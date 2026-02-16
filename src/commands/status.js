// @ts-check
'use strict';

/**
 * /declare:status command logic.
 *
 * Loads the graph from FUTURE.md, MILESTONES.md, and milestone folders.
 * Runs validation, detects staleness, computes coverage.
 * Returns structured data for the slash command to render.
 *
 * Zero runtime dependencies. CJS module.
 */

const { existsSync, readFileSync } = require('node:fs');
const { join, basename } = require('node:path');
const { execFileSync } = require('node:child_process');
const { parseFutureFile } = require('../artifacts/future');
const { parseMilestonesFile } = require('../artifacts/milestones');
const { parsePlanFile } = require('../artifacts/plan');
const { findMilestoneFolder } = require('../artifacts/milestone-folders');
const { loadActionsFromFolders } = require('./load-graph');
const { DeclareDag } = require('../graph/engine');

/**
 * Detect staleness indicators for milestones.
 *
 * @param {string} cwd - Working directory (project root)
 * @param {string} planningDir - Path to .planning directory
 * @param {Array<{id: string, title: string, status: string, realizes: string[], hasPlan: boolean}>} milestones
 * @returns {Array<{milestone: string, issue: string, detail: string}>}
 */
function detectStaleness(cwd, planningDir, milestones) {
  const indicators = [];

  for (const m of milestones) {
    const folder = findMilestoneFolder(planningDir, m.id);
    if (!folder) {
      indicators.push({ milestone: m.id, issue: 'NO_PLAN', detail: 'No plan derived yet' });
      continue;
    }

    const planPath = join(folder, 'PLAN.md');
    if (!existsSync(planPath)) {
      indicators.push({ milestone: m.id, issue: 'EMPTY_FOLDER', detail: 'Folder exists but no PLAN.md' });
      continue;
    }

    // Check age via git
    try {
      const lastMod = execFileSync('git', ['log', '-1', '--format=%ct', '--', planPath], {
        cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'],
      }).trim();

      if (lastMod) {
        const ageDays = (Date.now() - parseInt(lastMod, 10) * 1000) / 86400000;
        if (ageDays > 30) {
          indicators.push({ milestone: m.id, issue: 'STALE', detail: `Plan not updated in ${Math.floor(ageDays)} days` });
        }
      }
    } catch { /* git unavailable */ }

    // Check consistency
    const plan = parsePlanFile(readFileSync(planPath, 'utf-8'));
    if (m.status === 'ACTIVE' && plan.actions.length > 0 && plan.actions.every(a => a.status === 'DONE')) {
      indicators.push({ milestone: m.id, issue: 'COMPLETABLE', detail: 'All actions done, milestone still ACTIVE' });
    }
    if (m.status === 'DONE' && plan.actions.some(a => a.status !== 'DONE')) {
      indicators.push({ milestone: m.id, issue: 'INCONSISTENT', detail: 'Milestone marked DONE but has incomplete actions' });
    }
  }

  return indicators;
}

/**
 * Run the status command.
 *
 * @param {string} cwd - Working directory (project root)
 * @returns {{ project: string, stats: object, validation: object, lastActivity: string, health: string, coverage: object, staleness: Array } | { error: string }}
 */
function runStatus(cwd) {
  const planningDir = join(cwd, '.planning');

  // Check if project is initialized
  if (!existsSync(planningDir)) {
    return { error: 'No Declare project found. Run /declare:init first.' };
  }

  const projectName = basename(cwd);

  // Load and parse artifacts
  const futurePath = join(planningDir, 'FUTURE.md');
  const milestonesPath = join(planningDir, 'MILESTONES.md');

  const futureContent = existsSync(futurePath)
    ? readFileSync(futurePath, 'utf-8')
    : '';
  const milestonesContent = existsSync(milestonesPath)
    ? readFileSync(milestonesPath, 'utf-8')
    : '';

  const declarations = parseFutureFile(futureContent);
  const { milestones } = parseMilestonesFile(milestonesContent);
  const actions = loadActionsFromFolders(planningDir);

  // Reconstruct the DAG
  const dag = new DeclareDag();

  for (const d of declarations) {
    dag.addNode(d.id, 'declaration', d.title, d.status || 'PENDING');
  }
  for (const m of milestones) {
    dag.addNode(m.id, 'milestone', m.title, m.status || 'PENDING');
  }
  for (const a of actions) {
    dag.addNode(a.id, 'action', a.title, a.status || 'PENDING');
  }

  // Add edges: milestone->declaration (realizes)
  for (const m of milestones) {
    for (const declId of m.realizes) {
      if (dag.getNode(declId)) {
        dag.addEdge(m.id, declId);
      }
    }
  }

  // Add edges: action->milestone (causes)
  for (const a of actions) {
    for (const milestoneId of a.causes) {
      if (dag.getNode(milestoneId)) {
        dag.addEdge(a.id, milestoneId);
      }
    }
  }

  // Run validation and get stats
  const validation = dag.validate();
  const stats = dag.stats();

  // Get last activity from git
  let lastActivity = 'No activity recorded';
  try {
    const output = execFileSync('git', ['log', '-1', '--format=%ci %s', '--', '.planning/'], {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    if (output) {
      lastActivity = output;
    }
  } catch {
    // Git not available or no commits -- use default
  }

  // Compute coverage
  const withPlan = milestones.filter(m => m.hasPlan).length;
  const coverage = {
    total: milestones.length,
    withPlan,
    percentage: milestones.length > 0 ? Math.round((withPlan / milestones.length) * 100) : 100,
  };

  // Detect staleness
  const staleness = detectStaleness(cwd, planningDir, milestones);

  // Determine health
  let health = 'healthy';
  if (!validation.valid) {
    const hasCycle = validation.errors.some(e => e.type === 'cycle');
    const hasBroken = validation.errors.some(e => e.type === 'broken_edge');
    health = (hasCycle || hasBroken) ? 'errors' : 'warnings';
  }
  if (staleness.length > 0 && health === 'healthy') {
    health = 'warnings';
  }

  return {
    project: projectName,
    stats: {
      declarations: stats.declarations,
      milestones: stats.milestones,
      actions: stats.actions,
      edges: stats.edges,
      byStatus: stats.byStatus,
    },
    validation: {
      valid: validation.valid,
      errors: validation.errors,
    },
    lastActivity,
    health,
    coverage,
    staleness,
  };
}

module.exports = { runStatus };
