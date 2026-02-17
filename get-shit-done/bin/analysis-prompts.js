#!/usr/bin/env node

/**
 * Analysis Prompt Templates
 *
 * Three specialized Haiku extraction prompt templates for session analysis.
 * Each template produces structured JSON output with context grounding.
 *
 * CRITICAL: No direct API calls. All prompts are passed to Task() subagent by caller.
 * Temperature recommendation: 0.3 (lower temp for extraction accuracy)
 */

// ---------------------------------------------------------------------------
// DECISION_EXTRACTION_PROMPT - extracts explicit decisions from session
// ---------------------------------------------------------------------------
const DECISION_EXTRACTION_PROMPT = `Analyze this Claude Code session transcript and extract ALL explicit decisions made.

Session transcript:
{{SESSION_ENTRIES}}

For each decision found, provide:
1. What was decided (clear statement of the decision)
2. Why it was decided (reasoning behind the choice)
3. Alternatives that were considered (empty array if none mentioned)
4. Confidence level: "high" = explicitly stated, "medium" = strongly implied, "low" = inferred
5. Exact context snippet (quote from session that proves this decision exists)

Output ONLY a valid JSON array. No markdown, no prose, no code fences.

[
  {
    "type": "decision",
    "decision": "Use Haiku for session analysis instead of Sonnet",
    "reasoning": "Cost efficiency (3x cheaper) and speed while maintaining quality for extraction tasks",
    "alternatives_considered": ["Sonnet 4.5", "Local Llama models"],
    "confidence": "high",
    "context_snippet": "User: Should we use Haiku or Sonnet? Assistant: Haiku is better here..."
  }
]

CRITICAL: Only extract decisions EXPLICITLY stated in transcript. If uncertain, set confidence to "low".
Return empty array [] if no decisions found.`;

// ---------------------------------------------------------------------------
// REASONING_PATTERN_PROMPT - extracts reasoning patterns and problem-solving approaches
// ---------------------------------------------------------------------------
const REASONING_PATTERN_PROMPT = `Analyze this Claude Code session transcript and identify REASONING PATTERNS.

Session transcript:
{{SESSION_ENTRIES}}

Look for:
- Multi-step reasoning chains (A then B then C leads to conclusion)
- Problem-solving approaches (debugging, investigation, root cause analysis)
- Decision-making frameworks (pros/cons evaluation, tradeoff analysis, criteria evaluation)
- Meta-reasoning (reflection on approach, strategy changes mid-session)
- Constraint-driven reasoning (working backward from requirements or limitations)

For each reasoning pattern found, extract:
1. Pattern type (e.g. chain-of-thought, debugging, tradeoff-analysis, root-cause-analysis, constraint-driven)
2. Description of the reasoning process (what steps were taken)
3. Trigger condition (what problem or question prompted this reasoning)
4. Outcome or conclusion reached
5. Reusability (true if this pattern could apply to future similar problems)
6. Exact context snippet (quote from session showing this reasoning in action)

Output ONLY a valid JSON array. No markdown, no prose, no code fences.

[
  {
    "type": "reasoning_pattern",
    "pattern_type": "chain-of-thought",
    "description": "Cost analysis: counted tokens, estimated API cost, compared to budget, decided on chunking strategy",
    "trigger": "Budget constraint concern about large session analysis",
    "outcome": "Adopted 25k-char chunking with overlap to stay under budget",
    "reusable": true,
    "context_snippet": "..."
  }
]

Return empty array [] if no distinct reasoning patterns found.`;

