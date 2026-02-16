/**
 * Failure Handler Module
 *
 * Provides retry logic with exponential backoff and user escalation for handling
 * transient errors during roadmap execution.
 */

class FailureHandler {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.baseDelay = options.baseDelay || 1000;
    this.maxDelay = options.maxDelay || 30000;
    this.jitterFactor = options.jitterFactor || 0.2;
  }

  /**
   * Patterns for errors that should be retried automatically
   */
  static RETRYABLE_PATTERNS = [
    /ECONNRESET/,
    /ETIMEDOUT/,
    /rate limit/i,
    /429/,
    /503/,
    /temporary/i,
    /ENOTFOUND/,
  ];

  /**
   * Check if an error matches retryable patterns
   * @param {Error|Object} error - The error to check
   * @returns {boolean} - Whether the error is retryable
   */
  isRetryable(error) {
    const message = error?.message || error?.toString() || '';
    return FailureHandler.RETRYABLE_PATTERNS.some(pattern => pattern.test(message));
  }

  /**
   * Calculate exponential backoff delay with jitter
   * @param {number} attempt - The current attempt number (0-indexed)
   * @returns {number} - Delay in milliseconds
   */
  calculateBackoff(attempt) {
    // Exponential backoff: baseDelay * 2^attempt, capped at maxDelay
    const exponential = Math.min(this.baseDelay * Math.pow(2, attempt), this.maxDelay);

    // Add jitter to prevent thundering herd
    // Jitter range: ±(exponential * jitterFactor / 2)
    const jitter = exponential * this.jitterFactor * (Math.random() - 0.5);

    return Math.floor(exponential + jitter);
  }

  /**
   * Promise-based sleep utility
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Format a human-readable failure message
   * @param {Error} error - The error that occurred
   * @param {Object} context - Context about the operation
   * @param {number} retries - Number of retries attempted
   * @returns {string} - Formatted message
   */
  formatFailureMessage(error, context, retries) {
    const lines = [
      'Operation failed after retries',
      `Context: ${context?.operation || 'unknown'}`,
      `Error: ${error?.message || error}`,
      `Retries attempted: ${retries}`,
    ];

    if (context?.phase) {
      lines.splice(1, 0, `Phase: ${context.phase}`);
    }
    if (context?.plan) {
      lines.splice(2, 0, `Plan: ${context.plan}`);
    }

    return lines.join('\n');
  }

  /**
   * Execute an operation with automatic retry logic
   * @param {Function} operation - Async function to execute
   * @param {Object} context - Context about the operation (for logging/error messages)
   * @returns {Promise<Object>} - Result object with success/result/error/retries
   */
  async executeWithRetry(operation, context = {}) {
    let lastError = null;
    let retries = 0;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await operation();
        return {
          success: true,
          result,
          retries: attempt,
        };
      } catch (error) {
        lastError = error;

        // If this was the last attempt, don't retry
        if (attempt === this.maxRetries) {
          break;
        }

        // Check if error is retryable
        if (!this.isRetryable(error)) {
          // Non-retryable error - fail immediately
          break;
        }

        // Calculate backoff and wait
        const delay = this.calculateBackoff(attempt);
        retries = attempt + 1;

        if (context.verbose) {
          console.error(`Attempt ${attempt + 1} failed: ${error.message}`);
          console.error(`Retrying in ${delay}ms...`);
        }

        await this.sleep(delay);
      }
    }

    // All retries exhausted or non-retryable error
    return {
      success: false,
      error: lastError,
      retries,
      context,
      options: {
        retry: 'Try operation again manually',
        skip: 'Skip this operation and continue',
        escalate: 'Stop execution and require human intervention',
      },
    };
  }
}

/**
 * Standalone convenience wrapper for retry logic
 * @param {Function} operation - Async function to execute
 * @param {Object} context - Context about the operation
 * @param {Object} options - FailureHandler options
 * @returns {Promise<Object>} - Result object
 */
async function executeWithRetry(operation, context = {}, options = {}) {
  const handler = new FailureHandler(options);
  return handler.executeWithRetry(operation, context);
}

module.exports = {
  FailureHandler,
  executeWithRetry,
};
