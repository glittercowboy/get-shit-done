# Roadmap: GSD Enhancements v2.0

## Overview

This roadmap transforms GSD from a phase-based development framework into an intelligent, autonomous system that learns user preferences and executes entire projects with minimal intervention. The journey begins with Auto Mode (intelligent model selection for 40-60% token savings), builds knowledge persistence to capture decisions and reasoning patterns, then culminates in autonomous multi-phase roadmap execution with fresh context per phase. Integration touchpoints (hooks, notifications, observability) enable production-ready deployment with cost controls and progress tracking.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Auto Mode Foundation** - Intelligent model selection with complexity detection and cost tracking
- [ ] **Phase 2: Auto Mode Refinement** - Circuit breakers, learning feedback loops, and error handling
- [ ] **Phase 3: Knowledge System Foundation** - Local vector database with git-friendly storage and multi-user support
- [ ] **Phase 4: Knowledge Extraction & Learning** - Autonomous decision-making based on learned principles
- [ ] **Phase 5: Knowledge Permissions & Safety** - Explicit boundaries for irreversible/external/costly actions
- [ ] **Phase 6: Autonomous Execution Core** - Multi-phase roadmap orchestration with sub-coordinators
- [ ] **Phase 7: Autonomous Execution Optimization** - Parallel execution, context management, and task chunking
- [ ] **Phase 8: Integration & Observability** - Hooks, Telegram notifications, and production monitoring

## Phase Details

### Phase 1: Auto Mode Foundation
**Goal**: Users can execute GSD commands with `/gsd:set-profile auto` and see 40-60% token savings through intelligent model selection without quality loss
**Depends on**: Nothing (first phase)
**Requirements**: AUTO-01, AUTO-02, AUTO-03, AUTO-04, AUTO-07, AUTO-08, AUTO-09, AUTO-10
**Success Criteria** (what must be TRUE):
  1. System detects task complexity via multi-signal analysis and maps to model tiers (Haiku/Sonnet/Opus)
  2. Users can set profile to 'auto' and commands route to appropriate model automatically
  3. Token and cost tracking displays per-task metrics and cumulative savings vs manual profiles
  4. Quota tracking prevents exceeding session/weekly limits by adjusting model selection
  5. Default behavior uses Sonnet when complexity unclear or detection fails
**Plans:** 6 plans

Plans:
- [ ] 01-01-PLAN.md — Routing rules infrastructure (pattern table, parser, merge logic)
- [ ] 01-02-PLAN.md — Task context skill (model + context injection)
- [ ] 01-03-PLAN.md — Quota and token tracking with auto-wait
- [ ] 01-04-PLAN.md — Auto profile and status display
- [ ] 01-05-PLAN.md — Session scanning for rule bootstrap (checkpoint)
- [ ] 01-06-PLAN.md — Execute-plan integration and fallback behavior

### Phase 2: Auto Mode Refinement
**Goal**: Auto mode operates safely with circuit breakers preventing runaway execution and learns from user feedback to improve routing accuracy
**Depends on**: Phase 1
**Requirements**: AUTO-05, AUTO-06, AUTO-11, AUTO-12, AUTO-13, AUTO-14
**Success Criteria** (what must be TRUE):
  1. Haiku-executed tasks are validated by Sonnet before marking complete
  2. Failed Haiku validations trigger automatic re-execution with Sonnet
  3. Hard iteration caps (15-20 steps) and global timeouts (60-120 sec) prevent infinite loops
  4. Error rate thresholds automatically escalate to stronger models
  5. Users can mark incorrect model choices and system learns to improve future routing
**Plans**: TBD

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD

### Phase 3: Knowledge System Foundation
**Goal**: GSD maintains local knowledge databases (global and project-scoped) that persist decisions, patterns, and blockers across sessions in git-friendly format
**Depends on**: Nothing (parallel to Phase 1-2)
**Requirements**: KNOW-01, KNOW-02, KNOW-03, KNOW-04, KNOW-05
**Success Criteria** (what must be TRUE):
  1. Local vector database using Vectra stores knowledge in git-friendly JSON format
  2. Global knowledge scope exists at ~/.claude/knowledge/ for cross-project patterns
  3. Project knowledge scope exists at .planning/knowledge/ for project-specific context
  4. System works without knowledge DB (fallback to current GSD behavior)
  5. Multi-user support via separate files per developer prevents merge conflicts
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD
- [ ] 03-03: TBD

### Phase 4: Knowledge Extraction & Learning
**Goal**: Claude autonomously makes decisions based on learned principles extracted from user interactions and past executions
**Depends on**: Phase 3
**Requirements**: KNOW-06, KNOW-07, KNOW-08, KNOW-09, KNOW-10, KNOW-11, KNOW-12
**Success Criteria** (what must be TRUE):
  1. On-the-fly extraction captures decisions during GSD flows without blocking execution
  2. Q&A sessions enable Claude to ask questions and learn from user answers
  3. Session scanning batch-reviews past conversations to extract patterns
  4. Synthesis passes consolidate knowledge into higher-level principles
  5. Knowledge has staleness tracking (timestamps, volatility scores) to identify outdated information
  6. Claude makes autonomous decisions based on learned principles without requiring user approval for reversible actions
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD
- [ ] 04-03: TBD
- [ ] 04-04: TBD

### Phase 5: Knowledge Permissions & Safety
**Goal**: Users can grant explicit permissions with boundaries, and Claude stops to ask only for irreversible/external/costly actions
**Depends on**: Phase 4
**Requirements**: KNOW-13, KNOW-14, KNOW-15, KNOW-16, KNOW-17, KNOW-18, KNOW-19, KNOW-20
**Success Criteria** (what must be TRUE):
  1. Claude stops and asks before irreversible actions (data/code deletion)
  2. Claude stops and asks before external communications (emails, API calls to third parties)
  3. Claude stops and asks before actions that cost money above tracked thresholds
  4. Users can grant explicit permissions with stated limits (e.g., "max $20 on AWS")
  5. Conflict resolution applies user-defined priority rules when principles conflict
  6. Users can mark outdated or incorrect principles, triggering updates or invalidation
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD

### Phase 6: Autonomous Execution Core
**Goal**: Users can run `/gsd:execute-roadmap` and entire project phases execute autonomously with Opus coordinator spawning sub-coordinators per phase
**Depends on**: Phase 1, Phase 2, Phase 5
**Requirements**: EXEC-01, EXEC-02, EXEC-03, EXEC-04, EXEC-05, EXEC-06, EXEC-07, EXEC-08, EXEC-09, EXEC-10, EXEC-11
**Success Criteria** (what must be TRUE):
  1. `/gsd:execute-roadmap` command checks for ROADMAP.md and prompts user confirmation
  2. Opus coordinator parses roadmap and creates execution queue with phase dependencies
  3. Coordinator spawns sub-coordinator for each phase with fresh context window
  4. Sub-coordinator executes full cycle (research → plan → execute → verify) autonomously
  5. Automatic context cleanup and archiving prevents context rot across phases
  6. EXECUTION_LOG.md tracks real-time progress with checkpoints
  7. System resumes from last checkpoint on failure
  8. Phase dependencies are detected and enforced (Phase 2 waits for Phase 1)
**Plans**: TBD

Plans:
- [ ] 06-01: TBD
- [ ] 06-02: TBD
- [ ] 06-03: TBD
- [ ] 06-04: TBD

