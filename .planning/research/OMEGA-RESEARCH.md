# Omega-Memory Research: Patterns for Knowledge System

**Project:** GSD Enhancements v2.0
**Source:** https://github.com/omega-memory/omega-memory
**Researched:** 2026-02-15
**Purpose:** Complement existing research with battle-tested patterns from #1 LongMemEval solution

## Context

omega-memory is a production memory system for AI coding agents scoring 95.4% on LongMemEval benchmark (#1 overall). This research extracts **patterns and algorithms** that can enhance our Knowledge System design. The goal is synthesis — combining omega-memory's battle-tested approaches with GSD's existing architecture.

**What this research provides:**
- Proven algorithms for search, deduplication, memory lifecycle
- Hook integration patterns for Claude Code
- Storage patterns (they use sqlite-vec, aligns with our direction)
- Checkpoint/resume format for execution continuity

**What this research does NOT do:**
- Replace existing STACK.md recommendations (sqlite-vec already chosen)
- Override existing FEATURES.md scope
- Change fundamental GSD architecture

## Key Patterns to Synthesize

### 1. Multi-Phase Search Pipeline

**omega-memory approach:**
```
Query → Vector similarity → FTS5 text → Word overlap → Context boost → Type weights → Results
```

**Why it works:**
- Vector alone misses keyword matches ("ECONNRESET" error)
- Text alone misses semantic similarity ("auth problem" ≈ "login issue")
- Combined phases catch both, ranked by relevance

**Synthesis opportunity:**
Our KNOW-01 specifies vector database. omega-memory shows that **layered search** dramatically improves recall. Consider adding:
- FTS5 for keyword fallback (SQLite built-in)
- Type-weighted scoring (decisions/lessons rank higher than summaries)
- Context boost (current file/project gets priority)

**Algorithm (simplified):**
```javascript
function search(query, context) {
  // Phase 1: Vector similarity
  const vectorResults = await vectorSearch(query, limit: 20);

  // Phase 2: Text search (catches exact matches vector misses)
  const textResults = await fts5Search(query, limit: 10);

  // Phase 3: Merge and score
  const merged = mergeResults(vectorResults, textResults);

  // Phase 4: Apply weights
  for (const result of merged) {
    result.score *= TYPE_WEIGHTS[result.type]; // decision: 2.0, lesson: 2.0, summary: 0.5
    if (result.project === context.project) result.score *= 1.15;
    if (result.tags.some(t => context.tags.includes(t))) result.score *= 1.10;
  }

  return merged.sort((a, b) => b.score - a.score).slice(0, limit);
}
```

### 2. Memory Deduplication & Evolution

**omega-memory approach:**
Three-stage dedup prevents storing same knowledge twice:

1. **Content hash** — Exact duplicate detection (fast, cheap)
2. **Canonical hash** — Reformatted duplicates (normalized text)
3. **Embedding similarity** — Semantic duplicates (threshold: 0.88)

**Memory evolution (key insight):**
When similarity is 0.65-0.88 (related but not duplicate), **update existing memory** instead of creating new one. This prevents knowledge fragmentation.

```javascript
async function storeMemory(content, type) {
  const contentHash = hash(content);
  const canonicalHash = hash(canonicalize(content));
  const embedding = await embed(content);

  // Stage 1: Exact duplicate
  const exact = await findByHash(contentHash);
  if (exact) return incrementAccess(exact);

  // Stage 2: Canonical duplicate
  const canonical = await findByCanonicalHash(canonicalHash);
  if (canonical) return incrementAccess(canonical);

  // Stage 3: Semantic duplicate
  const similar = await vectorSearch(embedding, limit: 1);
  if (similar && similar.score >= 0.88) return incrementAccess(similar);

  // Stage 4: Evolution (related but distinct)
  if (similar && similar.score >= 0.65) {
    return evolveMemory(similar, content); // Append new insights
  }

  // Stage 5: New memory
  return createMemory(content, type, embedding);
}
```

**Synthesis opportunity:**
Our KNOW-06 through KNOW-12 cover extraction and learning. Adding dedup + evolution:
- Prevents knowledge bloat (same lesson stored 50 times)
- Enables knowledge growth (related insights merge)
- Tracks evolution count (memory becomes richer over time)

### 3. TTL Categories for Memory Lifecycle

**omega-memory approach:**
Different memory types have different lifespans:

| Category | TTL | Types |
|----------|-----|-------|
| PERMANENT | Never expires | lessons, preferences, error_patterns |
| LONG_TERM | 2 weeks | decisions, checkpoints, task_completions |
| SHORT_TERM | 1 day | session_summaries, blocked_context |
| EPHEMERAL | 1 hour | code_chunks, temp_notes |

**Why it matters:**
- Lessons learned should persist forever
- Session summaries become noise after a day
- Automatic cleanup prevents database bloat

**Synthesis opportunity:**
Our knowledge system doesn't specify lifecycle. Adding TTL categories:
- Aligns with KNOW-10 (staleness tracking)
- Enables automatic consolidation (KNOW-09)
- Keeps storage bounded without manual cleanup

### 4. Hook-Based Auto-Capture

**omega-memory hooks:**

| Hook | Trigger | Action |
|------|---------|--------|
| SessionStart | New session begins | Surface relevant memories, show briefing |
| UserPromptSubmit | User sends message | Detect decisions/lessons via patterns |
| PostToolUse | Tool completes | Surface on file edits, capture errors |
| SessionStop | Session ends | Create summary, checkpoint if mid-task |

**Auto-capture patterns (regex-based):**

```javascript
const DECISION_PATTERNS = [
  /let's use (.+)/i,
  /we should (.+)/i,
  /instead of (.+), (.+)/i,
  /remember that (.+)/i,
  /going with (.+)/i,
  /decided to (.+)/i
];

const LESSON_PATTERNS = [
  /I learned (.+)/i,
  /turns out (.+)/i,
  /the trick is (.+)/i,
  /don't forget (.+)/i,
  /til[:\s]+(.+)/i,
  /lesson[:\s]+(.+)/i
];

// Quality gates
const MIN_LENGTH = 20;
const TECH_SIGNALS = ['/', '`', 'error', 'function', 'import', 'config'];
```

**Synthesis opportunity:**
Our HOOK-01 through HOOK-05 are in Phase 8 (late). omega-memory shows hooks are **foundational** for passive learning. Consider:
- Moving hook integration earlier (Phase 4 with extraction)
- Using regex patterns for initial capture (no ML needed)
- Quality gates prevent noise (min length, tech signals)

### 5. Checkpoint Format for Execution Continuity

**omega-memory checkpoint structure:**

```json
{
  "version": "1.0",
  "task_title": "Implementing user authentication",
  "plan": [
    "Set up auth middleware",
    "Create login endpoint",
    "Add session management",
    "Write tests"
  ],
  "progress": {
    "completed": ["Set up auth middleware", "Create login endpoint"],
    "current": "Add session management",
    "remaining": ["Write tests"]
  },
  "files_touched": [
    "src/middleware/auth.js",
    "src/routes/login.js"
  ],
  "decisions": [
    "Using JWT instead of sessions for stateless auth",
    "Token expiry set to 24 hours"
  ],
  "key_context": "User requested passwordless auth but we're starting with email/password, magic links in v2",
  "next_steps": [
    "Complete session refresh logic",
    "Add logout endpoint"
  ],
  "created_at": "2026-02-15T10:30:00Z"
}
```

**Synthesis opportunity:**
Our EXEC-09/EXEC-10 mention checkpoint/resume but no format. This structure:
- Captures enough context to resume in fresh session
- Tracks decisions made during execution
- Lists concrete next steps
- Stores as searchable memory (can find past checkpoints)

### 6. Access Tracking for Relevance Ranking

**omega-memory approach:**
Every memory has `access_count` and `last_accessed`. Frequently-used knowledge ranks higher:

```javascript
// On every retrieval
await db.run(`
  UPDATE memories
  SET access_count = access_count + 1,
      last_accessed = datetime('now')
  WHERE node_id = ?
`, [memory.id]);

// In search ranking
score *= 1.0 + Math.log10(access_count + 1) * 0.1;
```

**Why it matters:**
- Knowledge that helps often should surface more
- Unused knowledge naturally fades (but doesn't delete)
- Creates feedback loop: useful → accessed → ranks higher → more useful

**Synthesis opportunity:**
Aligns with KNOW-19/KNOW-20 (feedback loops). Access tracking is passive feedback — no user action needed.

## Patterns NOT to Adopt

| Pattern | Reason to Skip |
|---------|----------------|
| Python-only implementation | GSD is JavaScript |
| Separate MCP server | GSD uses skills, not MCP tools |
| UDS socket daemon | Adds infrastructure complexity |
| Graph edges (related, supersedes, contradicts) | Start simple, add if needed later |
| Encryption at rest | Nice-to-have, not core value |

## Synthesis Recommendations

### For Phase 3 (Knowledge Foundation)

**Combine:**
- Our: SQLite + sqlite-vec + dual scope (global/project)
- omega-memory: Multi-phase search, type weights, TTL categories

**Result:** Knowledge DB that finds relevant memories via multiple signals, auto-cleans based on type.

### For Phase 4 (Extraction & Learning)

**Combine:**
- Our: On-the-fly extraction, session scanning, synthesis passes
- omega-memory: Hook-based auto-capture, regex patterns, dedup + evolution

**Result:** Passive capture during normal work, memories grow and merge rather than duplicate.

### For Phase 5 (Permissions & Safety)

**Keep as-is.** omega-memory has TTL/decay but no explicit permission tracking. Our stop-and-ask model is more sophisticated.

### For Phase 6 (Autonomous Execution)

**Combine:**
- Our: Sub-coordinator lifecycle, EXECUTION_LOG.md
- omega-memory: Checkpoint format, resume via semantic search

**Result:** Checkpoints that are both structured (resumable) and searchable (findable).

## Technical Notes

### sqlite-vec in Node.js

omega-memory uses Python bindings. For GSD (Node.js):

```bash
pnpm add better-sqlite3 sqlite-vec
```

```javascript
const Database = require('better-sqlite3');
const sqliteVec = require('sqlite-vec');

const db = new Database('.planning/knowledge/knowledge.db');
sqliteVec.load(db);

// Create vector table
db.exec(`
  CREATE VIRTUAL TABLE IF NOT EXISTS memories_vec USING vec0(
    embedding float[384]
  )
`);
```

### Embedding Model

omega-memory uses bge-small-en-v1.5 (384-dim, ~90MB). Our STACK.md suggests nomic-embed-text-v1.5 (768-dim).

**Trade-off:**
- bge-small: Smaller, faster, proven in omega-memory
- nomic-embed: Better for code/docs, longer context (8192 vs 512)

**Recommendation:** Start with bge-small (proven), upgrade to nomic if needed.

## Confidence Assessment

| Pattern | Confidence | Rationale |
|---------|------------|-----------|
| Multi-phase search | HIGH | Battle-tested, clear improvement over vector-only |
| Dedup + evolution | HIGH | Solves real problem (knowledge bloat) |
| TTL categories | HIGH | Simple, effective, low implementation cost |
| Hook auto-capture | MEDIUM | Patterns need tuning for GSD context |
| Checkpoint format | HIGH | Well-structured, immediately usable |
| Access tracking | HIGH | Passive, no user effort required |

---

*Research completed: 2026-02-15*
*Source: omega-memory analysis (LongMemEval #1, 95.4%)*
*Purpose: Synthesis with existing GSD research, not replacement*
