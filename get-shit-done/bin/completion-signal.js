#!/usr/bin/env node

/**
 * Structured Completion Signals for Multi-Agent Coordination
 *
 * Provides standardized completion signal format for sub-coordinators
 * to report execution status with rich context for decision-making.
 *
 * Pattern source: https://medium.com/@fraidoonomarzai99/multi-agent-systems-complete-guide-689f241b65c8
 */

const COMPLETION_STATUS = {
  SUCCESS: 'success',
  FAILURE: 'failure',
  BLOCKED: 'blocked',
  SKIPPED: 'skipped'
};

/**
 * Structured completion signal format
 */
class CompletionSignal {
  constructor(status, phase, details = {}) {
    this.status = status;
    this.phase = phase;
    this.timestamp = new Date().toISOString();
    this.details = {
      tokensUsed: details.tokensUsed || 0,
      filesModified: details.filesModified || [],
      checkpoints: details.checkpoints || [],
      errors: details.errors || [],
      nextSteps: details.nextSteps || [],
      ...details
    };
  }

  /**
   * Create success signal
   */
  static success(phase, details = {}) {
    return new CompletionSignal(COMPLETION_STATUS.SUCCESS, phase, {
      ...details,
      nextPhaseReady: true,
      verificationStatus: details.verificationStatus || 'passed'
    });
  }

  /**
   * Create failure signal with retry options
   */
  static failure(phase, error, options = {}) {
    return new CompletionSignal(COMPLETION_STATUS.FAILURE, phase, {
      error: error.message || String(error),
      stack: error.stack || null,
      retryable: options.retryable !== false,
      retryOptions: {
        maxRetries: options.maxRetries || 3,
        backoffMs: options.backoffMs || 2000
      },
      skipOption: options.allowSkip !== false,
      escalateOption: options.requiresEscalation || false,
      ...options
    });
  }

  /**
   * Create blocked signal (waiting on dependency or user)
   */
  static blocked(phase, reason, details = {}) {
    return new CompletionSignal(COMPLETION_STATUS.BLOCKED, phase, {
      reason,
      blockingDependencies: details.dependencies || details.blockingDependencies || [],
      userInputRequired: details.userInput || details.userInputRequired || false,
      estimatedUnblockTime: details.eta || details.estimatedUnblockTime || null,
      ...details
    });
  }

  /**
   * Create skipped signal (user chose to skip incomplete phase)
   */
  static skipped(phase, reason) {
    return new CompletionSignal(COMPLETION_STATUS.SKIPPED, phase, {
      reason,
      incomplete: true,
      affectedPhases: [] // Will be populated by caller
    });
  }

  /**
   * Check if completion is terminal (requires user action)
   */
  isTerminal() {
    return this.status === COMPLETION_STATUS.BLOCKED && this.details.userInputRequired;
  }

  /**
   * Check if can automatically retry
   */
  canRetry() {
    return this.status === COMPLETION_STATUS.FAILURE && this.details.retryable;
  }

  /**
   * Serialize for logging
   */
  toJSON() {
    return {
      status: this.status,
      phase: this.phase,
      timestamp: this.timestamp,
      ...this.details
    };
  }
}

module.exports = { CompletionSignal, COMPLETION_STATUS };
