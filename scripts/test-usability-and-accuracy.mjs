import { analyzeDraftContent, retrieveRelevantEvidence } from '../src/lib/retrieval-engine.ts';
import { INITIAL_BRAND_PROFILE, INITIAL_APPROVED_EDITS } from '../src/lib/mock-data.ts';

console.log('================================================================');
console.log('TEST SUITE: ACCURACY UPGRADES & DASHBOARD USABILITY ENGINE');
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
  // 1. Accuracy: Word boundary test (No subword false positives)
  console.log('--- TEST 1: WORD BOUNDARY SCANNING (NO SUBWORD FALSE POSITIVES) ---');
  const customBrand = {
    ...INITIAL_BRAND_PROFILE,
    prohibitedTerms: [
      {
        id: 'term-cure',
        term: 'cure',
        reason: 'Disease claim prohibited.',
        suggestedAlternative: 'soothe',
        severity: 'high'
      },
      {
        id: 'term-eco',
        term: 'eco-friendly',
        reason: 'Greenwashing phrase.',
        suggestedAlternative: 'recycled',
        severity: 'medium'
      }
    ]
  };

  // "secure" and "procurement" contain "cure" as a substring, but are NOT the prohibited word "cure"
  const subwordDraft = "We implement secure cloud infrastructure for customer procurement.";
  const subwordFindings = analyzeDraftContent('d-1', subwordDraft, customBrand, []);
  
  assert(
    subwordFindings.length === 0,
    'Subwords ("secure", "procurement") do NOT trigger false-positive violation for "cure"',
    `Found ${subwordFindings.length} violations`
  );

  // But an actual isolated word "cure" MUST trigger
  const actualDraft = "This topical lotion offers a rapid cure.";
  const actualFindings = analyzeDraftContent('d-2', actualDraft, customBrand, []);
  assert(
    actualFindings.length === 1 && actualFindings[0].quote.toLowerCase() === 'cure',
    'Standalone word "cure" is accurately caught with word boundary matching',
    `Found: "${actualFindings[0]?.quote}"`
  );

  // 2. Accuracy: Multi-occurrence detection across the draft
  console.log('\n--- TEST 2: MULTI-OCCURRENCE DETECTION ---');
  const multiDraft = "We strive to be an eco-friendly brand. Later in paragraph two, we also claim eco-friendly packaging.";
  const multiFindings = analyzeDraftContent('d-3', multiDraft, customBrand, []);
  
  assert(
    multiFindings.length === 2,
    'Captures ALL occurrences of a prohibited term across paragraphs (not just the first one)',
    `Detected ${multiFindings.length} occurrences (Expected 2)`
  );
  assert(
    multiFindings[0].startIndex !== multiFindings[1].startIndex,
    'Distinct character index positions registered for each occurrence',
    `Offsets: [${multiFindings[0].startIndex}, ${multiFindings[1].startIndex}]`
  );

  // 3. Accuracy: Citation ID Grounding
  console.log('\n--- TEST 3: CITATION GROUNDING IN RETRIEVAL ---');
  const query = "Made entirely from recycled plastic with 75-hour battery life";
  const retrieved = retrieveRelevantEvidence(query, INITIAL_BRAND_PROFILE, INITIAL_APPROVED_EDITS, { topK: 6 });
  const retrievedIds = new Set(retrieved.map(r => r.id));

  const sampleFindings = analyzeDraftContent('d-4', query, INITIAL_BRAND_PROFILE, INITIAL_APPROVED_EDITS);
  const factFinding = sampleFindings.find(f => f.issueType === 'Fact Conflict');

  assert(
    !!factFinding,
    'Detected factual conflict in draft'
  );
  assert(
    factFinding.ruleId.startsWith('cite-fact-'),
    'Factual conflict ruleId is formatted with cite-fact- prefix',
    `ruleId: "${factFinding.ruleId}"`
  );
  assert(
    factFinding.evidence[0].type === 'fact',
    'Primary evidence cited is of type "fact"'
  );

  // 4. Usability: Batch Safe Replacements
  console.log('\n--- TEST 4: BATCH SURGICAL REPLACEMENT (REVERSE INDEX ORDER) ---');
  let draftText = "Our product has revolutionary design, made entirely from recycled plastic, and guaranteed unbreakable build.";
  const auditFindings = analyzeDraftContent('d-5', draftText, INITIAL_BRAND_PROFILE, INITIAL_APPROVED_EDITS);
  
  const pendingFixes = auditFindings.filter(f => f.suggestedFix && f.suggestedFix.trim());
  assert(pendingFixes.length >= 3, `Identified ${pendingFixes.length} pending fixes for batch application`);

  // Sort descending by startIndex
  const sorted = [...pendingFixes].sort((a, b) => b.startIndex - a.startIndex);
  for (const f of sorted) {
    if (draftText.includes(f.quote)) {
      draftText = draftText.replace(f.quote, f.suggestedFix);
    }
  }

  assert(
    !draftText.includes('revolutionary'),
    'Original phrase "revolutionary" removed after batch fix'
  );
  assert(
    !draftText.includes('guaranteed unbreakable'),
    'Original phrase "guaranteed unbreakable" removed after batch fix'
  );
  assert(
    draftText.includes('80% certified post-consumer recycled plastic'),
    'Correct verified benchmark inserted into draft'
  );

  // Verify that re-scanning the updated draft shows resolved compliance
  const rescanFindings = analyzeDraftContent('d-5', draftText, INITIAL_BRAND_PROFILE, INITIAL_APPROVED_EDITS);
  const remainingTargetIssues = rescanFindings.filter(f => 
    f.quote.includes('revolutionary') || f.quote.includes('guaranteed unbreakable') || f.quote.includes('made entirely')
  );
  assert(
    remainingTargetIssues.length === 0,
    'Re-scanning fixed draft reports 0 active violations for replaced terms',
    `Remaining issues: ${remainingTargetIssues.length}`
  );

  console.log('\n================================================================');
  console.log('ALL ACCURACY & USABILITY TEST SUITES PASSED (100%)!');
  console.log('================================================================\n');
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
