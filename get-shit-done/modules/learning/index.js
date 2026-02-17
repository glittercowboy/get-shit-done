/**
 * GSD Learning Module - Placeholder
 *
 * This is a placeholder for the Phase 2 learning implementation.
 * Future implementation will extract patterns from feedback and update routing rules.
 *
 * @module @gsd/learning
 */

/**
 * Learn from feedback and update routing patterns
 *
 * @param {Object} feedback - Feedback data to learn from
 * @returns {Promise<Object>} Learning result with extracted patterns
 *
 * @future Will implement multi-signal pattern extraction
 * @future Will require evidence threshold of 3 entries to override rules
 * @future Will consolidate patterns with >50% keyword overlap
 * @future Will output learned rules in markdown format
 */
async function learn(feedback) {
  console.warn('[learning] Using placeholder - pattern learning not yet implemented');

  return {
    learned: false,
    patterns: [],
    rulesUpdated: false
  };
}

/**
 * Get learned patterns from historical feedback
 *
 * @param {Object} options - Query options (minConfidence, category, etc.)
 * @returns {Array<Object>} Learned patterns with confidence scores
 */
function getPatterns(options = {}) {
  console.warn('[learning] Using placeholder - pattern retrieval not yet implemented');

  return [];
}

module.exports = {
  learn,
  getPatterns
};
