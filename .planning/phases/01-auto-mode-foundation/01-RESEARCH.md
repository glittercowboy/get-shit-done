# Phase 1: Auto Mode Foundation - Research

**Researched:** 2026-02-15
**Domain:** Intelligent model selection system, task routing, quota management
**Confidence:** HIGH

## Summary

Phase 1 implements an intelligent model selection system that routes GSD tasks to appropriate Claude model tiers (Haiku/Sonnet/Opus) based on task patterns, with token tracking and quota management to achieve 40-60% token savings without quality loss.

The system consists of three core components: (1) A routing skill that analyzes task descriptions and returns model recommendations plus relevant context injection, (2) A pattern matching engine using keyword-based lookup tables for fast, deterministic routing decisions, and (3) Quota tracking with auto-wait functionality to maintain autonomous execution when rate limits are approached.

**Primary recommendation:** Use gray-matter for YAML front matter parsing, implement keyword-based pattern matching with simple lookup tables (no ML/semantic analysis), track quota via Claude API response headers, and leverage existing GSD infrastructure (gsd-tools.js, .planning/config.json) for state management and configuration.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Core Architecture
- **Task Context Skill** — Single skill that returns: model recommendation, relevant guides (top 3), relevant skills, project-specific instructions
- **Sub-coordinator spawns agents** — Skill decides, sub-coordinator executes via Task tool with model parameter
- **No explicit tags on tasks** — Skill infers model from task description/keywords only

#### Complexity Detection
- **Hybrid multi-signal** — Combine keyword patterns from task description + explicit annotations from docs
- **Pattern → Model table** — Simple lookup format in the skill, easy to scan and edit
- **Tie-breaking** — When multiple patterns match different models, stronger model wins (safety over savings)
- **Output** — Skill returns model name only (no confidence scores)

#### Rule Generation (Phase 1 Scope)
- **Session scanning** — Haiku scans last 5-7 days of sessions from igaming-platform project
- **Sources** — Both Claude Code conversation logs and GSD execution logs
- **Output** — Markdown table: Pattern | Suggested Model | Evidence
- **User review** — Present suggestions, user corrects before finalizing

#### Context Matching
- **Indexing strategy** — Hybrid: index once per session, refresh on file changes
- **Matching method** — Keyword extraction + explicit front-matter tags (existing YAML format)
- **Match limit** — Top 3 most relevant docs/guides injected per task
- **CLAUDE.md handling** — Keyword extraction from instruction blocks

#### Tag System (Phase 1 Scope)
- **Use existing front-matter** — Docs already have YAML tags, parse directly
- **Tag review** — Haiku reviews all docs, suggests tag updates for task-matching use case
- **Find validators** — Search for existing doc/tag validators (GitHub workflows, git hooks)
- **Update flows** — Ensure tag standards support routing needs
- **Changes presented for review** — User approves before applying

#### Model Tiers
- **Three tiers** — Haiku, Sonnet, Opus
- **Symbolic names** — Skill outputs "haiku"/"sonnet"/"opus", mapping to model IDs in GSD settings
- **No hard locks** — All routing via pattern matching, no model forced for specific task types
- **Rule scope** — Global rules in ~/.claude/, project rules in .planning/, project overrides global

#### Cost/Quota Display
- **Display timing** — Real-time running total + on-request command
- **Status bar format** — `Tokens: 32K → Haiku | +15 min | H:60% S:35% O:5%`
- **Metrics shown:**
  - Tokens delegated to smaller models
  - Session extension estimate (token-to-time conversion)
  - Model distribution percentage
- **On-request command** — Session total + per-model breakdown in table format

#### Quota Management
- **Soft warning** — At 80% of session quota
- **Auto-wait** — At 98-99%: pause, calculate refresh time, sleep until quota restores, verify, resume
- **Same logic for weekly quota**
- **Quota logic location** — In sub-coordinator (checks before spawning, handles wait/resume)

#### Fallback Behavior
- **Default model** — Sonnet when no patterns match
- **Unmatched logging** — Track tasks that fell back to default for periodic rule improvement
- **Escalation ladder** — Haiku → Sonnet → Opus (full ladder before failing)
- **Failure criteria:**
  - Task error/exception
  - Validation rejection (Phase 2)
  - Duration timeout: Haiku 20min, Sonnet 40min, Opus 1hr (configurable)
