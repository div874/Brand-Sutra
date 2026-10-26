import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';

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
    const contentType = req.headers.get('content-type') || '';
    let rawText = '';
    let fileName = 'pasted-guideline.txt';
    let fileType = 'text';
    let pages: PdfPage[] = [];

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
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
      return NextResponse.json({ error: 'Extracted content is empty' }, { status: 400 });
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
          suggestedAlternative: String(t.suggestedAlternative || t.alternative || t.useInstead || 'alternative'),
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
      .filter(l => l.length > 5);

    lines.forEach((line, index) => {
      const lower = line.toLowerCase();

      // Prohibited terms
      if (
        lower.includes('prohibited') ||
        lower.includes('avoid') ||
        lower.includes('do not use') ||
        lower.includes("don't use") ||
        lower.includes('never say') ||
        lower.includes('banned')
      ) {
        const quoted = line.match(/['"“]([^'"”]+)['"”]/g)?.map(s => s.replace(/['"“”]/g, '')) || [];
        const term = quoted[0] || line.split(/avoid|prohibited|do not use|never say/i)[1]?.trim().split(/[.,;:]/)[0] || 'prohibited term';
        const alternative = quoted[1] || line.split(/use instead|use|alternative/i)[1]?.trim().split(/[.,;:]/)[0] || 'approved alternative';

        result.prohibitedTerms.push({
          id: `term-ext-${Date.now()}-${page.pageNumber}-${index}`,
          term: term.trim(),
          reason: line,
          suggestedAlternative: alternative.trim(),
          severity: lower.includes('critical') || lower.includes('strict') ? 'high' : 'medium',
          sourceDoc: fileName,
          pageNumber: page.pageNumber
        });
        return;
      }

      // Approved terms
      if (
        lower.includes('approved term') ||
        lower.includes('preferred term') ||
        lower.includes('preferred usage') ||
        lower.includes('recommended term')
      ) {
        const quoted = line.match(/['"“]([^'"”]+)['"”]/g)?.map(s => s.replace(/['"“”]/g, '')) || [];
        const term = quoted[0] || line.split(':')[1]?.trim() || line;
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

      // Facts
      if (
        /\d+%\s*(recycled|post-consumer|organic|reduction|plastic|efficiency)/i.test(line) ||
        (/certified|certification|standard|iec|iso|grs|guarantee|battery life|hours|tested/i.test(line) && /\d+/.test(line))
      ) {
        result.trustedFacts.push({
          id: `fact-ext-${Date.now()}-${page.pageNumber}-${index}`,
          topic: line.slice(0, 32).trim() + '...',
          claimOrStat: line,
          source: `${fileName} (Page ${page.pageNumber})`,
          verifiedDate: new Date().toISOString().split('T')[0],
          sourceDoc: fileName,
          pageNumber: page.pageNumber
        });
        return;
      }

      // Tone
      if (
        lower.startsWith('tone:') ||
        lower.startsWith('voice:') ||
        lower.includes('voice pillar') ||
        lower.includes('tone pillar') ||
        lower.includes('voice attribute')
      ) {
        const cleanLine = line.replace(/^(tone|voice|pillar|attribute)[:\s-]*/i, '');
        result.toneGuidelines.push({
          attribute: cleanLine.split(/[-:–]/)[0]?.trim() || 'Imported Tone Guideline',
          description: cleanLine,
          doExample: 'Clear and grounded statements.',
          dontExample: 'Sensational claims.',
          sourceDoc: fileName,
          pageNumber: page.pageNumber
        });
      }
    });
  });

  // If no items were detected, create a fallback fact with page context
  if (
    result.trustedFacts.length === 0 &&
    result.prohibitedTerms.length === 0 &&
    result.approvedTerms.length === 0 &&
    result.toneGuidelines.length === 0
  ) {
    result.trustedFacts.push({
      id: `fact-ext-${Date.now()}-general`,
      topic: 'General Guideline',
      claimOrStat: pages[0]?.text.slice(0, 280) || 'Extracted document content',
      source: `${fileName} (Page 1)`,
      verifiedDate: new Date().toISOString().split('T')[0],
      sourceDoc: fileName,
      pageNumber: 1
    });
  }

  return result;
}
