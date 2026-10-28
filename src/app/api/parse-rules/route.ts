import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';

export const maxDuration = 60;

interface PdfPage {
  text: string;
  pageNumber: number;
}

// Extract text and page numbers from PDF buffer
async function extractTextFromPdf(buffer: Buffer): Promise<{ pages: PdfPage[]; totalText: string; isScanned: boolean }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParseModule = require('pdf-parse');
    if (pdfParseModule.PDFParse) {
      const parser = new pdfParseModule.PDFParse({ data: buffer });
      const textResult = await parser.getText();
      const rawText = textResult?.text || (typeof textResult === 'string' ? textResult : '');

      // Check if text is present and meaningful
      const wordsCount = (rawText.match(/[a-zA-Z]{2,}/g) || []).length;
      if (!rawText.trim() || wordsCount < 10) {
        return { pages: [], totalText: '', isScanned: true };
      }

      // Split pages by form feed character (\f) standard in PDF text streams
      const rawPages = rawText.split('\f').filter((p: string) => p.trim().length > 0);
      const pages: PdfPage[] = rawPages.map((pageText: string, idx: number) => ({
        text: pageText,
        pageNumber: idx + 1
      }));

      return { pages: pages.length > 0 ? pages : [{ text: rawText, pageNumber: 1 }], totalText: rawText, isScanned: false };
    }
  } catch (err) {
    console.warn('PDFParse module error, trying fallback stream extraction:', err);
  }

  // Fallback: extract ASCII string blocks from raw PDF stream
  const rawStr = buffer.toString('binary');
  const textMatches = rawStr.match(/\(([^()]*)\)\s*Tj/g) || [];
  const extractedStream = textMatches
    .map(m => m.replace(/^\(/, '').replace(/\)\s*Tj$/, ''))
    .join(' ');

  const words = (extractedStream.match(/[a-zA-Z]{2,}/g) || []).length;
  if (words < 10) {
    return { pages: [], totalText: '', isScanned: true };
  }

  return {
    pages: [{ text: extractedStream, pageNumber: 1 }],
    totalText: extractedStream,
    isScanned: false
  };
}

export async function POST(req: NextRequest) {
  try {
    const contentType = (typeof req.headers?.get === 'function' ? req.headers.get('content-type') : (req.headers as any)?.['content-type']) || '';
    let rawText = '';
    let fileName = 'pasted-guideline.txt';
    let fileType = 'text';
    let pages: PdfPage[] = [];

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
      }

      fileName = file.name;
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const ext = fileName.split('.').pop()?.toLowerCase();

      if (ext === 'json') {
        fileType = 'json';
        rawText = buffer.toString('utf-8');
        pages = [{ text: rawText, pageNumber: 1 }];
      } else if (ext === 'docx') {
        fileType = 'docx';
        const docxResult = await mammoth.extractRawText({ buffer });
        rawText = docxResult.value;
        pages = [{ text: rawText, pageNumber: 1 }];
      } else if (ext === 'pdf') {
        fileType = 'pdf';
        const pdfResult = await extractTextFromPdf(buffer);

        if (pdfResult.isScanned) {
          return NextResponse.json(
            {
              success: false,
              ocrRequired: true,
              fileName,
              error: 'OCR Required: This PDF appears to be a scanned image with no extractable text layer. Please upload a searchable digital PDF or paste the text directly.'
            },
            { status: 422 }
          );
        }

        rawText = pdfResult.totalText;
        pages = pdfResult.pages;
      } else {
        fileType = 'txt';
        rawText = buffer.toString('utf-8');
        pages = [{ text: rawText, pageNumber: 1 }];
      }
    } else {
      // JSON body with direct text
      const body = await req.json();
      rawText = body.text || '';
      fileType = body.format || 'text';
      fileName = body.fileName || 'Pasted Text';
      pages = [{ text: rawText, pageNumber: 1 }];
    }

    if (!rawText.trim()) {
      return NextResponse.json({ success: false, error: 'Extracted content is empty' }, { status: 400 });
    }

    // Parsing extracted text with page number provenance
    const extracted = parseTextIntoRules(pages, fileName, fileType);

    return NextResponse.json({
      success: true,
      fileName,
      fileType,
      pagesCount: pages.length,
      rawTextPreview: rawText.slice(0, 500),
      extracted
    });
  } catch (error) {
    console.error('Error parsing rules:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to parse file' },
      { status: 500 }
    );
  }
}

interface ParsedRules {
  trustedFacts: Array<{
    id: string;
    topic: string;
    claimOrStat: string;
    source: string;
    verifiedDate: string;
    sourceDoc?: string;
    pageNumber?: number;
  }>;
  prohibitedTerms: Array<{
    id: string;
    term: string;
    reason: string;
    suggestedAlternative: string;
    severity: 'high' | 'medium' | 'low';
    sourceDoc?: string;
    pageNumber?: number;
  }>;
  approvedTerms: Array<{
    id: string;
    term: string;
    preferredUsage: string;
    category?: string;
    sourceDoc?: string;
    pageNumber?: number;
  }>;
  toneGuidelines: Array<{
    attribute: string;
    description: string;
    doExample: string;
    dontExample: string;
    sourceDoc?: string;
    pageNumber?: number;
  }>;
}

