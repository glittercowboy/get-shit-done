#!/usr/bin/env node

/**
 * Session Analyzer
 *
 * Core orchestrator for Haiku-based session analysis.
 * Prepares extraction requests for Task() subagent invocation.
 *
 * CRITICAL: This module does NOT make direct API calls.
 * All Haiku analysis is performed via Claude Code Task() subagent:
 *   Task(subagent_type="general-purpose", model="haiku", prompt=...)
 *
 * The calling workflow/tool is responsible for:
 * 1. Calling analyzeSession() to get extraction requests
 * 2. Passing each request's prompt to Task() subagent
 * 3. Passing Task() output to parseExtractionResult()
 */

const {
  formatEntriesForPrompt,
  buildDecisionPrompt,
  buildReasoningPrompt,
  buildMetaKnowledgePrompt
} = require('./analysis-prompts.js');

// Required fields for each extraction type
const REQUIRED_FIELDS = {
  decision: ['decision', 'context_snippet'],
  reasoning_pattern: ['pattern_type', 'description', 'context_snippet'],
  meta_knowledge: ['category', 'statement', 'context_snippet']
};

// ---------------------------------------------------------------------------
// analyzeSession - prepare extraction requests for Haiku Task() invocation
// ---------------------------------------------------------------------------

/**
 * Prepare Haiku extraction requests from session entries.
 *
 * Returns an array of extraction request objects. The CALLER must pass each
 * request's prompt to a Haiku Task() subagent and then call parseExtractionResult()
 * on the raw output.
 *
 * Pattern (in the calling workflow):
 *   const requests = analyzeSession(entries, options);
 *   for (const req of requests) {
 *     // Via Task() subagent - NO direct API calls here
 *     const rawJson = await Task(subagent_type="general-purpose", model="haiku", prompt=req.prompt);
 *     const result = parseExtractionResult(req.type, rawJson);
 *     allInsights.push(...result.insights);
 *   }
 *
 * @param {Array} sessionEntries - Session JSONL entries (plain objects with type field)
 * @param {Object} options - Extraction options
 * @param {boolean} [options.extractDecisions=true] - Extract decisions
 * @param {boolean} [options.extractReasoning=true] - Extract reasoning patterns
 * @param {boolean} [options.extractMetaKnowledge=true] - Extract meta-knowledge
 * @returns {Array<{type: string, prompt: string, expectedSchema: Object}>} Extraction requests
 */
function analyzeSession(sessionEntries, options = {}) {
  const {
    extractDecisions = true,
    extractReasoning = true,
    extractMetaKnowledge = true
  } = options;

  const sessionText = formatEntriesForPrompt(sessionEntries);

  const requests = [];

  if (extractDecisions) {
    requests.push({
      type: 'decision',
      prompt: buildDecisionPrompt(sessionText),
      expectedSchema: {
        type: 'array',
        items: {
          type: 'object',
          required: ['type', 'decision', 'reasoning', 'alternatives_considered', 'confidence', 'context_snippet'],
          properties: {
            type: { type: 'string', enum: ['decision'] },
            decision: { type: 'string', minLength: 5 },
            reasoning: { type: 'string' },
            alternatives_considered: { type: 'array', items: { type: 'string' } },
            confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
            context_snippet: { type: 'string', minLength: 5 }
          }
        }
      }
    });
  }

  if (extractReasoning) {
    requests.push({
      type: 'reasoning_pattern',
      prompt: buildReasoningPrompt(sessionText),
      expectedSchema: {
        type: 'array',
        items: {
          type: 'object',
          required: ['type', 'pattern_type', 'description', 'trigger', 'outcome', 'reusable', 'context_snippet'],
          properties: {
            type: { type: 'string', enum: ['reasoning_pattern'] },
            pattern_type: { type: 'string' },
            description: { type: 'string' },
            trigger: { type: 'string' },
            outcome: { type: 'string' },
            reusable: { type: 'boolean' },
            context_snippet: { type: 'string', minLength: 5 }
          }
        }
      }
    });
  }

  if (extractMetaKnowledge) {
    requests.push({
      type: 'meta_knowledge',
      prompt: buildMetaKnowledgePrompt(sessionText),
      expectedSchema: {
        type: 'array',
        items: {
          type: 'object',
          required: ['type', 'category', 'statement', 'evidence', 'confidence', 'scope', 'context_snippet'],
          properties: {
            type: { type: 'string', enum: ['meta_knowledge'] },
            category: { type: 'string', enum: ['preference', 'principle', 'constraint', 'learning_pattern'] },
            statement: { type: 'string' },
            evidence: { type: 'array', items: { type: 'string' } },
            confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
            scope: { type: 'string', enum: ['project', 'global'] },
            context_snippet: { type: 'string', minLength: 5 }
          }
        }
      }
    });
  }

  return requests;
}

