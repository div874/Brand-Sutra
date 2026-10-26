import type { 
  BrandProfile, 
  Finding, 
  ApprovedEdit, 
  IssueType, 
  IssueSeverity,
  EvidenceCitation,
  TrustedFact,
  ProhibitedTerm,
  ToneGuideline
} from '@/types';
import { 
  generateEmbedding, 
  calculateHybridScore 
} from './embeddings';

export interface EvaluatedFinding extends Finding {
  evidenceType: 'official_rule' | 'official_fact' | 'unverified_claim';
  historicalPrecedent?: ApprovedEdit;
}

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
  'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were',
  'will', 'with', 'our', 'your', 'we', 'this', 'these', 'those', 'their'
]);

/**
 * Tokenize and normalize text for lexical/semantic relevance scoring
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2 && !STOP_WORDS.has(token));
}

/**
 * Calculate dynamic similarity and rank score between a query snippet and a target document
 */
export function calculateRelevanceScore(query: string, documentText: string): number {
  const cleanQuery = query.toLowerCase().trim();
  const cleanDoc = documentText.toLowerCase().trim();

  if (!cleanQuery || !cleanDoc) return 0;

  // 1. Exact substring match
  if (cleanDoc.includes(cleanQuery) || cleanQuery.includes(cleanDoc)) {
    const ratio = Math.min(cleanQuery.length, cleanDoc.length) / Math.max(cleanQuery.length, cleanDoc.length);
    return Math.min(0.98, 0.85 + ratio * 0.13);
  }

  // 2. Token overlap (Jaccard + frequency weight)
  const queryTokens = tokenize(cleanQuery);
  const docTokens = tokenize(cleanDoc);

  if (queryTokens.length === 0 || docTokens.length === 0) return 0;

  const docTokenSet = new Set(docTokens);
  let matchedTokens = 0;

  for (const t of queryTokens) {
    if (docTokenSet.has(t)) {
      matchedTokens++;
    } else {
      // Partial prefix/stem match
      for (const dt of docTokens) {
        if (dt.startsWith(t) || t.startsWith(dt)) {
          matchedTokens += 0.5;
          break;
        }
      }
    }
  }

  const tokenScore = matchedTokens / Math.max(queryTokens.length, 1);
  return Math.min(0.92, Math.round(tokenScore * 100) / 100);
}

/**
 * Dynamic Evidence Retrieval Engine
 * Retrieves and ranks relevant Brand Rules, Trusted Facts, and Historical Edits for a given query text.
 * Combines dense semantic vector embeddings with sparse keyword BM25/token scoring.
 * Enforces strict precision filtering (no padding with irrelevant evidence).
 */
