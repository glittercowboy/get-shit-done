/**
 * knowledge-feedback.js
 *
 * Principle feedback and invalidation system.
 * Implements KNOW-26 (mark wrong/outdated) and KNOW-27 (learn from feedback).
 *
 * Usage:
 *   const { markPrincipleWrong, markPrincipleOutdated } = require('./knowledge-feedback.js')
 *   const { openKnowledgeDB } = require('./knowledge-db.js')
 *
 *   const conn = openKnowledgeDB('project')
 *   const result = markPrincipleWrong(conn.db, principleId, {
 *     severity: 'major',
 *     reason: 'Does not work in production'
 *   })
 */

// ─── Constants ─────────────────────────────────────────────────────────────

/**
 * Confidence degradation factors by severity
 */
const DEGRADATION_FACTORS = {
  critical: 1.0,   // Invalidate immediately (confidence -> 0)
  major: 0.5,      // Cut confidence in half
  minor: 0.2       // Reduce by 20%
}

/**
 * Minimum confidence threshold for validity
 */
const INVALIDATION_THRESHOLD = 0.3

// ─── Feedback History ──────────────────────────────────────────────────────

/**
 * Ensure feedback_history table exists
 * @param {object} db - better-sqlite3 database connection
 */
function ensureFeedbackHistoryTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS feedback_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      principle_id INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      severity TEXT,
      reason TEXT,
      old_confidence REAL,
      new_confidence REAL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (principle_id) REFERENCES knowledge(id)
    );
  `)
}

/**
 * Record a feedback event in history
 * @param {object} db - better-sqlite3 database connection
 * @param {number} principleId - Principle ID
 * @param {object} event - Event details
 * @returns {object} Result with recorded status and event ID
 */
function recordFeedbackEvent(db, principleId, event) {
  ensureFeedbackHistoryTable(db)

  const stmt = db.prepare(`
    INSERT INTO feedback_history (principle_id, event_type, severity, reason, old_confidence, new_confidence, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  const info = stmt.run(
    principleId,
    event.event_type,
    event.severity || null,
    event.reason || null,
    event.old_confidence || null,
    event.new_confidence || null,
    event.created_at || Date.now()
  )

  return {
    recorded: true,
    event_id: info.lastInsertRowid
  }
}

/**
 * Get feedback history for a principle
 * @param {object} db - better-sqlite3 database connection
 * @param {number} principleId - Principle ID
 * @returns {Array<object>} Array of feedback events
 */
function getPrincipleFeedbackHistory(db, principleId) {
  ensureFeedbackHistoryTable(db)

  return db.prepare(`
    SELECT * FROM feedback_history
    WHERE principle_id = ?
    ORDER BY created_at DESC
  `).all(principleId)
}

/**
 * Get all invalidated principles
 * @param {object} db - better-sqlite3 database connection
 * @returns {Array<object>} Array of invalidated principles
 */
function getInvalidatedPrinciples(db) {
  return db.prepare(`
    SELECT * FROM knowledge
    WHERE type = 'principle'
    AND JSON_EXTRACT(metadata, '$.invalidated') = 1
  `).all().map(row => ({
    ...row,
    metadata: row.metadata ? JSON.parse(row.metadata) : {}
  }))
}

// ─── Mark Principle Wrong ──────────────────────────────────────────────────

/**
 * Mark a principle as wrong, degrading its confidence
 * @param {object} db - better-sqlite3 database connection
 * @param {number} principleId - Principle ID
 * @param {object} [feedback={}] - Feedback details
 * @param {string} [feedback.severity='minor'] - Severity level ('minor', 'major', 'critical')
 * @param {string} [feedback.reason] - Reason for marking wrong
 * @returns {object} Result with old/new confidence and invalidation status
 */
