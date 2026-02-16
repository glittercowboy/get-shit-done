#!/usr/bin/env node

/**
 * Knowledge System API
 *
 * Unified facade for GSD knowledge operations. Provides high-level
 * access to storage, search, and lifecycle management.
 *
 * Usage:
 *   const knowledge = require('./knowledge.js');
 *   const result = knowledge.search('SQLite patterns', { scope: 'project' });
 */

const path = require('path');

// ─── Lazy Loading ────────────────────────────────────────────────────────────

let db = null;
let crud = null;
let search = null;
let lifecycle = null;

function loadModules() {
  if (!db) {
    try {
      db = require('./knowledge-db.js');
      crud = require('./knowledge-crud.js');
      search = require('./knowledge-search.js');
      lifecycle = require('./knowledge-lifecycle.js');
    } catch (err) {
      return { available: false, reason: err.message };
    }
  }
  return { available: true };
}

// ─── Connection Cache ────────────────────────────────────────────────────────

const connections = new Map();

function getConnection(scope) {
  const check = loadModules();
  if (!check.available) {
    return { db: null, available: false, reason: check.reason };
  }

  const available = db.isKnowledgeDBAvailable(scope);
  if (!available.available) {
    return { db: null, available: false, reason: available.reason };
  }

  const dbPath = db.getDBPath(scope);
  if (!connections.has(dbPath)) {
    const conn = db.openKnowledgeDB(scope);
    connections.set(dbPath, conn);

    // Run cleanup on first open
    const cleaned = lifecycle.cleanupExpired(conn);
    if (cleaned.deleted > 0) {
      console.log(`Knowledge: cleaned ${cleaned.deleted} expired entries`);
    }
  }

  return { db: connections.get(dbPath), available: true };
}

function closeAllConnections() {
  const check = loadModules();
  if (!check.available) return;

  for (const conn of connections.values()) {
    db.closeKnowledgeDB(conn);
  }
  connections.clear();
}

// ─── Fallback Helpers ────────────────────────────────────────────────────────

/**
 * Execute knowledge operation with fallback
 * Returns null/empty if knowledge system unavailable
 */
function withFallback(fn, defaultValue = null) {
  return (...args) => {
    try {
      return fn(...args);
    } catch (err) {
      // Log but don't throw - graceful degradation
      if (process.env.GSD_DEBUG) {
        console.warn('Knowledge system error:', err.message);
      }
      return defaultValue;
    }
  };
}

/**
 * Check if knowledge system is enabled in config
 * Respects config.json knowledge setting
 */
function isKnowledgeEnabled(cwd) {
  const configPath = path.join(cwd, '.planning', 'config.json');
  try {
    const config = JSON.parse(require('fs').readFileSync(configPath, 'utf-8'));
    // Default to enabled if not specified
    return config.knowledge !== false;
  } catch {
    return true; // Enabled by default
  }
}

// ─── High-Level API ──────────────────────────────────────────────────────────

const knowledge = {
  /**
   * Check if knowledge system is available
   * @param {string} scope - 'global' or 'project'
   * @returns {{ available: boolean, reason?: string }}
   */
  isAvailable(scope = 'project') {
    const check = loadModules();
    if (!check.available) return check;
    return db.isKnowledgeDBAvailable(scope);
  },

  /**
   * Add knowledge entry
   * @param {Object} entry - { content, type, scope, ttlCategory?, embedding?, metadata? }
   * @returns {{ id: number, content_hash: string } | { skipped: true, reason: string }}
   */
  add(entry) {
    const conn = getConnection(entry.scope || 'project');
    if (!conn.available) {
      return { skipped: true, reason: conn.reason };
    }
    return crud.insertKnowledge(conn.db, entry);
  },

  /**
   * Get knowledge by ID
   * @param {number} id
   * @param {string} scope - 'global' or 'project'
   * @returns {Object | null}
   */
  get(id, scope = 'project') {
    const conn = getConnection(scope);
    if (!conn.available) return null;

    const result = crud.getKnowledge(conn.db, id);
    if (result) {
      lifecycle.trackAccess(conn.db, id);
    }
    return result;
  },

  /**
   * Search knowledge
   * @param {string} query - Text query for FTS search
   * @param {Object} options - { scope?, types?, embedding?, limit? }
   * @returns {Array}
   */
  search(query, options = {}) {
    const scope = options.scope || 'project';
    const conn = getConnection(scope);
    if (!conn.available) return [];

    const results = search.searchKnowledge(conn.db, query, options);

    // Track access for returned results
    if (results.length > 0) {
      lifecycle.trackAccessBatch(conn.db, results.map(r => r.id));
    }

    return results;
  },

  /**
   * Update knowledge entry
   * @param {number} id
   * @param {Object} updates - { content?, type?, ttlCategory?, metadata?, embedding? }
   * @param {string} scope
   * @returns {{ success: boolean, error?: string }}
   */
  update(id, updates, scope = 'project') {
    const conn = getConnection(scope);
    if (!conn.available) {
      return { success: false, error: conn.reason };
    }
    return crud.updateKnowledge(conn.db, id, updates);
  },

  /**
   * Delete knowledge entry
   * @param {number} id
   * @param {string} scope
   * @returns {{ deleted: boolean }}
   */
  delete(id, scope = 'project') {
    const conn = getConnection(scope);
    if (!conn.available) {
      return { deleted: false };
    }
    return crud.deleteKnowledge(conn.db, id);
  },

  /**
   * Get knowledge by type
   * @param {string} type - 'decision', 'lesson', 'summary', 'temp_note'
   * @param {Object} options - { scope?, limit? }
   * @returns {Array}
   */
  getByType(type, options = {}) {
    const scope = options.scope || 'project';
    const conn = getConnection(scope);
    if (!conn.available) return [];
    return crud.getKnowledgeByType(conn.db, type, options);
  },

  /**
   * Run cleanup on expired entries
   * @param {string} scope
   * @returns {{ deleted: number, ids: number[] }}
   */
  cleanup(scope = 'project') {
    const conn = getConnection(scope);
    if (!conn.available) {
      return { deleted: 0, ids: [] };
    }
    return lifecycle.cleanupExpired(conn.db);
  },

  /**
   * Get staleness information
   * @param {number} id
   * @param {string} scope
   * @returns {Object | null}
   */
  getStaleness(id, scope = 'project') {
    const conn = getConnection(scope);
    if (!conn.available) return null;
    return lifecycle.getStalenessScore(conn.db, id);
  },

  /**
   * Get access statistics
   * @param {Object} options - { scope?, type? }
   * @returns {Array}
   */
  getStats(options = {}) {
    const scope = options.scope || 'project';
    const conn = getConnection(scope);
    if (!conn.available) return [];
    return lifecycle.getAccessStats(conn.db, options);
  },

  /**
   * Safe search that returns empty array on any error
   */
  safeSearch(query, options = {}) {
    return withFallback(
      () => this.search(query, options),
      []
    )();
  },

  /**
   * Safe add that returns skipped status on any error
   */
  safeAdd(entry) {
    return withFallback(
      () => this.add(entry),
      { skipped: true, reason: 'knowledge system unavailable' }
    )();
  },

  /**
   * Check if knowledge is both available and enabled
   */
  isReady(scope = 'project', cwd = process.cwd()) {
    if (!isKnowledgeEnabled(cwd)) {
      return { ready: false, reason: 'disabled in config' };
    }
    const available = this.isAvailable(scope);
    return {
      ready: available.available,
      reason: available.available ? null : available.reason
    };
  },

  /**
   * Close all connections (for cleanup)
   */
  close: closeAllConnections
};

module.exports = { knowledge };
