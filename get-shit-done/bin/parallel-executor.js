#!/usr/bin/env node

/**
 * Parallel Phase Executor
 *
 * Enables parallel execution of independent phases when dependency graph allows.
 * Integrates with token budget monitoring for safe fallback to sequential execution.
 *
 * Pattern: Parallel Execution with Worker Pool
 * Source: Phase 7 Research - Pattern 4
 */

const CONFIG = {
  MAX_WORKERS: 2,              // Conservative: max 2 parallel phases
  MIN_TOKEN_BUDGET_PER_PHASE: 50000, // Minimum tokens to start a phase
  FALLBACK_TO_SEQUENTIAL: true // Fall back on budget exhaustion
};

/**
 * Parallel Phase Executor
 *
 * Manages concurrent execution of independent phases using a worker pool model.
 */
class ParallelPhaseExecutor {
  /**
   * @param {number} maxWorkers - Maximum concurrent phases (default: 2)
   */
  constructor(maxWorkers = CONFIG.MAX_WORKERS) {
    this.maxWorkers = maxWorkers;
    this.activePhases = new Map(); // phaseNum -> { startTime, status }
    this.completedPhases = [];
    this.failedPhases = [];
    this.startTime = new Date().toISOString();
  }

  /**
   * Analyze roadmap for parallel execution opportunities
   * @param {Array} phases - Array of phase objects with dependencies
   * @returns {Object} - Analysis with parallel groups
   */
  analyzeParallelOpportunities(phases) {
    // Build dependency graph
    const graph = new Map();
    for (const phase of phases) {
      graph.set(phase.number, phase.depends_on || []);
    }

    // Group phases by dependency level
    const levels = new Map(); // level -> [phase numbers]
    const processed = new Set();

    const getLevel = (phaseNum, visited = new Set()) => {
      if (visited.has(phaseNum)) return -1; // Cycle detection
      if (levels.has(phaseNum)) return levels.get(phaseNum);

      visited.add(phaseNum);
      const deps = graph.get(phaseNum) || [];

      if (deps.length === 0) {
        return 0;
      }

      const depLevels = deps.map(d => getLevel(d, new Set(visited)));
      if (depLevels.includes(-1)) return -1; // Cycle

      return Math.max(...depLevels) + 1;
    };

    // Calculate level for each phase
    const phaseLevels = new Map();
    for (const phase of phases) {
      const level = getLevel(phase.number);
      phaseLevels.set(phase.number, level);

      if (!levels.has(level)) {
        levels.set(level, []);
      }
      levels.get(level).push(phase.number);
    }

    // Convert to parallel groups (sorted by level)
    const sortedLevels = Array.from(levels.keys()).sort((a, b) => a - b);
    const parallelGroups = sortedLevels.map(level => levels.get(level));

    // Calculate max parallelism
    const maxParallelism = Math.max(...parallelGroups.map(g => g.length));

    return {
      parallelGroups,
      totalPhases: phases.length,
      maxParallelism,
      phaseLevels: Object.fromEntries(phaseLevels)
    };
  }

  /**
   * Check if phases can execute in parallel given token budget
   * @param {Array} phases - Phase numbers to check
   * @param {Object} tokenMonitor - TokenBudgetMonitor instance (optional)
   * @returns {Object} - { canParallel, reason }
   */
  canExecuteInParallel(phases, tokenMonitor = null) {
    const requiredTokens = phases.length * CONFIG.MIN_TOKEN_BUDGET_PER_PHASE;

    if (!tokenMonitor) {
      // No monitor = assume sufficient budget
      return {
        canParallel: true,
        reason: 'No token monitor provided, assuming sufficient budget',
        requiredTokens
      };
    }

    const report = tokenMonitor.getReport();
    const availableTokens = report.max_tokens - report.current_usage;

    if (availableTokens >= requiredTokens) {
      return {
        canParallel: true,
        reason: `Sufficient budget: ${availableTokens} available, ${requiredTokens} required`,
        requiredTokens,
        availableTokens
      };
    }

    return {
      canParallel: false,
      reason: `Insufficient budget: ${availableTokens} available, ${requiredTokens} required`,
      requiredTokens,
      availableTokens,
      shortfall: requiredTokens - availableTokens
    };
  }

