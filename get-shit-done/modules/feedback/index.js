/**
 * GSD Feedback Module - Placeholder
 *
 * This is a placeholder for the Phase 2 feedback implementation.
 * Future implementation will collect user feedback on task execution quality.
 *
 * @module @gsd/feedback
 */

/**
 * Collect feedback on task execution
 *
 * @param {Object} task - The completed task
 * @param {Object} execution - Execution metadata
 * @param {string} mode - Feedback mode (human/opus)
 * @returns {Promise<Object>} Feedback result
 *
 * @future Will support human and Opus modes
 * @future Will implement three frequencies: all, escalations, sample
 * @future Will use task fingerprinting for pattern detection
 * @future Will log to JSONL for analytics
 */
async function collectFeedback(task, execution, mode = 'human') {
  console.warn('[feedback] Using placeholder - feedback collection not yet implemented');

  return {
    collected: false,
    mode,
    feedback: null,
    timestamp: new Date().toISOString()
  };
}

/**
 * Get feedback statistics
 *
 * @param {Object} options - Query options (timeRange, model, etc.)
 * @returns {Object} Feedback statistics
 */
function getFeedbackStats(options = {}) {
  console.warn('[feedback] Using placeholder - feedback stats not yet implemented');

  return {
    total: 0,
    byMode: { human: 0, opus: 0 },
    averageRating: null,
    patterns: []
  };
}

module.exports = {
  collectFeedback,
  getFeedbackStats
};
