# Architecture Research

**Domain:** AI Development Framework Enhancement
**Researched:** 2026-02-15
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                      USER INTERFACE LAYER                            │
│  /gsd:execute-roadmap, /gsd:plan-phase, /gsd:execute-phase          │
├─────────────────────────────────────────────────────────────────────┤
│                    ORCHESTRATION LAYER                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Workflow     │  │ Complexity   │  │ Knowledge    │              │
│  │ Coordinator  │  │ Detector     │  │ Manager      │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                  │                  │                      │
├─────────┴──────────────────┴──────────────────┴──────────────────────┤
│                      MODEL SELECTION LAYER                           │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │  Intelligent Router: Complexity Score → Model Assignment   │     │
│  │  (Haiku 0-30 | Sonnet 31-70 | Opus 71-100)                 │     │
│  └────────────────────────────────────────────────────────────┘     │
├─────────────────────────────────────────────────────────────────────┤
│                       AGENT EXECUTION LAYER                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │ Planner  │  │ Executor │  │Research  │  │ Verifier │            │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘            │
│       │             │              │             │                  │
├───────┴─────────────┴──────────────┴─────────────┴──────────────────┤
│                     PERSISTENCE LAYER                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Knowledge DB │  │ State Store  │  │ Git Commits  │              │
│  │ (Graph+Vec)  │  │ (STATE.md)   │  │ (History)    │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Complexity Detector** | Analyze task descriptions, extract signals, assign 0-100 complexity score | Keyword analysis + heuristics (static rules initially, ML later) |
| **Model Router** | Map complexity score to model tier (Haiku/Sonnet/Opus) | Threshold-based routing with fallback chain |
| **Workflow Coordinator** | Spawn sub-coordinators per phase, manage context cleanup, handle failures | Hierarchical orchestration with Task() calls |
| **Knowledge Manager** | Store/retrieve project learnings, decisions, patterns across sessions | Hybrid: Graph DB (relationships) + Vector store (semantic retrieval) + JSON (session state) |
| **Phase Executor** | Execute research→plan→execute→verify cycle for single phase | Sub-coordinator with isolated context |
| **State Store** | Track execution progress, blockers, decisions, completion status | Markdown-based (.planning/STATE.md) with structured sections |

## Recommended Project Structure

```
.claude/
├── get-shit-done/
│   ├── bin/
│   │   ├── gsd-tools.js                    # Extended with complexity detection
│   │   └── knowledge-db.js                 # Knowledge persistence operations
│   ├── agents/
│   │   ├── gsd-roadmap-coordinator.md      # New: Autonomous roadmap execution
│   │   ├── gsd-phase-coordinator.md        # New: Single phase orchestration
│   │   ├── gsd-complexity-analyzer.md      # New: Deep complexity analysis (opt)
│   │   ├── gsd-planner.md                  # Existing (enhanced with knowledge queries)
│   │   ├── gsd-executor.md                 # Existing (enhanced with knowledge writes)
│   │   ├── gsd-verifier.md                 # Existing (enhanced with validation)
│   │   └── [other existing agents]
│   ├── workflows/
│   │   ├── execute-roadmap.md              # New: Autonomous roadmap orchestration
│   │   ├── plan-phase.md                   # Existing (add knowledge integration)
│   │   ├── execute-phase.md                # Existing (add knowledge integration)
│   │   └── [other existing workflows]
│   └── templates/
│       ├── EXECUTION_LOG.md                # New: Roadmap execution tracking
│       └── KNOWLEDGE_ENTRY.md              # New: Structured knowledge format

.planning/
├── config.json                             # Extended with: auto_mode, knowledge_db
├── STATE.md                                # Existing (add visual status layer)
├── ROADMAP.md                              # Existing
├── EXECUTION_LOG.md                        # New: Per-roadmap execution journal
├── knowledge/
│   ├── db.json                             # JSON-based knowledge store (MVP)
│   ├── graph.cypher                        # Cypher export (future: Neo4j)
│   └── embeddings/                         # Vector embeddings (future: Pinecone)
│       └── index.json
└── phases/
    └── [existing phase structure]
```

