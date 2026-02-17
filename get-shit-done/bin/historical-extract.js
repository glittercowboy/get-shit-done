#!/usr/bin/env node

/**
 * historical-extract.js
 *
 * Historical extraction from existing GSD project .planning/ directories.
 *
 * Reads completed phases from a ROADMAP.md, formats plan/summary files as
 * session-like transcripts, and prepares Haiku extraction requests.
 *
 * CRITICAL: This module does NOT make direct API calls.
 * All Haiku analysis is performed via Claude Code Task() subagent by the
 * CALLING WORKFLOW. This module only prepares extraction requests.
 *
 * Per locked decision #4: Each completed phase is treated as one conversation
 * (conversation_id = "phase-{phaseNumber}").
 *
 * CommonJS module - no @anthropic-ai/sdk usage.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// discoverCompletedPhases
// ---------------------------------------------------------------------------

/**
 * Parse ROADMAP.md content to find completed phases.
 *
 * Detects completion by:
 * - Checkbox: [x] in the phase entry
 * - Status column: "Complete" or "Done" in a markdown table
 *
 * @param {string} roadmapContent - Raw ROADMAP.md text
 * @returns {Array<{number: string, name: string, goal: string}>} Completed phases
 */
function discoverCompletedPhases(roadmapContent) {
  const completedPhases = [];

  if (!roadmapContent || typeof roadmapContent !== 'string') {
    return completedPhases;
  }

  const lines = roadmapContent.split('\n');

  // Pattern 1: Checkbox list entries - [x] Phase N: name
  // e.g. - [x] Phase 01: Auto Mode Foundation
  const checkboxPattern = /^\s*-?\s*\[x\]\s*(?:Phase\s+)?(\d+(?:\.\d+)?)[:\s]+(.+)/i;

  // Pattern 2: Markdown table rows with "Complete" or "Done" status
  // e.g. | 01 | Auto Mode Foundation | Complete | ...
  const tableRowPattern = /^\|\s*(\d+(?:\.\d+)?)\s*\|\s*([^|]+?)\s*\|\s*(Complete|Done)\s*\|/i;

  // Pattern 3: Section headers with [x] marker
  // e.g. ## [x] Phase 01 - Auto Mode Foundation
  const sectionPattern = /^#+\s*\[x\]\s*(?:Phase\s+)?(\d+(?:\.\d+)?)\s*[-:]\s*(.+)/i;

  for (const line of lines) {
    let match;

    match = line.match(checkboxPattern);
    if (match) {
      completedPhases.push({
        number: match[1].padStart(2, '0'),
        name: match[2].trim(),
        goal: match[2].trim()
      });
      continue;
    }

    match = line.match(tableRowPattern);
    if (match) {
      const num = match[1];
      const paddedNum = num.includes('.') ? num : num.padStart(2, '0');
      completedPhases.push({
        number: paddedNum,
        name: match[2].trim(),
        goal: match[2].trim()
      });
      continue;
    }

    match = line.match(sectionPattern);
    if (match) {
      const num = match[1];
      const paddedNum = num.includes('.') ? num : num.padStart(2, '0');
      // Avoid duplicates from multiple parsing patterns
      if (!completedPhases.some(p => p.number === paddedNum)) {
        completedPhases.push({
          number: paddedNum,
          name: match[2].trim(),
          goal: match[2].trim()
        });
      }
      continue;
    }
  }

  // Deduplicate by phase number (keep first occurrence)
  const seen = new Set();
  return completedPhases.filter(p => {
    if (seen.has(p.number)) return false;
    seen.add(p.number);
    return true;
  });
}

// ---------------------------------------------------------------------------
// formatPhaseAsTranscript
// ---------------------------------------------------------------------------

/**
 * Convert phase files (PLAN.md, SUMMARY.md, VERIFICATION.md) into a
 * session-like transcript format that session-analyzer.js can process.
 *
 * Format mirrors the JSONL entries expected by formatEntriesForPrompt():
 *   [{type: 'question', question: '...', timestamp: ...}, ...]
 *
 * We convert:
 *   - Phase goal/context -> session_metadata + question entries
 *   - PLAN.md objectives/tasks -> question entries (the "intent")
 *   - SUMMARY.md content -> answer entries (the "outcome")
 *   - VERIFICATION.md -> answer entries (the "verification result")
 *
 * @param {object} phaseFiles - Object with file paths and content
 * @param {string} phaseFiles.phaseNumber - Phase number string
 * @param {string} phaseFiles.phaseName - Phase name
 * @param {string[]} phaseFiles.plans - Array of PLAN.md content strings
 * @param {string[]} phaseFiles.summaries - Array of SUMMARY.md content strings
 * @param {string|null} phaseFiles.verification - VERIFICATION.md content or null
 * @returns {Array<object>} Session-like entries for analyzeSession()
 */
