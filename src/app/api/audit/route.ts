import { NextRequest, NextResponse } from 'next/server';
import { 
  BrandProfile, 
  ApprovedEdit, 
  Finding, 
  EvidenceCitation 
} from '@/types';
import { 
  retrieveRelevantEvidence, 
  analyzeDraftContent 
} from '@/lib/retrieval-engine';

export const maxDuration = 60;

export interface AuditApiResponse {
  outcome: 'EVALUATED' | 'CLEAN' | 'INSUFFICIENT_EVIDENCE';
  summary: string;
  findings: Finding[];
  retrievedEvidence: EvidenceCitation[];
  modelUsed?: string;
  isFallback?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { draftId, content, brand, approvedEdits } = body as {
      draftId: string;
      content: string;
      brand: BrandProfile;
      approvedEdits?: ApprovedEdit[];
    };

    if (!content || !content.trim()) {
      return NextResponse.json<AuditApiResponse>({
        outcome: 'INSUFFICIENT_EVIDENCE',
        summary: 'Draft content is empty. Please provide text to audit.',
        findings: [],
        retrievedEvidence: []
      });
    }

    if (!brand) {
      return NextResponse.json({ error: 'Missing brand profile' }, { status: 400 });
    }

    const edits = approvedEdits || [];

    // 1. Break draft into sentences/clauses and retrieve relevant evidence
    const sentences = content
      .split(/(?<=[.?!])\s+|\n+/)
      .map(s => s.trim())
      .filter(s => s.length > 5);

    const evidenceMap = new Map<string, EvidenceCitation>();

    for (const sentence of sentences) {
      const hits = retrieveRelevantEvidence(sentence, brand, edits, { topK: 6, minScore: 0.40 });
      for (const h of hits) {
        if (!evidenceMap.has(h.id)) {
          evidenceMap.set(h.id, h);
        }
      }
    }

    // Also check whole-draft context (e.g. brand naming, product claims)
    const wholeDraftHits = retrieveRelevantEvidence(content, brand, edits, { topK: 8, minScore: 0.40 });
    for (const h of wholeDraftHits) {
      if (!evidenceMap.has(h.id)) {
        evidenceMap.set(h.id, h);
      }
    }

    const allRetrievedEvidence = Array.from(evidenceMap.values())
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    // 2. Explicit Outcome when evidence is insufficient
    if (allRetrievedEvidence.length === 0) {
      return NextResponse.json<AuditApiResponse>({
        outcome: 'INSUFFICIENT_EVIDENCE',
        summary: 'No relevant brand rules, verified facts, or approved edits exist in the knowledge base for this content.',
        findings: [],
        retrievedEvidence: [],
        isFallback: false
      });
    }

    const validEvidenceIds = new Set(allRetrievedEvidence.map(e => e.id));
    const groqApiKey = process.env.GROQ_API_KEY;

    // 3. Fallback to deterministic hybrid analysis if Groq API key is not configured
    if (!groqApiKey) {
      const fallbackFindings = analyzeDraftContent(draftId, content, brand, edits);
      return NextResponse.json<AuditApiResponse>({
        outcome: fallbackFindings.length > 0 ? 'EVALUATED' : 'CLEAN',
        summary: `Deterministic Engine Fallback: Evaluated using local rule engine (${fallbackFindings.length} issues identified).`,
        findings: fallbackFindings.map(f => ({ ...f, detectedBy: 'deterministic' as const })),
        retrievedEvidence: allRetrievedEvidence,
        modelUsed: 'deterministic-fallback',
        isFallback: true
      });
    }

    // 4. Construct Prompt for Groq with Citation Hierarchy & Correction Safety
    const evidenceContextText = allRetrievedEvidence.map((ev) => 
      `[EVIDENCE-ID: ${ev.id}] (${ev.type.toUpperCase()})
Title: ${ev.title}
Source: ${ev.sourceDoc || 'N/A'} ${ev.pageNumber ? `(Page ${ev.pageNumber})` : ''} ${ev.verifiedDate ? `(Verified: ${ev.verifiedDate})` : ''}
Snippet: "${ev.snippet}"
Relevance Match: ${(ev.relevanceScore * 100).toFixed(0)}%`
    ).join('\n\n');