### Structure Rationale

- **bin/gsd-tools.js:** Already 4000+ lines, central hub for state/model resolution. Add complexity detection functions here (200-300 lines). Extract knowledge operations to separate module (knowledge-db.js) to keep concerns separated.
- **agents/:** New coordinator agents follow existing naming convention. Complexity analyzer optional (can start with inline heuristics in gsd-tools.js).
- **.planning/knowledge/:** Local-first JSON database (MVP), path to upgrade to graph DB later. Keeps all project data portable.
- **Visual state tracking:** Add emoji layer to STATE.md without breaking existing tools (additive change).

## Architectural Patterns

### Pattern 1: Hierarchical Orchestration with Fresh Context

**What:** Parent coordinator spawns sub-coordinators per phase. Each sub-coordinator runs in isolated context, reads minimal state, writes completion signal. Parent maintains clean context across entire roadmap.

**When to use:** Multi-phase autonomous execution where context window would normally fill across 3+ phases.

**Trade-offs:**
- **Pros:** No context rot, scalable to 20+ phase roadmaps, predictable token usage
- **Cons:** Sub-coordinators don't see prior phase details (must query knowledge DB), slight overhead spawning agents
- **Complexity:** Medium (requires careful state passing)

**Example:**
```javascript
// In gsd-roadmap-coordinator agent
for (const phase of roadmapPhases) {
  const contextSummary = loadMinimalContext(phase); // <500 tokens

  const result = await Task({
    agent: 'gsd-phase-coordinator',
    model: determineModel('gsd-phase-coordinator', phase.description),
    prompt: `
      Execute phase ${phase.number}: ${phase.description}

      Context: ${contextSummary}

      Run complete cycle: research → plan → execute → verify
      Return structured completion signal with artifacts.
    `
  });

  if (result.status === 'complete') {
    updateExecutionLog(phase, result);
    archiveOldContext(); // Keep context <30%
  } else {
    handleFailure(phase, result);
  }
}
```

### Pattern 2: Signal-Based Complexity Detection

**What:** Extract multiple signal types from task description (domain keywords, length, structural complexity, validation requirements) and combine into 0-100 score. Map score to model tier via thresholds.

**When to use:** Auto mode for model selection, any time you need to right-size computational resources.

**Trade-offs:**
- **Pros:** Transparent, debuggable, fast (<10ms), no external dependencies
- **Cons:** Static rules can be gamed, requires tuning thresholds based on real usage
- **Complexity:** Low (keyword matching + arithmetic)

**Example:**
```javascript
function detectTaskComplexity(description) {
  let score = 50; // Baseline: assume Sonnet

  // Domain signals
  if (hasPattern(description, HAIKU_PATTERNS)) score -= 25;
  if (hasPattern(description, OPUS_PATTERNS)) score += 30;

  // Structural signals
  if (description.length < 100) score -= 10; // Brief = simpler
  if (description.length > 500) score += 10; // Verbose = complex
  if (hasCodeBlocks(description)) score += 5; // Specs provided

  // Cross-cutting signals
  if (mentionsMultipleComponents(description)) score += 20;
  if (requiresValidation(description)) score += 10;

  return clamp(score, 0, 100);
}

function routeToModel(score) {
  if (score <= 30) return 'haiku';
  if (score <= 70) return 'sonnet';
  return 'opus';
}
```

### Pattern 3: Hybrid Knowledge Architecture (Graph + Vector + Flat)

**What:** Three-layer knowledge system:
1. **Flat JSON** (MVP): Simple key-value store for decisions, blockers, patterns
2. **Vector Store** (Phase 2): Semantic search across past summaries, research
3. **Graph DB** (Phase 3): Relationships between phases, dependencies, component interactions

**When to use:** Projects with >10 phases or >3 milestones where context reuse matters.

