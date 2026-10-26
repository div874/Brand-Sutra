import { POST } from '../src/app/api/parse-rules/route.ts';

console.log('================================================================');
console.log('PHASE 4: VERIFY RULE INGESTION & DOCUMENT PARSING');
console.log('================================================================\n');

function assert(cond, name, details = '') {
  if (cond) {
    console.log(`[PASS] ${name}`);
    if (details) console.log(`       ${details}`);
  } else {
    console.error(`[FAIL] ${name}`);
    if (details) console.error(`       ${details}`);
    process.exit(1);
  }
}

async function run() {
  // 1. Pasted Text
  console.log('--- TEST 1: PASTED TEXT (PLAIN TEXT) ---');
  const plainText = `
Brand Rule: Do not use "breakthrough innovation", use "tested advancement" instead.
Specification: Housing is certified 80% recycled aluminum under ISO 14021.
Voice Pillar: Direct & Clear - Avoid corporate buzzwords.
  `.trim();

  const req1 = {
    formData: async () => { throw new Error('Not form data'); },
    json: async () => ({ text: plainText, format: 'text' })
  };
  const res1 = await POST(req1);
  const data1 = await res1.json();

  assert(data1.success, 'Pasted plain text parsed successfully');
  assert(data1.extracted.prohibitedTerms.length >= 1, 'Extracted prohibited term from plain text', `Found: "${data1.extracted.prohibitedTerms[0]?.term}"`);
  assert(data1.extracted.trustedFacts.length >= 1, 'Extracted trusted fact from plain text', `Found fact: "${data1.extracted.trustedFacts[0]?.claimOrStat}"`);
  assert(data1.extracted.toneGuidelines.length >= 1, 'Extracted tone guideline from plain text', `Found tone: "${data1.extracted.toneGuidelines[0]?.attribute}"`);

  // 2. Structured JSON
  console.log('\n--- TEST 2: STRUCTURED JSON ---');
  const jsonInput = JSON.stringify({
    prohibitedTerms: [{ term: 'all-natural', reason: 'Unverified marketing claim', suggestedAlternative: 'organically derived' }],
    trustedFacts: [{ topic: 'Packaging', claimOrStat: '100% biodegradable corrugated cardboard', source: 'PackAudit 2025' }]
  });
  const req2 = {
    formData: async () => { throw new Error('Not form data'); },
    json: async () => ({ text: jsonInput, format: 'json' })
  };
  const res2 = await POST(req2);
  const data2 = await res2.json();

  assert(data2.success, 'JSON rules parsed successfully');
  assert(data2.extracted.prohibitedTerms.length === 1 && data2.extracted.prohibitedTerms[0].term === 'all-natural', 'JSON prohibited term parsed cleanly');
  assert(data2.extracted.trustedFacts.length === 1 && data2.extracted.trustedFacts[0].topic === 'Packaging', 'JSON trusted fact parsed cleanly');

  // 3. Structured YAML / Key-Value Text
  console.log('\n--- TEST 3: YAML / KEY-VALUE TEXT ---');
  const yamlInput = `
prohibited:
  - term: zero emissions
    reason: Unsubstantiated net-zero claim
    suggestedAlternative: reduced operational carbon
facts:
  - topic: Carbon Offset
    claim: 40% reduction in scope 1 emissions verified by CarbonTrust
    source: CarbonTrust 2025 Audit
  `.trim();
  const req3 = {
    formData: async () => { throw new Error('Not form data'); },
    json: async () => ({ text: yamlInput, format: 'text' })
  };
  const res3 = await POST(req3);
  const data3 = await res3.json();

  assert(data3.success, 'YAML/Key-Value text parsed successfully');
  assert(data3.extracted.prohibitedTerms.length >= 1 || data3.extracted.trustedFacts.length >= 1, 'Extracted terms or facts from YAML/Key-Value format');

  // 4. Invalid or Empty Input
  console.log('\n--- TEST 4: INVALID OR EMPTY INPUT ---');
  const req4Empty = {
    formData: async () => { throw new Error('Not form data'); },
    json: async () => ({ text: '', format: 'text' })
  };
  const res4Empty = await POST(req4Empty);
  const data4Empty = await res4Empty.json();

  assert(res4Empty.status === 400 && data4Empty.success === false, 'Empty text returns HTTP 400 with helpful error message', `Error: "${data4Empty.error}"`);

  const req4Whitespace = {
    formData: async () => { throw new Error('Not form data'); },
    json: async () => ({ text: '   \n\t   ', format: 'text' })
  };
  const res4Whitespace = await POST(req4Whitespace);
  const data4Whitespace = await res4Whitespace.json();

  assert(res4Whitespace.status === 400 && data4Whitespace.success === false, 'Whitespace-only text returns HTTP 400 with helpful error message');

  // 5. Scanned / Empty PDF (OCR required detection)
  console.log('\n--- TEST 5: PDF / BINARY HANDLING & OCR DETECTION ---');
  const emptyPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
  const formData = new FormData();
  formData.append('file', new Blob([emptyPdfBuffer], { type: 'application/pdf' }), 'scanned_report.pdf');

  const req5 = {
    headers: { get: (header) => header.toLowerCase() === 'content-type' ? 'multipart/form-data' : null },
    formData: async () => formData,
    json: async () => { throw new Error('Not JSON'); }
  };
  const res5 = await POST(req5);
  const data5 = await res5.json();

  assert(res5.status === 422 && data5.ocrRequired === true, 'Scanned PDF with no selectable text flagged with ocrRequired: true', `Message: "${data5.error}"`);

  // 6. Preview & Deduplication Behavior
  console.log('\n--- TEST 6: PREVIEW & NO ACCIDENTAL UNSUPPORTED FACT CREATION ---');
  const unformattedText = 'The quick brown fox jumps over the lazy dog. Just some random prose with no brand rules or technical specs.';
  const req6 = {
    formData: async () => { throw new Error('Not form data'); },
    json: async () => ({ text: unformattedText, format: 'text' })
  };
  const res6 = await POST(req6);
  const data6 = await res6.json();

  assert(data6.success === true, 'Parsed without throwing error');
  assert(data6.extracted.trustedFacts.length === 0, 'No accidental fake trusted facts created when text contains no facts', `Found ${data6.extracted.trustedFacts.length} facts`);
  assert(data6.extracted.prohibitedTerms.length === 0, 'No accidental prohibited terms created when text contains no rules', `Found ${data6.extracted.prohibitedTerms.length} terms`);

  console.log('\n================================================================');
  console.log('PHASE 4 COMPLETE: ALL INGESTION TESTS PASSED!');
  console.log('================================================================');
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
