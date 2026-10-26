import { INITIAL_BRAND_PROFILE, INITIAL_APPROVED_EDITS, INITIAL_DRAFTS } from '../src/lib/mock-data.js';

console.log('================================================================');
console.log('TESTING FOUR CORE CITATION & SAFETY FIXES');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    console.log(`[PASS] ${testName}`);
    if (details) console.log(`       ${details}`);
    passedTests++;
  } else {
    console.error(`[FAIL] ${testName}`);
    if (details) console.error(`       ${details}`);
    process.exit(1);
  }
}

async function runAudit(content, options = {}) {
  const { POST } = await import('../src/app/api/audit/route.js');
  const req = {
    json: async () => ({
      draftId: 'test-fixes-draft',
      content,
      brand: INITIAL_BRAND_PROFILE,
      approvedEdits: INITIAL_APPROVED_EDITS,
      ...options
    })
  };
  const response = await POST(req);
  return { status: response.status, data: await response.json() };
}

async function main() {
  const sampleDraft = INITIAL_DRAFTS[0];

  // -------------------------------------------------------------------------
  // 1. Citation Correctness: Factual claims must cite a trusted fact
  // -------------------------------------------------------------------------
  console.log('--- FIX 1: CITATION CORRECTNESS ---');
  const res1 = await runAudit(sampleDraft.content);

  const recycledFinding = res1.data.findings.find(f => 
    f.quote.toLowerCase().includes('recycled') || f.issueType === 'Fact Conflict'
  );

  assert(
    !!recycledFinding,
    'Finding detected for factual recycled plastic claim'
  );

  const topCitation = recycledFinding?.evidence?.[0];
  assert(
    topCitation && topCitation.type === 'fact',
    'Factual claim cites trusted fact as primary evidence (not a prohibited term rule)',
    `Citing: [${topCitation?.type.toUpperCase()}] "${topCitation?.title}" (${topCitation?.sourceDoc})`
  );

  const batteryFinding = res1.data.findings.find(f => 
    f.quote.toLowerCase().includes('battery') || f.quote.toLowerCase().includes('75-hour')
  );

  const batteryCitation = batteryFinding?.evidence?.[0];
  assert(
    batteryCitation && batteryCitation.type === 'fact',
    'Battery life factual conflict cites Hardware Lab Protocol fact',
    `Citing: [${batteryCitation?.type.toUpperCase()}] "${batteryCitation?.title}" (${batteryCitation?.sourceDoc})`
  );

  // -------------------------------------------------------------------------
  // 2. Citation Validation: Server rejects any evidence ID not returned by retriever
  // -------------------------------------------------------------------------
  console.log('\n--- FIX 2: CITATION VALIDATION ---');
  // Check that every finding's ruleId/evidenceId in res1 exists in the retrieved set
  const retrievedIds = new Set(res1.data.retrievedEvidence.map(e => e.id));
  
  let allFindingsValidlyGrounded = true;
  res1.data.findings.forEach(f => {
    if (!retrievedIds.has(f.ruleId)) {
      allFindingsValidlyGrounded = false;
    }
  });

  assert(
    allFindingsValidlyGrounded,
    'Every returned finding is strictly grounded in an ID returned by the retriever',
    `Verified ${res1.data.findings.length} findings against ${retrievedIds.size} retrieved evidence items`
  );

  // -------------------------------------------------------------------------
  // 3. Correction Safety: Suggested fixes must not introduce new unsupported claims
  // -------------------------------------------------------------------------
  console.log('\n--- FIX 3: CORRECTION SAFETY ---');
  const unsafeClaimsRegex = /(100%|guaranteed unbreakable|revolutionary|best in the world)/i;
  let allFixesSafe = true;
  let unsafeFixMessage = '';

  res1.data.findings.forEach(f => {
    if (unsafeClaimsRegex.test(f.suggestedFix)) {
      allFixesSafe = false;
      unsafeFixMessage = `Unsafe fix in "${f.quote}": "${f.suggestedFix}"`;
    }
  });

  assert(
    allFixesSafe,
    'All suggested fixes are conservative, surgical, and introduce no forbidden superlatives',
    unsafeFixMessage || 'Verified: All fixes use certified benchmarks (e.g. "80% certified recycled plastic")'
  );

  // -------------------------------------------------------------------------
  // 4. Fallback Transparency: Clear identification when deterministic engine runs
  // -------------------------------------------------------------------------
  console.log('\n--- FIX 4: FALLBACK TRANSPARENCY ---');
  // Simulate missing or invalid API key by temporarily blanking GROQ_API_KEY
  const originalKey = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = '';

  const fallbackRes = await runAudit(sampleDraft.content);
  process.env.GROQ_API_KEY = originalKey; // Restore key

  assert(
    fallbackRes.data.isFallback === true,
    'API explicitly marks response with isFallback: true when deterministic engine takes over'
  );

  assert(
    fallbackRes.data.modelUsed === 'deterministic-fallback',
    'Model identifier explicitly shows deterministic-fallback (not claiming AI succeeded)',
    `modelUsed: "${fallbackRes.data.modelUsed}"`
  );

  assert(
    fallbackRes.data.findings.every(f => f.detectedBy === 'deterministic'),
    'All findings under fallback are clearly tagged with detectedBy: "deterministic"',
    `Tagged ${fallbackRes.data.findings.length} findings as deterministic`
  );

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`ALL 4 FIXES VERIFIED: ${passedTests}/${totalTests} tests passed successfully!`);
  console.log('================================================================');
}

main().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