**Trade-offs:**
- **Pros:** Start simple (JSON), upgrade incrementally, semantic search powerful for "similar past problems"
- **Cons:** Three systems to maintain at maturity, vector embeddings add latency
- **Complexity:** Low (JSON), Medium (Vector), High (Graph)

**Example:**
```javascript
// MVP: Flat JSON knowledge store
const knowledge = {
  decisions: [
    { phase: "1.1", decision: "Use Drizzle ORM", rationale: "Type safety + migration control", locked: true }
  ],
  patterns: [
    { phase: "2.3", pattern: "API validation layer", code: "@/lib/validate-api.ts", reusable: true }
  ],
  blockers: [
    { phase: "3.1", blocker: "Auth0 rate limits", resolution: "Implement retry backoff", resolved: true }
  ]
};

// Phase 2: Add semantic search
function findSimilarPastWork(currentTask) {
  const embedding = embed(currentTask);
  return vectorStore.search(embedding, limit: 3);
}

// Phase 3: Graph relationships
// MATCH (p:Phase)-[:DEPENDS_ON]->(d:Phase) WHERE d.status='complete' RETURN p
```

### Pattern 4: Progressive Autonomy Spectrum

**What:** Three autonomy levels for workflows:
- **Human-in-loop:** Agent pauses at checkpoints, waits for approval
- **Human-on-loop:** Agent executes fully, sends status updates, user can intervene
- **Human-out-of-loop:** Agent executes entire roadmap, only reports completion/blockers

**When to use:** Match autonomy to user's trust level and task criticality.

**Trade-offs:**
- **Pros:** Flexibility, gradual adoption, users control risk tolerance
- **Cons:** Requires mode switching logic in agents
- **Complexity:** Low (controlled by `autonomous: true/false` in plan frontmatter)

**Example:**
```markdown
---
phase: 1.1
autonomous: false  # Human-in-loop: pause at checkpoints
---

## Tasks

### Task 1: Setup database schema
type: auto

### Task 2: Review schema before migration
type: checkpoint:user-review  # STOP here, wait for user

### Task 3: Run migration
type: auto  # Only executes after user approves checkpoint
```

### Pattern 5: Two-Tier Validation (Haiku → Sonnet)

**What:** When Haiku executes a task, Sonnet validates the output before marking complete. If validation fails, re-execute with Sonnet.

**When to use:** Auto mode with budget optimization (Haiku for simple tasks).

**Trade-offs:**
- **Pros:** Catches Haiku errors cheaply, maintains quality, learns which tasks Haiku handles well
- **Cons:** Adds latency (validation step), extra tokens for validation
- **Complexity:** Low (add validation step after Haiku execution)

**Example:**
```javascript
async function executeWithValidation(task, complexity) {
  const model = routeToModel(complexity);

  if (model === 'haiku') {
    const output = await executeTask(task, 'haiku');

    const validation = await Task({
      agent: 'gsd-verifier',
      model: 'sonnet',
      prompt: `
        Task: ${task.description}
        Haiku output: ${output}

        Verify this output meets requirements.
        Return: "✓ VALID" or "✗ REDO: <reason>"
      `
    });

    if (validation.includes('REDO')) {
      console.log('Haiku failed validation, retrying with Sonnet');
      return executeTask(task, 'sonnet');
    }

    return output;
  }

  return executeTask(task, model);
}
```

## Data Flow

### Request Flow: User Command → Execution

```
User: /gsd:execute-roadmap
    ↓
[Command Handler] Load ROADMAP.md, extract phases
    ↓
[Workflow Orchestrator] Validate dependencies, check state
    ↓
[Spawn Roadmap Coordinator] (Opus tier, autonomous mode)
    ↓
┌─────────────────────────────────────────────┐
│ For each phase:                             │
│   ├─ Load minimal context (<500 tokens)    │
│   ├─ Spawn Phase Coordinator                │
│   │    ↓                                    │
│   │   [Research] → [Plan] → [Execute] → [Verify]
│   │    ↓                                    │
│   │   Write SUMMARY.md, commit             │
│   │    ↓                                    │
│   │   Return completion signal              │
│   ├─ Update EXECUTION_LOG.md                │
│   ├─ Archive completed phase context        │
│   └─ Continue to next phase                 │
└─────────────────────────────────────────────┘
    ↓
[Report to User] All phases complete / blocker encountered
```

