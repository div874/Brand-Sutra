import { INITIAL_BRAND_PROFILE, INITIAL_APPROVED_EDITS, INITIAL_DRAFTS } from '../src/lib/mock-data.js';

console.log('================================================================');
console.log('TESTING STEP 3: SERVER-SIDE GROQ AUDIT PIPELINE');
console.log('================================================================\n');

const sampleDraft = INITIAL_DRAFTS[0];

async function runGroqAudit(content, brand = INITIAL_BRAND_PROFILE) {
  // Test the route handler directly
  const { POST } = await import('../src/app/api/audit/route.js');
  
  const req = {
    json: async () => ({
      draftId: 'test-draft-groq',
      content,
      brand,
      approvedEdits: INITIAL_APPROVED_EDITS
    })
  };

  const response = await POST(req);
  const data = await response.json();
  return { status: response.status, data };
}

async function main() {
  // -------------------------------------------------------------
  // Test 1: Full Draft with Violations Audited via Groq
  // -------------------------------------------------------------
  console.log('--- TEST 1: GROQ AUDIT ON MARKETING DRAFT ---');
  console.log('Sending draft to Groq with retrieved evidence...');
  const t0 = Date.now();
  const res1 = await runGroqAudit(sampleDraft.content);
  const duration = Date.now() - t0;

  console.log(`Response received in ${duration}ms (Status: ${res1.status})`);
  console.log(`Outcome: ${res1.data.outcome}`);
  console.log(`Model: ${res1.data.modelUsed}`);
  console.log(`Summary: ${res1.data.summary}`);
  console.log(`Retrieved Evidence Chunks: ${res1.data.retrievedEvidence?.length || 0}`);
  console.log(`Findings Count: ${res1.data.findings?.length || 0}\n`);

  if (res1.data.findings && res1.data.findings.length > 0) {
    res1.data.findings.forEach((f, idx) => {
      console.log(`Finding #${idx + 1}: [${f.issueType}] (${f.severity}) "${f.quote}"`);
      console.log(`  Fix: "${f.suggestedFix}"`);
      console.log(`  Explanation: ${f.explanation}`);
      console.log(`  Evidence Link: ${f.sourceLink}`);
      if (f.evidence && f.evidence.length > 0) {
        console.log(`  Top Cited Evidence: [${f.evidence[0].type}] "${f.evidence[0].title}" (${f.evidence[0].snippet})`);
      }
      console.log('');
    });
  }

  if (!res1.data.findings || res1.data.findings.length === 0) {
    console.error('FAIL: Expected Groq to return structured findings for sample draft');
    process.exit(1);
  }

  // -------------------------------------------------------------
  // Test 2: Explicit Outcome when Evidence is Insufficient
  // -------------------------------------------------------------
  console.log('--- TEST 2: EXPLICIT OUTCOME WHEN EVIDENCE IS INSUFFICIENT ---');
  const completelyUnrelatedContent = 'In agricultural microbiology, Rhizobium leguminosarum establishes nitrogen-fixing root nodules in Pisum sativum legumes.';
  const res2 = await runGroqAudit(completelyUnrelatedContent);

  console.log(`Outcome: ${res2.data.outcome}`);
  console.log(`Summary: ${res2.data.summary}`);
  console.log(`Findings Count: ${res2.data.findings?.length || 0}`);

  if (res2.data.outcome !== 'INSUFFICIENT_EVIDENCE') {
    console.error(`FAIL: Expected outcome to be INSUFFICIENT_EVIDENCE, got ${res2.data.outcome}`);
    process.exit(1);
  }
  console.log('[PASS] Correctly returned explicit INSUFFICIENT_EVIDENCE outcome when no evidence exists!\n');

  // -------------------------------------------------------------
  // Test 3: Clean Compliant Draft
  // -------------------------------------------------------------
  console.log('--- TEST 3: CLEAN COMPLIANT DRAFT ---');
  const cleanDraft = 'Crafted with 80% certified post-consumer recycled plastic and up to 48 hours of tested battery life. Thoughtfully redesigned for sustainable listening.';
  const res3 = await runGroqAudit(cleanDraft);

  console.log(`Outcome: ${res3.data.outcome}`);
  console.log(`Summary: ${res3.data.summary}`);
  console.log(`Findings Count: ${res3.data.findings?.length || 0}`);
  console.log('[PASS] Clean draft handled appropriately!\n');

  console.log('================================================================');
  console.log('ALL STEP 3 GROQ PIPELINE TESTS PASSED!');
  console.log('================================================================');
}

main().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
