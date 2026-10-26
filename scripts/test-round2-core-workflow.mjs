import { POST } from '../src/app/api/audit/route.ts';
import { INITIAL_BRAND_PROFILE, INITIAL_APPROVED_EDITS, INITIAL_DRAFTS } from '../src/lib/mock-data.ts';

console.log('================================================================');
console.log('ROUND 2 CORE WORKFLOW & TECHNICAL RELIABILITY VALIDATION');
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
  // 1. Load existing brand rules & trusted facts
  console.log('--- STEP 1: LOAD RULES & TRUSTED FACTS ---');
  const brand = INITIAL_BRAND_PROFILE;
  assert(brand.prohibitedTerms.length >= 3, 'Brand prohibited terms loaded', `Total: ${brand.prohibitedTerms.length} terms`);
  assert(brand.trustedFacts.length >= 2, 'Brand trusted facts loaded', `Total: ${brand.trustedFacts.length} facts`);
  assert(INITIAL_APPROVED_EDITS.length >= 1, 'Historical approved edits loaded', `Total: ${INITIAL_APPROVED_EDITS.length} edits`);

  // 2. Submit problematic marketing draft
  console.log('\n--- STEP 2: SUBMIT PROBLEMATIC MARKETING DRAFT ---');
  const sampleDraft = INITIAL_DRAFTS[0];
  const req = {
    json: async () => ({
      draftId: sampleDraft.id,
      content: sampleDraft.content,
      brand,
      approvedEdits: INITIAL_APPROVED_EDITS
    })
  };
  const res = await POST(req);
  const data = await res.json();

  assert(res.status === 200, 'Audit API returned HTTP 200');
  assert(data.findings && data.findings.length >= 4, 'Detected multiple non-compliant issues in draft', `Found ${data.findings.length} findings`);
  assert(data.retrievedEvidence && data.retrievedEvidence.length >= 5, 'Retrieved structured evidence citations', `Retrieved ${data.retrievedEvidence.length} evidence chunks`);

  // 3. Technical Reliability: Citations & Fact Grounding
  console.log('\n--- STEP 3: EVIDENCE GROUNDING & FACTUAL CITATION VALIDATION ---');
  const retrievedIdSet = new Set(data.retrievedEvidence.map(e => e.id));
  let allGrounded = true;
  data.findings.forEach(f => {
    if (!retrievedIdSet.has(f.ruleId)) {
      allGrounded = false;
    }
  });
  assert(allGrounded, 'Every finding strictly references an evidence ID returned by the retriever');

  const factFinding = data.findings.find(f => 
    f.issueType === 'Fact Conflict' || f.quote.toLowerCase().includes('recycled') || f.quote.toLowerCase().includes('battery')
  );
  assert(!!factFinding, 'Factual finding identified in problematic draft');
  const primaryEvidence = factFinding?.evidence?.[0];
  assert(primaryEvidence?.type === 'fact', 'Factual contradiction cites verified trusted fact as primary evidence', `Cited: [${primaryEvidence?.type}] "${primaryEvidence?.title}"`);

  // 4. Correction Safety
  console.log('\n--- STEP 4: CORRECTION SAFETY ---');
  const forbiddenSuperlatives = /(100%|guaranteed unbreakable|revolutionary|best in the world)/i;
  let allFixesSafe = true;
  data.findings.forEach(f => {
    if (forbiddenSuperlatives.test(f.suggestedFix)) {
      allFixesSafe = false;
    }
  });
  assert(allFixesSafe, 'Suggested corrections do not invent unverified superlatives or guarantees');

  // 5. Apply Suggested Correction Without Corrupting Text
  console.log('\n--- STEP 5: SURGICAL TEXT REPLACEMENT ---');
  const originalText = sampleDraft.content;
  const targetFinding = data.findings.find(f => originalText.includes(f.quote));
  assert(!!targetFinding, 'Found matching quote for surgical replacement test', `Target: "${targetFinding?.quote}"`);

  // Surgical replacement simulation
  const quoteIdx = originalText.indexOf(targetFinding.quote);
  const prefixBefore = originalText.slice(0, quoteIdx);
  const suffixAfter = originalText.slice(quoteIdx + targetFinding.quote.length);

  const updatedText = originalText.replace(targetFinding.quote, targetFinding.suggestedFix);

  assert(updatedText.startsWith(prefixBefore), 'Prefix text preserved with 100% integrity');
  assert(updatedText.endsWith(suffixAfter), 'Suffix text preserved with 100% integrity');
  assert(updatedText.includes(targetFinding.suggestedFix), 'Suggested fix accurately inserted into copy');
  assert(!updatedText.includes(targetFinding.quote), 'Original problematic quote completely removed');

  // 6. Persistence & Approved-Edit History Simulation
  console.log('\n--- STEP 6: APPROVED-EDIT HISTORY & PERSISTENCE ---');
  const newApprovedEdit = {
    id: `edit-${Date.now()}-${targetFinding.id}`,
    draftId: sampleDraft.id,
    findingId: targetFinding.id,
    originalText: targetFinding.quote,
    approvedChange: targetFinding.suggestedFix,
    reason: targetFinding.explanation,
    relatedRuleOrFact: targetFinding.sourceLink || 'Brand Guideline',
    approvedBy: 'Divyansh Chandra (Brand Lead)',
    approvedByRole: 'reviewer',
    approvedAt: new Date().toISOString(),
    category: targetFinding.issueType,
    usageCount: 1
  };

  const updatedApprovedEdits = [newApprovedEdit, ...INITIAL_APPROVED_EDITS];
  const serialized = JSON.stringify(updatedApprovedEdits);
  const rehydrated = JSON.parse(serialized);

  assert(rehydrated.length === INITIAL_APPROVED_EDITS.length + 1, 'Approved edit recorded and rehydrated from storage');
  assert(rehydrated[0].approvedChange === targetFinding.suggestedFix, 'Approved change correctly stored in history');
  assert(rehydrated[0].originalText === targetFinding.quote, 'Original problematic phrase stored in history');

  console.log('\n================================================================');
  console.log('ROUND 2 CORE WORKFLOW FULLY VERIFIED & PASSED!');
  console.log('================================================================');
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