### Model Selection Flow

```
Task Description (from plan or command)
    ↓
[Complexity Detector]
    ├─ Extract domain signals (keywords)
    ├─ Extract structural signals (length, code blocks)
    ├─ Extract cross-cutting signals (multi-component, validation)
    ↓
Complexity Score (0-100)
    ↓
[Model Router]
    ├─ Score 0-30: Haiku
    ├─ Score 31-70: Sonnet
    ├─ Score 71-100: Opus
    ↓
[Check Auto Mode Enabled]
    YES → Use computed model
    NO  → Use profile-based model (existing logic)
    ↓
[Agent Execution] with selected model
    ↓
[If Haiku] → Sonnet validation step
```

### Knowledge Persistence Flow

```
[Executor Agent] Completes task
    ↓
[Knowledge Extraction]
    ├─ Decisions made (library choices, architecture)
    ├─ Patterns created (reusable components)
    ├─ Blockers encountered + resolutions
    ↓
[Knowledge Manager] Write to .planning/knowledge/db.json
    ↓
┌────────────────────────────────────────────┐
│ Knowledge DB Structure:                    │
│ {                                          │
│   "decisions": [...],                      │
│   "patterns": [...],                       │
│   "blockers": [...]                        │
│ }                                          │
└────────────────────────────────────────────┘
    ↓
[Future Query] Planner asks "Similar past work?"
    ↓
[Knowledge Manager] Query by phase/topic/similarity
    ↓
[Return Results] "Phase 2.3 had similar auth task, see SUMMARY.md"
```

### State Management

```
[Project Initialization] /gsd:new-project
    ↓
Create .planning/STATE.md with structure:
    ├─ ## Current Position (phase, plan, status)
    ├─ ## Progress (visual emoji bar)
    ├─ ## Decisions (locked choices)
    ├─ ## Blockers (active issues)
    └─ ## Session Continuity (resume context)
    ↓
[Each Phase Execution]
    ├─ Update "Current Position" (phase 1.1 → 1.2)
    ├─ Update "Progress" (🔴🔴🟢 → 🔴🟢🟢)
    ├─ Append to "Decisions" (new architecture choices)
    ├─ Track in "Blockers" (if issues arise)
    └─ Commit STATE.md changes
    ↓
[Orchestrator Reads State] Before each operation
    ↓
Knows: Where we are, what's decided, what's blocked, what's next
```

## Integration Points with Existing GSD

### Integration Point 1: gsd-tools.js Model Resolution

**Current:** Lines 3477-3483, `resolveModelInternal(cwd, agentType)`

**Enhancement:**
```javascript
// Add after line 137 (MODEL_PROFILES)
const AUTO_COMPLEXITY_THRESHOLDS = { HAIKU_MAX: 30, SONNET_MAX: 70, OPUS_MIN: 71 };

function detectTaskComplexity(description) {
  // Implementation from Pattern 2
}

// Modify resolveModelInternal (lines 3477-3483)
function resolveModelInternal(cwd, agentType, taskDescription = null) {
  const config = loadConfig(cwd);
  const profile = config.model_profile || 'balanced';

  // NEW: Auto mode logic
  if (profile === 'auto' && taskDescription) {
    const score = detectTaskComplexity(taskDescription);
    const tier = routeToModel(score);
    const agentModels = MODEL_PROFILES[agentType];

    // Map tier to profile: haiku→budget, sonnet→balanced, opus→quality
    const profileMap = { haiku: 'budget', sonnet: 'balanced', opus: 'quality' };
    return agentModels[profileMap[tier]] || 'sonnet';
  }

  // EXISTING: Profile-based logic
  const agentModels = MODEL_PROFILES[agentType];
  if (!agentModels) return 'sonnet';
  return agentModels[profile] || agentModels['balanced'] || 'sonnet';
}
```

