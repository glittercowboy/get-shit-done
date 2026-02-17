#!/usr/bin/env node

/**
 * session-quality-gates.js
 *
 * Session quality gates and re-analysis prevention for session-end knowledge extraction.
 *
 * Purpose: Cost control and quality assurance:
 * - Prevent wasteful analysis of trivial sessions (too few questions/answers/entries)
 * - Prevent re-analyzing sessions whose content hasn't changed (content hashing)
 * - Track which sessions have been analyzed and with what results
 *
 * NO external dependencies beyond Node.js built-ins (fs, crypto, path).
 * CommonJS module.exports pattern (matches all get-shit-done/bin/ files).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ANALYSIS_LOG_NAME = '.analysis-log.jsonl';
const ANALYSIS_LOG_VERSION = 1;

// Minimum thresholds for a session to be worth analyzing
const MIN_QUESTIONS = 2;
const MIN_ANSWERS = 2;
const MIN_TOTAL_ENTRIES = 10;

// Entry types that represent substantive interaction
const SUBSTANTIVE_TYPES = new Set(['question', 'answer', 'user_message', 'bot_response']);

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the path to the .analysis-log.jsonl file.
 * Stored in .planning/telegram-sessions/ alongside session JSONL files.
 *
 * @returns {string} Absolute path to analysis log
 */
function getAnalysisLogPath() {
  // Walk up from this file to find project root (contains .planning/)
  let dir = __dirname;
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, '.planning', 'telegram-sessions', ANALYSIS_LOG_NAME);
    const planningDir = path.join(dir, '.planning');
    if (fs.existsSync(planningDir)) {
      return candidate;
    }
    dir = path.dirname(dir);
  }
  // Fallback: relative to CWD
  return path.join(process.cwd(), '.planning', 'telegram-sessions', ANALYSIS_LOG_NAME);
}

/**
 * Read all entries from the analysis log JSONL file.
 * Returns empty array if the file doesn't exist or is empty.
 *
 * @param {string} logPath - Path to the JSONL log file
 * @returns {Array<object>} Parsed log entries
 */
function readAnalysisLog(logPath) {
  if (!fs.existsSync(logPath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(logPath, 'utf8');
    const lines = content.split('\n').filter(l => l.trim());
    const entries = [];
    for (const line of lines) {
      try {
        entries.push(JSON.parse(line));
      } catch {
        // Skip malformed lines (crash safety)
      }
    }
    return entries;
  } catch (err) {
    console.warn('[quality-gates] Failed to read analysis log:', err.message);
    return [];
  }
}

// ---------------------------------------------------------------------------
// shouldAnalyzeSession
// ---------------------------------------------------------------------------

/**
 * Determine whether a session has enough substantive content to be worth analyzing.
 *
 * Thresholds (from plan spec):
 * - At least 2 question entries
 * - At least 2 answer entries
 * - At least 10 total entries overall (including any type)
 *
 * @param {Array<object>} entries - Session JSONL entries (plain objects)
 * @returns {{ analyze: boolean, reason: string }}
 */
function shouldAnalyzeSession(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return { analyze: false, reason: 'Session has no entries' };
  }

  const totalEntries = entries.length;

  // Count by type
  let questionCount = 0;
  let answerCount = 0;
  let substantiveCount = 0;

  for (const entry of entries) {
    if (!entry || typeof entry.type !== 'string') continue;
    if (entry.type === 'question') questionCount++;
    if (entry.type === 'answer') answerCount++;
    if (SUBSTANTIVE_TYPES.has(entry.type)) substantiveCount++;
  }

  // Check substantive interaction threshold first
  if (substantiveCount === 0) {
    return {
      analyze: false,
      reason: 'Session contains only heartbeats/metadata (no substantive interaction)'
    };
  }

  // Check minimum total entries
  if (totalEntries < MIN_TOTAL_ENTRIES) {
    return {
      analyze: false,
      reason: `Only ${totalEntries} total entries (minimum ${MIN_TOTAL_ENTRIES})`
    };
  }

  // Check minimum questions
  if (questionCount < MIN_QUESTIONS) {
    return {
      analyze: false,
      reason: `Only ${questionCount} question${questionCount === 1 ? '' : 's'} (minimum ${MIN_QUESTIONS})`
    };
  }

  // Check minimum answers
  if (answerCount < MIN_ANSWERS) {
    return {
      analyze: false,
      reason: `Only ${answerCount} answer${answerCount === 1 ? '' : 's'} (minimum ${MIN_ANSWERS})`
    };
  }

  return {
    analyze: true,
    reason: `Session qualifies: ${questionCount} questions, ${answerCount} answers, ${totalEntries} total entries`
  };
}

// ---------------------------------------------------------------------------
// getSessionContentHash
// ---------------------------------------------------------------------------