  /**
   * Reserve tokens for a parallel group
   * @param {Array} phases - Phase numbers
   * @param {Object} tokenMonitor - TokenBudgetMonitor instance
   * @returns {Object} - Reservation result
   */
  reserveTokensForParallelGroup(phases, tokenMonitor) {
    if (!tokenMonitor) {
      return {
        reserved: true,
        tokens: 0,
        warnings: ['No token monitor provided']
      };
    }

    const totalTokens = phases.length * CONFIG.MIN_TOKEN_BUDGET_PER_PHASE;
    const operation = `parallel-group-${phases.join('-')}`;

    const canProceed = tokenMonitor.reserve(totalTokens, operation);
    const report = tokenMonitor.getReport();

    return {
      reserved: canProceed,
      tokens: totalTokens,
      utilization: report.utilization_percent,
      warnings: canProceed ? [] : ['Token budget insufficient for parallel execution']
    };
  }

  /**
   * Execute phases in parallel using Promise.allSettled
   * @param {Array} phaseConfigs - Array of { phaseNum, executor } objects
   * @param {Object} tokenMonitor - Optional token monitor
   * @returns {Promise<Object>} - Execution results
   */
  async executeParallelGroup(phaseConfigs, tokenMonitor = null) {
    const startTime = Date.now();

    // Check token budget
    const phaseNums = phaseConfigs.map(p => p.phaseNum);
    const budgetCheck = this.canExecuteInParallel(phaseNums, tokenMonitor);

    if (!budgetCheck.canParallel && CONFIG.FALLBACK_TO_SEQUENTIAL) {
      return {
        fallback: true,
        reason: 'token_budget',
        details: budgetCheck.reason,
        phases: phaseNums
      };
    }

    // Track active phases
    for (const { phaseNum } of phaseConfigs) {
      this.activePhases.set(phaseNum, {
        startTime: new Date().toISOString(),
        status: 'running'
      });
    }

    // Execute in parallel
    const promises = phaseConfigs.map(async ({ phaseNum, executor }) => {
      try {
        const result = await executor();
        return { phaseNum, status: 'fulfilled', result };
      } catch (error) {
        return { phaseNum, status: 'rejected', error: error.message };
      }
    });

    const results = await Promise.allSettled(promises);
    const duration = Date.now() - startTime;

    // Process results
    let totalTokens = 0;
    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { phaseNum, status, result: phaseResult } = result.value;
        if (status === 'fulfilled') {
          this.completedPhases.push({
            phaseNum,
            completedAt: new Date().toISOString(),
            tokensUsed: phaseResult?.tokensUsed || CONFIG.MIN_TOKEN_BUDGET_PER_PHASE
          });
          totalTokens += phaseResult?.tokensUsed || CONFIG.MIN_TOKEN_BUDGET_PER_PHASE;
        } else {
          this.failedPhases.push({
            phaseNum,
            error: result.value.error,
            failedAt: new Date().toISOString()
          });
        }
        this.activePhases.delete(phaseNum);
      }
    }

    return {
      results: results.map(r => r.value),
      totalTokens,
      duration,
      parallel: true
    };
  }

  /**
   * Execute phases sequentially (fallback)
   * @param {Array} phaseConfigs - Array of { phaseNum, executor } objects
   * @param {Object} tokenMonitor - Optional token monitor
   * @returns {Promise<Object>} - Execution results
   */
  async executeSequentially(phaseConfigs, tokenMonitor = null) {
    const startTime = Date.now();
    const results = [];
    let totalTokens = 0;

    for (const { phaseNum, executor } of phaseConfigs) {
      this.activePhases.set(phaseNum, {
        startTime: new Date().toISOString(),
        status: 'running'
      });

      try {
        const result = await executor();
        results.push({ phaseNum, status: 'fulfilled', result });
        this.completedPhases.push({
          phaseNum,
          completedAt: new Date().toISOString(),
          tokensUsed: result?.tokensUsed || CONFIG.MIN_TOKEN_BUDGET_PER_PHASE
        });
        totalTokens += result?.tokensUsed || CONFIG.MIN_TOKEN_BUDGET_PER_PHASE;
      } catch (error) {
        results.push({ phaseNum, status: 'rejected', error: error.message });
        this.failedPhases.push({
          phaseNum,
          error: error.message,
          failedAt: new Date().toISOString()
        });
      }

      this.activePhases.delete(phaseNum);
    }

    return {
      results,
      totalTokens,
      duration: Date.now() - startTime,
      parallel: false
    };
  }

  /**
   * Execute all phase groups (main orchestration)
   * @param {Array<Array>} parallelGroups - Groups of phase numbers
   * @param {Map} phaseMap - Map of phaseNum -> executor function
   * @param {Object} tokenMonitor - Optional token monitor
   * @returns {Promise<Object>} - Comprehensive execution results
   */
  async executePhaseGroups(parallelGroups, phaseMap, tokenMonitor = null) {
    const stats = {
      parallel: 0,
      sequential: 0,
      failed: 0,
      fallbacks: 0
    };

    const allResults = [];

    for (const group of parallelGroups) {
      const phaseConfigs = group.map(phaseNum => ({
        phaseNum,
        executor: phaseMap.get(phaseNum)
      })).filter(p => p.executor);

      if (phaseConfigs.length === 0) continue;

      if (phaseConfigs.length === 1) {
        // Single phase: execute directly
        const result = await this.executeSequentially(phaseConfigs, tokenMonitor);
        allResults.push(...result.results);
        stats.sequential++;
      } else {
        // Multiple phases: try parallel
        const budgetCheck = this.canExecuteInParallel(group, tokenMonitor);

        if (budgetCheck.canParallel) {
          const result = await this.executeParallelGroup(phaseConfigs, tokenMonitor);

          if (result.fallback) {
            // Fell back to sequential
            const seqResult = await this.executeSequentially(phaseConfigs, tokenMonitor);
            allResults.push(...seqResult.results);
            stats.sequential++;
            stats.fallbacks++;
          } else {
            allResults.push(...result.results);
            stats.parallel++;
          }
        } else {
          // Budget insufficient, run sequentially
          const result = await this.executeSequentially(phaseConfigs, tokenMonitor);
          allResults.push(...result.results);
          stats.sequential++;
          stats.fallbacks++;
        }
      }
    }

    stats.failed = this.failedPhases.length;

    return {
      results: allResults,
      stats,
      completed: this.completedPhases,
      failed: this.failedPhases
    };
  }

  /**
   * Handle failure of one phase in parallel group
   * @param {Array} phases - All phases in the group
   * @param {number} failedPhase - The failed phase number
   * @param {Object} tokenMonitor - Optional token monitor
   * @returns {Object} - Handling recommendation
   */
  handleParallelFailure(phases, failedPhase, tokenMonitor = null) {
    // Let other phases continue
    const remainingPhases = phases.filter(p => p !== failedPhase);

    // Record the failure
    if (!this.failedPhases.find(f => f.phaseNum === failedPhase)) {
      this.failedPhases.push({
        phaseNum: failedPhase,
        error: 'Phase failed during parallel execution',
        failedAt: new Date().toISOString()
      });
    }

    return {
      shouldContinue: true,
      failedPhase,
      remainingPhases,
      recommendation: 'Continue with remaining phases, retry failed phase later'
    };
  }

  /**
   * Execute with full token awareness
   * @param {Array} phases - Phase objects
   * @param {Map} phaseMap - Map of phaseNum -> executor function
   * @param {string} tokenBudgetPath - Path to token budget JSON
   * @returns {Promise<Object>} - Comprehensive results
   */
  async executeWithTokenAwareness(phases, phaseMap, tokenBudgetPath = null) {
    let tokenMonitor = null;

    if (tokenBudgetPath) {
      try {
        const fs = require('fs');
        if (fs.existsSync(tokenBudgetPath)) {
          const { TokenBudgetMonitor } = require('./token-monitor.js');
          const data = JSON.parse(fs.readFileSync(tokenBudgetPath, 'utf-8'));
          tokenMonitor = TokenBudgetMonitor.fromJSON(data);
        }
      } catch (e) {
        // Continue without monitor
      }
    }

    // Analyze parallel opportunities
    const analysis = this.analyzeParallelOpportunities(phases);

    // Execute groups
    const results = await this.executePhaseGroups(
      analysis.parallelGroups,
      phaseMap,
      tokenMonitor
    );

    return {
      analysis,
      ...results,
      tokenBudget: tokenMonitor ? tokenMonitor.getReport() : null
    };
  }

  /**
   * Get current execution status
   * @returns {Object} - Status summary
   */
  getStatus() {
    return {
      active: Array.from(this.activePhases.entries()).map(([num, data]) => ({
        phase: num,
        ...data
      })),
      completed: this.completedPhases.length,
      failed: this.failedPhases.length,
      progress: this.completedPhases.length + this.failedPhases.length,
      startTime: this.startTime
    };
  }

  /**
   * Serialize state for checkpoint persistence
   * @returns {Object} - Serializable state
   */
  toJSON() {
    return {
      maxWorkers: this.maxWorkers,
      activePhases: Array.from(this.activePhases.entries()),
      completedPhases: this.completedPhases,
      failedPhases: this.failedPhases,
      startTime: this.startTime
    };
  }

  /**
   * Restore state from checkpoint
   * @param {Object} data - Serialized state
   * @returns {ParallelPhaseExecutor} - Restored instance
   */
  static fromJSON(data) {
    const executor = new ParallelPhaseExecutor(data.maxWorkers);
    executor.activePhases = new Map(data.activePhases || []);
    executor.completedPhases = data.completedPhases || [];
    executor.failedPhases = data.failedPhases || [];
    executor.startTime = data.startTime;
    return executor;
  }
}