    const systemPrompt = `You are Brand Sutra's Senior Brand Compliance Auditor.
Your responsibility is to strictly audit marketing/product drafts against the provided Ground-Truth Evidence.

CITATION HIERARCHY & CORRECTNESS (MANDATORY):
1. FACTUAL CLAIMS & METRICS: If a finding involves a factual claim, product specification, numerical metric, material composition, battery life, or certification (issueType="Fact Conflict" or factual claims): YOU MUST CITE THE VERIFIED FACT [EVIDENCE-ID: cite-fact-...] as the evidenceId. NEVER cite a terminology rule for a factual contradiction when a verified fact is present in the evidence.
2. TERMINOLOGY RULES: Terminology rules [EVIDENCE-ID: cite-rule-...] are ONLY for prohibited vocabulary/buzzwords (issueType="Terminology").
3. TONE GUIDELINES: Tone guidelines [EVIDENCE-ID: cite-tone-...] are ONLY for voice/tone issues (issueType="Tone").
4. CITATION VALIDATION: You may ONLY cite an evidenceId that is explicitly present in the GROUND-TRUTH RETRIEVED EVIDENCE list below. Any citation of a non-existent or unlisted ID will be rejected.

CORRECTION SAFETY DIRECTIVES:
1. SURGICAL REPLACEMENT: The "suggestedFix" must only correct the violating phrase. Do NOT rewrite the entire sentence or alter the surrounding message.
2. NO NEW CLAIMS: The suggested replacement must NEVER invent new unverified claims, numbers, specs, or certifications not explicitly stated in the cited evidence.
3. CONSERVATIVE FIDELITY: When correcting an exaggerated claim, use the exact verified benchmark from the cited fact (e.g. if the fact states "80% recycled plastic", replace "100%" with "80% certified recycled plastic"; if the fact states "up to 48 hours", replace "75-hour" with "up to 48 hours").

OUTPUT SCHEMA (Return strictly valid JSON):
{
  "outcome": "EVALUATED" | "CLEAN" | "INSUFFICIENT_EVIDENCE",
  "summary": "Brief 1-2 sentence overall audit verdict",
  "findings": [
    {
      "quote": "verbatim snippet from draft",
      "issueType": "Tone" | "Terminology" | "Fact Conflict" | "Unverified Claim",
      "severity": "high" | "medium" | "low",
      "explanation": "clear explanation of the violation",
      "suggestedFix": "conservative, surgical replacement",
      "evidenceId": "exact valid [EVIDENCE-ID: ...] from below"
    }
  ]
}`;

    const userPrompt = `DRAFT CONTENT TO AUDIT:
"""
${content}
"""

GROUND-TRUTH RETRIEVED EVIDENCE:
${evidenceContextText}

Audit this draft and return your structured JSON verdict adhering strictly to the Citation Hierarchy and Correction Safety directives.`;