/**
 * Compute a deterministic SHA-256 hash of substantive session content.
 *
 * Only substantive entry types (question/answer/user_message/bot_response)
 * are included. Entries are sorted by timestamp for determinism.
 * The hash captures type + primary content field.
 *
 * @param {Array<object>} entries - Session JSONL entries
 * @returns {string} Hex-encoded SHA-256 hash
 */
function getSessionContentHash(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return crypto.createHash('sha256').update('empty').digest('hex');
  }

  // Filter to substantive entries only
  const substantive = entries.filter(e => e && SUBSTANTIVE_TYPES.has(e.type));

  // Sort by timestamp for deterministic ordering
  substantive.sort((a, b) => {
    const ta = a.timestamp || a.created_at || a.answered_at || '';
    const tb = b.timestamp || b.created_at || b.answered_at || '';
    return ta.localeCompare(tb);
  });

  // Concatenate type + primary content field for each entry
  const parts = substantive.map(entry => {
    let content = '';
    switch (entry.type) {
      case 'question':    content = entry.question || entry.content || ''; break;
      case 'answer':      content = entry.answer   || entry.content || ''; break;
      case 'user_message':  content = entry.content || ''; break;
      case 'bot_response':  content = entry.content || ''; break;
      default: content = '';
    }
    return `${entry.type}:${content}`;
  });

  const concatenated = parts.join('\n');
  return crypto.createHash('sha256').update(concatenated).digest('hex');
}

// ---------------------------------------------------------------------------
// markSessionAnalyzed
// ---------------------------------------------------------------------------

/**
 * Persist an analysis record to the append-only JSONL log.
 *
 * Storage: .planning/telegram-sessions/.analysis-log.jsonl
 * Each line: { session_id, content_hash, analyzed_at, insight_count, version }
 *
 * Append-only for crash safety (no full rewrites).
 *
 * @param {string} sessionId - Session identifier (UUID or date string)
 * @param {string} contentHash - SHA-256 hash from getSessionContentHash()
 * @param {number} insightCount - Number of insights extracted in this analysis
 * @returns {void}
 */
function markSessionAnalyzed(sessionId, contentHash, insightCount) {
  const logPath = getAnalysisLogPath();

  // Ensure parent directory exists
  const logDir = path.dirname(logPath);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const record = {
    session_id: sessionId,
    content_hash: contentHash,
    analyzed_at: new Date().toISOString(),
    insight_count: insightCount || 0,
    version: ANALYSIS_LOG_VERSION
  };

  const line = JSON.stringify(record) + '\n';
  fs.appendFileSync(logPath, line, 'utf8');
}

// ---------------------------------------------------------------------------
// isAlreadyAnalyzed
// ---------------------------------------------------------------------------

/**
 * Check whether a session has already been analyzed with the same content.
 *
 * Returns true ONLY if both session_id AND content_hash match an existing log entry.
 * If session_id exists but hash differs, returns false (content changed → re-analyze).
 *
 * @param {string} sessionId - Session identifier
 * @param {string} contentHash - SHA-256 hash from getSessionContentHash()
 * @returns {boolean}
 */
function isAlreadyAnalyzed(sessionId, contentHash) {
  const logPath = getAnalysisLogPath();
  const entries = readAnalysisLog(logPath);

  return entries.some(
    e => e.session_id === sessionId && e.content_hash === contentHash
  );
}

// ---------------------------------------------------------------------------
// getAnalysisStats
// ---------------------------------------------------------------------------

/**
 * Return aggregate statistics from the analysis log.
 *
 * @returns {{ totalSessions: number, totalInsights: number, lastAnalyzedAt: string|null }}
 */
function getAnalysisStats() {
  const logPath = getAnalysisLogPath();
  const entries = readAnalysisLog(logPath);

  if (entries.length === 0) {
    return {
      totalSessions: 0,
      totalInsights: 0,
      lastAnalyzedAt: null
    };
  }

  // Count unique session_ids
  const uniqueSessions = new Set(entries.map(e => e.session_id));

  // Sum all insight counts
  const totalInsights = entries.reduce((sum, e) => sum + (e.insight_count || 0), 0);

  // Find the most recent analyzed_at
  const timestamps = entries
    .map(e => e.analyzed_at)
    .filter(Boolean)
    .sort();
  const lastAnalyzedAt = timestamps.length > 0 ? timestamps[timestamps.length - 1] : null;

  return {
    totalSessions: uniqueSessions.size,
    totalInsights,
    lastAnalyzedAt
  };
}

// ---------------------------------------------------------------------------
// Module exports
// ---------------------------------------------------------------------------

module.exports = {
  shouldAnalyzeSession,
  getSessionContentHash,
  markSessionAnalyzed,
  isAlreadyAnalyzed,
  getAnalysisStats
};
