#!/usr/bin/env node

/**
 * knowledge-dedup.js
 * Three-stage deduplication for knowledge entries
 *
 * Stage 1: Content hash (exact match)
 * Stage 2: Canonical hash (normalized match)
 * Stage 3: Embedding similarity (semantic match)
 */

const crypto = require('crypto');

// Thresholds from research (04-RESEARCH.md)
const DEDUP_THRESHOLDS = {
  exact: 1.0,           // Stage 1: content hash
  canonical: 0.95,      // Stage 2: canonical hash
  embedding: 0.88       // Stage 3: vector similarity
};

/**
 * Compute SHA-256 hash of content (exact match)
 * @param {string} content - Raw content
 * @returns {string} Hex-encoded hash
 */
function computeContentHash(content) {
  return crypto.createHash('sha256').update(content.trim()).digest('hex');
}

/**
 * Compute canonical hash (normalized for case/punctuation/whitespace)
 * @param {string} content - Raw content
 * @returns {string} Hex-encoded hash
 */
function computeCanonicalHash(content) {
  const canonical = content
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,;:!?'"]/g, '')
    .trim();
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

/**
 * Stage 1: Check for exact content match
 * @param {object} db - SQLite database instance
 * @param {string} content - Content to check
 * @returns {object} Duplicate result
 */
function checkExactDuplicate(db, content) {
  const hash = computeContentHash(content);
  const existing = db.prepare(
    'SELECT id, content FROM knowledge WHERE content_hash = ?'
  ).get(hash);

  if (existing) {
    return {
      isDuplicate: true,
      stage: 'exact',
      existingId: existing.id,
      existingContent: existing.content,
      similarity: 1.0
    };
  }

  return { isDuplicate: false, contentHash: hash };
}

/**
 * Stage 2: Check for canonical match (normalized)
 * @param {object} db - SQLite database instance
 * @param {string} content - Content to check
 * @returns {object} Duplicate result
 */
function checkCanonicalDuplicate(db, content) {
  const canonical = computeCanonicalHash(content);

  // Store canonical_hash in metadata, so we query via json_extract
  const matches = db.prepare(`
    SELECT id, content, metadata
    FROM knowledge
    WHERE json_extract(metadata, '$.canonical_hash') = ?
  `).all(canonical);

  if (matches.length > 0) {
    return {
      isDuplicate: true,
      stage: 'canonical',
      existingId: matches[0].id,
      existingContent: matches[0].content,
      similarity: 0.95
    };
  }

  return { isDuplicate: false, canonicalHash: canonical };
}

/**
 * Stage 3: Find similar entries by embedding
 * @param {object} conn - Database connection object
 * @param {Float32Array|Buffer} embedding - Query embedding
 * @param {object} options - Search options
 * @returns {Promise<Array>} Similar entries
 */
async function findSimilarByEmbedding(conn, embedding, options = {}) {
  const { threshold = 0.88, limit = 5 } = options;

  if (!embedding || !conn.vectorEnabled) {
    return [];
  }

  const { db } = conn;

  // sqlite-vec uses distance (0 = identical, 2 = opposite for cosine)
  // Convert similarity threshold to distance: distance = 2 * (1 - similarity)
  const maxDistance = 2 * (1 - threshold);

  try {
    // Query vec0 table with k parameter
    const k = limit * 2;  // Fetch extra to account for filtering
    const results = db.prepare(`
      SELECT
        k.id,
        k.content,
        k.type,
        k.metadata,
        v.distance
      FROM knowledge_vec v
      JOIN knowledge k ON v.rowid = k.id
      WHERE v.embedding MATCH ? AND k = ?
      ORDER BY v.distance
      LIMIT ?
    `).all(embedding, k, limit);

    // Filter by threshold and convert distance to similarity
    return results
      .filter(r => r.distance <= maxDistance)
      .map(r => ({
        id: r.id,
        content: r.content,
        type: r.type,
        metadata: r.metadata ? JSON.parse(r.metadata) : {},
        distance: r.distance,
        similarity: 1 - (r.distance / 2)  // Convert cosine distance to similarity
      }));
  } catch (err) {
    console.warn('[dedup] Vector search failed:', err.message);
    return [];
  }
}

/**
 * Stage 3: Check for embedding-based duplicate
 * @param {object} conn - Database connection object
 * @param {Float32Array|Buffer} embedding - Query embedding
 * @param {number} threshold - Similarity threshold (default: 0.88)
 * @returns {Promise<object>} Duplicate result
 */
async function checkEmbeddingDuplicate(conn, embedding, threshold = 0.88) {
  const similar = await findSimilarByEmbedding(conn, embedding, { threshold, limit: 1 });

  if (similar.length > 0) {
    return {
      isDuplicate: true,
      stage: 'embedding',
      existingId: similar[0].id,
      existingContent: similar[0].content,
      similarity: similar[0].similarity,
      distance: similar[0].distance
    };
  }

  return { isDuplicate: false };
}

/**
 * Three-stage duplicate check
 * @param {object} conn - Database connection object
 * @param {string} content - Content to check
 * @param {Float32Array|Buffer} embedding - Optional embedding
 * @returns {Promise<object>} Duplicate result
 */
async function checkDuplicate(conn, content, embedding = null) {
  const { db } = conn;

  // Stage 1: Exact content hash
  const exactCheck = checkExactDuplicate(db, content);
  if (exactCheck.isDuplicate) {
    return exactCheck;
  }

  // Stage 2: Canonical hash
  const canonicalCheck = checkCanonicalDuplicate(db, content);
  if (canonicalCheck.isDuplicate) {
    return canonicalCheck;
  }

  // Stage 3: Embedding similarity (if embedding provided)
  if (embedding && conn.vectorEnabled) {
    const embeddingCheck = await checkEmbeddingDuplicate(conn, embedding);
    if (embeddingCheck.isDuplicate) {
      return embeddingCheck;
    }
  }

  // Not a duplicate
  return {
    isDuplicate: false,
    contentHash: exactCheck.contentHash,
    canonicalHash: canonicalCheck.canonicalHash
  };
}

module.exports = {
  DEDUP_THRESHOLDS,
  computeContentHash,
  computeCanonicalHash,
  checkExactDuplicate,
  checkCanonicalDuplicate,
  findSimilarByEmbedding,
  checkEmbeddingDuplicate,
  checkDuplicate
};