**Files to modify:**
- `bin/gsd-tools.js` (lines 137-138, 3477-3483)

### Integration Point 2: Workflow Init Commands

**Current:** Each workflow has `init` command (e.g., `init execute-phase <phase>`)

**Enhancement:** Pass task description to enable auto mode
```javascript
// In init execute-phase (line 3570+)
case 'init': {
  if (args[1] === 'execute-phase') {
    const phase = args[2];
    const planPath = findPlanPath(phase);
    const plan = parsePlan(planPath);
    const taskDescription = plan.objective; // NEW: Extract from plan

    const executor_model = resolveModelInternal(cwd, 'gsd-executor', taskDescription);
    const verifier_model = resolveModelInternal(cwd, 'gsd-verifier', plan.verification);

    // Return JSON with models (existing pattern)
  }
}
```

**Files to modify:**
- `bin/gsd-tools.js` init commands (lines 3570+, 3640+, 3759+, etc.)

### Integration Point 3: Knowledge Manager CLI

**New commands in gsd-tools.js:**
```javascript
case 'knowledge': {
  const subcommand = args[1];
  switch (subcommand) {
    case 'add-decision':
      addDecision(cwd, { phase, decision, rationale, locked });
      break;
    case 'add-pattern':
      addPattern(cwd, { phase, pattern, code, reusable });
      break;
    case 'query':
      queryKnowledge(cwd, { topic, phase, type });
      break;
    case 'export':
      exportKnowledge(cwd, format); // JSON, Cypher, Markdown
      break;
  }
  break;
}
```

**Files to create:**
- `bin/knowledge-db.js` (new module, ~300-500 lines)
- `commands/gsd/query-knowledge.md` (user-facing command)

### Integration Point 4: Agent Prompt Enhancement

**Planner agent (gsd-planner.md):**
```markdown
<step name="query_knowledge_for_context">
Before creating plan, query knowledge DB for similar past work:

```bash
KNOWLEDGE=$(node ~/.claude/get-shit-done/bin/gsd-tools.js knowledge query \
  --topic "${PHASE_DESCRIPTION}" \
  --type pattern,blocker \
  --limit 3)
```

Review knowledge entries. If relevant patterns exist, reference in plan context.
</step>
```

**Executor agent (gsd-executor.md):**
```markdown
<step name="record_learnings">
After completing plan, extract and record:

```bash
# Record architectural decision
node ~/.claude/get-shit-done/bin/gsd-tools.js knowledge add-decision \
  --phase "${PHASE}" \
  --decision "Used Drizzle ORM" \
  --rationale "Type safety + migration control" \
  --locked true

# Record reusable pattern
node ~/.claude/get-shit-done/bin/gsd-tools.js knowledge add-pattern \
  --phase "${PHASE}" \
  --pattern "API validation layer" \
  --code "@/lib/validate-api.ts" \
  --reusable true
```
</step>
```

**Files to modify:**
- `agents/gsd-planner.md` (add query step)
- `agents/gsd-executor.md` (add recording step)

### Integration Point 5: Visual State in STATE.md

**Current STATE.md:** Text-based sections

**Enhancement:** Add emoji visual layer (non-breaking)
```markdown
# Project State

## Quick Status
🟢🟢🟠🔴🔴🔴  6 phases | 2 complete | 1 in progress | 3 pending

## Current Position
**Phase:** 1.3
**Status:** Planning in progress

## Phase Overview
┌────────┬──────────────────────┬────────┐
│ Phase  │ Description          │ Status │
├────────┼──────────────────────┼────────┤
│ 1.1    │ Core API Setup       │ ✓ 🟢   │
│ 1.2    │ Database Schema      │ ✓ 🟢   │
│ 1.3    │ Authentication       │ ⏳ 🟠  │
│ 2.1    │ User Management      │ 📌 🔴  │
└────────┴──────────────────────┴────────┘
```