// ---------------------------------------------------------------------------
// parseExtractionResult - parse and validate Haiku Task() output
// ---------------------------------------------------------------------------

/**
 * Parse and validate raw JSON text returned by a Haiku Task() subagent.
 *
 * Handles:
 * - Markdown code fences (```json ... ```)
 * - JSON embedded in prose
 * - Malformed items (filtered out with error tracking)
 * - Missing required fields (filtered with per-item error)
 *
 * @param {string} type - Extraction type: 'decision' | 'reasoning_pattern' | 'meta_knowledge'
 * @param {string} rawJsonText - Raw text output from Haiku Task() subagent
 * @returns {{ insights: Array, errors: string[] }} Valid insights and any parse/validation errors
 */
function parseExtractionResult(type, rawJsonText) {
  const errors = [];

  if (!rawJsonText || typeof rawJsonText !== 'string') {
    return { insights: [], errors: ['Empty or non-string input from Task() subagent'] };
  }

  // Step 1: Strip markdown code fences if present
  let cleanText = rawJsonText.trim();

  // Remove ```json ... ``` or ``` ... ```
  const fenceMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    cleanText = fenceMatch[1].trim();
  }

  // Step 2: Find JSON array in the text (handles prose before/after JSON)
  // Look for the outermost [...] array
  const arrayStart = cleanText.indexOf('[');
  const arrayEnd = cleanText.lastIndexOf(']');

  if (arrayStart === -1 || arrayEnd === -1 || arrayEnd < arrayStart) {
    // Try to handle "[]" case explicitly (valid empty result)
    if (cleanText.includes('[]') || cleanText.trim() === '') {
      return { insights: [], errors: [] };
    }
    errors.push(`No JSON array found in Haiku output. Raw text (first 200 chars): ${cleanText.substring(0, 200)}`);
    return { insights: [], errors };
  }

  const jsonText = cleanText.substring(arrayStart, arrayEnd + 1);

  // Step 3: Parse JSON
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    errors.push(`JSON.parse failed: ${err.message}. Text (first 200 chars): ${jsonText.substring(0, 200)}`);
    return { insights: [], errors };
  }

  // Step 4: Validate array structure
  if (!Array.isArray(parsed)) {
    errors.push(`Haiku returned non-array JSON (got ${typeof parsed})`);
    return { insights: [], errors };
  }

  if (parsed.length === 0) {
    return { insights: [], errors: [] };
  }

  // Step 5: Filter and validate each item
  const requiredFields = REQUIRED_FIELDS[type] || [];
  const validInsights = [];

  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i];

    if (!item || typeof item !== 'object') {
      errors.push(`Item ${i}: not an object (got ${typeof item})`);
      continue;
    }

    // Check required fields
    const missingFields = requiredFields.filter(field => {
      const val = item[field];
      return val === undefined || val === null || val === '';
    });

    if (missingFields.length > 0) {
      errors.push(`Item ${i}: missing required fields: ${missingFields.join(', ')}`);
      continue;
    }

    // Validate context_snippet is present and non-empty (grounding requirement)
    if (!item.context_snippet || item.context_snippet.trim().length < 5) {
      errors.push(`Item ${i}: context_snippet missing or too short (grounding required)`);
      continue;
    }

    // Normalize type field to match expected
    if (!item.type) {
      item.type = type;
    }

    validInsights.push(item);
  }

  return { insights: validInsights, errors };
}

module.exports = {
  analyzeSession,
  parseExtractionResult
};