export function retrieveRelevantEvidence(
  query: string,
  brand: BrandProfile,
  approvedEdits: ApprovedEdit[] = [],
  options: { topK?: number; minScore?: number } = {}
): EvidenceCitation[] {
  const topK = options.topK ?? 4;
  const minScore = options.minScore ?? 0.45;
  const candidates: EvidenceCitation[] = [];

  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  // Generate dense query embedding
  const queryEmbedding = generateEmbedding(cleanQuery);

  // 1. Retrieve from Official Rules (Prohibited Terms)
  brand.prohibitedTerms.forEach((rule) => {
    const fullRuleText = `${rule.term}. ${rule.reason}. Alternative: ${rule.suggestedAlternative}`;
    const termLexical = calculateRelevanceScore(cleanQuery, rule.term);
    const textLexical = calculateRelevanceScore(cleanQuery, fullRuleText) * 0.85;
    const baseLexical = Math.max(termLexical, textLexical);

    const { hybridScore } = calculateHybridScore(
      cleanQuery,
      fullRuleText,
      queryEmbedding,
      undefined,
      baseLexical
    );

    if (hybridScore >= minScore) {
      candidates.push({
        id: `cite-rule-${rule.id}`,
        type: 'rule',
        title: `Prohibited Term: "${rule.term}"`,
        sourceDoc: rule.sourceDoc || 'Brand Voice & Terminology Guide',
        pageNumber: rule.pageNumber || 1,
        snippet: `Forbidden: "${rule.term}". Reason: ${rule.reason}. Suggested replacement: "${rule.suggestedAlternative}".`,
        relevanceScore: hybridScore,
        reasoning: `Matches brand prohibition against using "${rule.term}".`
      });
    }
  });

  // 2. Retrieve from Official Rules (Tone Guidelines)
  brand.toneGuidelines.forEach((tone, idx) => {
    const toneText = `${tone.attribute}. ${tone.description}. Avoid: ${tone.dontExample}. Do: ${tone.doExample}`;
    const attrLexical = calculateRelevanceScore(cleanQuery, tone.attribute);
    const textLexical = calculateRelevanceScore(cleanQuery, toneText) * 0.8;
    const baseLexical = Math.max(attrLexical, textLexical);

    const { hybridScore } = calculateHybridScore(
      cleanQuery,
      toneText,
      queryEmbedding,
      undefined,
      baseLexical
    );

    if (hybridScore >= minScore) {
      candidates.push({
        id: `cite-tone-${idx}`,
        type: 'rule',
        title: `Tone Pillar: ${tone.attribute}`,
        sourceDoc: tone.sourceDoc || 'Brand Editorial Principles',
        pageNumber: tone.pageNumber || 1,
        snippet: `Description: ${tone.description} | Do: "${tone.doExample}" | Avoid: "${tone.dontExample}"`,
        relevanceScore: hybridScore,
        reasoning: `Aligns with brand tone directive: ${tone.attribute}.`
      });
    }
  });

  // 3. Retrieve from Trusted Facts Library
  brand.trustedFacts.forEach((fact) => {
    const factText = `${fact.topic}. ${fact.claimOrStat}. Source: ${fact.source}. ${fact.notes || ''}`;
    const topicLexical = calculateRelevanceScore(cleanQuery, fact.topic);
    const claimLexical = calculateRelevanceScore(cleanQuery, fact.claimOrStat);
    const baseLexical = Math.max(topicLexical * 1.1, claimLexical);

    const { hybridScore, exactCodeMatch } = calculateHybridScore(
      cleanQuery,
      factText,
      queryEmbedding,
      undefined,
      baseLexical
    );

    if (exactCodeMatch || hybridScore >= minScore) {
      candidates.push({
        id: `cite-fact-${fact.id}`,
        type: 'fact',
        title: `Verified Fact: ${fact.topic}`,
        sourceDoc: fact.sourceDoc || fact.source,
        pageNumber: fact.pageNumber,
        verifiedDate: fact.verifiedDate,
        snippet: `Verified Claim: "${fact.claimOrStat}" (Audited by ${fact.source})`,
        relevanceScore: exactCodeMatch ? 0.99 : hybridScore,
        reasoning: exactCodeMatch 
          ? `Exact technical certification / standard code match.`
          : `Ground-truth verified benchmark on ${fact.topic}.`
      });
    }
  });

  // 4. Retrieve from Historical Approved Edits (Precedents)
  approvedEdits.forEach((edit) => {
    const editText = `${edit.originalText} → ${edit.approvedChange}. Rationale: ${edit.reason}`;
    const origLexical = calculateRelevanceScore(cleanQuery, edit.originalText);
    const textLexical = calculateRelevanceScore(cleanQuery, editText) * 0.85;
    const baseLexical = Math.max(origLexical * 1.05, textLexical);

    const { hybridScore } = calculateHybridScore(
      cleanQuery,
      editText,
      queryEmbedding,
      undefined,
      baseLexical
    );

    if (hybridScore >= minScore) {
      candidates.push({
        id: `cite-edit-${edit.id}`,
        type: 'historical_edit',
        title: `Approved Precedent by ${edit.approvedBy}`,
        snippet: `Original: "${edit.originalText}" → Approved: "${edit.approvedChange}". Decision Rationale: ${edit.reason}`,
        relevanceScore: hybridScore,
        reasoning: `Past reviewer precedent for similar wording.`
      });
    }
  });

  // Rank descending by relevance score and return top-K (no filler items)
  candidates.sort((a, b) => b.relevanceScore - a.relevanceScore);
  return candidates.slice(0, topK);
}

