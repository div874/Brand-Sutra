console.log('=== MULTI-FORMAT RULE INGESTION TEST ===\n');

async function testIngestion() {
  // Test 1: Structured JSON input
  console.log('Test 1: Testing Structured JSON parsing...');
  const jsonPayload = {
    trustedFacts: [
      {
        topic: 'Packaging Compliance',
        claimOrStat: 'All packaging is 100% plastic-free, made from FSC-certified recycled kraft paper.',
        source: 'Supply Chain Audit Q1 2025'
      }
    ],
    prohibitedTerms: [
      {
        term: 'greenest ever',
        reason: 'Unsubstantiated superlative environmental claim.',
        suggestedAlternative: 'thoughtfully designed with low-impact materials'
      }
    ],
    approvedTerms: [
      {
        term: 'Closed-Loop Lifecycle',
        preferredUsage: 'Use when describing our refurbishment program.'
      }
    ]
  };

  const res1 = await fetch('http://localhost:3000/api/parse-rules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: JSON.stringify(jsonPayload),
      format: 'json'
    })
  });

  const data1 = await res1.json();
  if (
    data1.success &&
    data1.extracted.trustedFacts.length === 1 &&
    data1.extracted.prohibitedTerms.length === 1 &&
    data1.extracted.approvedTerms.length === 1
  ) {
    console.log('  PASSED: JSON structure correctly parsed into facts, terms, and guidelines.');
  } else {
    console.error('  FAILED: JSON structure parsing failed.', data1);
    process.exit(1);
  }

  // Test 2: Unstructured Text / Brand Policy lines
  console.log('\nTest 2: Testing Unstructured Text parsing (TXT / Markdown excerpt)...');
  const textExcerpt = [
    'BRAND SUTRA POLICY GUIDELINE 2026',
    'Official Specification: Outer housing is crafted with 80% recycled plastic certified under GRS-2025 standard.',
    'Prohibited term: Do not use "miracle gadget", use "precision tool" instead.',
    'Approved Term: "Modular Core Architecture" preferred for hardware documentation.',
    'Voice attribute: Direct & Honest - Speak plainly without artificial hype.'
  ].join('\n');

  const res2 = await fetch('http://localhost:3000/api/parse-rules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: textExcerpt,
      format: 'text'
    })
  });

  const data2 = await res2.json();
  if (
    data2.success &&
    data2.extracted.trustedFacts.length >= 1 &&
    data2.extracted.prohibitedTerms.length >= 1 &&
    data2.extracted.approvedTerms.length >= 1 &&
    data2.extracted.toneGuidelines.length >= 1
  ) {
    console.log('  PASSED: Unstructured text accurately extracted into distinct rule categories.');
    console.log(`    - Facts found: ${data2.extracted.trustedFacts.length}`);
    console.log(`    - Prohibited terms: ${data2.extracted.prohibitedTerms.length}`);
    console.log(`    - Approved terms: ${data2.extracted.approvedTerms.length}`);
    console.log(`    - Tone pillars: ${data2.extracted.toneGuidelines.length}`);
  } else {
    console.error('  FAILED: Unstructured text extraction failed.', data2);
    process.exit(1);
  }

  // Test 3: Multipart Form Data File Upload Simulation (TXT/JSON file)
  console.log('\nTest 3: Testing File Upload (Multipart FormData)...');
  const formData = new FormData();
  const fileBlob = new Blob([JSON.stringify(jsonPayload)], { type: 'application/json' });
  formData.append('file', fileBlob, 'brand_guidelines.json');

  const res3 = await fetch('http://localhost:3000/api/parse-rules', {
    method: 'POST',
    body: formData
  });

  const data3 = await res3.json();
  if (data3.success && data3.fileName === 'brand_guidelines.json' && data3.extracted.trustedFacts.length === 1) {
    console.log('  PASSED: Multipart file upload parsed with full integrity.');
  } else {
    console.error('  FAILED: Multipart file upload failed.', data3);
    process.exit(1);
  }

  console.log('\n========================================');
  console.log('ALL MULTI-FORMAT INGESTION TESTS PASSED ✓');
  console.log('========================================');
}

testIngestion().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