// Helper to extract cleanly paired quoted phrases (double, curly, backtick, single)
function extractQuotedPhrases(text: string): string[] {
  const results: string[] = [];

  // Match paired double quotes (straight ", curly/smart “ ”, guillemets « », backticks ` `)
  // Apostrophes (') inside double quotes are preserved within the matched string.
  const doubleQuoteRegex = /"([^"\r\n]+)"|“([^”\r\n]+)”|«([^»\r\n]+)»|`([^`\r\n]+)`/g;
  let match: RegExpExecArray | null;
  while ((match = doubleQuoteRegex.exec(text)) !== null) {
    const val = (match[1] ?? match[2] ?? match[3] ?? match[4] ?? '').trim();
    if (val && !results.includes(val)) {
      results.push(val);
    }
  }

  // Match paired single quotes '...' or ‘...’ flanked by whitespace/punctuation boundaries
  // Explicitly excludes contraction/possessive apostrophes (e.g. world's, don't, skin's)
  const singleQuoteRegex = /(?:^|[\s(\[{:–—-])['‘]([a-zA-Z0-9][^'’\r\n]{0,80}?)['’](?:$|[\s)\]},;:–—.-])/g;
  while ((match = singleQuoteRegex.exec(text)) !== null) {
    const val = (match[1] ?? '').trim();
    if (val && !results.includes(val) && !/^(s|t|d|m|re|ve|ll)$/i.test(val)) {
      results.push(val);
    }
  }

  return results;
}

// Identify headings, rule headers, structural section titles, and table separators
function isHeadingOrSectionOrRuleId(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;

  // Horizontal rules / line dividers (e.g. ===, ---, ***)
  if (/^[=\-_*~]{3,}$/.test(trimmed)) return true;

  // Markdown table separator (e.g. |---|---| or |:---|:---|)
  if (/^\|?[\s:-|-]+\|?$/.test(trimmed)) return true;

  // Markdown table header row (e.g. | Prohibited Term | Approved Alternative | Reason |)
  if (/^\|?\s*(?:prohibited|approved|rule|term|claim|fact|topic|alternative|reason|usage|attribute|category)\b.*\|/i.test(trimmed)) {
    return true;
  }

  // Pure Rule ID lines (e.g. "RULE PC-01", "RULE PC-01:", "RULE NS-001", "Rule 1:", "[RULE-PC01]")
  if (/^(?:rule\s*(?:id)?[:\s-]*[a-z0-9_-]+[:\s]*)$/i.test(trimmed)) {
    return true;
  }

  // Rule title headers without quotes (e.g. "RULE PC-01: Prohibited Marketing Claims", "RULE PC-02: Medical Claims")
  if (/^rule\s*(?:id)?[:\s-]*[a-z0-9_-]+[:\s-]+(?:prohibited|approved|general|medical|environmental|brand)?\s*(?:terms|claims|guidelines|standards|rules|policy)?$/i.test(trimmed)) {
    return true;
  }

  // Markdown headings without quotes (e.g. "## 2. PROHIBITED TERMS AND CLAIMS", "### Terms to Avoid")
  if (/^#{1,6}\s+/.test(trimmed)) {
    const headingText = trimmed.replace(/^#{1,6}\s+/, '').trim();
    if (!headingText.includes('"') && !headingText.includes("'") && !headingText.includes('“')) {
      return true;
    }
  }

  // Section titles with numbered prefixes (e.g. "4. PREFERRED TERMINOLOGY AND WORDING", "3. PROHIBITED PHRASES")
  if (/^(?:\d+[\.\)]\s*)?(?:section\s*[a-z0-9.-]+[:\s-]*)?(?:brand\s*)?(?:profile|voice|tone|prohibited|banned|approved|preferred|trusted|facts|claims|terms|terminology|vocabulary|wording|guidelines|standards|benchmarks|specifications|review|policy|status|purpose|approval|notice|draft|results|evidence)\b/i.test(trimmed)) {
    if (!trimmed.includes('"') && !trimmed.includes('“') && !trimmed.includes(':')) {
      return true;
    }
  }

  // All-caps section headers without quotes or colons (e.g. "PROHIBITED TERMS AND CLAIMS", "TERMS AND CLAIMS")
  if (trimmed === trimmed.toUpperCase() && trimmed.length > 3 && !trimmed.includes('"') && !trimmed.includes("'") && !trimmed.includes(':')) {
    if (/(?:PROHIBITED|BANNED|APPROVED|PREFERRED|TERMS|CLAIMS|TERMINOLOGY|WORDING|GUIDELINES|VOICE|TONE|FACTS|STANDARDS|RULES|SECTION)/.test(trimmed)) {
      return true;
    }
  }

  return false;
}

// Identify explanatory instructions and meta prose that must not be classified as terms
function isMetaInstructionSentence(line: string): boolean {
  const trimmed = line.trim();
  const lower = trimmed.toLowerCase();

  // Document meta-sections, instructions, or disclaimers
  if (/^(?:[-*•]\s*)?(?:extract\s+the\s+exact|do\s+not\s+extract|each\s+rule\s+record|how\s+to\s+interpret|this\s+is\s+a\s+fictional|document\s+status|important\s+status|document\s+purpose|verification\s+status|evidence\s+rules|core\s+principle)/i.test(trimmed)) {
    return true;
  }

  // If this line explicitly presents a key-value label, do not reject it as meta prose
  if (/^(?:[-*•]\s*)?(?:prohibited\s*(?:phrase|term)|approved\s*(?:alternative|term)|suggested\s*alternative|preferred\s*alternative|banned\s*term|avoid|never\s*say|do\s*not\s*use)[:\s-]/i.test(trimmed)) {
    return false;
  }

  // If the line contains quotes, an exact term is likely present
  if (trimmed.includes('"') || trimmed.includes('“') || trimmed.includes('«') || trimmed.includes('`')) {
    return false;
  }

  // Single-quoted term present
  if (/'[a-zA-Z0-9\s-]{2,40}'/.test(trimmed)) {
    return false;
  }

  // Typical explanatory meta sentences
  const metaInstructionPatterns = [
    /\b(?:this|these|the|all|any)\s+(?:phrase|phrases|term|terms|word|words|claim|claims|statement|statements|rule|rules)\s+(?:as\s+a\s+|that\s+|in\s+|without\s+|must\s+|should\s+|will\s+|are\s+|below\s+are)/i,
    /\b(?:extract\s+the\s+exact|do\s+not\s+extract|wording\s+suggestions\s+only|they\s+are\s+not\s+medical|a\s+brand\s+manager\s+must|verification\s+status)\b/i,
    /\b(?:claims|phrases|terms|words)\s+that\s+(?:remain|appear|are|have|do\s+not)\b/i,
    /\b(?:in\s+the\s+draft|in\s+all\s+drafts|in\s+drafts|in\s+copy|in\s+marketing\s+copy|in\s+marketing\s+materials|in\s+content)\b/i,
    /\b(?:this\s+section|this\s+guide|this\s+policy|this\s+document)\s+(?:outlines|lists|details|covers|defines|specifies|is\s+a\s+fictional|does\s+not\s+verify)/i,
    /\b(?:must\s+be\s+avoided|should\s+be\s+avoided|will\s+trigger|strictly\s+prohibited|to\s+avoid\s+penalties|to\s+avoid\s+regulatory|to\s+avoid\s+misbranding|to\s+avoid\s+scrutiny)\b/i,
    /\b(?:without\s+clinical\s+evidence|without\s+prior\s+legal|without\s+verification|without\s+citations?|without\s+disclaimers?)\b/i,
    /\b(?:prohibited|avoid)\s+(?:marketing\s+claims|unsubstantiated\s+claims|medical\s+claims|disease\s+claims)\b/i,
  ];

  for (const pattern of metaInstructionPatterns) {
    if (pattern.test(lower)) {
      return true;
    }
  }

  return false;
}

// Validate candidate prohibited term string
function isValidTerm(term: string): boolean {
  if (!term) return false;
  // Strip trailing punctuation like colons, commas, dots
  const stripped = term.trim().replace(/[:.,;!?]+$/, '');
  const clean = stripped.toLowerCase();
  if (clean.length < 2 || clean.length > 70) return false;

  // If the raw term itself ended with a colon, it's almost certainly a label like "Prohibited phrase:"
  if (term.trim().endsWith(':')) return false;

  const invalidPhrases = [
    'marketing claims',
    'terms and claims',
    'prohibited terms',
    'prohibited claims',
    'prohibited phrases',
    'prohibited phrase',
    'prohibited term',
    'banned terms',
    'banned phrases',
    'banned term',
    'banned phrase',
    'approved terms',
    'approved term',
    'approved alternative',
    'approved alternatives',
    'suggested alternative',
    'preferred alternative',
    'preferred terminology',
    'preferred term',
    'claims to avoid',
    'terms to avoid',
    'rule pc-01',
    'rule pc-02',
    'rule ns-001',
    'alternative',
    'reason',
    'usage condition',
    'brand voice',
    'brand rules'
  ];
  if (invalidPhrases.includes(clean)) return false;

  if (/^rule\s*[a-z0-9_-]+/i.test(clean)) return false;
  if (/^(?:this|these|the|all|any)\s+(?:phrase|phrases|term|terms|claim|claims|statement|statements)\b/i.test(clean)) return false;
  if (/^(?:claims|phrases|terms|words)\s+that\b/i.test(clean)) return false;
  if (/\b(?:remain\s+in\s+the\s+draft|appear\s+in\s+the\s+draft|without\s+clinical)\b/i.test(clean)) return false;

  return true;
}

// Extract replacement alternative only when explicitly provided in the source text
function extractAlternativeFromLine(line: string, prohibitedTerm: string, quotedPhrases: string[]): string {
  if (quotedPhrases.length >= 2) {
    const termIdx = quotedPhrases.indexOf(prohibitedTerm);
    if (termIdx === 0 && quotedPhrases[1]) {
      const afterFirstQuote = line.slice(line.indexOf(quotedPhrases[0]) + quotedPhrases[0].length);
      if (/(?:use|alternative|instead|prefer|replace|->|—|\|)/i.test(afterFirstQuote)) {
        return quotedPhrases[1].trim();
      }
    }
  }

  const altPatterns = [
    /(?:suggested\s*alternative|approved\s*alternative|preferred\s*alternative|alternative|preferred\s*term|use\s*instead|instead\s*use|replace\s*with)\s*[:=–—\->]\s*["“']?([^"”'\r\n.;,|]+)["”']?/i,
    /(?:use|prefer)\s+["“']([^"”'\r\n]+)["”']\s+(?:instead|as\s+an?\s+alternative)/i,
    /(?:->|—|\|)\s*(?:use\s+)?["“']?([^"”'\r\n.;|]+)["”']?\s*$/i
  ];

  for (const pattern of altPatterns) {
    const match = line.match(pattern);
    if (match && match[1]) {
      const alt = match[1].trim();
      if (
        alt && 
        alt.toLowerCase() !== prohibitedTerm.toLowerCase() && 
        !/(?:approved\s*alternative|alternative|none|n\/a)$/i.test(alt)
      ) {
        return alt;
      }
    }
  }

  return '';
}

function parseTextIntoRules(pages: PdfPage[], fileName: string, fileType: string): ParsedRules {
  const result: ParsedRules = {
    trustedFacts: [],
    prohibitedTerms: [],
    approvedTerms: [],
    toneGuidelines: []
  };

  // Direct structured JSON format
  if (fileType === 'json' && pages[0]) {
    try {
      const parsed = JSON.parse(pages[0].text);
      if (parsed.trustedFacts && Array.isArray(parsed.trustedFacts)) {
        result.trustedFacts = parsed.trustedFacts.map((f: Record<string, unknown>, idx: number) => ({
          id: String(f.id || `fact-imp-${Date.now()}-${idx}`),
          topic: String(f.topic || 'Imported Fact'),
          claimOrStat: String(f.claimOrStat || f.claim || f.fact || ''),
          source: String(f.source || fileName),
          sourceDoc: fileName,
          pageNumber: Number(f.pageNumber) || 1,
          verifiedDate: String(f.verifiedDate || new Date().toISOString().split('T')[0])
        }));
      }
      if (parsed.prohibitedTerms && Array.isArray(parsed.prohibitedTerms)) {
        result.prohibitedTerms = parsed.prohibitedTerms.map((t: Record<string, unknown>, idx: number) => ({
          id: String(t.id || `term-imp-${Date.now()}-${idx}`),
          term: String(t.term || t.word || ''),
          reason: String(t.reason || 'Prohibited in brand guidelines'),
          suggestedAlternative: String(t.suggestedAlternative || t.alternative || t.useInstead || '').trim(),
          severity: (t.severity as 'high' | 'medium' | 'low') || 'medium',
          sourceDoc: fileName,
          pageNumber: Number(t.pageNumber) || 1
        }));
      }
      if (parsed.approvedTerms && Array.isArray(parsed.approvedTerms)) {
        result.approvedTerms = parsed.approvedTerms.map((a: Record<string, unknown>, idx: number) => ({
          id: String(a.id || `appr-imp-${Date.now()}-${idx}`),
          term: String(a.term || a.word || ''),
          preferredUsage: String(a.preferredUsage || a.usage || 'Preferred terminology'),
          category: String(a.category || 'General'),
          sourceDoc: fileName,
          pageNumber: Number(a.pageNumber) || 1
        }));
      }
      if (parsed.toneGuidelines && Array.isArray(parsed.toneGuidelines)) {
        result.toneGuidelines = parsed.toneGuidelines.map((tg: Record<string, unknown>) => ({
          attribute: String(tg.attribute || tg.title || 'Tone Pillar'),
          description: String(tg.description || ''),
          doExample: String(tg.doExample || tg.do || ''),
          dontExample: String(tg.dontExample || tg.dont || ''),
          sourceDoc: fileName,
          pageNumber: Number(tg.pageNumber) || 1
        }));
      }

      if (
        result.trustedFacts.length > 0 ||
        result.prohibitedTerms.length > 0 ||
        result.approvedTerms.length > 0 ||
        result.toneGuidelines.length > 0
      ) {
        return result;
      }
    } catch {
      // Not JSON, continue to line parsing
    }
  }

  // Iterate through pages and lines preserving pageNumber
  pages.forEach(page => {
    const lines = page.text
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0);

    let currentSection: 'meta_skip' | 'profile' | 'voice' | 'prohibited' | 'approved' | 'facts' | null = null;
    let activeProhibitedTerm: ParsedRules['prohibitedTerms'][0] | null = null;
    let activeToneGuideline: ParsedRules['toneGuidelines'][0] | null = null;
    let pendingFactTopic: string | null = null;

    lines.forEach((line, index) => {
      if (line.length < 2) return;
      const lower = line.toLowerCase();

      // Divider lines
      if (/^[=\-_*~]{3,}$/.test(line)) return;

      // Standalone Section Titles (ensure lines with quotes are not treated as section headers)
      const isSectionTitle = (pattern: RegExp) => {
        if (line.includes('"') || line.includes('“')) return false;
        return pattern.test(line);
      };

      if (isSectionTitle(/^(?:#+\s*)?(?:\d+[\.\)]\s*)?(?:document\s+(?:status|purpose)|how\s+to\s+interpret|important\s+status|test\s+marketing\s+draft|sample\s+draft|expected\s+test\s+results|manager\s+approval|review\s+and\s+correction\s+policy|content\s+review\s+policy)[\s:]*$/i)) {
        currentSection = 'meta_skip';
        activeProhibitedTerm = null;
        activeToneGuideline = null;
        return;
      }
      if (isSectionTitle(/^(?:#+\s*)?(?:\d+[\.\)]\s*)?brand\s+profile[\s:]*$/i)) {
        currentSection = 'profile';
        activeProhibitedTerm = null;
        activeToneGuideline = null;
        return;
      }
      if (isSectionTitle(/^(?:#+\s*)?(?:\d+[\.\)]\s*)?(?:brand\s+voice|voice\s*&?\s*tone|tone\s*guidelines|voice\s*rules|tone\s*pillars)[\s:]*$/i)) {
        currentSection = 'voice';
        activeProhibitedTerm = null;
        activeToneGuideline = null;
        return;
      }
      if (isSectionTitle(/^(?:#+\s*)?(?:\d+[\.\)]\s*)?(?:prohibited|banned)\s*(?:phrases|terms|claims|words|and\s+claims)?(?:\s+with\s+approved\s+alternatives)?[\s:]*$/i)) {
        currentSection = 'prohibited';
        activeProhibitedTerm = null;
        activeToneGuideline = null;
        return;
      }
      if (isSectionTitle(/^(?:#+\s*)?(?:\d+[\.\)]\s*)?(?:approved|preferred)\s*(?:general\s*)?(?:terminology|terms|vocabulary|wording)[\s:]*$/i)) {
        currentSection = 'approved';
        activeProhibitedTerm = null;
        activeToneGuideline = null;
        return;
      }
      if (isSectionTitle(/^(?:#+\s*)?(?:\d+[\.\)]\s*)?(?:trusted\s*)?(?:facts|specifications|standards|clinical\s*benchmarks|evidence)[\s:]*$/i)) {
        currentSection = 'facts';
        activeProhibitedTerm = null;
        activeToneGuideline = null;
        return;
      }

      // If we are currently inside an informational/meta section (e.g. how to interpret), skip
      if (currentSection === 'meta_skip') {
        return;
      }

      // Check for RULE headers (e.g. RULE BV-001, RULE NS-001, RULE PC-01)
      const ruleHeaderMatch = line.match(/^RULE\s+([A-Z0-9_-]+)(?:\s*[:—–-]\s*(.+))?$/i);
      if (ruleHeaderMatch) {
        activeProhibitedTerm = null;
        activeToneGuideline = null;

        // Brand Voice rule (e.g. RULE BV-001 — Plain language)
        if (/^RULE\s+BV-[0-9]+/i.test(line)) {
          const attribute = ruleHeaderMatch[2]?.trim() || line.replace(/^RULE\s+BV-[0-9]+[:\s—–-]*/i, '').trim() || 'Brand Voice';
          activeToneGuideline = {
            attribute,
            description: '',
            doExample: 'Clear and grounded statements.',
            dontExample: 'Sensational claims.',
            sourceDoc: fileName,
            pageNumber: page.pageNumber
          };
          result.toneGuidelines.push(activeToneGuideline);
          return;
        }

        // Review policy rule (skip from term extraction)
        if (/^RULE\s+RV-[0-9]+/i.test(line)) {
          return;
        }
      }

      // Tone guideline description continuation
      if (activeToneGuideline && activeToneGuideline.description === '' && !isHeadingOrSectionOrRuleId(line) && !line.includes(':')) {
        activeToneGuideline.description = line;
        return;
      }

      // Structured Prohibited Rule field: Prohibited phrase: "..."
      const prohibitedFieldMatch = line.match(/^(?:[-*•]\s*)?prohibited\s*(?:phrase|term)[:\s-]\s*(.+)$/i);
      if (prohibitedFieldMatch) {
        const quoted = extractQuotedPhrases(prohibitedFieldMatch[1]);
        const candidate = quoted[0] || prohibitedFieldMatch[1].replace(/['"“”]/g, '').trim();
        if (isValidTerm(candidate)) {
          const existing = result.prohibitedTerms.find(t => t.term.toLowerCase() === candidate.toLowerCase());
          if (!existing) {
            activeProhibitedTerm = {
              id: `term-ext-${Date.now()}-${page.pageNumber}-${index}`,
              term: candidate,
              reason: '',
              suggestedAlternative: '',
              severity: 'medium',
              sourceDoc: fileName,
              pageNumber: page.pageNumber
            };
            result.prohibitedTerms.push(activeProhibitedTerm);
          } else {
            activeProhibitedTerm = existing;
          }
          return;
        }
      }

      // Reason continuation for structured prohibited rule
      const reasonMatch = line.match(/^(?:[-*•]\s*)?(?:reason|rationale|policy\s*reason)[:\s-]\s*(.+)$/i);
      if (reasonMatch) {
        const target = activeProhibitedTerm || (result.prohibitedTerms[result.prohibitedTerms.length - 1]?.pageNumber === page.pageNumber ? result.prohibitedTerms[result.prohibitedTerms.length - 1] : null);
        if (target) {
          target.reason = reasonMatch[1].trim();
          return;
        }
      }

      // Alternative continuation (approved alternative, suggested alternative, alternative, use instead)
      const altMatch = line.match(/^(?:[-*•]\s*)?(?:approved\s*alternative|suggested\s*alternative|preferred\s*alternative|alternative|use\s*instead)[:\s-]\s*(.+)$/i);
      if (altMatch) {
        const target = activeProhibitedTerm || (result.prohibitedTerms[result.prohibitedTerms.length - 1]?.pageNumber === page.pageNumber ? result.prohibitedTerms[result.prohibitedTerms.length - 1] : null);
        if (target) {
          const quoted = extractQuotedPhrases(altMatch[1]);
          const alt = quoted[0] || altMatch[1].replace(/['"“”]/g, '').trim();
          if (alt && alt.toLowerCase() !== target.term.toLowerCase() && !/(?:approved\s*alternative|alternative|none|n\/a)$/i.test(alt)) {
            target.suggestedAlternative = alt;
          }
          return;
        }
      }

      // Usage condition continuation
      const usageMatch = line.match(/^(?:[-*•]\s*)?usage\s*condition[:\s-]\s*(.+)$/i);
      if (usageMatch) {
        const target = activeProhibitedTerm || (result.prohibitedTerms[result.prohibitedTerms.length - 1]?.pageNumber === page.pageNumber ? result.prohibitedTerms[result.prohibitedTerms.length - 1] : null);
        if (target) {
          target.reason = target.reason
            ? `${target.reason} (Usage: ${usageMatch[1].trim()})`
            : `Usage: ${usageMatch[1].trim()}`;
          return;
        }
      }

      // Do / Don't continuation for tone guidelines
      if (/^do[:\s-]\s*(.+)$/i.test(line)) {
        const doMatch = line.match(/^do[:\s-]\s*(.+)$/i);
        const lastTone = activeToneGuideline || (result.toneGuidelines[result.toneGuidelines.length - 1]?.pageNumber === page.pageNumber ? result.toneGuidelines[result.toneGuidelines.length - 1] : null);
        if (lastTone && doMatch?.[1]) {
          lastTone.doExample = doMatch[1].replace(/['"“”]/g, '').trim();
          return;
        }
      }
      if (/^don'?t[:\s-]\s*(.+)$/i.test(line)) {
        const dontMatch = line.match(/^don'?t[:\s-]\s*(.+)$/i);
        const lastTone = activeToneGuideline || (result.toneGuidelines[result.toneGuidelines.length - 1]?.pageNumber === page.pageNumber ? result.toneGuidelines[result.toneGuidelines.length - 1] : null);
        if (lastTone && dontMatch?.[1]) {
          lastTone.dontExample = dontMatch[1].replace(/['"“”]/g, '').trim();
          return;
        }
      }

      // YAML Key-Value: "- term: ..." or "- topic: ..."
      if (/^[-*•]?\s*term:\s*(.+)$/i.test(line)) {
        const termMatch = line.match(/^[-*•]?\s*term:\s*(.+)$/i);
        const rawTerm = termMatch?.[1]?.replace(/['"“”]/g, '').trim();
        if (rawTerm && isValidTerm(rawTerm)) {
          const item = {
            id: `term-ext-${Date.now()}-${page.pageNumber}-${index}`,
            term: rawTerm,
            reason: `Prohibited in ${fileName}`,
            suggestedAlternative: '',
            severity: 'medium' as const,
            sourceDoc: fileName,
            pageNumber: page.pageNumber
          };
          result.prohibitedTerms.push(item);
          activeProhibitedTerm = item;
          return;
        }
      }
      if (/^[-*•]?\s*topic:\s*(.+)$/i.test(line)) {
        const topicMatch = line.match(/^[-*•]?\s*topic:\s*(.+)$/i);
        pendingFactTopic = topicMatch?.[1]?.replace(/['"“”]/g, '').trim() || null;
        return;
      }
      if (/^(?:claim|claimorstat|fact):\s*(.+)$/i.test(line)) {
        const claimMatch = line.match(/^(?:claim|claimorstat|fact):\s*(.+)$/i);
        const claim = claimMatch?.[1]?.trim();
        if (claim) {
          result.trustedFacts.push({
            id: `fact-ext-${Date.now()}-${page.pageNumber}-${index}`,
            topic: pendingFactTopic || claim.slice(0, 32).trim() + '...',
            claimOrStat: claim,
            source: `${fileName} (Page ${page.pageNumber})`,
            verifiedDate: new Date().toISOString().split('T')[0],
            sourceDoc: fileName,
            pageNumber: page.pageNumber
          });
          pendingFactTopic = null;
          return;
        }
      }

      // Approved Terminology lines (e.g. Approved term AT-001: "daily skincare routine")
      const apprTermMatch = line.match(/^(?:[-*•]\s*)?(?:approved|preferred)\s*term(?:\s+[a-z0-9_-]+)?[:\s-]\s*(.+)$/i);
      if (apprTermMatch) {
        const quoted = extractQuotedPhrases(apprTermMatch[1]);
        const term = quoted[0] || apprTermMatch[1].split(/[-—–:]/)[0].replace(/['"“”]/g, '').trim();
        if (term && isValidTerm(term)) {
          const usage = apprTermMatch[1].includes('—') || apprTermMatch[1].includes('-')
            ? apprTermMatch[1].split(/[-—–]/).slice(1).join('—').trim()
            : line;
          result.approvedTerms.push({
            id: `appr-ext-${Date.now()}-${page.pageNumber}-${index}`,
            term,
            preferredUsage: usage,
            category: 'Vocabulary',
            sourceDoc: fileName,
            pageNumber: page.pageNumber
          });
          return;
        }
      }

      // Skip headings, standalone rule IDs, table headers/separators, or meta instructions
      if (isHeadingOrSectionOrRuleId(line) || isMetaInstructionSentence(line)) {
        return;
      }

      // 1. Tone & Voice Guidelines
      if (
        lower.startsWith('tone:') ||
        lower.startsWith('voice:') ||
        lower.includes('voice pillar') ||
        lower.includes('tone pillar') ||
        lower.includes('voice attribute') ||
        lower.includes('tone attribute') ||
        lower.includes('tone guideline') ||
        lower.includes('brand voice:')
      ) {
        const cleanLine = line.replace(/^(?:[-*•]\s*)?(?:voice\s*pillar|tone\s*pillar|voice\s*attribute|tone\s*attribute|tone\s*guideline|brand\s*voice|voice|tone)[:\s-]*/i, '').trim();
        const attribute = cleanLine.split(/[-:–]/)[0]?.trim() || 'Tone Pillar';
        
        let doExample = 'Clear and grounded statements.';
        let dontExample = 'Sensational claims.';
        const doMatch = cleanLine.match(/do[:\s]+([^.]+)/i);
        const dontMatch = cleanLine.match(/don'?t[:\s]+([^.]+)/i);
        if (doMatch?.[1]) doExample = doMatch[1].trim();
        if (dontMatch?.[1]) dontExample = dontMatch[1].trim();

        const toneItem = {
          attribute,
          description: cleanLine,
          doExample,
          dontExample,
          sourceDoc: fileName,
          pageNumber: page.pageNumber
        };
        result.toneGuidelines.push(toneItem);
        activeToneGuideline = toneItem;
        return;
      }

      // 2. Approved Terms (General line-based)
      if (
        lower.includes('approved term') ||
        lower.includes('preferred term') ||
        lower.includes('preferred usage') ||
        lower.includes('recommended term') ||
        lower.includes('approved phrasing') ||
        lower.includes('approved vocabulary')
      ) {
        const quoted = extractQuotedPhrases(line);
        let term = quoted[0];
        if (!term) {
          const stripped = line.replace(/^(?:[-*•]\s*)?(?:approved\s*(?:term|phrasing|vocabulary)?|preferred\s*(?:term|usage)?|recommended\s*term)[:\s-]*/i, '').trim();
          term = stripped.split(/[-:–|]/)[0]?.trim() || stripped;
        }
        if (term && isValidTerm(term) && term.length <= 60) {
          result.approvedTerms.push({
            id: `appr-ext-${Date.now()}-${page.pageNumber}-${index}`,
            term: term.trim(),
            preferredUsage: line,
            category: 'Vocabulary',
            sourceDoc: fileName,
            pageNumber: page.pageNumber
          });
          return;
        }
      }

      // Prohibited indicator check
      const hasProhibitedIndicator =
        lower.includes('prohibited') ||
        lower.includes('avoid') ||
        lower.includes('do not use') ||
        lower.includes("don't use") ||
        lower.includes('never say') ||
        lower.includes('never use') ||
        lower.includes('banned') ||
        lower.includes('disallowed') ||
        lower.includes('forbidden') ||
        currentSection === 'prohibited';

      // 3. Trusted Facts
      const hasFactLabel = /^(?:[-*•]\s*)?(?:official\s*specification|specification|trusted\s*fact|fact|clinical\s*study|clinical\s*trial|benchmark)[:\s-]/i.test(line);
      const hasMetricsAndStandards = 
        /\d+%\s*(?:recycled|post-consumer|organic|reduction|plastic|efficiency|improvement|participants|subjects|decrease|increase|pure|biodegradable)/i.test(line) ||
        (/\b(?:certified|certification|standard|iec|iso|grs|fsc|usda|fda|clinical|double-blind|benchmark|battery life|hours|depth|meters|tested)\b/i.test(line) && /\d+/.test(line));

      if (hasFactLabel || (hasMetricsAndStandards && !hasProhibitedIndicator && currentSection !== 'prohibited')) {
        const cleanClaim = line.replace(/^[-*•]\s*/, '').trim();
        let topic = 'General';
        if (hasFactLabel) {
          const label = line.match(/^(?:[-*•]\s*)?([a-zA-Z\s]+)[:\s-]/)?.[1]?.trim();
          if (label) topic = label;
        }
        if (topic === 'General') {
          topic = cleanClaim.slice(0, 32).trim() + '...';
        }

        result.trustedFacts.push({
          id: `fact-ext-${Date.now()}-${page.pageNumber}-${index}`,
          topic,
          claimOrStat: cleanClaim,
          source: `${fileName} (Page ${page.pageNumber})`,
          verifiedDate: new Date().toISOString().split('T')[0],
          sourceDoc: fileName,
          pageNumber: page.pageNumber
        });
        return;
      }

      // 4. Prohibited Terms (Line-based)
      if (hasProhibitedIndicator) {
        const quoted = extractQuotedPhrases(line);

        if (quoted.length > 0) {
          // The first quoted phrase is the prohibited term
          const term = quoted[0].trim();
          if (isValidTerm(term)) {
            const alternative = extractAlternativeFromLine(line, term, quoted);
            const severity: 'high' | 'medium' | 'low' =
              /critical|strict|zero\s*tolerance|severe|fda|regulatory|legal/i.test(lower) ? 'high' : 'medium';

            // Avoid duplicate additions on the same page
            const existing = result.prohibitedTerms.find(t => t.term.toLowerCase() === term.toLowerCase());
            if (!existing) {
              const item = {
                id: `term-ext-${Date.now()}-${page.pageNumber}-${index}`,
                term,
                reason: line,
                suggestedAlternative: alternative,
                severity,
                sourceDoc: fileName,
                pageNumber: page.pageNumber
              };
              result.prohibitedTerms.push(item);
              activeProhibitedTerm = item;
            } else if (alternative && !existing.suggestedAlternative) {
              existing.suggestedAlternative = alternative;
            }
            return;
          }
        }

        // Unquoted key-value line (e.g. "Prohibited Term: miracle cure", "Avoid: flawless skin")
        const labelMatch = line.match(/^(?:[-*•]\s*)?(?:rule\s*[a-z0-9_-]+[:\s-]*)?(?:prohibited\s*(?:phrase|term|claim|word)?|banned\s*(?:phrase|term|claim|word)?|avoid|do\s*not\s*use|never\s*(?:say|use))\s*[:=–—\->]\s*(.+)$/i);
        if (labelMatch?.[1]) {
          const rawCandidate = labelMatch[1].trim();
          // Split candidate from potential inline alternative or reason
          const parts = rawCandidate.split(/\s*(?:->|—|\||\buse\s+(?:instead|as)\b)\s*/i);
          const term = parts[0]?.replace(/['"“”]/g, '').trim();

          if (term && isValidTerm(term) && !isMetaInstructionSentence(term)) {
            let alternative = '';
            if (parts[1]) {
              alternative = parts[1].replace(/['"“”]/g, '').replace(/^(?:use\s*instead|instead|alternative)[:\s-]*/i, '').trim();
            } else {
              alternative = extractAlternativeFromLine(line, term, []);
            }

            const severity: 'high' | 'medium' | 'low' =
              /critical|strict|zero\s*tolerance|severe|fda|regulatory|legal/i.test(lower) ? 'high' : 'medium';

            const existing = result.prohibitedTerms.find(t => t.term.toLowerCase() === term.toLowerCase());
            if (!existing) {
              const item = {
                id: `term-ext-${Date.now()}-${page.pageNumber}-${index}`,
                term,
                reason: line,
                suggestedAlternative: alternative,
                severity,
                sourceDoc: fileName,
                pageNumber: page.pageNumber
              };
              result.prohibitedTerms.push(item);
              activeProhibitedTerm = item;
            } else if (alternative && !existing.suggestedAlternative) {
              existing.suggestedAlternative = alternative;
            }
            return;
          }
        }
      }
    });
  });

  return result;
}