**Files to modify:**
- `templates/STATE.md` (add visual layer)
- `bin/gsd-tools.js` state update functions (generate emoji status)

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1-3 phases | No special handling. Existing orchestration works. Knowledge DB optional. |
| 4-10 phases | Enable auto mode (save 30% tokens). Start using knowledge DB for decision tracking. Visual state helpful for quick scans. |
| 11-25 phases | Autonomous roadmap execution becomes valuable (save hours of manual orchestration). Fresh context per phase prevents rot. Knowledge DB becomes critical (pattern reuse). |
| 26+ phases | Consider milestone grouping (5-8 phases per milestone). Vector search for semantic "find similar past work". Graph DB for dependency visualization. |

### Scaling Priorities

1. **First bottleneck: Context window fills after 3-4 phases**
   - **Fix:** Hierarchical orchestration with fresh context per phase (Pattern 1)
   - **Impact:** Can handle 20+ phases without degradation

2. **Second bottleneck: Manual orchestration overhead (user fatigue)**
   - **Fix:** Autonomous roadmap execution (execute entire roadmap unattended)
   - **Impact:** 4-hour roadmaps complete while user sleeps

3. **Third bottleneck: Token costs on simple tasks**
   - **Fix:** Auto mode with Haiku for read-only operations
   - **Impact:** 40-60% cost reduction on status checks, log reviews, verification

4. **Fourth bottleneck: Repeating past mistakes (no learning)**
   - **Fix:** Knowledge DB with decision/pattern/blocker tracking
   - **Impact:** "We solved this in Phase 2.3" prevents rewrites

## Anti-Patterns

### Anti-Pattern 1: Shared Context Across All Phases

**What people do:** Load ROADMAP.md, all prior SUMMARY.md files, entire codebase into orchestrator context, try to execute 8 phases in one conversation.

**Why it's wrong:** Context window fills by Phase 3. Quality degrades exponentially (see gsd-planner Philosophy: Quality Degradation Curve at 70%+ context). Later phases get rushed, incomplete work.

**Do this instead:** Hierarchical orchestration (Pattern 1). Parent coordinator maintains minimal state (<10% context). Each sub-coordinator gets fresh context, reads only current phase files. Archive completed phases to .planning/archived/.

### Anti-Pattern 2: Over-Indexing on Opus

**What people do:** Set `model_profile: 'quality'` and use Opus for all agents including verification, codebase mapping, log review.

**Why it's wrong:** Wastes quota on tasks that don't need advanced reasoning. Opus for "check if tests pass" is like hiring a principal engineer to run `npm test`. Quota runs out mid-project.

**Do this instead:** Use auto mode (Pattern 2) or balanced profile. Opus for planning/architecture (where reasoning matters), Sonnet for execution (following clear instructions), Haiku for read-only exploration.

### Anti-Pattern 3: Treating Knowledge DB as Documentation

**What people do:** Dump entire SUMMARY.md contents into knowledge DB. Store verbose explanations, full code listings, essay-length rationales.

**Why it's wrong:** Knowledge DB becomes noise-filled, query results useless ("too many matches"), defeats purpose of compact knowledge retrieval.

**Do this instead:** Store **decisions** (what was chosen + 1-sentence why), **patterns** (component name + file path + "reusable: yes/no"), **blockers** (issue + resolution + "resolved: yes/no"). Link to full details in SUMMARY.md rather than duplicating.

### Anti-Pattern 4: Complexity Detection Based Solely on Keywords

**What people do:** `if (description.includes('architecture')) return 'opus'` — single keyword determines model.

**Why it's wrong:** Easily gamed, brittle, doesn't capture true complexity. "Check architecture documentation" would incorrectly route to Opus despite being read-only.

