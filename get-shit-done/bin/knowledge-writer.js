#!/usr/bin/env node

/**
 * knowledge-writer.js
 *
 * Bridges Haiku-extracted insights to the Phase 3 knowledge database.
 * Handles deduplication, type mapping, TTL assignment, and auto-init.
 *
 * Used by the session-end analysis pipeline. Called AFTER Haiku Task()
 * subagent returns parsed insights (via session-analyzer.js).
 *
 * Dependencies: knowledge-db.js, knowledge-crud.js, knowledge-dedup.js,
 *               knowledge-evolution.js (all Phase 3/4)
 *
 * CommonJS module - no @anthropic-ai/sdk usage.
 */

'use strict';

const path = require('path');
const fs = require('fs');

// ─── Knowledge Config ────────────────────────────────────────────────────────

const KNOWLEDGE_DEFAULTS = {
  dedupThreshold: 0.88,    // Stage 3: similarity above this → skip (exact/near-exact duplicate)
  evolutionThreshold: 0.65 // Stage 3: similarity above this but below dedupThreshold → evolve
};

/**
 * Read knowledge thresholds from .planning/config.json.
 * Falls back to hardcoded defaults if config absent or field missing.
 * @param {string} [cwd] - Working directory (defaults to process.cwd())
 * @returns {{ dedupThreshold: number, evolutionThreshold: number }}
 */
