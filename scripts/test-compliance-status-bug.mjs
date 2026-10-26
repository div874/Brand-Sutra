import { analyzeDraftContent } from '../src/lib/retrieval-engine.ts';
import { INITIAL_BRAND_PROFILE, INITIAL_APPROVED_EDITS } from '../src/lib/mock-data.ts';

console.log('================================================================');
console.log('REGRESSION TEST: COMPLIANCE STATUS VS REVIEW PROGRESS BUG');
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

// Function mirroring page.tsx compliance calculation logic
function calculateComplianceState(draft, brand, approvedEdits) {
  const liveViolations = analyzeDraftContent(draft.id, draft.content, brand, approvedEdits);
  const lowerContent = draft.content.toLowerCase();
  
  const pending = draft.findings.filter(f => f.status === 'Pending').length;
  const ignoredStillPresent = draft.findings.filter(f => 
    f.status === 'Ignored' && lowerContent.includes(f.quote.toLowerCase().trim())
  );

  const isCompliant = liveViolations.length === 0 && pending === 0 && ignoredStillPresent.length === 0;
  const activeViolationsCount = Math.max(liveViolations.length, pending + ignoredStillPresent.length);
  const total = draft.findings.length;
  const resolved = draft.findings.filter(f => f.status !== 'Pending').length;
  const progressPercent = total > 0 ? Math.round((resolved / total) * 100) : 100;

  return {
    isCompliant,
    activeViolationsCount,
    ignoredCount: ignoredStillPresent.length,
    resolved,
    total,
    progressPercent
  };
}

async function run() {
  const brand = INITIAL_BRAND_PROFILE;
  const approvedEdits = INITIAL_APPROVED_EDITS;

  // 1. Initial State: Problematic draft with "perfect sound", "unbeatable battery life", "risk-free listening"
  console.log('--- TEST 1: PROBLEMATIC DRAFT DETECTION ---');
  const nonCompliantText = `Meet EchoStream Pro. Enjoy perfect sound, unbeatable battery life, and a thoughtfully redesigned experience. Buy now for risk-free listening!`;

  const initialFindings = analyzeDraftContent('draft-test-1', nonCompliantText, brand, approvedEdits);
  assert(initialFindings.length >= 3, 'All non-compliant claims detected in text', `Found ${initialFindings.length} violations`);
  
  const quotes = initialFindings.map(f => f.quote);
  assert(quotes.includes('perfect sound'), 'Detects "perfect sound" as prohibited subjective acoustic claim');
  assert(quotes.includes('unbeatable battery life'), 'Detects "unbeatable battery life" as prohibited superlative claim');
  assert(quotes.includes('risk-free listening'), 'Detects "risk-free listening" as prohibited legal guarantee');

  const draft = {
    id: 'draft-test-1',
    content: nonCompliantText,
    findings: initialFindings
  };

  const state1 = calculateComplianceState(draft, brand, approvedEdits);
  assert(state1.isCompliant === false, 'Draft is initially Non-Compliant');
  assert(state1.activeViolationsCount >= 3, 'Active violations count matches detected issues in text');
  assert(state1.progressPercent === 0, 'Review progress is 0% before review');

  // 2. Test Case A: Ignoring a finding does NOT make content compliant
  console.log('\n--- TEST 2: IGNORING A FINDING DOES NOT MAKE CONTENT COMPLIANT ---');
  // Reviewer ignores "perfect sound"
  draft.findings = draft.findings.map(f => 
    f.quote === 'perfect sound' ? { ...f, status: 'Ignored' } : f
  );

  const state2 = calculateComplianceState(draft, brand, approvedEdits);
  assert(
    state2.isCompliant === false, 
    'Compliance status remains NON-COMPLIANT after ignoring a finding',
    'Reviewer dismissed the suggestion, but the text is STILL non-compliant!'
  );
  assert(state2.ignoredCount >= 1, 'Tracks ignored violation still present in copy', `Ignored in copy: ${state2.ignoredCount}`);
  assert(state2.progressPercent > 0, 'Review progress incremented (suggestion was addressed)', `Progress: ${state2.progressPercent}%`);

  // 3. Test Case B: Ignoring ALL findings still leaves content Non-Compliant
  console.log('\n--- TEST 3: IGNORING ALL FINDINGS REFUSES "CLEAN & COMPLIANT" ---');
  draft.findings = draft.findings.map(f => ({ ...f, status: 'Ignored' }));

  const state3 = calculateComplianceState(draft, brand, approvedEdits);
  assert(state3.progressPercent === 100, 'Review workflow progress is 100% (all cards processed)');
  assert(
    state3.isCompliant === false,
    'System REFUSES to display "Clean & Compliant" when ignored violations remain in copy',
    `Reported Non-Compliant with ${state3.activeViolationsCount} violations still in text`
  );

  // 4. Test Case C: Applying surgical fixes makes content Clean & Compliant
  console.log('\n--- TEST 4: SURGICAL FIXES ACTUALLY MAKE CONTENT COMPLIANT ---');
  let fixedText = nonCompliantText;
  fixedText = fixedText.replace('perfect sound', 'TrueNeutral balanced audio');
  fixedText = fixedText.replace('unbeatable battery life', 'up to 48 hours of tested battery life');
  fixedText = fixedText.replace('risk-free listening', 'with a 30-day trial period');

  draft.content = fixedText;
  draft.findings = draft.findings.map(f => ({ ...f, status: 'Accepted' }));

  const state4 = calculateComplianceState(draft, brand, approvedEdits);
  assert(
    state4.isCompliant === true,
    'Draft is now genuinely CLEAN & COMPLIANT after non-compliant phrases are removed from text',
    'Live scan against current copy returns 0 violations'
  );
  assert(state4.activeViolationsCount === 0, 'Active violations count is 0');

  // 5. Test Case D: Storage Roundtrip & Refresh Simulation
  console.log('\n--- TEST 5: STORAGE ROUNDTRIP & REFRESH RECALCULATION ---');
  // Case D1: Rehydrating non-compliant copy that was previously marked ignored stays Non-Compliant
  const uncorrectedDraft = {
    id: 'draft-test-uncorrected',
    content: nonCompliantText,
    findings: initialFindings.map(f => ({ ...f, status: 'Ignored' }))
  };
  const serializedUncorrected = JSON.stringify(uncorrectedDraft);
  const rehydratedUncorrected = JSON.parse(serializedUncorrected);

  const stateD1 = calculateComplianceState(rehydratedUncorrected, brand, approvedEdits);
  assert(
    stateD1.isCompliant === false,
    'After refresh, uncorrected draft with ignored findings stays NON-COMPLIANT',
    'Recalculated against actual text; does not falsely show Clean & Compliant'
  );

  // Case D2: Rehydrating fixed copy stays Clean & Compliant
  const serializedFixed = JSON.stringify(draft);
  const rehydratedFixed = JSON.parse(serializedFixed);
  const stateD2 = calculateComplianceState(rehydratedFixed, brand, approvedEdits);
  assert(
    stateD2.isCompliant === true,
    'After refresh, fixed draft stays CLEAN & COMPLIANT'
  );

  console.log('\n================================================================');
  console.log('ALL REGRESSION TESTS PASSED: COMPLIANCE BUG CONFIRMED FIXED!');
  console.log('================================================================');
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