function markPrincipleWrong(db, principleId, feedback = {}) {
  // 1. Extract severity (default to minor)
  const severity = feedback.severity || 'minor'

  // 2. Get current principle
  const row = db.prepare('SELECT * FROM knowledge WHERE id = ?').get(principleId)
  if (!row) {
    return { success: false, error: 'principle_not_found' }
  }

  // 3. Parse metadata and get current confidence
  const metadata = row.metadata ? JSON.parse(row.metadata) : {}
  const currentConfidence = metadata.confidence !== undefined ? metadata.confidence : 0.7

  // 4. Calculate new confidence
  const degradationFactor = DEGRADATION_FACTORS[severity] || DEGRADATION_FACTORS.minor
  const newConfidence = currentConfidence * (1 - degradationFactor)

  // 5. Update metadata
  metadata.confidence = newConfidence
  metadata.feedback_count = (metadata.feedback_count || 0) + 1
  metadata.last_feedback = Date.now()
  if (feedback.reason) {
    metadata.last_feedback_reason = feedback.reason
  }
  metadata.last_feedback_severity = severity

  // 6. Check for invalidation
  const invalidated = newConfidence < INVALIDATION_THRESHOLD
  if (invalidated) {
    metadata.invalidated = true
    metadata.invalidated_at = Date.now()
  }

  // 7. Update database and record event
  db.transaction(() => {
    db.prepare('UPDATE knowledge SET metadata = ? WHERE id = ?').run(
      JSON.stringify(metadata),
      principleId
    )

    // Record feedback event
    recordFeedbackEvent(db, principleId, {
      event_type: 'marked_wrong',
      severity,
      reason: feedback.reason,
      old_confidence: currentConfidence,
      new_confidence: newConfidence,
      created_at: Date.now()
    })
  })()

  return {
    success: true,
    old_confidence: currentConfidence,
    new_confidence: newConfidence,
    invalidated
  }
}

// ─── Mark Principle Outdated ───────────────────────────────────────────────

/**
 * Mark a principle as outdated (soft delete with expiration)
 * @param {object} db - better-sqlite3 database connection
 * @param {number} principleId - Principle ID
 * @param {object} [options={}] - Outdating options
 * @param {string} [options.replacement] - ID of replacement principle
 * @returns {object} Result with outdated status and expiration
 */
function markPrincipleOutdated(db, principleId, options = {}) {
  // 1. Get current principle
  const row = db.prepare('SELECT * FROM knowledge WHERE id = ?').get(principleId)
  if (!row) {
    return { success: false, error: 'principle_not_found' }
  }

  // 2. Parse metadata
  const metadata = row.metadata ? JSON.parse(row.metadata) : {}
  const oldConfidence = metadata.confidence !== undefined ? metadata.confidence : 0.7

  // 3. Update metadata with outdated status
  metadata.outdated = true
  metadata.outdated_at = Date.now()
  metadata.confidence = 0.0
  if (options.replacement) {
    metadata.replaced_by = options.replacement
  }

  // 4. Set expires_at to 7 days from now (soft delete)
  const now = Date.now()
  const expiresAt = now + (7 * 24 * 60 * 60 * 1000) // 7 days

  // 5. Update database and record event
  db.transaction(() => {
    db.prepare('UPDATE knowledge SET metadata = ?, expires_at = ? WHERE id = ?').run(
      JSON.stringify(metadata),
      expiresAt,
      principleId
    )

    // Record feedback event
    recordFeedbackEvent(db, principleId, {
      event_type: 'marked_outdated',
      reason: options.replacement ? `Replaced by ${options.replacement}` : null,
      old_confidence: oldConfidence,
      new_confidence: 0.0,
      created_at: now
    })
  })()

  return {
    success: true,
    outdated: true,
    expires_at: expiresAt
  }
}

// ─── Get Principle Metadata ────────────────────────────────────────────────

/**
 * Get parsed metadata for a principle
 * @param {object} db - better-sqlite3 database connection
 * @param {number} principleId - Principle ID
 * @returns {object} Parsed metadata object or empty object
 */
