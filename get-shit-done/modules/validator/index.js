/**
 * GSD Validator Module - Placeholder
 *
 * This is a placeholder for the Phase 2 validator implementation.
 * Future implementation will validate task outputs against plan specifications.
 *
 * @module @gsd/validator
 */

/**
 * Validate task output against plan specifications
 *
 * @param {Object} taskOutput - The task output to validate
 * @param {Object} planSpec - The plan specification to validate against
 * @returns {Object} Validation result with score and issues
 *
 * @future Will implement three validation depths: light, standard, thorough
 * @future Will auto-retry on scores < 70
 * @future Will log to JSONL for analytics
 */
function validate(taskOutput, planSpec) {
  console.warn('[validator] Using placeholder - actual validation not yet implemented');
  return {
    valid: true,
    score: 100,
    issues: [],
    depth: 'light'
  };
}

/**
 * Validate a specific task's completion criteria
 *
 * @param {Object} task - The task to validate
 * @returns {boolean} Whether task meets done criteria
 *
 * @future Will check must_haves, artifacts, key_links from plan
 */
function validateTask(task) {
  console.warn('[validator] Using placeholder - task validation not yet implemented');
  return true;
}

module.exports = {
  validate,
  validateTask
};