// Standalone function wrappers
function analyzeParallelOpportunities(phases) {
  const executor = new ParallelPhaseExecutor();
  return executor.analyzeParallelOpportunities(phases);
}

async function executeParallelGroups(parallelGroups, phaseMap, tokenMonitor = null) {
  const executor = new ParallelPhaseExecutor();
  return executor.executePhaseGroups(parallelGroups, phaseMap, tokenMonitor);
}

// Exports
module.exports = {
  ParallelPhaseExecutor,
  analyzeParallelOpportunities,
  executeParallelGroups,
  CONFIG
};

// CLI interface when run directly
if (require.main === module) {
  console.log('ParallelPhaseExecutor module loaded successfully');
  console.log('Exports:', Object.keys(module.exports).join(', '));
  console.log('Config:', CONFIG);

  // Quick test
  const executor = new ParallelPhaseExecutor(2);
  console.log('Executor created, status:', executor.getStatus());

  const testPhases = [
    { number: 1, depends_on: [] },
    { number: 2, depends_on: [] },
    { number: 3, depends_on: [1, 2] },
    { number: 4, depends_on: [3] }
  ];

  const analysis = executor.analyzeParallelOpportunities(testPhases);
  console.log('\nParallel analysis:');
  console.log('Groups:', analysis.parallelGroups);
  console.log('Max parallelism:', analysis.maxParallelism);
}
