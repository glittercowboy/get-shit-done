/**
 * Roadmap Parser — Parse ROADMAP.md and compute DAG-based execution order
 *
 * Functions:
 * - parseRoadmap(roadmapPath) — Parse ROADMAP.md into structured phases array
 * - buildDAG(phases) — Build adjacency list from dependencies
 * - getExecutionOrder(phases) — Kahn's algorithm for topological sort
 * - detectParallelOpportunities(graph, order) — Group phases that can run parallel
 * - verifyDependenciesMet(phases, targetPhase) — Check if phase can execute
 * - getNextExecutablePhases(phases) — Find all phases that can start
 * - validatePhaseCompletion(phaseNumber) — Verify phase actually complete
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

/**
 * Parse ROADMAP.md into structured phases array
 *
 * @param {string} roadmapPath - Path to ROADMAP.md
 * @returns {Promise<{phases: Array, total: number, roadmap_path: string}>}
 */
async function parseRoadmap(roadmapPath) {
  // Check if file exists
  if (!fs.existsSync(roadmapPath)) {
    return { error: 'ROADMAP.md not found', phases: [], total: 0 };
  }

  const phases = [];
  let currentPhase = null;
  let inSuccessCriteria = false;
  let inPlans = false;

  const fileStream = fs.createReadStream(roadmapPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    // Phase header: ### Phase N: Name
    const phaseMatch = line.match(/^###\s+Phase\s+(\d+):\s+(.+)/);
    if (phaseMatch) {
      // Save previous phase
      if (currentPhase) phases.push(currentPhase);

      currentPhase = {
        number: parseInt(phaseMatch[1]),
        name: phaseMatch[2].trim(),
        goal: '',
        depends_on: [],
        requirements: [],
        success_criteria: [],
        status: 'pending',
        plans_count: 0,
        plans: []
      };
      inSuccessCriteria = false;
      inPlans = false;
      continue;
    }

    if (!currentPhase) continue;

    // Goal: **Goal**: Text
    if (line.startsWith('**Goal**:')) {
      currentPhase.goal = line.replace(/^\*\*Goal\*\*:\s*/, '').trim();
      continue;
    }

    // Dependencies: **Depends on**: Phase 1, Phase 2, Phase 5
    if (line.startsWith('**Depends on**:')) {
      const depsText = line.replace(/^\*\*Depends on\*\*:\s*/, '').trim();
      // Handle "Nothing (first phase)" or "Nothing (parallel)"
      if (!depsText.toLowerCase().includes('nothing')) {
        currentPhase.depends_on = depsText
          .split(',')
          .map(dep => {
            const match = dep.match(/Phase\s+(\d+)/);
            return match ? parseInt(match[1]) : null;
          })
          .filter(n => n !== null);
      }
      continue;
    }

    // Requirements: **Requirements**: REQ-01, REQ-02, REQ-03
    if (line.startsWith('**Requirements**:')) {
      const reqText = line.replace(/^\*\*Requirements\*\*:\s*/, '').trim();
      currentPhase.requirements = reqText
        .split(',')
        .map(r => r.trim())
        .filter(r => r.length > 0);
      continue;
    }

    // Success Criteria section start
    if (line.includes('**Success Criteria**')) {
      inSuccessCriteria = true;
      inPlans = false;
      continue;
    }

    // Plans section start
    if (line.startsWith('**Plans:**')) {
      inSuccessCriteria = false;
      inPlans = false;
      const match = line.match(/(\d+)\s+plans?/i);
      if (match) currentPhase.plans_count = parseInt(match[1]);
      continue;
    }

    // Plans list section
    if (line.startsWith('Plans:')) {
      inSuccessCriteria = false;
      inPlans = true;
      continue;
    }

    // Success criteria items (numbered list, indented)
    if (inSuccessCriteria && line.match(/^\s+\d+\.\s+/)) {
      currentPhase.success_criteria.push(
        line.replace(/^\s+\d+\.\s+/, '').trim()
      );
      continue;
    }

    // Plan items (checkbox list: - [ ] or - [x])
    if (inPlans && line.match(/^\s*-\s+\[([ x])\]\s+/)) {
      const planMatch = line.match(/^\s*-\s+\[([x ])\]\s+(.+)/);
      if (planMatch) {
        const [, checked, planText] = planMatch;
        currentPhase.plans.push({
          completed: checked === 'x',
          text: planText.trim()
        });
      }
      continue;
    }

    // End success criteria if we hit a different section
    if (inSuccessCriteria && line.startsWith('**') && !line.includes('Success Criteria')) {
      inSuccessCriteria = false;
    }

    // End plans if we hit a different section
    if (inPlans && line.startsWith('###')) {
      inPlans = false;
    }
  }

  // Don't forget the last phase
  if (currentPhase) phases.push(currentPhase);

  return {
    phases: phases,
    total: phases.length,
    roadmap_path: roadmapPath
  };
}

/**
 * Build dependency graph (adjacency list) from phases
 *
 * @param {Array} phases - Parsed phases from parseRoadmap
 * @returns {{graph: Map, inDegree: Map}}
 */
function buildDAG(phases) {
  const graph = new Map();
  const inDegree = new Map();

  // Initialize graph and inDegree
  for (const phase of phases) {
    graph.set(phase.number, phase.depends_on || []);
    inDegree.set(phase.number, (phase.depends_on || []).length);
  }

  return { graph, inDegree };
}

/**
 * Compute execution order using Kahn's algorithm (topological sort)
 * Detects circular dependencies
 *
 * @param {Array} phases - Parsed phases from parseRoadmap
 * @returns {{execution_order: Array<number>, has_cycle: boolean, cycle_phases?: Array<number>}}
 */
function getExecutionOrder(phases) {
  const { graph, inDegree } = buildDAG(phases);
  const queue = [];
  const executionOrder = [];

  // Start with phases that have no dependencies (inDegree === 0)
  for (const [phaseNum, degree] of inDegree.entries()) {
    if (degree === 0) {
      queue.push(phaseNum);
    }
  }

  // Process queue
  while (queue.length > 0) {
    const current = queue.shift();
    executionOrder.push(current);

    // For each phase that depends on current phase
    for (const [phaseNum, deps] of graph.entries()) {
      if (deps.includes(current)) {
        const newDegree = inDegree.get(phaseNum) - 1;
        inDegree.set(phaseNum, newDegree);

        // If all dependencies satisfied, add to queue
        if (newDegree === 0) {
          queue.push(phaseNum);
        }
      }
    }
  }

  // Detect cycle: if not all phases processed, there's a cycle
  if (executionOrder.length !== phases.length) {
    const missing = phases
      .filter(p => !executionOrder.includes(p.number))
      .map(p => p.number);

    return {
      execution_order: executionOrder,
      has_cycle: true,
      cycle_phases: missing
    };
  }

  return {
    execution_order: executionOrder,
    has_cycle: false
  };
}

/**
 * Detect phases that can run in parallel
 * Groups phases by execution level (same depth in DAG)
 *
 * @param {Map} graph - Dependency graph from buildDAG
 * @param {Array<number>} order - Execution order from getExecutionOrder
 * @returns {Array<Array<number>>} - Batches of parallel phase numbers
 */
function detectParallelOpportunities(graph, order) {
  const parallel = [];
  const processed = new Set();

  for (const phaseNum of order) {
    if (processed.has(phaseNum)) continue;

    const deps = graph.get(phaseNum) || [];

    // Find other phases that can run with current phase
    // (no mutual dependencies)
    const canRunWith = order.filter(other =>
      other !== phaseNum &&
      !processed.has(other) &&
      !deps.includes(other) &&
      !(graph.get(other) || []).includes(phaseNum)
    );

    if (canRunWith.length > 0) {
      // Group phases that can run together
      parallel.push([phaseNum, ...canRunWith]);
      canRunWith.forEach(p => processed.add(p));
    } else {
      // Single phase batch
      parallel.push([phaseNum]);
    }

    processed.add(phaseNum);
  }

  return parallel;
}

/**
 * Check if a phase's dependencies are met (all dependencies complete)
 *
 * @param {Array} phases - Parsed phases with status
 * @param {number} targetPhase - Phase number to check
 * @returns {{can_execute: boolean, blocking: Array<number>, ready: Array<number>}}
 */
function verifyDependenciesMet(phases, targetPhase) {
  const phase = phases.find(p => p.number === targetPhase);

  if (!phase) {
    return {
      can_execute: false,
      blocking: [],
      ready: [],
      error: `Phase ${targetPhase} not found`
    };
  }

  const depends_on = phase.depends_on || [];

  // No dependencies? Can execute
  if (depends_on.length === 0) {
    return { can_execute: true, blocking: [], ready: [] };
  }

  const blocking = [];
  const ready = [];

  for (const depNum of depends_on) {
    const dep = phases.find(p => p.number === depNum);
    if (!dep) {
      blocking.push(depNum); // Dependency not found
      continue;
    }

    if (dep.status === 'complete') {
      ready.push(depNum);
    } else {
      blocking.push(depNum);
    }
  }

  return {
    can_execute: blocking.length === 0,
    blocking,
    ready
  };
}

/**
 * Get all phases that can execute right now (dependencies met, not complete)
 *
 * @param {Array} phases - Parsed phases with status
 * @returns {{executable: Array<number>, blocked: Array<{phase: number, waiting_on: Array<number>}>}}
 */
function getNextExecutablePhases(phases) {
  const executable = [];
  const blocked = [];

  for (const phase of phases) {
    // Skip already complete phases
    if (phase.status === 'complete') continue;

    const { can_execute, blocking } = verifyDependenciesMet(phases, phase.number);

    if (can_execute) {
      executable.push(phase.number);
    } else {
      blocked.push({
        phase: phase.number,
        waiting_on: blocking
      });
    }
  }

  return { executable, blocked };
}

/**
 * Validate that a phase is actually complete
 * Checks for VERIFICATION.md with status: passed and all SUMMARY.md files
 *
 * @param {number} phaseNumber - Phase number to validate
 * @param {string} cwd - Current working directory (project root)
 * @returns {{complete: boolean, missing: Array<string>}}
 */
function validatePhaseCompletion(phaseNumber, cwd = process.cwd()) {
  const missing = [];

  // Find phase directory
  const planningDir = path.join(cwd, '.planning');
  const phasesDir = path.join(planningDir, 'phases');

  if (!fs.existsSync(phasesDir)) {
    return { complete: false, missing: ['phases directory not found'] };
  }

  // Look for phase directory (format: NN-name)
  const phasePattern = new RegExp(`^${phaseNumber.toString().padStart(2, '0')}-`);
  const phaseDirs = fs.readdirSync(phasesDir)
    .filter(d => phasePattern.test(d));

  if (phaseDirs.length === 0) {
    return { complete: false, missing: ['phase directory not found'] };
  }

  const phaseDir = path.join(phasesDir, phaseDirs[0]);

  // Check for VERIFICATION.md
  const verificationPath = path.join(phaseDir, `${phaseNumber.toString().padStart(2, '0')}-VERIFICATION.md`);
  if (!fs.existsSync(verificationPath)) {
    missing.push('VERIFICATION.md');
  } else {
    // Check if status is "passed"
    const content = fs.readFileSync(verificationPath, 'utf-8');
    if (!content.match(/status:\s*passed/i)) {
      missing.push('VERIFICATION.md status not "passed"');
    }
  }

  // Check for SUMMARY.md files (at least one plan should be complete)
  const summaries = fs.readdirSync(phaseDir)
    .filter(f => f.endsWith('-SUMMARY.md'));

  if (summaries.length === 0) {
    missing.push('no SUMMARY.md files found');
  }

  return {
    complete: missing.length === 0,
    missing
  };
}

// ─── Phase Size Validation ────────────────────────────────────────────────────

/**
 * Validate phase sizes against limits
 * @param {Array} phases - Array of phase objects
 * @returns {Object} - Validation result with oversized phases
 */
function validatePhaseSizes(phases) {
  // Lazy load to avoid circular dependencies
  const { detectOversizedPhases } = require('./phase-sizer.js');
  const oversized = detectOversizedPhases(phases);

  return {
    valid: oversized.length === 0,
    oversizedPhases: oversized,
    warnings: oversized.map(o =>
      `WARNING: Phase ${o.phase} has ${o.estimate.requirements} requirements (max recommended: 8)`
    )
  };
}

/**
 * Generate warning messages for oversized phases
 * @param {Object} validationResult - Result from validatePhaseSizes
 * @returns {Array<string>} - Array of warning strings
 */
function warnOnOversizedPhases(validationResult) {
  if (!validationResult || validationResult.valid) {
    return [];
  }

  const warnings = [];
  for (const oversized of validationResult.oversizedPhases) {
    const { formatReport } = require('./phase-sizer.js');
    warnings.push(formatReport(oversized));
  }

  return warnings;
}

/**
 * Parse roadmap and include size validation
 * @param {string} roadmapPath - Path to ROADMAP.md
 * @returns {Promise<Object>} - Parsed roadmap with size validation
 */
async function parseRoadmapWithDAG(roadmapPath) {
  const result = await parseRoadmap(roadmapPath);

  if (result.error) {
    return result;
  }

  const dag = buildDAG(result.phases);
  const executionOrderResult = getExecutionOrder(result.phases);
  const parallelGroups = detectParallelOpportunities(dag.graph, executionOrderResult.execution_order);
  const sizeValidation = validatePhaseSizes(result.phases);

  return {
    ...result,
    dag,
    executionOrder: executionOrderResult,
    parallelGroups,
    sizeValidation
  };
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  parseRoadmap,
  parseRoadmapWithDAG,
  buildDAG,
  getExecutionOrder,
  detectParallelOpportunities,
  verifyDependenciesMet,
  getNextExecutablePhases,
  validatePhaseCompletion,
  validatePhaseSizes,
  warnOnOversizedPhases
};
