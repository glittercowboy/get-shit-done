const { knowledge } = require('./knowledge.js');
const { generateEmbedding } = require('./embeddings.js');

const SYNTHESIS_CONFIG = {
  min_cluster_size: 5,       // Minimum examples to form principle
  confidence_threshold: 0.7, // Minimum confidence for valid principle
  similarity_threshold: 0.6, // Similarity for clustering
  max_principles: 20,        // Limit principles per synthesis run
  stale_days: 30             // Refresh synthesis after N days
};

// Cosine similarity between two embeddings
function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Infer topic from cluster members (simple keyword extraction)
function inferTopic(members) {
  const words = {};
  for (const m of members) {
    const tokens = m.content.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3);

    for (const token of tokens) {
      words[token] = (words[token] || 0) + 1;
    }
  }

  // Get top 3 most common words
  const sorted = Object.entries(words)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([w]) => w);

  return sorted.join('_') || 'general';
}

function calculateAverageSimilarity(embeddings) {
  if (embeddings.length < 2) return 1.0;

  let totalSim = 0, pairs = 0;
  for (let i = 0; i < embeddings.length; i++) {
    for (let j = i + 1; j < embeddings.length; j++) {
      totalSim += cosineSimilarity(embeddings[i], embeddings[j]);
      pairs++;
    }
  }

  return pairs > 0 ? totalSim / pairs : 0;
}

function generatePrincipleText(patterns, topic) {
  // Extract common phrases (simplified)
  // Real implementation would use LLM to synthesize
  const words = patterns[0].split(' ').slice(0, 10).join(' ');
  return `For ${topic.replace(/_/g, ' ')}: ${words}...`;
}

// Simple clustering based on embedding similarity
async function clusterKnowledge(conn, options = {}) {
  const { types = ['decision', 'lesson'], limit = 100 } = options;
  const { db } = conn;

  // Get recent knowledge entries
  const entries = db.prepare(`
    SELECT id, content, type, metadata, created_at
    FROM knowledge
    WHERE type IN (${types.map(() => '?').join(',')})
      AND (expires_at IS NULL OR expires_at > ?)
    ORDER BY created_at DESC
    LIMIT ?
  `).all(...types, Date.now(), limit);

  if (entries.length < SYNTHESIS_CONFIG.min_cluster_size) {
    return { clusters: [], reason: 'insufficient_knowledge' };
  }

  // Generate embeddings for all entries
  const embeddings = new Map();
  for (const entry of entries) {
    const emb = await generateEmbedding(entry.content);
    if (emb) embeddings.set(entry.id, emb);
  }

  // Simple greedy clustering
  const clusters = [];
  const assigned = new Set();

  for (const entry of entries) {
    if (assigned.has(entry.id)) continue;

    const embedding = embeddings.get(entry.id);
    if (!embedding) continue;

    // Start new cluster
    const cluster = {
      seed: entry,
      members: [entry],
      embeddings: [embedding]
    };
    assigned.add(entry.id);

    // Find similar entries
    for (const other of entries) {
      if (assigned.has(other.id)) continue;

      const otherEmb = embeddings.get(other.id);
      if (!otherEmb) continue;

      // Calculate cosine similarity
      const similarity = cosineSimilarity(embedding, otherEmb);

      if (similarity >= SYNTHESIS_CONFIG.similarity_threshold) {
        cluster.members.push(other);
        cluster.embeddings.push(otherEmb);
        assigned.add(other.id);
      }
    }

    // Only keep clusters meeting minimum size
    if (cluster.members.length >= SYNTHESIS_CONFIG.min_cluster_size) {
      cluster.topic = inferTopic(cluster.members);
      cluster.size = cluster.members.length;
      clusters.push(cluster);
    }
  }

  return { clusters };
}

function extractPrinciple(cluster) {
  const { members, topic } = cluster;

  // Find common patterns in member content
  const patterns = members.map(m => m.content);

  // Calculate confidence based on cluster cohesion
  // More members + more similar = higher confidence
  const avgSimilarity = calculateAverageSimilarity(cluster.embeddings);
  const sizeBonus = Math.min(members.length / 10, 0.2);  // Max 0.2 bonus
  const confidence = Math.min(avgSimilarity + sizeBonus, 1.0);

  // Generate principle text (simplified - real would use LLM)
  const principleText = generatePrincipleText(patterns, topic);

  return {
    topic,
    rule: principleText,
    confidence,
    examples: patterns.slice(0, 5),  // Store up to 5 examples
    source_count: members.length,
    source_ids: members.map(m => m.id),
    created_at: Date.now()
  };
}

async function synthesizePrinciples(conn, options = {}) {
  const { db } = conn;

  // Get clusters
  const { clusters, reason } = await clusterKnowledge(conn, options);

  if (reason) {
    return { synthesized: 0, reason };
  }

  const principles = [];

  for (const cluster of clusters.slice(0, SYNTHESIS_CONFIG.max_principles)) {
    const principle = extractPrinciple(cluster);

    // Only store if confidence meets threshold
    if (principle.confidence >= SYNTHESIS_CONFIG.confidence_threshold) {
      // Store as 'principle' type knowledge
      const { insertOrEvolve } = require('./knowledge-evolution.js');
      const embedding = await generateEmbedding(principle.rule);

      const result = await insertOrEvolve(conn, {
        content: principle.rule,
        type: 'principle',
        scope: 'global',  // Principles are global
        embedding,
        metadata: {
          topic: principle.topic,
          confidence: principle.confidence,
          examples: principle.examples,
          source_count: principle.source_count,
          source_ids: principle.source_ids,
          synthesized_at: Date.now()
        }
      });

      principles.push({
        ...principle,
        action: result.action,
        id: result.id
      });
    }
  }

  return {
    synthesized: principles.length,
    clusters_found: clusters.length,
    principles
  };
}

module.exports = {
  SYNTHESIS_CONFIG,
  clusterKnowledge,
  extractPrinciple,
  cosineSimilarity,
  synthesizePrinciples
};