function readKnowledgeConfig(cwd) {
  try {
    const configPath = path.join(cwd || process.cwd(), '.planning', 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const k = config.knowledge || {};
    return {
      dedupThreshold: typeof k.dedup_threshold === 'number' ? k.dedup_threshold : KNOWLEDGE_DEFAULTS.dedupThreshold,
      evolutionThreshold: typeof k.evolution_threshold === 'number' ? k.evolution_threshold : KNOWLEDGE_DEFAULTS.evolutionThreshold
    };
  } catch {
    return { ...KNOWLEDGE_DEFAULTS };
  }
}

// ─── Project Slug Resolution ──────────────────────────────────────────────

/**
 * Resolve the project slug for a given working directory.
 *
 * Resolution priority:
 *   1. .planning/config.json project.slug field
 *   2. Directory basename of cwd
 *
 * @param {string} [cwd] - Working directory (defaults to process.cwd())
 * @returns {string} Project slug
 */
function resolveProjectSlug(cwd) {
  try {
    const configPath = path.join(cwd || process.cwd(), '.planning', 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (config.project && config.project.slug) return config.project.slug;
  } catch { /* no config or no slug field */ }
  return path.basename(cwd || process.cwd());
}

// ─── Type and TTL Mapping ─────────────────────────────────────────────────

/**
 * Map Haiku insight types to Phase 3 knowledge types and TTL categories.
 *
 * Insight types from session-analyzer.js:
 *   'decision'         -> decision, long_term (90 days)
 *   'reasoning_pattern'-> lesson,   permanent
 *   'meta_knowledge'   -> depends on .category field:
 *     'preference'       -> lesson, permanent
 *     'principle'        -> lesson, permanent
 *     'constraint'       -> decision, long_term
 *     'learning_pattern' -> summary, short_term (7 days)
 */
function mapInsightToKnowledgeType(insight) {
  if (insight.type === 'decision') {
    return { knowledgeType: 'decision', ttlCategory: 'long_term' };
  }

  if (insight.type === 'reasoning_pattern') {
    return { knowledgeType: 'lesson', ttlCategory: 'permanent' };
  }

  if (insight.type === 'meta_knowledge') {
    const category = insight.category || '';
    if (category === 'preference' || category === 'principle') {
      return { knowledgeType: 'lesson', ttlCategory: 'permanent' };
    }
    if (category === 'constraint') {
      return { knowledgeType: 'decision', ttlCategory: 'long_term' };
    }
    if (category === 'learning_pattern') {
      return { knowledgeType: 'summary', ttlCategory: 'short_term' };
    }
    // Unknown sub-category - treat as lesson
    return { knowledgeType: 'lesson', ttlCategory: 'permanent' };
  }

  // Unknown type - default to short_term summary
  return { knowledgeType: 'summary', ttlCategory: 'short_term' };
}

/**
 * Extract the primary content field from a Haiku insight object.
 * Picks the most specific field based on insight type.
 *
 * @param {object} insight - Parsed Haiku output item
 * @returns {string} Content to store in knowledge DB
 */
function extractInsightContent(insight) {
  if (insight.type === 'decision') {
    return insight.decision || insight.description || insight.statement || '';
  }
  if (insight.type === 'reasoning_pattern') {
    return insight.description || insight.decision || insight.statement || '';
  }
  if (insight.type === 'meta_knowledge') {
    return insight.statement || insight.description || insight.decision || '';
  }
  // Fallback
  return insight.decision || insight.description || insight.statement || '';
}

// ─── Database Auto-Initialization ─────────────────────────────────────────

/**
 * Ensure knowledge database is available, creating it if needed.
 *
 * Per locked decision #5: Knowledge database auto-creates on first use
 * if it does not exist. This function handles that bootstrap.
 *
 * @param {string} scope - 'project' or 'global'
 * @returns {{ available: boolean, conn?: object, reason?: string }}
 */
function ensureKnowledgeDB(scope) {
  // 1. Check that better-sqlite3 is installed
  let knowledgeDb;
  try {
    knowledgeDb = require('./knowledge-db.js');
  } catch (err) {
    return { available: false, reason: 'knowledge-db.js not loadable: ' + err.message };
  }

  // 2. Check availability (dependency check)
  const check = knowledgeDb.isKnowledgeDBAvailable(scope);
  if (!check.available) {
    return { available: false, reason: check.reason };
  }

  // 3. Directory creation is handled by openKnowledgeDB() for all scopes
  // (all scopes now resolve to the global ~/.claude/knowledge/ path)

  // 4. Open the database (auto-creates schema on first use)
  let conn;
  try {
    conn = knowledgeDb.openKnowledgeDB(scope);
  } catch (err) {
    return { available: false, reason: 'Failed to open knowledge DB: ' + err.message };
  }

  return { available: true, conn };
}

// ─── Core Storage Function ─────────────────────────────────────────────────

/**
 * Store Haiku-extracted insights in the Phase 3 knowledge database.
 *
 * Applies three-stage deduplication before each insertion:
 *   Stage 1: Content hash (exact match) -> skip
 *   Stage 2: Canonical hash (normalized) -> skip
 *   Stage 3: Embedding similarity > 0.88 -> skip
 *   Similarity 0.65-0.88 -> evolve (insertOrEvolve via knowledge-evolution.js)
 *   Similarity < 0.65 -> insert (insertKnowledge via knowledge-crud.js)
 *
 * Stage 3 is attempted with a 2-second timeout using generateEmbeddingCached().
 * If embedding generation times out or fails, dedup falls back to stages 1 and 2.
 *
 * @param {Array<object>} insights - Parsed Haiku output objects (from parseExtractionResult)
 * @param {object} options - Storage options
 * @param {string} [options.sessionId] - Session ID for context tracking
 * @param {string} [options.conversationId] - Conversation ID for context tracking
 * @param {string} [options.scope='global'] - Knowledge scope ('project' or 'global')
 * @returns {Promise<{ stored: number, skipped: number, evolved: number, errors: string[] }>}
 */
async function storeInsights(insights, options = {}) {
  const result = { stored: 0, skipped: 0, evolved: 0, errors: [] };
  const scope = options.scope || 'global';
  const projectSlug = options.projectSlug || resolveProjectSlug(options.cwd);
  const { dedupThreshold, evolutionThreshold } = readKnowledgeConfig(options.cwd);
  const debug = process.env.GSD_DEBUG;

  // Validate input
  if (!Array.isArray(insights) || insights.length === 0) {
    return result;
  }

  // 1. Ensure knowledge DB is available and auto-initialize if needed
  const dbResult = ensureKnowledgeDB(scope);
  if (!dbResult.available) {
    result.errors.push('Knowledge DB unavailable: ' + dbResult.reason);
    process.stderr.write(`[knowledge-writer] Knowledge DB unavailable: ${dbResult.reason}\n`);
    return result;
  }

  const conn = dbResult.conn;

  // 2. Load dedup and evolution modules
  let checkDuplicate, insertOrEvolve, insertKnowledge;
  try {
    const dedup = require('./knowledge-dedup.js');
    checkDuplicate = dedup.checkDuplicate;
  } catch (err) {
    result.errors.push('knowledge-dedup.js not loadable: ' + err.message);
    return result;
  }

  try {
    const evolution = require('./knowledge-evolution.js');
    insertOrEvolve = evolution.insertOrEvolve;
  } catch (err) {
    result.errors.push('knowledge-evolution.js not loadable: ' + err.message);
    return result;
  }

  try {
    const crud = require('./knowledge-crud.js');
    insertKnowledge = crud.insertKnowledge;
  } catch (err) {
    result.errors.push('knowledge-crud.js not loadable: ' + err.message);
    return result;
  }

  // 3. Process each insight
  for (const insight of insights) {
    try {
      // a. Extract content
      const content = extractInsightContent(insight);
      if (!content || content.trim().length < 5) {
        result.errors.push(`Skipped insight with empty/short content (type: ${insight.type})`);
        result.skipped++;
        continue;
      }

      // b. Map insight type to knowledge type and TTL
      const { knowledgeType, ttlCategory } = mapInsightToKnowledgeType(insight);

      // c. Build context metadata
      const contextMetadata = {
        session_id: options.sessionId || null,
        conversation_id: options.conversationId || null,
        confidence: insight.confidence || 'medium',
        context_snippet: insight.context_snippet || '',
        source: 'haiku-extraction',
        insight_type: insight.type,
        insight_category: insight.category || null
      };

      // d. Build tags
      const tags = ['haiku-extracted', insight.type];

      // e. Attempt Stage-3 embedding generation with 2s timeout (lazy-loaded)
      // Falls back to null (hash-only dedup) on timeout or unavailability.
      let embedding = null;
      try {
        const { generateEmbeddingCached } = require('./embeddings.js');
        embedding = await Promise.race([
          generateEmbeddingCached(content),
          new Promise(resolve => setTimeout(() => resolve(null), 2000))
        ]);
      } catch (_embErr) {
        // Embedding unavailable — fall back to hash-only dedup (stages 1 and 2)
      }

      // f. Check for duplicates (three-stage dedup; stage 3 fires when embedding non-null)
      const dupCheck = await checkDuplicate(conn, content, embedding);

      if (dupCheck.isDuplicate) {
        const similarity = dupCheck.similarity || 0;

        if (debug) {
          const action = similarity > dedupThreshold ? 'skipped' : similarity >= evolutionThreshold ? 'evolve' : 'insert';
          process.stderr.write(
            `[dedup] similarity=${similarity.toFixed(3)} dedupThreshold=${dedupThreshold} evolutionThreshold=${evolutionThreshold} stage=${dupCheck.stage} → ${action}\n`
          );
        }

        if (similarity > dedupThreshold) {
          // Exact or near-exact duplicate - skip
          result.skipped++;
          continue;
        }

        if (similarity >= evolutionThreshold && similarity <= dedupThreshold) {
          // Near-duplicate - evolve existing entry via insertOrEvolve
          const evolveResult = await insertOrEvolve(conn, {
            content,
            type: knowledgeType,
            scope,
            embedding: null,
            project_slug: projectSlug,
            metadata: {
              ...contextMetadata,
              tags
            }
          });

          if (evolveResult.action === 'evolved') {
            result.evolved++;
          } else if (evolveResult.action === 'skipped') {
            result.skipped++;
          } else if (evolveResult.action === 'created') {
            result.stored++;
          }
          continue;
        }
      }

      // g. Not a duplicate - insert new entry
      // Use insertOrEvolve for canonical handling (it runs full dedup internally)
      const insertResult = await insertOrEvolve(conn, {
        content,
        type: knowledgeType,
        scope,
        embedding: null,
        project_slug: projectSlug,
        metadata: {
          ...contextMetadata,
          tags
        }
      });

      if (insertResult.action === 'created') {
        result.stored++;
      } else if (insertResult.action === 'evolved') {
        result.evolved++;
      } else if (insertResult.action === 'skipped') {
        result.skipped++;
      }

    } catch (err) {
      const errorMsg = `Failed to store insight (type: ${insight.type}): ${err.message}`;
      result.errors.push(errorMsg);
      process.stderr.write(`[knowledge-writer] ${errorMsg}\n`);
      // Continue processing remaining insights (non-fatal)
    }
  }

  return result;
}

// ─── Exports ───────────────────────────────────────────────────────────────

module.exports = {
  storeInsights,
  ensureKnowledgeDB,
  mapInsightToKnowledgeType,
  extractInsightContent,
  resolveProjectSlug,
  readKnowledgeConfig,
  KNOWLEDGE_DEFAULTS
};