- **Timeout logging** — Task details, duration, model assigned, reason for delay

### Claude's Discretion
- Exact keyword extraction algorithm
- Pattern matching implementation details
- Status bar rendering approach
- Log file format and rotation

### Deferred Ideas (OUT OF SCOPE)
- Semantic embedding for context matching — keep for later, start with keyword + tags
- Haiku task validation by Sonnet — Phase 2 (AUTO-05)
- Learning from user feedback on incorrect model choices — Phase 2

</user_constraints>

## Standard Stack

### Core Libraries

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| gray-matter | ^4.0.3 | YAML front matter parsing | Battle-tested, used by Eleventy/Gatsby/MDX. Supports YAML/JSON/TOML, custom delimiters. Most comprehensive option. |
| Node.js built-in fs/path | N/A | File system operations | No dependencies, native performance, already used in gsd-tools.js |
| Claude API (via Claude Code) | Current | Model execution, quota tracking | Direct access to response headers for rate limit monitoring |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| YAKE! (optional) | ^1.0.0 | Lightweight keyword extraction | If simple regex patterns insufficient for keyword extraction from CLAUDE.md |
| chalk (existing) | ^5.3.0 | Terminal output formatting | Status bar rendering, quota warnings |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| gray-matter | front-matter, yaml-front-matter | Less features, no TOML/custom delimiter support. gray-matter more battle-tested. |
| Keyword patterns | YAKE/RAKE/semantic embeddings | Patterns are simpler, faster, more deterministic. Deferred semantic analysis to Phase 2+. |
| Custom quota tracking | Claude API Usage Cost API | Response headers provide real-time per-request data. Usage API is batch/reporting focused. |

**Installation:**
```bash
npm install gray-matter  # Only new dependency needed
```

## Architecture Patterns

### Recommended Project Structure

```
~/.claude/
├── skills/
│   └── gsd-task-router/
│       ├── SKILL.md                    # Main routing skill
│       ├── routing-rules.md            # Pattern → Model lookup table
│       └── context-index.json          # Cached doc/guide index
├── get-shit-done/
│   └── bin/
       └── gsd-tools.js                 # Extended with quota tracking functions
.planning/
├── config.json                         # Extended with auto_mode settings
├── routing/
│   ├── project-rules.md                # Project-specific routing overrides
│   └── routing-stats.jsonl             # Unmatched task log for improvement
└── quota/
    └── session-usage.json              # Token usage tracking per session
```

### Pattern 1: Keyword-Based Task Routing

**What:** Simple pattern matching using keyword lookups against task descriptions to determine model tier.

**When to use:** All task routing decisions in Phase 1 (no ML, no embeddings).

**Example:**
```javascript
// routing-rules.md format (markdown table for easy editing)
// Pattern | Model | Priority | Rationale
// --------|-------|----------|----------
// "database schema|migration|index" | sonnet | 2 | Complex data modeling
// "button|styling|CSS|layout" | haiku | 1 | Simple UI work
// "architecture|system design|integration" | opus | 3 | High-level decisions

// Implementation in skill
const rules = parseMarkdownTable('routing-rules.md');
const matches = rules.filter(rule =>
  new RegExp(rule.pattern, 'i').test(taskDescription)
);

// Tie-breaking: highest priority (strongest model) wins
const selectedRule = matches.sort((a, b) => b.priority - a.priority)[0];
return selectedRule?.model || 'sonnet'; // default to sonnet
```

**Source:** User decision (pattern → model table), implementation based on standard JavaScript regex matching.

### Pattern 2: Front Matter Tag-Based Context Matching

**What:** Parse YAML front matter from docs/guides to extract tags, then match task keywords against tag sets.

**When to use:** Determining which docs/guides/skills to inject into task context.

**Example:**
```javascript
// Using gray-matter to parse doc front matter
import matter from 'gray-matter';

const doc = matter.read('~/.claude/guides/supabase-setup.md');
// doc.data = { tags: ['database', 'supabase', 'authentication', 'RLS'] }
// doc.content = actual markdown content

// Task matching
function matchDocs(taskDescription, allDocs) {
  const taskKeywords = extractKeywords(taskDescription);
  return allDocs
    .map(doc => ({
      doc,
      score: countMatches(taskKeywords, doc.data.tags || [])
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)  // Top 3 matches
    .map(item => item.doc);
}
```

