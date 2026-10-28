import { POST } from '../src/app/api/parse-rules/route.ts';

console.log('================================================================');
console.log('REGRESSION TEST: NUVIA SKIN GUIDELINE EXTRACTION');
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
  const nuviaSkinDocument = `
# NUVIA SKIN BRAND & REGULATORY GUIDELINES
Document ID: NUV-GDL-2026-v3
Audience: Copywriters, Regulatory Reviewers, Marketing Leads

## 1. BRAND VOICE & TONE GUIDELINES
Voice Pillar: Dermatological Authority - Grounded, scientific, and empathetic. Avoid sensationalism.
Tone Attribute: Clinically Transparent
Description: State exact active ingredient concentrations and verified clinical metrics.
Do: Formulated with 5% niacinamide and 2% hyaluronic acid.
Don't: A magical elixir that erases all your skin flaws overnight.

## 2. PROHIBITED TERMS AND CLAIMS
This section outlines prohibited marketing claims that must be avoided in all drafts.
Claims that remain in the draft will trigger audit rejection.
Phrases that appear in the draft must comply with FDA cosmetic regulations to avoid misbranding penalties.

RULE PC-01: Prohibited Marketing Claims
- Never say "the world's best skincare" because absolute superlatives cannot be clinically substantiated.
- Do not use "miracle cure", use "targeted treatment" instead.
- Prohibited Phrase: "permanent wrinkle removal"
  Reason: Cosmetic products cannot claim permanent structural alteration.
  Alternative: "visibly smooths the appearance of fine lines"
- Banned Term: "100% organic" -> use "crafted with certified organic botanicals" instead.
- Avoid: "instant face lift"
  Reason: Comparison to surgical medical procedures is prohibited.
- Do not use this phrase as a product claim without clinical evidence.

RULE PC-02: Medical & Disease Claims
- Prohibited: "treats acne"
  Alternative: "helps clarify blemish-prone skin"
- Do not use "erases scars"
- Never say "cure eczema"
  Alternative: "soothes dry, sensitive skin"

## 3. APPROVED TERMINOLOGY
Approved Term: "Bio-Renewal Complex"
Preferred Usage: Permitted for the proprietary fermented peptide blend.
Approved Term: "dermatologist-tested"
Preferred Usage: Permitted for all formulas tested under clinical Protocol NUV-2025.

## 4. TRUSTED FACTS & CLINICAL BENCHMARKS
Official Specification: Outer packaging is 100% post-consumer recycled paperboard certified under FSC standards.
Clinical Benchmark: Clinical study protocol NUV-2025-01 demonstrated 94% improvement in skin hydration over 14 days under ISO 17025 certification.
`.trim();

  const req = {
    formData: async () => { throw new Error('Not form data'); },
    json: async () => ({
      text: nuviaSkinDocument,
      fileName: 'Nuvia_Skin_Brand_Guidelines_2026.pdf',
      format: 'text'
    })
  };

  const res = await POST(req);
  const data = await res.json();

  assert(data.success === true, 'Parsed Nuvia Skin document successfully');
  const prohibited = data.extracted.prohibitedTerms;
  const approved = data.extracted.approvedTerms;
  const tone = data.extracted.toneGuidelines;
  const facts = data.extracted.trustedFacts;

  console.log(`\nExtracted summary:`);
  console.log(`  - Prohibited terms: ${prohibited.length}`);
  console.log(`  - Approved terms:   ${approved.length}`);
  console.log(`  - Tone guidelines:  ${tone.length}`);
  console.log(`  - Trusted facts:    ${facts.length}`);

  const extractedTermNames = prohibited.map(t => t.term.toLowerCase());
  console.log('\nExtracted Prohibited Terms:');
  prohibited.forEach((t, i) => {
    console.log(`  ${i + 1}. "${t.term}" (Alternative: "${t.suggestedAlternative || '[None]'}")`);
  });

  // Problem 1 & 2: Verify NO invalid extractions exist
  console.log('\n--- VERIFYING JUNK FILTERING & NO FALSE POSITIVES ---');
  
  assert(
    !extractedTermNames.some(t => t === 'marketing claims' || t.includes('marketing claims')),
    'Does not extract "marketing claims" heading/label as a prohibited term'
  );

  assert(
    !extractedTermNames.some(t => t === 'terms and claims' || t.includes('terms and claims')),
    'Does not extract "TERMS AND CLAIMS" heading as a prohibited term'
  );

  assert(
    !extractedTermNames.some(t => t.includes('rule pc-01') || t.includes('rule pc-02')),
    'Does not classify "RULE PC-01" or other rule IDs as banned terms'
  );

  assert(
    !extractedTermNames.some(t => t.includes('this phrase as a product claim') || t.includes('this phrase')),
    'Does not classify "this phrase as a product claim without..." instruction as banned term'
  );

  assert(
    !extractedTermNames.some(t => t.includes('claims that remain in the draft') || t.includes('claims that')),
    'Does not classify "claims that remain in the draft" instruction as banned term'
  );

  assert(
    !extractedTermNames.some(t => t.includes('phrases that appear in the draft') || t.includes('phrases that')),
    'Does not classify "phrases that appear in the draft" instruction as banned term'
  );

  assert(
    !extractedTermNames.some(t => t === 'the world'),
    'Does NOT truncate "the world\'s best skincare" to "the world"'
  );

  // Problem 1: Exact prohibited phrases preserving full wording and context
  console.log('\n--- VERIFYING EXACT PROHIBITED PHRASES ---');
  const worldBest = prohibited.find(t => t.term.toLowerCase() === "the world's best skincare");
  assert(
    !!worldBest,
    'Extracts exact phrase "the world\'s best skincare" preserving internal apostrophe',
    `Found term: "${worldBest?.term}"`
  );

  const miracleCure = prohibited.find(t => t.term.toLowerCase() === 'miracle cure');
  assert(!!miracleCure, 'Extracts "miracle cure"');

  const wrinkleRemoval = prohibited.find(t => t.term.toLowerCase() === 'permanent wrinkle removal');
  assert(!!wrinkleRemoval, 'Extracts "permanent wrinkle removal" from key-value block');

  const organic100 = prohibited.find(t => t.term.toLowerCase() === '100% organic');
  assert(!!organic100, 'Extracts "100% organic"');

  const faceLift = prohibited.find(t => t.term.toLowerCase() === 'instant face lift');
  assert(!!faceLift, 'Extracts "instant face lift"');

  const treatsAcne = prohibited.find(t => t.term.toLowerCase() === 'treats acne');
  assert(!!treatsAcne, 'Extracts "treats acne"');

  const erasesScars = prohibited.find(t => t.term.toLowerCase() === 'erases scars');
  assert(!!erasesScars, 'Extracts "erases scars"');

  // Problem 3: Correct categories
  console.log('\n--- VERIFYING CATEGORY SEPARATION ---');
  assert(
    approved.some(a => a.term.toLowerCase() === 'bio-renewal complex') &&
    approved.some(a => a.term.toLowerCase() === 'dermatologist-tested'),
    'Approved terms are in approvedTerms, not mixed into prohibitedTerms'
  );

  assert(
    tone.some(tg => tg.attribute.toLowerCase().includes('dermatological authority')),
    'Voice pillar "Dermatological Authority" kept in toneGuidelines (not in prohibitedTerms despite "avoid")'
  );

  assert(
    facts.some(f => f.claimOrStat.includes('100% post-consumer recycled paperboard')) &&
    facts.some(f => f.claimOrStat.includes('94% improvement in skin hydration')),
    'Packaging and clinical specifications kept in trustedFacts'
  );

  // Problem 4: Do not invent replacement wording
  console.log('\n--- VERIFYING REPLACEMENT WORDING ACCURACY ---');
  assert(
    worldBest.suggestedAlternative === '',
    'Leaves alternative empty when no replacement is given for "the world\'s best skincare"',
    `Alternative: "${worldBest.suggestedAlternative}"`
  );

  assert(
    faceLift.suggestedAlternative === '',
    'Leaves alternative empty when no replacement is given for "instant face lift"',
    `Alternative: "${faceLift.suggestedAlternative}"`
  );

  assert(
    erasesScars.suggestedAlternative === '',
    'Leaves alternative empty when no replacement is given for "erases scars"',
    `Alternative: "${erasesScars.suggestedAlternative}"`
  );

  assert(
    miracleCure.suggestedAlternative.toLowerCase() === 'targeted treatment',
    'Accurately extracts valid replacement for "miracle cure" -> "targeted treatment"',
    `Alternative: "${miracleCure.suggestedAlternative}"`
  );

  assert(
    wrinkleRemoval.suggestedAlternative.toLowerCase() === 'visibly smooths the appearance of fine lines',
    'Accurately extracts multi-line replacement for "permanent wrinkle removal"',
    `Alternative: "${wrinkleRemoval.suggestedAlternative}"`
  );

  // Problem 5: Provenance preservation
  console.log('\n--- VERIFYING PROVENANCE ---');
  assert(
    prohibited.every(t => t.sourceDoc === 'Nuvia_Skin_Brand_Guidelines_2026.pdf' && t.pageNumber === 1),
    'Source doc and page number preserved on all prohibited terms'
  );
  assert(
    facts.every(f => f.sourceDoc === 'Nuvia_Skin_Brand_Guidelines_2026.pdf'),
    'Source doc preserved on all trusted facts'
  );

  // Precision check: verify items count is realistic and not inflated with noise
  assert(
    prohibited.length >= 6 && prohibited.length <= 12,
    `Clean, high-precision extraction: ${prohibited.length} real prohibited terms found (no 31-item noise explosion)`
  );

  // ============================================================
  // PART 2: FULL NUVIA SKIN V2 GUIDELINES DOCUMENT REGRESSION
  // ============================================================
  console.log('\n================================================================');
  console.log('REGRESSION TEST PART 2: FULL NUVIA SKIN V2 GUIDELINE DOCUMENT');
  console.log('================================================================\n');

  const fs = await import('fs');
  const path = await import('path');
  const v2Path = path.join(process.cwd(), 'scratch', 'Nuvia_Skin_Rules_and_Approved_Alternatives_v2.txt');
  let v2Text = '';
  if (fs.existsSync(v2Path)) {
    v2Text = fs.readFileSync(v2Path, 'utf-8');
  } else {
    const fallbackPath = 'C:\\Users\\divya\\.gemini\\antigravity-ide\\brain\\5ea190ad-8bbc-4ee6-ae4e-6371d097fb37\\scratch\\Nuvia_Skin_Rules_and_Approved_Alternatives_v2.txt';
    v2Text = fs.readFileSync(fallbackPath, 'utf-8');
  }

  const reqV2 = {
    formData: async () => { throw new Error('Not form data'); },
    json: async () => ({
      text: v2Text,
      fileName: 'Nuvia_Skin_Rules_and_Approved_Alternatives_v2.txt',
      format: 'text'
    })
  };

  const resV2 = await POST(reqV2);
  const dataV2 = await resV2.json();

  assert(dataV2.success === true, 'Parsed Nuvia Skin v2 document successfully');
  const v2Prohibited = dataV2.extracted.prohibitedTerms;
  const v2Approved = dataV2.extracted.approvedTerms;
  const v2Tone = dataV2.extracted.toneGuidelines;
  const v2Facts = dataV2.extracted.trustedFacts;

  console.log(`\nV2 Extracted summary:`);
  console.log(`  - Prohibited terms: ${v2Prohibited.length}`);
  console.log(`  - Approved terms:   ${v2Approved.length}`);
  console.log(`  - Tone guidelines:  ${v2Tone.length}`);
  console.log(`  - Trusted facts:    ${v2Facts.length}`);

  // 1. Label False-Positive Check
  console.log('\n--- VERIFYING NO LABEL OR HEADING FALSE-POSITIVES ---');
  const v2TermNames = v2Prohibited.map(t => t.term.toLowerCase());
  assert(
    !v2TermNames.includes('prohibited phrase') && 
    !v2TermNames.includes('prohibited phrase:') && 
    !v2TermNames.some(t => t.endsWith(':')),
    'Literal label "Prohibited phrase:" is NOT extracted as a prohibited term'
  );
  assert(
    !v2TermNames.includes('approved alternative') && !v2TermNames.includes('approved alternative:'),
    'Label "Approved alternative:" is NOT extracted as a prohibited term'
  );
  assert(
    !v2Approved.some(a => a.term.toLowerCase().includes('preferred terminology')),
    'Heading "PREFERRED TERMINOLOGY AND WORDING" is NOT extracted as an approved term'
  );

  // 2. Exact Count of Prohibited Rules (NS-001 through NS-025)
  console.log('\n--- VERIFYING EXACT PROHIBITED TERMS COUNT & ALTERNATIVES ---');
  assert(v2Prohibited.length === 25, `Extracted exactly 25 prohibited terms (Found: ${v2Prohibited.length})`);

  const expectedMappings = {
    'miracle cure': 'part of a simple skincare routine',
    'guaranteed acne-free skin': 'designed to fit into your daily skincare routine',
    '100% safe for everyone': 'review the ingredient list to decide whether the product suits your needs',
    'instantly removes all wrinkles': 'learn more about the product and its intended use',
    'clinically proven': 'see the product information for details',
    "the world's best skincare": 'skincare designed with simplicity in mind',
    'flawless skin forever': 'build a skincare routine that works for you',
    'perfect skin': 'care for your skin in a way that suits your routine',
    'guaranteed results': 'explore the product details before deciding',
    'dermatologist approved': 'read the available product information',
    'non-toxic': 'review the ingredient information',
    'chemical-free': 'see the ingredient list',
    'instant transformation': 'take a simple approach to your skincare routine',
    'revolutionary': 'thoughtfully presented',
    'perfect for every skin type': 'check the product information to see whether it suits your needs',
    'dermatologist recommended': 'learn more about the product',
    'works overnight': 'follow the product directions and review the available information',
    'erases dark spots': "learn about the product's intended use",
    'clinically tested': 'review the available product information',
    'hypoallergenic': 'review the ingredient list and product information',
    'zero irritation': 'individual experiences may vary',
    'safe for sensitive skin': 'review the ingredients and product directions',
    '100% natural': 'review the ingredient list',
    'eco-friendly packaging': 'see the packaging information',
    'instant glow guaranteed': 'make time for your daily skincare routine'
  };

  for (const [term, expectedAlt] of Object.entries(expectedMappings)) {
    const item = v2Prohibited.find(t => t.term.toLowerCase() === term.toLowerCase());
    assert(!!item, `Extracted prohibited term "${term}"`);
    assert(
      item?.suggestedAlternative.toLowerCase() === expectedAlt.toLowerCase(),
      `Prohibited term "${term}" has correct 1-to-1 alternative "${expectedAlt}"`,
      `Actual: "${item?.suggestedAlternative}"`
    );
  }

  // 3. Category Validation: Approved Terms
  console.log('\n--- VERIFYING APPROVED TERMINOLOGY (AT-001 TO AT-007) ---');
  assert(v2Approved.length === 7, `Extracted exactly 7 approved terms (Found: ${v2Approved.length})`);
  const expectedApproved = [
    'daily skincare routine',
    'simple skincare',
    'product information',
    'ingredient list',
    'designed for everyday use',
    'learn more about the product',
    'individual experiences may vary'
  ];
  for (const expAppr of expectedApproved) {
    assert(
      v2Approved.some(a => a.term.toLowerCase() === expAppr.toLowerCase()),
      `Approved terminology contains "${expAppr}"`
    );
  }

  // 4. Category Validation: Brand Voice Rules
  console.log('\n--- VERIFYING BRAND VOICE CATEGORIZATION ---');
  const expectedVoice = [
    'Plain language',
    'Respectful tone',
    'No pressure tactics',
    'Measured claims',
    'No guaranteed individual outcomes',
    'No invented endorsements'
  ];
  for (const expVoice of expectedVoice) {
    assert(
      v2Tone.some(t => t.attribute.toLowerCase().includes(expVoice.toLowerCase())),
      `Brand voice rule "${expVoice}" correctly classified in toneGuidelines`
    );
  }

  // 5. Verification Status: 0 Fake Trusted Facts
  console.log('\n--- VERIFYING NO FAKE TRUSTED FACTS ---');
  assert(
    v2Facts.length === 0,
    `No fake trusted facts invented when source states no verified facts exist (Found: ${v2Facts.length})`
  );

  console.log('\n================================================================');
  console.log('ALL NUVIA SKIN REGRESSION TESTS PASSED!');
  console.log('================================================================\n');
}

run().catch(err => {
  console.error('Test failure:', err);
  process.exit(1);
});