// ---------------------------------------------------------------------------
// META_KNOWLEDGE_PROMPT - extracts higher-order insights, preferences, principles
// ---------------------------------------------------------------------------
const META_KNOWLEDGE_PROMPT = `Analyze this Claude Code session transcript and extract META-KNOWLEDGE.

Meta-knowledge = higher-order insights that go beyond specific decisions:
- User preferences (coding style, architecture choices, tool preferences, communication style)
- Working principles (how the user approaches problems, quality bars, non-negotiables)
- Constraints (budget limits, time pressure, technical limitations, political constraints)
- Learning patterns (what the user needed clarification on, repeated questions, knowledge gaps)

Session transcript:
{{SESSION_ENTRIES}}

For each meta-knowledge item found, extract:
1. Category: "preference" | "principle" | "constraint" | "learning_pattern"
2. Knowledge statement (generalized, reusable insight about the user or project)
3. Evidence list (which specific decisions or conversations support this insight)
4. Confidence level: "high" = repeated or explicitly stated, "medium" = clearly evident once, "low" = inferred from behavior
5. Scope: "project" = specific to this project, "global" = applies across projects
6. Exact context snippet (quote from session providing evidence)

Output ONLY a valid JSON array. No markdown, no prose, no code fences.

[
  {
    "type": "meta_knowledge",
    "category": "preference",
    "statement": "User prefers TypeScript over JavaScript for new modules",
    "evidence": ["3 instances of choosing TS over JS", "explicit statement about type safety value"],
    "confidence": "high",
    "scope": "global",
    "context_snippet": "User: Can we use TypeScript here? I value type safety..."
  }
]

Return empty array [] if no meta-knowledge patterns found.`;

// ---------------------------------------------------------------------------
// formatEntriesForPrompt - formats session JSONL entries for prompt injection
// ---------------------------------------------------------------------------

/**
 * Format session JSONL entries into prompt-ready text.
 * Filters out session_metadata, heartbeat, session_close entries (noise).
 * Includes: question, answer, user_message, bot_response
 *
 * @param {Array} entries - Session JSONL entries (plain objects)
 * @returns {string} Formatted session text for prompt injection
 */
function formatEntriesForPrompt(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return '(empty session - no entries found)';
  }

  const RELEVANT_TYPES = new Set(['question', 'answer', 'user_message', 'bot_response']);

  const relevant = entries.filter(e => e && RELEVANT_TYPES.has(e.type));

  if (relevant.length === 0) {
    return '(no relevant entries - session contains only metadata/heartbeat/system events)';
  }

  const lines = relevant.map((entry, idx) => {
    const timestamp = entry.timestamp || entry.created_at || entry.answered_at || 'unknown';

    let line;
    switch (entry.type) {
      case 'question':
        line = `[${idx}] [${timestamp}] QUESTION: ${entry.question || '(no question text)'}`;
        if (entry.context) {
          line += `\nContext: ${entry.context}`;
        }
        break;

      case 'answer':
        line = `[${idx}] [${timestamp}] ANSWER: ${entry.answer || '(no answer text)'}`;
        break;

      case 'user_message':
        line = `[${idx}] [${timestamp}] USER: ${entry.content || '(no content)'}`;
        break;

      case 'bot_response':
        line = `[${idx}] [${timestamp}] ASSISTANT: ${entry.content || '(no content)'}`;
        break;

      default:
        line = '';
    }

    return line;
  }).filter(Boolean);

  return lines.join('\n\n');
}

// ---------------------------------------------------------------------------
// Prompt builder functions - replace {{SESSION_ENTRIES}} placeholder
// ---------------------------------------------------------------------------

/**
 * Build decision extraction prompt with session text injected.
 * @param {string} sessionText - Formatted session text from formatEntriesForPrompt
 * @returns {string} Complete prompt ready for Haiku Task() subagent
 */
function buildDecisionPrompt(sessionText) {
  return DECISION_EXTRACTION_PROMPT.replace('{{SESSION_ENTRIES}}', sessionText || '(empty)');
}

/**
 * Build reasoning pattern extraction prompt with session text injected.
 * @param {string} sessionText - Formatted session text from formatEntriesForPrompt
 * @returns {string} Complete prompt ready for Haiku Task() subagent
 */
function buildReasoningPrompt(sessionText) {
  return REASONING_PATTERN_PROMPT.replace('{{SESSION_ENTRIES}}', sessionText || '(empty)');
}

/**
 * Build meta-knowledge extraction prompt with session text injected.
 * @param {string} sessionText - Formatted session text from formatEntriesForPrompt
 * @returns {string} Complete prompt ready for Haiku Task() subagent
 */
function buildMetaKnowledgePrompt(sessionText) {
  return META_KNOWLEDGE_PROMPT.replace('{{SESSION_ENTRIES}}', sessionText || '(empty)');
}

module.exports = {
  DECISION_EXTRACTION_PROMPT,
  REASONING_PATTERN_PROMPT,
  META_KNOWLEDGE_PROMPT,
  formatEntriesForPrompt,
  buildDecisionPrompt,
  buildReasoningPrompt,
  buildMetaKnowledgePrompt
};
