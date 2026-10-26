import { INITIAL_BRAND_PROFILE, INITIAL_APPROVED_EDITS, INITIAL_DRAFTS } from '../src/lib/mock-data.js';
import { analyzeDraftContent, retrieveRelevantEvidence, calculateRelevanceScore } from '../src/lib/retrieval-engine.js';

console.log('--- Phase 1: Testing Dynamic Evidence Retrieval & Ranking ---');

// 1. Test calculation of relevance score
const exactScore = calculateRelevanceScore('recycled plastic', '80% post-consumer recycled plastic');
console.log(`Relevance Score (exact match): ${(exactScore * 100).toFixed(0)}%`);
if (exactScore < 0.8) {
  console.error('FAIL: Expected exact match score to be high');
  process.exit(1);
}

// 2. Test Dynamic Retrieval across Rules, Facts, and Past Edits
const query = '75-hour continuous battery life with quick charging';
const retrieved = retrieveRelevantEvidence(query, INITIAL_BRAND_PROFILE, INITIAL_APPROVED_EDITS, { topK: 4 });

console.log(`\nRetrieved ${retrieved.length} evidence citations for query: "${query}"`);
retrieved.forEach((cite, idx) => {
  console.log(`  [Rank #${idx + 1}] (${cite.type.toUpperCase()}) Score: ${(cite.relevanceScore * 100).toFixed(0)}%`);
  console.log(`    Title: ${cite.title}`);
  console.log(`    Source: ${cite.sourceDoc || 'N/A'} ${cite.pageNumber ? `(p.${cite.pageNumber})` : ''} ${cite.verifiedDate ? `[Verified ${cite.verifiedDate}]` : ''}`);
  console.log(`    Snippet: ${cite.snippet}`);
});

// Verify ranking is descending
for (let i = 0; i < retrieved.length - 1; i++) {
  if (retrieved[i].relevanceScore < retrieved[i + 1].relevanceScore) {
    console.error('FAIL: Evidence citations not sorted descending by relevance score');
    process.exit(1);
  }
}

// 3. Test analyzeDraftContent attaching evidence to findings
const sampleDraft = INITIAL_DRAFTS[0];
const findings = analyzeDraftContent(sampleDraft.id, sampleDraft.content, INITIAL_BRAND_PROFILE, INITIAL_APPROVED_EDITS);

console.log(`\nDraft Analysis produced ${findings.length} findings with structured evidence:`);
let findingsWithEvidenceCount = 0;

findings.forEach((f, idx) => {
  const hasEvidence = Array.isArray(f.evidence) && f.evidence.length > 0;
  if (hasEvidence) findingsWithEvidenceCount++;

  console.log(`\nFinding #${idx + 1}: [${f.issueType}] "${f.quote}"`);
  console.log(`  Fix: "${f.suggestedFix}"`);
  console.log(`  Evidence count: ${f.evidence ? f.evidence.length : 0}`);
  
  if (f.evidence) {
    f.evidence.forEach((ev, evIdx) => {
      console.log(`    Citation #${evIdx + 1}: [${ev.type}] "${ev.title}" (Score: ${(ev.relevanceScore * 100).toFixed(0)}%)`);
      if (ev.sourceDoc) console.log(`      Citation Source: ${ev.sourceDoc} ${ev.pageNumber ? `p.${ev.pageNumber}` : ''}`);
      console.log(`      Snippet: ${ev.snippet}`);
    });
  }
});

if (findingsWithEvidenceCount === 0) {
  console.error('FAIL: No findings contained structured evidence');
  process.exit(1);
}

console.log(`\nSUCCESS: ${findingsWithEvidenceCount}/${findings.length} findings have ground-truth evidence citations attached!`);