function formatPhaseAsTranscript(phaseFiles) {
  const { phaseNumber, phaseName, plans, summaries, verification } = phaseFiles;
  const entries = [];
  const baseTime = new Date(2024, 0, 1).toISOString(); // Stable base timestamp for historical data

  // 1. Session metadata entry (context header)
  entries.push({
    type: 'session_metadata',
    session_id: `phase-${phaseNumber}`,
    started_at: baseTime,
    phase: phaseNumber,
    phase_name: phaseName,
    timestamp: baseTime
  });

  // 2. Context header as a question-like entry
  entries.push({
    type: 'question',
    question: `Phase ${phaseNumber} goal: ${phaseName}. What decisions and reasoning patterns emerged during implementation?`,
    timestamp: baseTime
  });

  // 3. Each PLAN.md becomes a question entry (the implementation intent)
  for (let i = 0; i < plans.length; i++) {
    const planContent = plans[i];
    if (!planContent || planContent.trim().length < 10) continue;

    // Extract objective section if present
    const objectiveMatch = planContent.match(/<objective>([\s\S]*?)<\/objective>/);
    const planText = objectiveMatch
      ? objectiveMatch[1].trim()
      : planContent.substring(0, 2000).trim();

    entries.push({
      type: 'question',
      question: `PLAN ${i + 1}: ${planText}`,
      timestamp: baseTime
    });
  }

  // 4. Each SUMMARY.md becomes an answer entry (what was actually built)
  for (let i = 0; i < summaries.length; i++) {
    const summaryContent = summaries[i];
    if (!summaryContent || summaryContent.trim().length < 10) continue;

    entries.push({
      type: 'answer',
      answer: `COMPLETION ${i + 1}: ${summaryContent.substring(0, 3000).trim()}`,
      timestamp: baseTime
    });
  }

  // 5. VERIFICATION.md as an answer entry if present
  if (verification && verification.trim().length > 10) {
    entries.push({
      type: 'answer',
      answer: `VERIFICATION: ${verification.substring(0, 2000).trim()}`,
      timestamp: baseTime
    });
  }

  return entries;
}

// ---------------------------------------------------------------------------
// readPhaseFiles
// ---------------------------------------------------------------------------

/**
 * Read all relevant files for a given phase from the planning directory.
 *
 * @param {string} planningPath - Absolute path to .planning/ directory
 * @param {string} phaseNumber - Phase number (e.g. "01", "08.1")
 * @param {string} phaseName - Phase name for directory matching
 * @returns {object|null} Phase files object or null if phase dir not found
 */
function readPhaseFiles(planningPath, phaseNumber, phaseName) {
  const phasesDir = path.join(planningPath, 'phases');

  if (!fs.existsSync(phasesDir)) {
    return null;
  }

  // Find the phase directory by prefix matching
  let phaseDir = null;
  try {
    const entries = fs.readdirSync(phasesDir);
    // Phase dirs start with the number (e.g. "01-name", "08.1-name")
    const prefix = phaseNumber + '-';
    const exactPrefix = phaseNumber.replace(/^0+/, '') + '-'; // without leading zeros

    for (const entry of entries) {
      if (entry.startsWith(prefix) || entry.startsWith(phaseNumber + '.')) {
        phaseDir = path.join(phasesDir, entry);
        break;
      }
      // Try without leading zeros
      if (entry.startsWith(exactPrefix)) {
        phaseDir = path.join(phasesDir, entry);
        break;
      }
    }
  } catch (err) {
    process.stderr.write(`[historical-extract] Error reading phases dir: ${err.message}\n`);
    return null;
  }

  if (!phaseDir || !fs.existsSync(phaseDir)) {
    return null;
  }

  // Read all PLAN.md files in the phase directory
  const plans = [];
  const summaries = [];
  let verification = null;

  try {
    const phaseEntries = fs.readdirSync(phaseDir).sort();

    for (const filename of phaseEntries) {
      const fullPath = path.join(phaseDir, filename);

      if (filename.match(/\d+-\d+-PLAN\.md$/i)) {
        try {
          plans.push(fs.readFileSync(fullPath, 'utf8'));
        } catch (err) {
          process.stderr.write(`[historical-extract] Could not read ${fullPath}: ${err.message}\n`);
        }
      } else if (filename.match(/\d+-\d+-SUMMARY\.md$/i)) {
        try {
          summaries.push(fs.readFileSync(fullPath, 'utf8'));
        } catch (err) {
          process.stderr.write(`[historical-extract] Could not read ${fullPath}: ${err.message}\n`);
        }
      } else if (filename.match(/VERIFICATION\.md$/i)) {
        try {
          verification = fs.readFileSync(fullPath, 'utf8');
        } catch (err) {
          process.stderr.write(`[historical-extract] Could not read ${fullPath}: ${err.message}\n`);
        }
      }
    }
  } catch (err) {
    process.stderr.write(`[historical-extract] Error reading phase dir ${phaseDir}: ${err.message}\n`);
    return null;
  }

  return {
    phaseNumber,
    phaseName,
    phaseDir,
    plans,
    summaries,
    verification
  };
}