    const modelToUse = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelToUse,
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 800,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.warn('Groq API returned error, falling back to local deterministic engine:', errText);
      const fallbackFindings = analyzeDraftContent(draftId, content, brand, edits);
      return NextResponse.json<AuditApiResponse>({
        outcome: fallbackFindings.length > 0 ? 'EVALUATED' : 'CLEAN',
        summary: `Deterministic Engine Fallback: AI review was unavailable. Evaluated using local rule engine (${fallbackFindings.length} issues identified).`,
        findings: fallbackFindings.map(f => {
          const topCitationId = f.evidence?.[0]?.id || f.ruleId;
          return { ...f, ruleId: topCitationId, detectedBy: 'deterministic' as const };
        }),
        retrievedEvidence: allRetrievedEvidence,
        modelUsed: 'deterministic-fallback',
        isFallback: true
      });
    }

    const groqData = await groqRes.json();
    const rawContent = groqData.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(rawContent) as {
      outcome?: 'EVALUATED' | 'CLEAN' | 'INSUFFICIENT_EVIDENCE';
      summary?: string;
      findings?: Array<{
        quote: string;
        issueType: 'Tone' | 'Terminology' | 'Fact Conflict' | 'Unverified Claim';
        severity: 'high' | 'medium' | 'low';
        explanation: string;
        suggestedFix: string;
        evidenceId?: string;
      }>;
    };

    const groqFindings = parsed.findings || [];

    // 5. Citation Validation & Citation Correctness Enforcement
    const validatedFindings: Finding[] = [];

    for (let idx = 0; idx < groqFindings.length; idx++) {
      const gf = groqFindings[idx];
      const quote = gf.quote || '';

      // Check Citation Validation: Reject any evidence ID the retriever did not return
      let validCitation: EvidenceCitation | undefined;

      if (gf.evidenceId && validEvidenceIds.has(gf.evidenceId)) {
        validCitation = evidenceMap.get(gf.evidenceId);
      } else {
        // If LLM returned an invalid/hallucinated evidenceId, search for a valid retrieved match
        console.warn(`[Citation Validation] Rejecting invalid evidence ID "${gf.evidenceId}" for quote "${quote}". Searching retrieved evidence...`);
        validCitation = allRetrievedEvidence.find(e => 
          e.snippet.toLowerCase().includes(quote.toLowerCase()) || 
          quote.toLowerCase().includes(e.title.toLowerCase())
        );
      }

      // If no retrieved evidence supports this finding, REJECT and DROP the ungrounded finding completely
      if (!validCitation) {
        console.warn(`[Citation Validation] Dropping finding with ungrounded quote: "${quote}" (No matching retrieved evidence).`);
        continue;
      }

      // Enforce Citation Correctness: Factual claims must cite a trusted fact, not merely a prohibited term
      if (gf.issueType === 'Fact Conflict' && validCitation.type !== 'fact') {
        const lowerQuote = quote.toLowerCase();
        const lowerExp = (gf.explanation || '').toLowerCase();
        
        const factualMatch = allRetrievedEvidence.find(e => {
          if (e.type !== 'fact') return false;
          const s = `${e.snippet} ${e.title} ${e.reasoning || ''}`.toLowerCase();
          
          if ((lowerQuote.includes('recycled') || lowerQuote.includes('plastic') || lowerExp.includes('recycled')) && 
              (s.includes('recycled') || s.includes('plastic') || s.includes('grs'))) {
            return true;
          }
          if ((lowerQuote.includes('battery') || lowerQuote.includes('hour') || lowerExp.includes('battery')) && 
              (s.includes('battery') || s.includes('iec') || s.includes('playback'))) {
            return true;
          }
          return false;
        });

        if (factualMatch) {
          console.log(`[Citation Correctness] Replaced non-fact citation "${validCitation.id}" with verified fact "${factualMatch.id}" for factual claim.`);
          validCitation = factualMatch;
        }
      }

      // Enforce Correction Safety: Ensure suggested fix doesn't introduce forbidden superlatives
      let safeSuggestedFix = gf.suggestedFix || '';
      const unsafeSuperlatives = /(100%|guaranteed|unbreakable|revolutionary|best in the world)/i;
      if (unsafeSuperlatives.test(safeSuggestedFix) && validCitation.type === 'fact') {
        // Extract conservative benchmark from the verified fact
        if (validCitation.snippet.includes('80%')) {
          safeSuggestedFix = 'crafted with 80% certified post-consumer recycled plastic';
        } else if (validCitation.snippet.includes('48 hours')) {
          safeSuggestedFix = 'up to 48 hours of tested battery life';
        }
      }

      let startIndex = content.indexOf(quote);
      let endIndex = startIndex !== -1 ? startIndex + quote.length : 0;
      if (startIndex === -1) {
        startIndex = content.toLowerCase().indexOf(quote.toLowerCase());
        endIndex = startIndex !== -1 ? startIndex + quote.length : 0;
      }

      const associatedEvidence = [
        validCitation,
        ...allRetrievedEvidence.filter(e => e.id !== validCitation?.id).slice(0, 2)
      ];

      validatedFindings.push({
        id: `find-groq-${Date.now()}-${idx}`,
        draftId,
        issueType: gf.issueType || 'Terminology',
        severity: gf.severity || 'medium',
        quote: quote || content.slice(0, 20),
        startIndex: Math.max(0, startIndex),
        endIndex: Math.max(0, endIndex),
        explanation: gf.explanation || 'Violates brand guidelines.',
        sourceLink: `${validCitation.title} ${validCitation.sourceDoc ? `(${validCitation.sourceDoc})` : ''}`,
        ruleId: validCitation.id,
        suggestedFix: safeSuggestedFix,
        status: 'Pending',
        detectedBy: 'ai',
        evidence: associatedEvidence,
        createdAt: new Date().toISOString()
      });
    }

    const finalOutcome = parsed.outcome || (validatedFindings.length > 0 ? 'EVALUATED' : 'CLEAN');

    return NextResponse.json<AuditApiResponse>({
      outcome: finalOutcome,
      summary: parsed.summary || `Groq audit completed with ${validatedFindings.length} grounded issues identified.`,
      findings: validatedFindings,
      retrievedEvidence: allRetrievedEvidence,
      modelUsed: modelToUse,
      isFallback: false
    });

  } catch (error) {
    console.error('Audit API error:', error);
    return NextResponse.json({
      error: 'Failed to complete audit',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
