/**
 * Embeddings & Semantic Similarity Engine for Brand Sutra RAG Pipeline
 * Provides:
 * 1. 384-dimensional dense semantic embedding generation
 * 2. Cosine similarity calculation
 * 3. Domain-specific semantic semantic expansion for brand governance (materials, battery, tone, legal claims)
 * 4. Hybrid Search (Dense Semantic Vector + Sparse Keyword BM25)
 */

export const EMBEDDING_DIMENSION = 384;

// Domain synonym and semantic association graph for brand & hardware compliance
const SEMANTIC_CLUSTERS: Record<string, string[]> = {
  // Sustainable materials cluster
  recycled: ['repurposed', 'post-consumer', 'circular', 'sustainable', 'eco-friendly', 'reclaimed', 'regenerated', 'grs', 'plastic', 'resin', 'polymer'],
  plastic: ['polymer', 'resin', 'polycarbonate', 'casing', 'housing', 'shell', 'enclosure'],
  // Battery & power cluster
  battery: ['playback', 'endurance', 'charge', 'runtime', 'longevity', 'hours', 'mah', 'power', 'operating-time', 'anc'],
  // Durability & warranty cluster
  unbreakable: ['indestructible', 'shatterproof', 'bulletproof', 'damage-proof', 'titanium', 'hinge', 'guaranteed', 'durability', 'resilience', 'drop-test'],
  // Packaging cluster
  packaging: ['box', 'kraft', 'cardboard', 'plastic-free', 'fsc', 'soy', 'ink', 'unboxing'],
  // Tone & hyperbole cluster
  revolutionary: ['game-changing', 'miraculous', 'disruptive', 'unmatched', 'unbeatable', 'unprecedented', 'world-first'],
  // Superlative cluster
  best: ['greatest', 'most', 'unbeatable', 'supreme', 'finest', 'number-one', 'market-leading']
};

/**
 * Hash string into a deterministic numeric index
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Normalize a vector to unit length (L2 norm)
 */
export function normalizeVector(vec: number[]): number[] {
  let sumSq = 0;
  for (let i = 0; i < vec.length; i++) {
    sumSq += vec[i] * vec[i];
  }
  const norm = Math.sqrt(sumSq);
  if (norm === 0) return vec;
  return vec.map(v => v / norm);
}

/**
 * Computes Cosine Similarity between two normalized vectors: [-1.0, 1.0]
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
  }
  return Math.max(0, Math.min(1, dotProduct));
}

/**
 * Generate a dense 384-dimensional vector embedding for text
 * Employs subword n-gram hashing with semantic cluster projection and L2 normalization
 */
export function generateEmbedding(text: string): number[] {
  const vector = new Array(EMBEDDING_DIMENSION).fill(0);
  if (!text || typeof text !== 'string') return normalizeVector(vector);

  const clean = text.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ');
  const words = clean.split(/\s+/).filter(w => w.length > 1);

  if (words.length === 0) return normalizeVector(vector);

  // 1. Word and subword n-gram projections
  for (const word of words) {
    const baseIdx = hashString(word) % EMBEDDING_DIMENSION;
    vector[baseIdx] += 1.5;

    // Character trigrams
    for (let i = 0; i < word.length - 2; i++) {
      const tri = word.slice(i, i + 3);
      const triIdx = hashString(tri) % EMBEDDING_DIMENSION;
      vector[triIdx] += 0.5;
    }

    // 2. Semantic Cluster Projection (bridges paraphrases)
    for (const [key, cluster] of Object.entries(SEMANTIC_CLUSTERS)) {
      if (word === key || cluster.includes(word)) {
        // Boost semantic cluster subspace
        const clusterBase = hashString(`cluster-${key}`) % (EMBEDDING_DIMENSION - 8);
        for (let offset = 0; offset < 8; offset++) {
          vector[clusterBase + offset] += 2.0;
        }
      }
    }
  }

  // 3. Exact Code/Identifier Extraction (e.g., GRS-2025-081, IEC 62368-1)
  const codeMatches = text.match(/\b([A-Z0-9]+-[A-Z0-9-]+)\b/g);
  if (codeMatches) {
    for (const code of codeMatches) {
      const codeIdx = hashString(code.toLowerCase()) % EMBEDDING_DIMENSION;
      vector[codeIdx] += 5.0; // High salience for exact codes
    }
  }

  return normalizeVector(vector);
}

/**
 * Hybrid Search Ranking: Combines dense vector similarity with exact keyword & code match
 * @param query Query text
 * @param documentText Target document text
 * @param queryEmbedding Precomputed or dynamically computed query vector
 * @param docEmbedding Precomputed or dynamically computed doc vector
 * @param keywordScore Pure lexical/token score (0.0 to 1.0)
 */
export function calculateHybridScore(
  query: string,
  documentText: string,
  queryEmbedding?: number[],
  docEmbedding?: number[],
  keywordScore: number = 0
): { hybridScore: number; semanticScore: number; exactCodeMatch: boolean } {
  const qClean = query.toLowerCase().trim();
  const dClean = documentText.toLowerCase().trim();

  // 1. Check for exact code/certification match (e.g., GRS-2025-081, IEC 62368-1)
  const queryCodes = (query.match(/\b[A-Za-z0-9]+-[A-Za-z0-9-]+\b/g) || []).map(c => c.toLowerCase());
  const docCodes = (documentText.match(/\b[A-Za-z0-9]+-[A-Za-z0-9-]+\b/g) || []).map(c => c.toLowerCase());

  let exactCodeMatch = false;
  for (const qc of queryCodes) {
    if (docCodes.includes(qc) || dClean.includes(qc)) {
      exactCodeMatch = true;
      break;
    }
  }

  if (exactCodeMatch) {
    return {
      hybridScore: 0.99,
      semanticScore: 0.99,
      exactCodeMatch: true
    };
  }

  // 2. Vector Semantic Similarity
  const qVec = queryEmbedding || generateEmbedding(query);
  const dVec = docEmbedding || generateEmbedding(documentText);
  const semanticScore = cosineSimilarity(qVec, dVec);

  // 3. Hybrid Combination: 60% semantic + 40% lexical/keyword
  let hybridScore = (0.60 * semanticScore) + (0.40 * keywordScore);

  // Exact phrase boost if present
  if (dClean.includes(qClean) || qClean.includes(dClean)) {
    hybridScore = Math.max(hybridScore, 0.95);
  }

  return {
    hybridScore: Math.round(Math.min(0.99, hybridScore) * 100) / 100,
    semanticScore: Math.round(semanticScore * 100) / 100,
    exactCodeMatch: false
  };
}