### Phase 7: Autonomous Execution Optimization
**Goal**: Autonomous execution scales to 20+ phases with parallel execution, context compression, and intelligent task splitting without quality degradation
**Depends on**: Phase 6
**Requirements**: EXEC-12, EXEC-13, EXEC-14, EXEC-15, EXEC-16, EXEC-17, EXEC-18, EXEC-19, EXEC-20, EXEC-21, EXEC-22
**Success Criteria** (what must be TRUE):
  1. Independent phases execute in parallel when dependency graph allows
  2. Token limit monitoring prevents exceeding session window during execution
  3. Failure handling provides retry/skip/escalate options with user choice
  4. Sub-coordinators provide structured completion signals (success/failure/blocked)
  5. Context compression summarizes completed phases to fit more in window
  6. Selective context injection passes only relevant history, not entire conversation
  7. Sub-coordinator spawns agents for tasks instead of running in own context
  8. Large task detection identifies work exceeding single context capacity
  9. Task chunking splits large tasks into batches (e.g., "update 350 tests" → multiple runs)
  10. Phase size limits trigger splitting when too many requirements exceed safe handling
  11. Batch processing optimizes repetitive operations (tests, migrations, refactors)
**Plans**: TBD

Plans:
- [ ] 07-01: TBD
- [ ] 07-02: TBD
- [ ] 07-03: TBD
- [ ] 07-04: TBD

### Phase 8: Integration & Observability
**Goal**: Production-ready deployment with hooks integration, Telegram notifications, and comprehensive observability for cost control and progress tracking
**Depends on**: Phase 7
**Requirements**: HOOK-01, HOOK-02, HOOK-03, HOOK-04, HOOK-05, TELE-01, TELE-02, TELE-03, TELE-04, TELE-05, OBSV-01, OBSV-02, OBSV-03, OBSV-04, OBSV-05
**Success Criteria** (what must be TRUE):
  1. Claude hooks capture conversation context for knowledge extraction
  2. Users can configure per-turn mode (analyze after each response) or session-end mode (batch at end)
  3. Hooks can be enabled/disabled via configuration
  4. Claude sends blocking questions to user via Telegram when human input required
  5. Telegram supports text chat and audio messages (speech-to-text via local LLM)
  6. Claude resumes execution after receiving Telegram response
  7. Distributed tracing tracks multi-agent workflows with span-level detail
  8. LLM-specific metrics (tokens, cost, context size, latency) are captured per operation
  9. Graduated budget alerts notify at 50%, 80%, 90%, 100% thresholds
  10. Real-time progress dashboard shows execution status via EXECUTION_LOG.md
  11. Token savings report compares auto mode vs manual profiles with detailed analytics
**Plans**: TBD

Plans:
- [ ] 08-01: TBD
- [ ] 08-02: TBD
- [ ] 08-03: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

**Phase Dependencies:**
```
Phase 1 (Auto Mode Foundation) ─────┐
                                     ├──> Phase 6 (Autonomous Execution Core)
Phase 2 (Auto Mode Refinement) ─────┤
                                     │
Phase 5 (Permissions & Safety) ─────┘

Phase 3 (Knowledge Foundation) ──> Phase 4 (Extraction & Learning) ──> Phase 5 (Permissions & Safety)

Phase 6 (Autonomous Core) ──> Phase 7 (Autonomous Optimization)

Phase 7 (Autonomous Optimization) ──> Phase 8 (Integration & Observability)
```

**Parallel Execution Opportunities:**
- Phases 1-2 (Auto Mode) can run parallel to Phase 3 (Knowledge Foundation)
- Phase 4 can run parallel to Phase 2 if Phase 3 completes first

| Phase | Plans | Status | Completed |
|-------|-------|--------|-----------|
| 1. Auto Mode Foundation | 6 | Planning complete | - |
| 2. Auto Mode Refinement | TBD | Not started | - |
| 3. Knowledge System Foundation | TBD | Not started | - |
| 4. Knowledge Extraction & Learning | TBD | Not started | - |
| 5. Knowledge Permissions & Safety | TBD | Not started | - |
| 6. Autonomous Execution Core | TBD | Not started | - |
| 7. Autonomous Execution Optimization | TBD | Not started | - |
| 8. Integration & Observability | TBD | Not started | - |