**Do this instead:** Multi-signal complexity detection (Pattern 2). Combine domain keywords, structural complexity (length, code blocks), cross-cutting concerns (multi-component), and validation requirements. Weight signals, tune thresholds based on real usage data.

### Anti-Pattern 5: Autonomous Execution Without Failure Handling

**What people do:** Spawn roadmap coordinator, assume all phases will succeed, no logic for blockers/failures.

**Why it's wrong:** When Phase 3 hits a blocker (API key missing, breaking change, auth issue), coordinator crashes or loops infinitely. User wakes up to broken state.

**Do this instead:** Implement checkpoint pattern (Pattern 4) and failure handling. On blocker: log to EXECUTION_LOG.md, send structured message to user ("Phase 3 blocked: missing API key. Continue? Retry? Abort?"), wait for decision. Resume cleanly from failure point.

## Build Order and Dependencies

### Phase 1: Foundation (Week 1)
**Goal:** Auto mode functional end-to-end

**Build:**
1. Add complexity detection functions to gsd-tools.js (~200 lines)
2. Modify resolveModelInternal to support 'auto' profile (10 lines)
3. Update MODEL_PROFILES defaults to include 'auto' option (5 lines)
4. Create /gsd:set-profile command extension (accept 'auto' argument)
5. Add Haiku validation logic to executor workflow (~30 lines)

**Dependencies:** None (extends existing model resolution system)

**Validation:**
```bash
/gsd:set-profile auto
/gsd:quick "check test results"  # Should use Haiku
/gsd:quick "design authentication system"  # Should use Opus
```

### Phase 2: Knowledge Persistence (Week 1-2)
**Goal:** Knowledge DB operational, planner queries, executor writes

**Build:**
1. Create bin/knowledge-db.js module (~300-500 lines)
   - addDecision(), addPattern(), addBlocker()
   - queryKnowledge() with topic/phase/type filters
   - exportKnowledge() to JSON/Markdown
2. Create .planning/knowledge/db.json structure
3. Add gsd-tools.js CLI commands for knowledge operations
4. Modify gsd-planner.md to query knowledge before planning
5. Modify gsd-executor.md to record learnings after execution

**Dependencies:** None (independent new system)

**Validation:**
```bash
# After executing phase 1.1
cat .planning/knowledge/db.json  # Should have decisions/patterns from 1.1

# Plan phase 1.2
/gsd:plan-phase 1.2  # Planner should reference knowledge from 1.1
```

### Phase 3: Visual State Tracking (Week 2)
**Goal:** STATE.md shows emoji visual status, table format

**Build:**
1. Update STATE.md template with visual layer
2. Add generateVisualStatus() to gsd-tools.js
3. Modify state update commands to regenerate visual layer
4. Update workflows to preserve visual layer on state updates

**Dependencies:** None (additive to existing STATE.md)

**Validation:**
```bash
cat .planning/STATE.md  # Should show 🟢🟠🔴 status bar and table
```

### Phase 4: Autonomous Roadmap Execution (Week 2-3)
**Goal:** /gsd:execute-roadmap runs entire roadmap unattended

**Build:**
1. Create agents/gsd-roadmap-coordinator.md (~300-400 lines)
2. Create agents/gsd-phase-coordinator.md (~200-300 lines)
3. Create workflows/execute-roadmap.md (~120 lines)
4. Create commands/gsd/execute-roadmap.md (~80 lines)
5. Create EXECUTION_LOG.md template
6. Add sub-agent spawning logic to gsd-tools.js
7. Implement context cleanup after each phase

**Dependencies:**
- Phase 1 (auto mode for model selection)
- Phase 2 (knowledge DB for context passing)
- Phase 3 (visual state for progress tracking)

**Validation:**
```bash
/gsd:execute-roadmap
# Should execute all phases sequentially
# Each phase gets fresh context
# EXECUTION_LOG.md tracks progress
# User gets completion notification
```

### Phase 5: Advanced Features (Week 3-4)
**Goal:** Complexity-based rule loading, creative phase enforcement, vector search (optional)