**Source:** gray-matter documentation, YAML front matter is standard in static site generators.

### Pattern 3: Claude API Response Header Quota Tracking

**What:** Extract rate limit information from Claude API response headers to track quota usage in real-time.

**When to use:** Every Task spawn to monitor quota, trigger warnings, implement auto-wait.

**Example:**
```javascript
// After each API call (Task spawn), Claude Code receives headers
const headers = {
  'anthropic-ratelimit-input-tokens-remaining': '450000',
  'anthropic-ratelimit-input-tokens-limit': '2000000',
  'anthropic-ratelimit-input-tokens-reset': '2026-02-15T14:30:00Z'
};

// Calculate usage percentage
const remaining = parseInt(headers['anthropic-ratelimit-input-tokens-remaining']);
const limit = parseInt(headers['anthropic-ratelimit-input-tokens-limit']);
const usagePercent = ((limit - remaining) / limit) * 100;

if (usagePercent >= 80) {
  console.warn('⚠️  80% quota used');
}

if (usagePercent >= 98) {
  const resetTime = new Date(headers['anthropic-ratelimit-input-tokens-reset']);
  const waitSeconds = Math.ceil((resetTime - Date.now()) / 1000);
  console.log(`⏳ Quota limit reached. Waiting ${waitSeconds}s for reset...`);
  await sleep(waitSeconds * 1000);
  // Verify quota restored, then resume
}
```