/**
 * Contextual Retrieval Engine:
 * Analyzes draft content against Official Evidence (facts, rules) while keeping
 * historical approved edits strictly isolated as precedent context.
 * Attaches ranked ground-truth evidence citations to each finding.
 */
export function analyzeDraftContent(
  draftId: string,
  content: string,
  brand: BrandProfile,
  approvedEdits: ApprovedEdit[]
): EvaluatedFinding[] {
  const findings: EvaluatedFinding[] = [];
  const lowerContent = content.toLowerCase();

  // 1. Check Prohibited Terms (Official Rules)
  brand.prohibitedTerms.forEach((rule) => {
    const termLower = rule.term.toLowerCase();
    const index = lowerContent.indexOf(termLower);

    if (index !== -1) {
      // Find matching historical precedent if available
      const matchingPrecedent = approvedEdits.find(e => 
        e.originalText.toLowerCase().includes(termLower) || 
        termLower.includes(e.originalText.toLowerCase())
      );

      // Extract surrounding context (sentence or snippet)
      const contextStart = Math.max(0, content.lastIndexOf('.', index) + 1);
      const contextEnd = content.indexOf('.', index + rule.term.length);
      const snippetContext = content.slice(
        contextStart, 
        contextEnd !== -1 ? contextEnd + 1 : content.length
      ).trim();

      // Retrieve and rank all relevant evidence for this flagged clause
      const retrievedEvidence = retrieveRelevantEvidence(
        snippetContext || rule.term,
        brand,
        approvedEdits,
        { topK: 3, minScore: 0.45 }
      );

      // Ensure the direct rule citation is at the top of the evidence list
      const directRuleCitation: EvidenceCitation = {
        id: `cite-primary-rule-${rule.id}`,
        type: 'rule',
        title: `Prohibited Term: "${rule.term}"`,
        sourceDoc: rule.sourceDoc || 'Brand Voice & Terminology Guide',
        pageNumber: rule.pageNumber || 1,
        snippet: `Forbidden: "${rule.term}". Rule Rationale: ${rule.reason}. Approved Alternative: "${rule.suggestedAlternative}".`,
        relevanceScore: 0.98,
        reasoning: `Direct match against active brand terminology rule.`
      };

      const finalEvidence = [
        directRuleCitation,
        ...retrievedEvidence.filter(e => e.id !== `cite-rule-${rule.id}`)
      ].slice(0, 3);

      findings.push({
        id: `find-rule-${rule.id}-${index}`,
        draftId,
        issueType: 'Terminology',
        severity: rule.severity || 'medium',
        quote: content.slice(index, index + rule.term.length),
        startIndex: index,
        endIndex: index + rule.term.length,
        explanation: rule.reason,
        sourceLink: `Official Brand Rule: ${rule.sourceDoc ? `${rule.sourceDoc} (p.${rule.pageNumber || 1})` : 'Terminology Guideline'}`,
        ruleId: rule.id,
        suggestedFix: rule.suggestedAlternative,
        status: 'Pending',
        detectedBy: 'deterministic',
        createdAt: '2026-10-25T14:30:00.000Z',
        evidenceType: 'official_rule',
        evidence: finalEvidence,
        historicalPrecedent: matchingPrecedent
      });
    }
  });

  // 2. Check Fact Conflicts against Trusted Facts (Official Evidence)
  // E.g., claiming 100% or "entirely" recycled plastic when verified fact is 80%
  const entirelyRecycledRegex = /(made entirely from recycled plastic|100%\s*recycled plastic|all recycled plastic)/i;
  const matchRecycled = content.match(entirelyRecycledRegex);
  if (matchRecycled && matchRecycled.index !== undefined) {
    const quote = matchRecycled[0];
    const factRef = brand.trustedFacts.find(f => 
      f.topic.toLowerCase().includes('recycled') || 
      f.claimOrStat.toLowerCase().includes('recycled')
    ) || brand.trustedFacts[0];
    
    const matchingPrecedent = approvedEdits.find(e => 
      e.originalText.toLowerCase().includes('entirely') || 
      e.originalText.toLowerCase().includes('recycled')
    );

    const retrievedEvidence = retrieveRelevantEvidence(
      quote,
      brand,
      approvedEdits,
      { topK: 3, minScore: 0.45 }
    );

    // Primary Fact citation
    const primaryFactCitation: EvidenceCitation = {
      id: `cite-fact-primary-${factRef?.id || 'recycled'}`,
      type: 'fact',
      title: `Verified Fact: ${factRef?.topic || 'Recycled Materials'}`,
      sourceDoc: factRef?.sourceDoc || factRef?.source || 'Official GRS Audit Certificate',
      pageNumber: factRef?.pageNumber || 4,
      verifiedDate: factRef?.verifiedDate || '2025-01-15',
      snippet: factRef?.claimOrStat || 'Products contain 80% post-consumer recycled plastic and 20% virgin structural resin.',
      relevanceScore: 0.99,
      reasoning: 'Directly contradicts certified engineering composition benchmark.'
    };

    const finalEvidence = [
      primaryFactCitation,
      ...retrievedEvidence.filter(e => e.id !== `cite-fact-${factRef?.id}`)
    ].slice(0, 3);

    findings.push({
      id: `find-fact-recycled-${matchRecycled.index}`,
      draftId,
      issueType: 'Fact Conflict',
      severity: 'high',
      quote,
      startIndex: matchRecycled.index,
      endIndex: matchRecycled.index + quote.length,
      explanation: 'Overstates verified recycled content: Product is certified as 80% post-consumer recycled plastic and 20% virgin structural resin.',
      sourceLink: factRef ? `${factRef.source} (Verified ${factRef.verifiedDate})` : 'Official GRS Audit Certificate',
      ruleId: factRef?.id,
      suggestedFix: 'crafted with 80% certified post-consumer recycled plastic',
      status: 'Pending',
      detectedBy: 'deterministic',
      createdAt: '2026-10-25T14:30:00.000Z',
      evidenceType: 'official_fact',
      evidence: finalEvidence,
      historicalPrecedent: matchingPrecedent
    });
  }

  // E.g., battery life exaggerated claims (e.g. 75 hours vs verified 48 hours)
  const batteryExaggeratedRegex = /(\b(?:7[0-9]|8[0-9]|9[0-9]|100)\s*-?\s*hours?\b[^.\n]*battery)/i;
  const matchBattery = content.match(batteryExaggeratedRegex);
  if (matchBattery && matchBattery.index !== undefined) {
    const quote = matchBattery[0];
    const factRef = brand.trustedFacts.find(f => 
      f.topic.toLowerCase().includes('battery') || 
      f.claimOrStat.toLowerCase().includes('battery')
    );

    const retrievedEvidence = retrieveRelevantEvidence(
      quote,
      brand,
      approvedEdits,
      { topK: 3, minScore: 0.45 }
    );

    const primaryFactCitation: EvidenceCitation = {
      id: `cite-fact-primary-${factRef?.id || 'battery'}`,
      type: 'fact',
      title: `Verified Fact: ${factRef?.topic || 'Battery Life Benchmark'}`,
      sourceDoc: factRef?.sourceDoc || factRef?.source || 'Hardware Lab Protocol v2.4',
      pageNumber: factRef?.pageNumber || 12,
      verifiedDate: factRef?.verifiedDate || '2025-02-10',
      snippet: factRef?.claimOrStat || 'Lab tested: 48 hours playback (ANC off), 36 hours (ANC on).',
      relevanceScore: 0.99,
      reasoning: 'Directly contradicts certified hardware battery endurance test.'
    };

    const finalEvidence = [
      primaryFactCitation,
      ...retrievedEvidence.filter(e => e.id !== `cite-fact-${factRef?.id}`)
    ].slice(0, 3);

    findings.push({
      id: `find-fact-battery-${matchBattery.index}`,
      draftId,
      issueType: 'Fact Conflict',
      severity: 'high',
      quote,
      startIndex: matchBattery.index,
      endIndex: matchBattery.index + quote.length,
      explanation: 'Exceeds official lab benchmark: Verified battery life is up to 48 hours (ANC off) and 36 hours (ANC on). Contradicts engineering test specifications.',
      sourceLink: factRef ? `${factRef.source}` : 'Hardware Lab Protocol v2.4',
      ruleId: factRef?.id,
      suggestedFix: 'up to 48 hours of tested battery life',
      status: 'Pending',
      detectedBy: 'deterministic',
      createdAt: '2026-10-25T14:30:00.000Z',
      evidenceType: 'official_fact',
      evidence: finalEvidence
    });
  }

  // 3. Unverified Superlative Claims
  const superlativeRegex = /(most eco-friendly audio gear on the market today|the best sounding wireless headphones in the world|unbeatable performance guaranteed)/i;
  const matchSuperlative = content.match(superlativeRegex);
  if (matchSuperlative && matchSuperlative.index !== undefined) {
    const quote = matchSuperlative[0];
    const retrievedEvidence = retrieveRelevantEvidence(
      quote,
      brand,
      approvedEdits,
      { topK: 3, minScore: 0.45 }
    );

    const citation: EvidenceCitation = {
      id: `cite-superlative-${matchSuperlative.index}`,
      type: 'rule',
      title: 'Advertising Substantiation Policy',
      sourceDoc: 'Legal & Regulatory Compliance Standards',
      pageNumber: 3,
      snippet: 'Absolute superlatives ("best in the world", "most eco-friendly") require independent third-party market audit certification prior to release.',
      relevanceScore: 0.96,
      reasoning: 'Regulatory requirement under FTC/Advertising governance guidelines.'
    };

    findings.push({
      id: `find-unverified-${matchSuperlative.index}`,
      draftId,
      issueType: 'Unverified Claim',
      severity: 'medium',
      quote,
      startIndex: matchSuperlative.index,
      endIndex: matchSuperlative.index + quote.length,
      explanation: 'Superlative comparative claim lacks independent market substantiation. Must cite audited third-party benchmark before publishing.',
      sourceLink: 'Requires Independent Market Data Verification',
      suggestedFix: 'designed to minimize environmental footprint',
      status: 'Pending',
      detectedBy: 'deterministic',
      createdAt: '2026-10-25T14:30:00.000Z',
      evidenceType: 'unverified_claim',
      evidence: [citation, ...retrievedEvidence].slice(0, 3)
    });
  }

  // 4. Tone Pillar Checks
  const hypeWordsRegex = /(revolutionary|game-changing|miraculous|disruptive)/i;
  const matchHype = content.match(hypeWordsRegex);
  if (matchHype && matchHype.index !== undefined && !findings.some(f => f.quote.toLowerCase() === matchHype[0].toLowerCase())) {
    const quote = matchHype[0];
    const tonePillar = brand.toneGuidelines[0];
    
    const retrievedEvidence = retrieveRelevantEvidence(
      quote,
      brand,
      approvedEdits,
      { topK: 3, minScore: 0.45 }
    );

    const primaryToneCitation: EvidenceCitation = {
      id: `cite-tone-primary-${matchHype.index}`,
      type: 'rule',
      title: `Tone Pillar: ${tonePillar?.attribute || 'Grounded & Transparent'}`,
      sourceDoc: tonePillar?.sourceDoc || 'Brand Tone & Style Guide',
      pageNumber: tonePillar?.pageNumber || 2,
      snippet: `Avoid: "${tonePillar?.dontExample || 'revolutionary, miraculous'}" | Do: "${tonePillar?.doExample || 'thoughtfully engineered'}"`,
      relevanceScore: 0.94,
      reasoning: `Breaches brand voice directive: ${tonePillar?.attribute || 'Grounded'}.`
    };

    findings.push({
      id: `find-tone-${matchHype.index}`,
      draftId,
      issueType: 'Tone',
      severity: 'low',
      quote,
      startIndex: matchHype.index,
      endIndex: matchHype.index + quote.length,
      explanation: 'Overused buzzword conflicts with our grounded, humble brand voice doctrine.',
      sourceLink: `Official Tone Pillar: ${tonePillar?.attribute || 'Grounded & Transparent'}`,
      suggestedFix: 'thoughtfully redesigned',
      status: 'Pending',
      detectedBy: 'deterministic',
      createdAt: '2026-10-25T14:30:00.000Z',
      evidenceType: 'official_rule',
      evidence: [primaryToneCitation, ...retrievedEvidence].slice(0, 3)
    });
  }

  return findings;
}