function getPrincipleMetadata(db, principleId) {
  const row = db.prepare('SELECT metadata FROM knowledge WHERE id = ?').get(principleId)
  if (!row) return {}
  return row.metadata ? JSON.parse(row.metadata) : {}
}

// ─── Replacement Workflow ──────────────────────────────────────────────────

/**
 * Generate a prompt for replacement principle
 * @param {string} principleContent - Content of the wrong principle
 * @returns {string} Prompt text for user
 */
function promptForReplacement(principleContent) {
  return `Principle '${principleContent}' was marked wrong. What should I do instead?`
}

/**
 * Create a replacement principle for an invalidated one
 * @param {object} db - better-sqlite3 database connection
 * @param {number} oldPrincipleId - ID of principle being replaced
 * @param {string} newContent - Content of replacement principle
 * @param {object} [options={}] - Creation options
 * @param {number} [options.confidence=0.7] - Initial confidence for new principle
 * @returns {object} Result with creation details
 */
function createReplacementPrinciple(db, oldPrincipleId, newContent, options = {}) {
  // Get old principle
  const oldRow = db.prepare('SELECT * FROM knowledge WHERE id = ?').get(oldPrincipleId)
  if (!oldRow) {
    return { success: false, error: 'old_principle_not_found' }
  }

  const oldMetadata = oldRow.metadata ? JSON.parse(oldRow.metadata) : {}

  // Create new principle
  const { insertKnowledge } = require('./knowledge-crud.js')
  const newMetadata = {
    replaces: oldPrincipleId,
    confidence: options.confidence !== undefined ? options.confidence : 0.7
  }

  const result = insertKnowledge(db, {
    content: newContent,
    type: 'principle',
    scope: oldRow.scope,
    metadata: newMetadata
  })

  // Update old principle to link to replacement
  oldMetadata.replaced_by = result.id
  db.prepare('UPDATE knowledge SET metadata = ? WHERE id = ?').run(
    JSON.stringify(oldMetadata),
    oldPrincipleId
  )

  return {
    created: true,
    old_id: oldPrincipleId,
    new_id: result.id,
    old_content: oldRow.content,
    new_content: newContent
  }
}

/**
 * Get the replacement chain for a principle
 * @param {object} db - better-sqlite3 database connection
 * @param {number} principleId - Starting principle ID
 * @returns {Array<object>} Array of principles from oldest to newest
 */
function getReplacementChain(db, principleId) {
  const chain = []
  let currentId = principleId

  // Follow the chain forward
  while (currentId) {
    const row = db.prepare('SELECT * FROM knowledge WHERE id = ?').get(currentId)
    if (!row) break

    const metadata = row.metadata ? JSON.parse(row.metadata) : {}
    chain.push({
      id: row.id,
      content: row.content,
      confidence: metadata.confidence,
      replaced_by: metadata.replaced_by,
      invalidated: metadata.invalidated,
      created_at: row.created_at
    })

    // Move to replacement if exists
    currentId = metadata.replaced_by
  }

  return chain
}

/**
 * Get principles that are invalidated but not yet replaced
 * @param {object} db - better-sqlite3 database connection
 * @returns {Array<object>} Array of invalidated principles without replacements
 */
function getPendingReplacements(db) {
  return db.prepare(`
    SELECT * FROM knowledge
    WHERE type = 'principle'
    AND JSON_EXTRACT(metadata, '$.invalidated') = 1
    AND JSON_EXTRACT(metadata, '$.replaced_by') IS NULL
  `).all().map(row => ({
    ...row,
    metadata: row.metadata ? JSON.parse(row.metadata) : {}
  }))
}

// ─── Exports ───────────────────────────────────────────────────────────────

module.exports = {
  DEGRADATION_FACTORS,
  markPrincipleWrong,
  markPrincipleOutdated,
  getPrincipleMetadata,
  recordFeedbackEvent,
  getPrincipleFeedbackHistory,
  getInvalidatedPrinciples,
  promptForReplacement,
  createReplacementPrinciple,
  getReplacementChain,
  getPendingReplacements
}
