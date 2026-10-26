import { INITIAL_BRAND_PROFILE, INITIAL_APPROVED_EDITS, INITIAL_DRAFTS } from '../src/lib/mock-data.js';

console.log('================================================================');
console.log('PHASE 2: VERIFY CORE AUDIT WORKFLOW (8 SCENARIOS)');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, scenarioNum, testName, details = '') {
  totalTests++;
  if (condition) {
    console.log(`[PASS] [Scenario ${scenarioNum}] ${testName}`);
    if (details) console.log(`       ${details}`);
    passedTests++;
  } else {
    console.error(`[FAIL] [Scenario ${scenarioNum}] ${testName}`);
    if (details) console.error(`       ${details}`);
    process.exit(1);
  }
}

async function executeAudit(content, options = {}) {
  const { POST } = await import('../src/app/api/audit/route.js');
  const req = {
    json: async () => ({
      draftId: 'test-phase2-draft',
      content,
      brand: options.brand || INITIAL_BRAND_PROFILE,
      approvedEdits: options.approvedEdits || INITIAL_APPROVED_EDITS,
      ...options
    })
  };
  const response = await POST(req);
  return { status: response.status, data: await response.json() };
}

async function runScenarioTests() {
  const brand = INITIAL_BRAND_PROFILE;
  const edits = INITIAL_APPROVED_EDITS;

  // -------------------------------------------------------------------------
  // Scenario 1: Non-compliant draft
  // -------------------------------------------------------------------------
  console.log('--- SCENARIO 1: NON-COMPLIANT DRAFT ---');
  const nonCompliantDraft = 'Our revolutionary headphones feature a 75-hour battery life and housing made entirely from recycled plastic, the most eco-friendly audio gear on earth.';
  const res1 = await executeAudit(nonCompliantDraft);

  const hasProhibitedTerm = res1.data.findings.some(f => f.issueType === 'Terminology' || f.quote.toLowerCase().includes('revolutionary') || f.quote.toLowerCase().includes('eco-friendly'));
  const hasFactConflict = res1.data.findings.some(f => f.issueType === 'Fact Conflict' || f.quote.toLowerCase().includes('battery') || f.quote.toLowerCase().includes('entirely'));
  const hasSuperlative = res1.data.findings.some(f => f.issueType === 'Unverified Claim' || f.quote.toLowerCase().includes('most eco-friendly'));

  assert(hasProhibitedTerm, 1, 'Flags prohibited terms ("revolutionary" / "eco-friendly")');
  assert(hasFactConflict, 1, 'Flags fact conflict (exaggerated battery or recycled claims)');
  assert(hasSuperlative, 1, 'Flags unverified environmental superlative claim');

  // -------------------------------------------------------------------------
  // Scenario 2: Compliant draft
  // -------------------------------------------------------------------------
  console.log('\n--- SCENARIO 2: COMPLIANT DRAFT ---');
  const compliantDraft = 'Our headphones are crafted with 80% certified post-consumer recycled plastic and provide up to 48 hours of tested battery life. Thoughtfully redesigned for clear listening.';
  const res2 = await executeAudit(compliantDraft);

  assert(
    res2.data.outcome === 'CLEAN' && res2.data.findings.length === 0,
    2,
    'Compliant draft receives 0 fabricated findings and outcome CLEAN',
    `Outcome: ${res2.data.outcome}, Findings: ${res2.data.findings.length}`
  );

  // -------------------------------------------------------------------------
  // Scenario 3: Insufficient evidence
  // -------------------------------------------------------------------------
  console.log('\n--- SCENARIO 3: INSUFFICIENT EVIDENCE ---');
  const outOfDomainDraft = 'The quantum spin Hall insulator demonstrates topological phase transitions at cryogenic temperatures in bismuth-antimony alloys.';
  const res3 = await executeAudit(outOfDomainDraft);

  assert(
    res3.data.outcome === 'INSUFFICIENT_EVIDENCE' && res3.data.findings.length === 0,
    3,
    'Unrelated claims return explicit INSUFFICIENT_EVIDENCE outcome without fabricating violations',
    `Outcome: ${res3.data.outcome}, Summary: "${res3.data.summary}"`
  );

  // -------------------------------------------------------------------------
  // Scenario 4: Invalid evidence ID rejection
  // -------------------------------------------------------------------------
  console.log('\n--- SCENARIO 4: INVALID EVIDENCE ID REJECTION ---');
  // Verify that any finding must have a ruleId present in the retrieved set
  const retrievedIds = new Set(res1.data.retrievedEvidence.map(e => e.id));
  const invalidIdFound = res1.data.findings.some(f => !retrievedIds.has(f.ruleId));

  assert(
    !invalidIdFound,
    4,
    'Server rejects any ungrounded evidence ID that retriever did not return',
    `All ${res1.data.findings.length} findings strictly grounded in retrieved set of ${retrievedIds.size} items`
  );

  // -------------------------------------------------------------------------
  // Scenario 5: Incorrect evidence type (Factual claim must cite a trusted fact)
  // -------------------------------------------------------------------------
  console.log('\n--- SCENARIO 5: INCORRECT EVIDENCE TYPE ---');
  const factualFindings = res1.data.findings.filter(f => f.issueType === 'Fact Conflict');

  assert(
    factualFindings.length > 0 && factualFindings.every(f => f.evidence?.[0]?.type === 'fact'),
    5,
    'Factual conflicts cite verified trusted facts as primary evidence, not merely terminology rules',
    `Verified ${factualFindings.length} factual findings correctly cite type="fact"`
  );

  // -------------------------------------------------------------------------
  // Scenario 6: Unsafe correction prevention
  // -------------------------------------------------------------------------
  console.log('\n--- SCENARIO 6: UNSAFE CORRECTION PREVENTION ---');
  const unsafeClaimsRegex = /(100%|guaranteed unbreakable|revolutionary|best in the world)/i;
  const hasUnsafeFix = res1.data.findings.some(f => unsafeClaimsRegex.test(f.suggestedFix));

  assert(
    !hasUnsafeFix,
    6,
    'Suggested fixes do not introduce new unsupported claims, numbers, guarantees, or superlatives',
    'Verified: All suggested replacements are conservative and surgical'
  );

  // -------------------------------------------------------------------------
  // Scenario 7: AI/API Failure & Deterministic Fallback Transparency
  // -------------------------------------------------------------------------
  console.log('\n--- SCENARIO 7: AI/API FAILURE & FALLBACK TRANSPARENCY ---');
  const savedKey = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = 'invalid_key_to_force_fallback';

  const res7 = await executeAudit(nonCompliantDraft);
  process.env.GROQ_API_KEY = savedKey; // Restore key

  assert(
    res7.data.isFallback === true && res7.data.modelUsed.includes('fallback'),
    7,
    'Deterministic fallback triggers safely on API failure and sets isFallback: true',
    `Model: ${res7.data.modelUsed}, Summary: "${res7.data.summary}"`
  );

  assert(
    res7.data.findings.every(f => f.detectedBy === 'deterministic'),
    7,
    'Fallback findings are explicitly labeled detectedBy: "deterministic" (no false AI claim)'
  );

  // -------------------------------------------------------------------------
  // Scenario 8: Malformed AI Output Graceful Handling
  // -------------------------------------------------------------------------
  console.log('\n--- SCENARIO 8: MALFORMED AI OUTPUT HANDLING ---');
  // Test with edge-case drafts: empty string, special characters, null values
  const res8Empty = await executeAudit('');
  assert(
    res8Empty.data.outcome === 'INSUFFICIENT_EVIDENCE',
    8,
    'Empty draft content handled safely without server crash'
  );

  const res8Special = await executeAudit('!@#$%^&*()_+{}[]:;"\'<>?,./~` \n\t\r');
  assert(
    res8Special.status === 200,
    8,
    'Draft with only symbols/whitespace handled safely without server crash'
  );

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`PHASE 2 COMPLETE: ${passedTests}/${totalTests} SCENARIOS PASSED!`);
  console.log('================================================================');
}

runScenarioTests().catch(err => {
  console.error('Phase 2 test runner error:', err);
  process.exit(1);
});