**Build:**
1. Implement complexity-based rule loading (RULE_LOADING config)
2. Add creative phase enforcement to plan-phase workflow (Level 3-4 tasks)
3. Create structured thinking templates (ARCHITECTURE_DECISION.md, ALGORITHM_DESIGN.md)
4. Add vector embeddings to knowledge DB (optional, future upgrade)
5. Implement graph export for dependency visualization (optional)

**Dependencies:** Phases 1-4 complete

**Validation:**
```bash
/gsd:plan-phase 2.1  # Complex phase should enforce creative thinking section
```

### Dependency Graph

```
Phase 1 (Auto Mode)
    ↓
Phase 2 (Knowledge DB) ─┐
    ↓                    │
Phase 3 (Visual State) ─┤
    ↓                    │
Phase 4 (Autonomous) ◄──┘
    ↓
Phase 5 (Advanced Features)
```

**Critical path:** Phases 1-2-3-4 must be sequential. Phase 5 optional enhancements.

**Parallelizable:** Phases 1-2-3 can be built in parallel (independent systems), but Phase 4 requires all three.

## Sources

**Multi-Agent Architecture:**
- [Google's Eight Essential Multi-Agent Design Patterns - InfoQ](https://www.infoq.com/news/2026/01/multi-agent-design-patterns/)
- [Multi-Agent System Architecture Guide for 2026](https://www.clickittech.com/ai/multi-agent-system-architecture/)
- [AI Agent Orchestration Patterns - Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns)
- [Choosing the Right Multi-Agent Architecture - LangChain Blog](https://blog.langchain.com/choosing-the-right-multi-agent-architecture/)

**Intelligent Model Selection:**
- [vLLM Semantic Router v0.1 Iris: The First Major Release](https://blog.vllm.ai/2026/01/05/vllm-sr-iris.html)
- [LLM Semantic Router: Intelligent request routing - Red Hat](https://developers.redhat.com/articles/2025/05/20/llm-semantic-router-intelligent-request-routing)
- [Multi-LLM routing strategies for generative AI - AWS](https://aws.amazon.com/blogs/machine-learning/multi-llm-routing-strategies-for-generative-ai-applications-on-aws/)
- [5 Steps for Task-Specific Generative AI Model Routing](https://www.prompts.ai/blog/5-steps-for-task-specific-generative-ai-model-routing)

**Knowledge Persistence:**
- [Mem0: Building Production-Ready AI Agents with Long-Term Memory](https://arxiv.org/pdf/2504.19413)
- [AI Agent Memory: Build Stateful AI Systems - Redis](https://redis.io/blog/ai-agent-memory-stateful-systems/)
- [Building smarter AI agents: AgentCore long-term memory - AWS](https://aws.amazon.com/blogs/machine-learning/building-smarter-ai-agents-agentcore-long-term-memory-deep-dive/)

**Orchestration Patterns:**
- [Unlocking exponential value with AI agent orchestration - Deloitte](https://www.deloitte.com/us/en/insights/industry/technology/technology-media-and-telecom-predictions/2026/ai-agent-orchestration.html)
- [AI agent orchestration for production systems - Redis](https://redis.io/blog/ai-agent-orchestration/)
- [Choosing the right orchestration pattern for multi agent systems - Kore.ai](https://www.kore.ai/blog/choosing-the-right-orchestration-pattern-for-multi-agent-systems)

**Database Design:**
- [How to Design Databases for Agentic AI](https://www.getmonetizely.com/articles/how-to-design-databases-for-agentic-ai-best-practices-for-storing-knowledge-and-state)
- [2026 Data Engineering Roadmap for Agent AI Era](https://medium.com/@sanjeebmeister/the-2026-data-engineering-roadmap-building-data-systems-for-the-agentic-ai-era-8e7064c2cf55)

---

*Architecture research for: GSD Framework Enhancement*
*Researched: 2026-02-15*
*Confidence: HIGH (verified with current 2026 sources and existing GSD codebase analysis)*