// ---------------------------------------------------------------------------
// extractFromProject
// ---------------------------------------------------------------------------

/**
 * Main entry point for historical extraction.
 *
 * Reads completed phases from a project's ROADMAP.md, formats each phase's
 * plan/summary files as session-like transcripts, and prepares Haiku
 * extraction requests for the calling workflow to execute via Task().
 *
 * Per locked decision #4: Each completed phase is treated as one conversation.
 * conversation_id = "phase-{phaseNumber}"
 *
 * Processing is SEQUENTIAL (not parallel) per discretion recommendation.
 *
 * @param {string} planningPath - Absolute path to a project's .planning/ directory
 * @returns {{
 *   projectPath: string,
 *   phasesFound: number,
 *   phasesCompleted: number,
 *   extractionRequests: Array<{
 *     phaseNumber: string,
 *     conversationId: string,
 *     requests: Array<{type: string, prompt: string, expectedSchema: object}>
 *   }>,
 *   errors: string[]
 * }}
 */
function extractFromProject(planningPath) {
  const result = {
    projectPath: planningPath,
    phasesFound: 0,
    phasesCompleted: 0,
    extractionRequests: [],
    errors: []
  };

  // 1. Validate planning path exists
  if (!fs.existsSync(planningPath)) {
    result.errors.push(`Planning path does not exist: ${planningPath}`);
    return result;
  }

  // 2. Read ROADMAP.md
  const roadmapPath = path.join(planningPath, 'ROADMAP.md');
  if (!fs.existsSync(roadmapPath)) {
    result.errors.push(`ROADMAP.md not found at: ${roadmapPath}`);
    return result;
  }

  let roadmapContent;
  try {
    roadmapContent = fs.readFileSync(roadmapPath, 'utf8');
  } catch (err) {
    result.errors.push(`Failed to read ROADMAP.md: ${err.message}`);
    return result;
  }

  // 3. Discover completed phases
  const completedPhases = discoverCompletedPhases(roadmapContent);
  result.phasesFound = completedPhases.length;
  result.phasesCompleted = completedPhases.length;

  if (completedPhases.length === 0) {
    result.errors.push('No completed phases found in ROADMAP.md (look for [x] checkboxes or "Complete" status)');
    return result;
  }

  // 4. Load session-analyzer for preparing extraction requests
  let analyzeSession;
  try {
    const sessionAnalyzer = require('./session-analyzer.js');
    analyzeSession = sessionAnalyzer.analyzeSession;
  } catch (err) {
    result.errors.push(`Failed to load session-analyzer.js: ${err.message}`);
    return result;
  }

  // 5. Process each completed phase sequentially
  for (const phase of completedPhases) {
    const conversationId = `phase-${phase.number}`;

    // a. Read phase files
    const phaseFiles = readPhaseFiles(planningPath, phase.number, phase.name);

    if (!phaseFiles) {
      process.stderr.write(`[historical-extract] Phase ${phase.number} directory not found, skipping\n`);
      result.phasesCompleted--;
      continue;
    }

    if (phaseFiles.plans.length === 0 && phaseFiles.summaries.length === 0) {
      process.stderr.write(`[historical-extract] Phase ${phase.number} has no plan/summary files, skipping\n`);
      result.phasesCompleted--;
      continue;
    }

    // b. Format phase files as session transcript
    const sessionEntries = formatPhaseAsTranscript(phaseFiles);

    // c. Prepare extraction requests via session-analyzer
    let requests;
    try {
      requests = analyzeSession(sessionEntries);
    } catch (err) {
      result.errors.push(`Phase ${phase.number}: analyzeSession failed: ${err.message}`);
      continue;
    }

    // d. Add to results
    result.extractionRequests.push({
      phaseNumber: phase.number,
      conversationId,
      phaseName: phase.name,
      requests
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Module exports
// ---------------------------------------------------------------------------

module.exports = {
  extractFromProject,
  formatPhaseAsTranscript,
  discoverCompletedPhases,
  readPhaseFiles
};
