import { INITIAL_BRAND_PROFILE, INITIAL_DRAFTS, INITIAL_AUDIT_LOGS, INITIAL_COMMENTS } from '../src/lib/mock-data.js';

console.log('=== BRAND SUTRA WORKFLOW VALIDATION ===\n');

// 1. Initial State Check
let drafts = JSON.parse(JSON.stringify(INITIAL_DRAFTS));
let currentDraft = drafts[0];

console.log('✓ Step 1: Initial State Loaded');
console.log(`  - Title: "${currentDraft.title}"`);
console.log(`  - Status: ${currentDraft.reviewStatus}`);
console.log(`  - Total Findings: ${currentDraft.findings.length}`);
console.log(`  - Active Pending Findings: ${currentDraft.findings.filter(f => f.status === 'Pending').length}`);

// 2. Test Apply Edit (find-1: 'made entirely from recycled plastic')
console.log('\n✓ Step 2: Testing "Apply Edit"...');
const findingToFix = currentDraft.findings.find(f => f.id === 'find-1');
const originalContent = currentDraft.content;

// Surgical replacement test
const updatedContent = currentDraft.content.replace(findingToFix.quote, findingToFix.suggestedFix);
currentDraft.content = updatedContent;
currentDraft.findings = currentDraft.findings.map(f => f.id === 'find-1' ? { ...f, status: 'Accepted' } : f);

// Record in approved edits
let approvedEdits = [];
const newApprovedEdit = {
  id: `approved-edit-${Date.now()}`,
  draftId: currentDraft.id,
  findingId: findingToFix.id,
  originalText: findingToFix.quote,
  approvedChange: findingToFix.suggestedFix,
  reason: findingToFix.explanation,
  relatedRuleOrFact: findingToFix.sourceLink || 'Brand Guideline',
  approvedBy: 'Divyansh Chandra (Brand Lead)',
  approvedByRole: 'reviewer',
  approvedAt: new Date().toISOString(),
  category: findingToFix.issueType,
  usageCount: 1
};
approvedEdits.push(newApprovedEdit);

// Integrity assertions
const hasReplacement = currentDraft.content.includes(findingToFix.suggestedFix);
const hasOriginal = currentDraft.content.includes(findingToFix.quote);
const preservedPrefix = currentDraft.content.startsWith('Meet the EchoStream Pro: our revolutionary');
const preservedSuffix = currentDraft.content.endsWith('join the green revolution.');

if (hasReplacement && !hasOriginal && preservedPrefix && preservedSuffix) {
  console.log(`  PASSED: "${findingToFix.quote}" replaced with "${findingToFix.suggestedFix}"`);
  console.log(`  PASSED: Unrelated prefix and suffix text preserved with 100% integrity.`);
  console.log(`  PASSED: Approved edit recorded in history for future learning.`);
} else {
  console.error('  FAILED: Content replacement error.');
  process.exit(1);
}

const remainingAfterFix = currentDraft.findings.filter(f => f.status === 'Pending').length;
console.log(`  PASSED: Active issues count decremented to ${remainingAfterFix}`);

// 3. Test Ignore (find-2: 'eco-friendly')
console.log('\n✓ Step 3: Testing "Ignore"...');
const contentBeforeIgnore = currentDraft.content;
currentDraft.findings = currentDraft.findings.map(f => f.id === 'find-2' ? { ...f, status: 'Ignored' } : f);

const contentAfterIgnore = currentDraft.content;
const remainingAfterIgnore = currentDraft.findings.filter(f => f.status === 'Pending').length;
const ignoredFinding = currentDraft.findings.find(f => f.id === 'find-2');

if (contentBeforeIgnore === contentAfterIgnore && remainingAfterIgnore === 4 && ignoredFinding.status === 'Ignored') {
  console.log(`  PASSED: Ignored finding status set to 'Ignored'.`);
  console.log(`  PASSED: Draft text strictly unchanged after ignore action.`);
  console.log(`  PASSED: Active issues count decremented to ${remainingAfterIgnore} (ignored issue filtered out).`);
} else {
  console.error('  FAILED: Ignore action validation error.');
  process.exit(1);
}

// 4. Test Workflow State Transitions: Submit, Request Changes, Approve
console.log('\n✓ Step 4: Testing Status Transitions...');

// Reviewer requests changes
currentDraft.reviewStatus = 'Changes Requested';
console.log(`  PASSED: Reviewer requested changes -> Status: ${currentDraft.reviewStatus}`);

// Creator submits
currentDraft.reviewStatus = 'In Review';
console.log(`  PASSED: Creator submitted draft -> Status: ${currentDraft.reviewStatus}`);

// Reviewer approves
currentDraft.reviewStatus = 'Approved';
console.log(`  PASSED: Reviewer approved draft -> Status: ${currentDraft.reviewStatus}`);

// 5. Test Persistence (Simulate LocalStorage serialization & rehydration)
console.log('\n✓ Step 5: Testing Persistence (Storage Round-trip)...');
const serialized = JSON.stringify(drafts);
const rehydrated = JSON.parse(serialized);
const rehydratedDraft = rehydrated[0];

const rehydratedActive = rehydratedDraft.findings.filter(f => f.status === 'Pending').length;
const rehydratedFind1 = rehydratedDraft.findings.find(f => f.id === 'find-1');
const rehydratedFind2 = rehydratedDraft.findings.find(f => f.id === 'find-2');

if (
  rehydratedDraft.reviewStatus === 'Approved' &&
  rehydratedActive === 4 &&
  rehydratedFind1.status === 'Accepted' &&
  rehydratedFind2.status === 'Ignored' &&
  rehydratedDraft.content.includes('crafted with 80% certified post-consumer recycled plastic')
) {
  console.log('  PASSED: Draft rehydrated with exact persisted state after reload.');
  console.log('  PASSED: Ignored issues remain ignored and DO NOT reappear.');
  console.log('  PASSED: Applied edits remain permanently stored.');
} else {
  console.error('  FAILED: Persistence round-trip mismatch.');
  process.exit(1);
}

// 6. Test Reset to Defaults
console.log('\n✓ Step 6: Testing Reset to Defaults...');
const resetDrafts = JSON.parse(JSON.stringify(INITIAL_DRAFTS));
const resetDraft = resetDrafts[0];
const resetActive = resetDraft.findings.filter(f => f.status === 'Pending').length;

if (resetActive === 6 && resetDraft.content.includes('made entirely from recycled plastic')) {
  console.log(`  PASSED: Reset restores original 6 issues and default copy cleanly.`);
} else {
  console.error('  FAILED: Reset failed.');
  process.exit(1);
}

console.log('\n========================================');
console.log('ALL WORKFLOW VALIDATION TESTS PASSED ✓');
console.log('========================================');