**Source:** [Claude API Rate Limits Documentation](https://platform.claude.com/docs/en/api/rate-limits)

### Anti-Patterns to Avoid

- **Over-engineering routing logic:** Don't build ML classifiers or semantic embeddings in Phase 1. Simple keyword patterns meet requirements and are easier to debug/edit.
- **Hardcoding model names:** Use symbolic names (haiku/sonnet/opus) in rules, map to actual model IDs in config. Allows easy model version updates.
- **Ignoring quota response headers:** Don't poll Usage API for quota data. Headers provide real-time per-request data with no additional API calls.
- **Blocking on quota limits:** Don't stop execution and ask user. Auto-wait maintains autonomous execution (per user requirement).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| YAML parsing | Custom regex-based parser | gray-matter | Handles edge cases (TOML, JSON, custom delimiters, nested objects, escaping) |
| Keyword extraction | Custom tokenizer + stemming | Simple regex split + lowercase | User deferred complex NLP to Phase 2. Regex is deterministic and fast. |
| Rate limit tracking | Custom token counter | Claude API response headers | API provides accurate counts including cache hits, which affect rate limits differently |
| Session log parsing | Custom JSONL parser | Node.js fs.readFileSync + JSON.parse per line | Standard approach, no dependencies needed |

**Key insight:** GSD already has robust infrastructure (gsd-tools.js, config system, state management). Extend existing patterns rather than creating parallel systems. The Task tool provides model parameter support natively—no custom spawning logic needed.

## Common Pitfalls

### Pitfall 1: Cache-Unaware Quota Tracking

**What goes wrong:** Tracking total input tokens instead of uncached tokens leads to incorrect rate limit calculations.

**Why it happens:** Claude API rate limits only count `input_tokens` + `cache_creation_input_tokens` toward ITPM. Cached tokens (`cache_read_input_tokens`) don't count for most models. If you track all tokens, you'll think you're hitting limits when you're not.

**How to avoid:**
- Use response headers `anthropic-ratelimit-input-tokens-remaining` instead of calculating from usage fields
- Headers reflect actual rate limit accounting (cache-aware)
- Only sum `input_tokens + cache_creation_input_tokens` if manually tracking

**Warning signs:** Quota warnings fire but API calls still succeed, or estimated time to quota exhaustion doesn't match actual API behavior.

**Source:** [Claude API Rate Limits - Cache-aware ITPM](https://platform.claude.com/docs/en/api/rate-limits#cache-aware-itpm)

### Pitfall 2: Session vs Weekly Quota Confusion

**What goes wrong:** Tracking only session quota (5-hour window) but hitting weekly limits, causing unexpected failures.

**Why it happens:** Anthropic introduced weekly limits in August 2025 on top of 5-hour windows. You need to track BOTH independently.

**How to avoid:**
- Track two separate quotas: session (5hr rolling) and weekly (calendar week)
- Different headers: session uses standard `anthropic-ratelimit-*`, weekly uses org-level tracking
- Warning thresholds for both: 80% session, 80% weekly
- Auto-wait calculates which quota limit is closer and waits for that one

**Warning signs:** Session quota shows 30% usage but API returns 429 errors. Check if weekly limit exceeded.

**Source:** [Claude Code Token Limits](https://www.faros.ai/blog/claude-code-token-limits), [Rate limits documentation](https://platform.claude.com/docs/en/api/rate-limits)

### Pitfall 3: Pattern Priority Conflicts

**What goes wrong:** Multiple patterns match a task, tie-breaking logic selects wrong model, quality degrades or costs spike.

**Why it happens:** Task descriptions often contain multiple signals. E.g., "Add authentication to admin dashboard" matches both "authentication" (opus-level) and "dashboard" (sonnet-level).

**How to avoid:**
- Assign explicit priority levels to patterns (1=haiku, 2=sonnet, 3=opus)
- User decision: stronger model wins (safety over savings)
- Log multi-match cases to routing-stats.jsonl for review
- Pattern refinement: make patterns more specific over time

**Warning signs:** Tasks routed to Haiku fail validation, or simple tasks going to Opus unnecessarily.

### Pitfall 4: Stale Context Index

**What goes wrong:** New docs/guides added to ~/.claude/ but not included in context injection. Task executes without relevant guidance.

**Why it happens:** Context index cached at session start, doesn't refresh when files change.

**How to avoid:**
- User decision: "Hybrid: index once per session, refresh on file changes"
- Watch for file mtime changes in ~/.claude/guides/, ~/.claude/skills/
- Re-index if mtime > index_created_at
- Or: simple approach—re-index every N task spawns (e.g., every 10 tasks)

**Warning signs:** User adds new guide, next task doesn't reference it. Check index timestamp vs file timestamp.

### Pitfall 5: Markdown Table Parsing Fragility

**What goes wrong:** routing-rules.md formatting changes break parser, all routing fails.

**Why it happens:** Hand-rolling markdown table parser misses edge cases (extra spaces, missing pipes, empty cells).

**How to avoid:**
- Use simple split('|') approach but trim() each cell
- Validate table has required columns on load
- Provide clear error: "routing-rules.md line 5: missing 'Model' column"
- Consider JSON format for rules if markdown proves too fragile (still human-editable)

**Warning signs:** Skill returns errors on startup, routing falls back to default for all tasks.

## Code Examples

Verified patterns from standard sources:

### YAML Front Matter Parsing with gray-matter

```javascript
// Source: https://github.com/jonschlinkert/gray-matter
import matter from 'gray-matter';

// Parse file with front matter
const file = matter.read('~/.claude/guides/supabase-rls.md');

console.log(file.data);
// {
//   tags: ['database', 'security', 'RLS', 'postgres'],
//   complexity: 'medium',
//   models: ['sonnet', 'opus']
// }

console.log(file.content);
// Markdown content without front matter

// Parse string directly
const content = `---
tags: [authentication, JWT, cookies]
---
# Auth Guide
...`;
const parsed = matter(content);
```

### Simple Keyword Extraction (No Dependencies)

```javascript
// Extract keywords from task description
// Simple approach: split on word boundaries, lowercase, filter common words
function extractKeywords(text) {
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter(word => word.length > 3 && !stopWords.has(word));
}

// Usage
const taskDesc = "Add authentication middleware with JWT validation";
const keywords = extractKeywords(taskDesc);
// ['authentication', 'middleware', 'validation']
```

### Pattern Matching Against Rules

```javascript
// Load and parse routing rules from markdown table
function loadRoutingRules(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));

  // Skip header and separator rows
  const dataLines = lines.slice(2);

  return dataLines.map(line => {
    const cells = line.split('|').map(c => c.trim()).filter(Boolean);
    return {
      pattern: cells[0],
      model: cells[1],
      priority: parseInt(cells[2]) || 1,
      rationale: cells[3] || ''
    };
  });
}

// Match task against rules
function selectModel(taskDescription, rules) {
  const matches = rules.filter(rule =>
    new RegExp(rule.pattern, 'i').test(taskDescription)
  );

  if (matches.length === 0) {
    return { model: 'sonnet', reason: 'default (no pattern match)' };
  }

  // Tie-breaking: highest priority wins (stronger model)
  const selected = matches.sort((a, b) => b.priority - a.priority)[0];

  // Log if multiple matches for analysis
  if (matches.length > 1) {
    logMultiMatch(taskDescription, matches, selected);
  }

  return { model: selected.model, reason: selected.rationale };
}
```

### Quota Tracking via Response Headers

```javascript
// Track quota from Claude API response headers
// Note: In Claude Code, these headers are accessible after Task() calls
function trackQuota(responseHeaders) {
  const quota = {
    input: {
      remaining: parseInt(responseHeaders['anthropic-ratelimit-input-tokens-remaining']),
      limit: parseInt(responseHeaders['anthropic-ratelimit-input-tokens-limit']),
      reset: new Date(responseHeaders['anthropic-ratelimit-input-tokens-reset'])
    },
    output: {
      remaining: parseInt(responseHeaders['anthropic-ratelimit-output-tokens-remaining']),
      limit: parseInt(responseHeaders['anthropic-ratelimit-output-tokens-limit']),
      reset: new Date(responseHeaders['anthropic-ratelimit-output-tokens-reset'])
    }
  };

  // Calculate usage percentage
  quota.input.usagePercent = ((quota.input.limit - quota.input.remaining) / quota.input.limit) * 100;
  quota.output.usagePercent = ((quota.output.limit - quota.output.remaining) / quota.output.limit) * 100;

  return quota;
}

// Auto-wait implementation
async function checkAndWaitForQuota(quota, threshold = 98) {
  const maxUsage = Math.max(quota.input.usagePercent, quota.output.usagePercent);

  if (maxUsage >= threshold) {
    const resetTime = quota.input.usagePercent > quota.output.usagePercent
      ? quota.input.reset
      : quota.output.reset;

    const waitMs = Math.max(0, resetTime - Date.now());
    const waitSec = Math.ceil(waitMs / 1000);

    console.log(`⏳ Quota at ${maxUsage.toFixed(1)}% - waiting ${waitSec}s for reset...`);
    await new Promise(resolve => setTimeout(resolve, waitMs + 1000)); // +1s buffer

    console.log('✓ Quota restored, resuming execution');
  }
}
```

### Context Index Building

```javascript
// Build searchable index of docs/guides with tags
function buildContextIndex(basePath) {
  const index = [];
  const files = glob.sync(`${basePath}/**/*.md`);

  for (const file of files) {
    try {
      const parsed = matter.read(file);
      index.push({
        path: file,
        tags: parsed.data.tags || [],
        keywords: extractKeywords(parsed.content),
        mtime: fs.statSync(file).mtime,
        title: parsed.data.title || path.basename(file, '.md')
      });
    } catch (err) {
      console.warn(`Failed to index ${file}: ${err.message}`);
    }
  }

  return {
    entries: index,
    created_at: new Date().toISOString(),
    base_path: basePath
  };
}

// Refresh index if files changed
function refreshIndexIfNeeded(cachedIndex) {
  const needsRefresh = cachedIndex.entries.some(entry => {
    const currentMtime = fs.statSync(entry.path).mtime;
    return currentMtime > new Date(entry.mtime);
  });

  if (needsRefresh) {
    return buildContextIndex(cachedIndex.base_path);
  }

  return cachedIndex;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual model selection | Intelligent routing with auto profiles | Phase 1 (this phase) | 40-60% token savings |
| Static profiles (quality/balanced/budget) | Dynamic per-task routing | Phase 1 | Fine-grained cost control |
| No quota awareness | Real-time quota tracking + auto-wait | Phase 1 | Maintains autonomous execution |
| Total token counting | Cache-aware token accounting | Aug 2025 (API change) | Accurate rate limit tracking |
| 5-hour session limits only | Session + weekly limits | Aug 2025 (Anthropic policy) | Must track both quota types |
| Semantic embedding for routing | Keyword pattern matching | Phase 1 (defer to Phase 2+) | Simpler, faster, deterministic |

**Deprecated/outdated:**
- **Anthropic Usage Cost API for real-time tracking**: Response headers provide per-request data. Usage API is for batch reporting.
- **front-matter library**: gray-matter supersedes it with more features (TOML, custom delimiters, widely adopted).
- **Combined tokens-per-minute limits**: Claude API now separates input (ITPM) and output (OTPM) limits with cache-aware counting.

## Open Questions

1. **Session log format and access**
   - What we know: Claude Code stores sessions in `~/.claude/projects/<project-hash>/<session-id>/`, confirmed via filesystem inspection
   - What's unclear: Exact format of conversation logs (JSONL per turn? structured JSON?), how to correlate session IDs with timestamps for "last 5-7 days" filtering
   - Recommendation: Investigate session directory structure in igaming-platform project during implementation. Fallback: scan by directory mtime instead of parsing logs.

2. **GSD execution log location**
   - What we know: User wants to scan "both Claude Code conversation logs and GSD execution logs"
   - What's unclear: Where GSD logs task execution details. STATE.md and SUMMARY.md exist, but are these the "execution logs" or is there a separate log file?
   - Recommendation: Check if gsd-tools.js writes to a log file. If not, parse SUMMARY.md files as execution record.

3. **Task tool response header access**
   - What we know: Claude API returns quota headers with every response
   - What's unclear: Whether Claude Code TaskCreate/TaskUpdate expose these headers to calling code, or if they're only available in the spawned agent's context
   - Recommendation: Test during implementation. If headers not accessible, use estimated tracking (count tokens in task descriptions) with periodic verification.

4. **Weekly quota reset timing**
   - What we know: Weekly limits exist, API returns `anthropic-ratelimit-tokens-reset` header
   - What's unclear: Whether weekly quota follows calendar week (Mon-Sun) or rolling 7-day window like session quota
   - Recommendation: Assume rolling window (same pattern as session quota). Verify via API headers during first week of usage.

## Sources

### Primary (HIGH confidence)

- [Claude API Rate Limits Documentation](https://platform.claude.com/docs/en/api/rate-limits) - Comprehensive rate limit mechanics, headers, cache-aware ITPM
- [gray-matter GitHub](https://github.com/jonschlinkert/gray-matter) - YAML front matter parsing, feature set, usage examples
- GSD codebase inspection - Existing architecture patterns (model profiles, Task tool usage, config.json schema)
- [Claude Code Tasks Documentation](https://code.claude.com/docs/en/sub-agents) - Task tool, model parameter, subagent spawning

### Secondary (MEDIUM confidence)

- [Claude Code Conversation History Access](https://kentgigger.com/posts/claude-code-conversation-history) - Session storage location at ~/.claude/projects/
- [LLM Model Routing Research](https://www.burnwise.io/blog/llm-model-routing-guide) - Industry patterns for task-to-model routing, 85% cost savings with routers
- [Claude Code Usage Tracking](https://shipyard.build/blog/claude-code-track-usage/) - Token tracking patterns, cost monitoring approaches

### Tertiary (LOW confidence)

- WebSearch results on YAKE keyword extraction - Lightweight option if simple patterns insufficient (not verified in practice)
- JavaScript pattern matching libraries - Multiple options exist but user decision is simple lookup table, no library needed

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - gray-matter is industry standard, GSD patterns verified in codebase
- Architecture: HIGH - All patterns grounded in user decisions and existing GSD infrastructure
- Pitfalls: MEDIUM-HIGH - Cache-aware tracking and weekly quotas verified in docs, pattern conflicts based on routing literature

**Research date:** 2026-02-15
**Valid until:** 2026-03-15 (30 days - stable domain, Claude API is mature)

**Key findings:**
1. **No new complex dependencies needed** - gray-matter is only addition, rest uses Node.js built-ins and existing GSD infrastructure
2. **Response headers are authoritative** - Don't calculate quota, read from API headers (cache-aware, accurate)
3. **Simple beats complex** - Keyword patterns meet requirements without ML/embeddings
4. **Two quota types required** - Session (5hr) AND weekly (calendar) must both be tracked independently
5. **GSD infrastructure ready** - gsd-tools.js, config.json, Task tool all support model parameter and configuration extension needed for auto mode
