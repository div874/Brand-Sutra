import { INITIAL_BRAND_PROFILE, INITIAL_APPROVED_EDITS } from '../src/lib/mock-data.js';
import { retrieveRelevantEvidence, analyzeDraftContent } from '../src/lib/retrieval-engine.js';
import { generateEmbedding, cosineSimilarity, calculateHybridScore, EMBEDDING_DIMENSION } from '../src/lib/embeddings.js';

console.log('================================================================');
console.log('STEP 1 & STEP 2: RETRIEVAL QUALITY & EMBEDDINGS TEST SUITE');
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

// -------------------------------------------------------------
// Test 1: Paraphrases (Semantic Vector Matching with Synonyms)
// -------------------------------------------------------------
console.log('--- TEST 1: PARAPHRASES ---');
const paraphraseQuery = 'Our new outer housing is constructed from repurposed polymers.';
const paraphraseResults = retrieveRelevantEvidence(
  paraphraseQuery, 
  INITIAL_BRAND_PROFILE, 
  INITIAL_APPROVED_EDITS, 
  { topK: 3, minScore: 0.45 }
);

assert(
  paraphraseResults.length > 0 && paraphraseResults.some(r => r.id.includes('fact-1') || r.title.includes('Recycled')),
  'Paraphrase "repurposed polymers" retrieves Recycled Materials fact',
  `Top Result: "${paraphraseResults[0]?.title}" with score ${(paraphraseResults[0]?.relevanceScore * 100).toFixed(0)}%`
);

const paraphraseBattery = 'Infinite playback runtime and power longevity on a single charge.';
const batteryResults = retrieveRelevantEvidence(
  paraphraseBattery,
  INITIAL_BRAND_PROFILE,
  INITIAL_APPROVED_EDITS,
  { topK: 3, minScore: 0.45 }
);

assert(
  batteryResults.length > 0 && batteryResults.some(r => r.id.includes('fact-3') || r.title.includes('Battery')),
  'Paraphrase "playback runtime and power longevity" retrieves Battery Life benchmark',
  `Top Result: "${batteryResults[0]?.title}" with score ${(batteryResults[0]?.relevanceScore * 100).toFixed(0)}%`
);

// -------------------------------------------------------------
// Test 2: Irrelevant Evidence (Zero Evidence Padding)
// -------------------------------------------------------------
console.log('\n--- TEST 2: IRRELEVANT EVIDENCE & PRECISION FILTERING ---');
const irrelevantQuery = 'Quarterly earnings and financial EBITDA margins increased by 14% across the European union market.';
const irrelevantResults = retrieveRelevantEvidence(
  irrelevantQuery,
  INITIAL_BRAND_PROFILE,
  INITIAL_APPROVED_EDITS,
  { topK: 4, minScore: 0.45 }
);

assert(
  irrelevantResults.length === 0,
  'Irrelevant financial query returns 0 evidence citations (no filler items attached)',
  `Received ${irrelevantResults.length} items (expected 0)`
);

// -------------------------------------------------------------
// Test 3: Conflicting Facts Detection
// -------------------------------------------------------------
console.log('\n--- TEST 3: CONFLICTING FACTS RETRIEVAL ---');
const conflictingDraft = 'Features an unbelievable 90-hour continuous battery life that blows away any other wireless audio on earth.';
const conflictFindings = analyzeDraftContent('draft-conflict-test', conflictingDraft, INITIAL_BRAND_PROFILE, INITIAL_APPROVED_EDITS);

const batteryConflict = conflictFindings.find(f => f.issueType === 'Fact Conflict');
assert(
  !!batteryConflict && batteryConflict.evidence && batteryConflict.evidence.length > 0,
  'Exaggerated 90-hour battery claim triggers Fact Conflict with ground-truth evidence',
  `Evidence cited: "${batteryConflict?.evidence?.[0]?.title}" (${batteryConflict?.evidence?.[0]?.sourceDoc})`
);

// -------------------------------------------------------------
// Test 4: Exact Certification Codes
// -------------------------------------------------------------
console.log('\n--- TEST 4: EXACT CERTIFICATION CODES ---');
const grsQuery = 'Audit verified under GRS-2025-081 standard';
const grsResults = retrieveRelevantEvidence(
  grsQuery,
  INITIAL_BRAND_PROFILE,
  INITIAL_APPROVED_EDITS,
  { topK: 2, minScore: 0.45 }
);

assert(
  grsResults.length > 0 && grsResults[0].id.includes('fact-1') && grsResults[0].relevanceScore >= 0.98,
  'Exact certification code "GRS-2025-081" matches official GRS audit fact with >=98% score',
  `Score: ${(grsResults[0]?.relevanceScore * 100).toFixed(0)}%, Title: "${grsResults[0]?.title}"`
);

const iecQuery = 'Hardware safety tested under IEC 62368-1 benchmark protocol';
const iecResults = retrieveRelevantEvidence(
  iecQuery,
  INITIAL_BRAND_PROFILE,
  INITIAL_APPROVED_EDITS,
  { topK: 2, minScore: 0.45 }
);

assert(
  iecResults.length > 0 && iecResults[0].id.includes('fact-3') && iecResults[0].relevanceScore >= 0.98,
  'Exact standard code "IEC 62368-1" matches hardware lab protocol fact with >=98% score',
  `Score: ${(iecResults[0]?.relevanceScore * 100).toFixed(0)}%, Title: "${iecResults[0]?.title}"`
);

// -------------------------------------------------------------
// Test 5: Drafts With No Supporting Evidence (Clean Copy)
// -------------------------------------------------------------
console.log('\n--- TEST 5: CLEAN DRAFTS WITHOUT EVIDENCE ---');
const cleanCompliantDraft = 'We design audio products with care, keeping our community informed with clear and honest updates every month.';
const cleanFindings = analyzeDraftContent('draft-clean-test', cleanCompliantDraft, INITIAL_BRAND_PROFILE, INITIAL_APPROVED_EDITS);

assert(
  cleanFindings.length === 0,
  'Clean, compliant copy produces 0 findings and 0 attached evidence',
  `Found ${cleanFindings.length} issues (expected 0)`
);

// -------------------------------------------------------------
// Test 6: Embeddings & pgvector Vector Operations
// -------------------------------------------------------------
console.log('\n--- TEST 6: 384-DIMENSIONAL EMBEDDINGS & VECTOR MATH ---');
const vec1 = generateEmbedding('80% post-consumer recycled plastic');
const vec2 = generateEmbedding('repurposed sustainable polymers');
const vec3 = generateEmbedding('high yield quarterly dividend distribution');

assert(
  vec1.length === EMBEDDING_DIMENSION && vec2.length === EMBEDDING_DIMENSION,
  `Embedding vector dimensions match pgvector specification (${EMBEDDING_DIMENSION}d)`,
  `Generated dimension: ${vec1.length}`
);

const simRelated = cosineSimilarity(vec1, vec2);
const simUnrelated = cosineSimilarity(vec1, vec3);

assert(
  simRelated > simUnrelated,
  'Cosine similarity correctly differentiates related domain concepts from unrelated text',
  `Related: ${(simRelated * 100).toFixed(1)}% vs Unrelated: ${(simUnrelated * 100).toFixed(1)}%`
);

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
console.log('\n================================================================');
console.log(`ALL TESTS PASSED: ${passedTests}/${totalTests} tests successful!`);
console.log('================================================================');
