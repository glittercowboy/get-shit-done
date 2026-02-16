# Requirements: GSD Enhancements v2.0

**Defined:** 2025-02-15
**Core Value:** Claude learns to make autonomous decisions based on user's reasoning patterns, only stopping for irreversible/external/costly actions

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Auto Mode (Intelligent Model Selection)

- [ ] **AUTO-01**: System detects task complexity via multi-signal analysis (keywords, length, structural markers)
- [ ] **AUTO-02**: Complexity score (0-100) maps to model tiers (Haiku ≤30, Sonnet 31-70, Opus ≥71)
- [ ] **AUTO-03**: Default to Sonnet when complexity unclear or detection fails
- [ ] **AUTO-04**: `/gsd:set-profile auto` enables intelligent model routing
- [ ] **AUTO-05**: Haiku-executed tasks validated by Sonnet before marking complete
- [ ] **AUTO-06**: Re-execute with Sonnet if Haiku validation fails
- [ ] **AUTO-07**: Track token count and cost per task execution
- [ ] **AUTO-08**: Track quota usage (session and weekly limits)
- [ ] **AUTO-09**: Adjust model selection based on remaining quota (more Opus early, conserve late)
- [ ] **AUTO-10**: Display token savings analytics (auto vs manual profile)
- [ ] **AUTO-11**: Circuit breakers: hard iteration caps (15-20 steps), global timeouts (60-120 sec)
- [ ] **AUTO-12**: Error rate thresholds trigger model escalation
- [ ] **AUTO-13**: Feedback loop: user can mark "this model choice was wrong"
- [ ] **AUTO-14**: Learn from feedback to improve complexity detection over time

### Autonomous Roadmap Execution

- [ ] **EXEC-01**: `/gsd:execute-roadmap` command checks for ROADMAP.md
- [ ] **EXEC-02**: User confirms before starting autonomous execution
- [ ] **EXEC-03**: Opus coordinator parses roadmap and creates execution queue
- [ ] **EXEC-04**: Coordinator spawns sub-coordinator for each phase
- [ ] **EXEC-05**: Sub-coordinator executes full cycle: research → plan → execute → verify
- [ ] **EXEC-06**: Each phase runs with fresh context (no context rot)
- [ ] **EXEC-07**: Automatic context cleanup and archiving after phase completion
- [ ] **EXEC-08**: EXECUTION_LOG.md tracks real-time progress
- [ ] **EXEC-09**: Checkpoint state after each significant action
- [ ] **EXEC-10**: Resume from last checkpoint on failure
- [ ] **EXEC-11**: Detect phase dependencies and enforce ordering
- [ ] **EXEC-12**: Execute independent phases in parallel where safe
- [ ] **EXEC-13**: Monitor token limits to avoid exceeding session window
- [ ] **EXEC-14**: Failure handling: retry, skip, or escalate to user
- [ ] **EXEC-15**: Structured completion signal from sub-coordinators
- [ ] **EXEC-16**: Context compression: summarize completed phases to fit more in window
- [ ] **EXEC-17**: Selective context injection (only relevant history, not entire conversation)
- [ ] **EXEC-18**: Sub-coordinator spawns agents for each task (not runs in own context)
- [ ] **EXEC-19**: Large task detection: identify tasks that exceed single context capacity
- [ ] **EXEC-20**: Task chunking: split large tasks into sub-tasks that fit one context (e.g., "update 350 tests" → multiple batches)
- [ ] **EXEC-21**: Phase size limits: split phases if too many requirements to handle safely
- [ ] **EXEC-22**: Batch processing for repetitive operations (tests, migrations, refactors)

### Knowledge System

- [ ] **KNOW-01**: Local vector database using Vectra (git-friendly JSON format)
- [ ] **KNOW-02**: Global knowledge scope at `~/.claude/knowledge/`
- [ ] **KNOW-03**: Project knowledge scope at `.planning/knowledge/`
- [ ] **KNOW-04**: Fallback: skip knowledge features if DB missing (works like current GSD)
- [ ] **KNOW-05**: Multi-user support via separate files per developer
- [ ] **KNOW-06**: On-the-fly extraction during GSD flows (Haiku agent)
- [ ] **KNOW-07**: Q&A sessions: Claude generates questions, user answers, system learns
- [ ] **KNOW-08**: Session scanning: batch review of past conversations
- [ ] **KNOW-09**: Synthesis passes: consolidate knowledge into principles
- [ ] **KNOW-10**: Knowledge has staleness tracking (timestamps, volatility scores)
- [ ] **KNOW-11**: Principles extracted from knowledge (higher-level reasoning patterns)
- [ ] **KNOW-12**: Claude makes autonomous decisions based on learned principles
- [ ] **KNOW-13**: Stop-and-ask for irreversible actions (data/code deletion)
- [ ] **KNOW-14**: Stop-and-ask for external communications (not to user)
- [ ] **KNOW-15**: Stop-and-ask for actions that cost money
- [ ] **KNOW-16**: Allow autonomous execution when explicitly permitted with boundaries
- [ ] **KNOW-17**: Track explicit permissions with stated limits (e.g., "max $20")
- [ ] **KNOW-18**: Conflict resolution: when principles conflict, user-defined priority rules
- [ ] **KNOW-19**: Feedback loop: user can mark "this principle was wrong/outdated"
- [ ] **KNOW-20**: Learn from feedback to update/invalidate principles

### Hooks Integration

- [ ] **HOOK-01**: Claude hooks capture conversation context
- [ ] **HOOK-02**: Configurable timing: per-turn mode (analyze after each response)
- [ ] **HOOK-03**: Configurable timing: session-end mode (batch process at end)
- [ ] **HOOK-04**: Enable/disable configuration for hooks capture
- [ ] **HOOK-05**: Switch between per-turn and session-end when enabled

### Telegram Integration

- [ ] **TELE-01**: Claude can send blocking questions to user via Telegram
- [ ] **TELE-02**: Support text chat messages
- [ ] **TELE-03**: Support audio messages (user sends voice, Claude receives text)
- [ ] **TELE-04**: Speech-to-text via small local LLM (e.g., Whisper)
- [ ] **TELE-05**: Claude can resume execution after receiving Telegram response

### Observability & Cost Control

- [ ] **OBSV-01**: Distributed tracing for multi-agent workflows
- [ ] **OBSV-02**: LLM-specific metrics (tokens, cost, context size, latency)
- [ ] **OBSV-03**: Graduated budget alerts (50%, 80%, 90%, 100% thresholds)
- [ ] **OBSV-04**: Real-time progress dashboard (via EXECUTION_LOG.md)
- [ ] **OBSV-05**: Token savings report comparing auto mode vs fixed profiles

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Advanced Knowledge Features

- **KNOW-A1**: Vector embeddings via Transformers.js + nomic-embed for semantic search
- **KNOW-A2**: Graph DB export for dependency visualization
- **KNOW-A3**: Cost-aware model selection (complexity + budget pressure combined)

### Enhanced Autonomy

- **EXEC-A1**: Asynchronous human approval (non-blocking requests)
- **EXEC-A2**: Predictive scheduling based on historical execution times
- **EXEC-A3**: Auto-recovery from common failure patterns

### Creative Enhancements

- **CREA-01**: Complexity-based rule loading (Level 0-4 determines rule depth)
- **CREA-02**: Creative phase enforcement for Level 3-4 tasks
- **CREA-03**: Structured thinking templates (ARCHITECTURE_DECISION.md, ALGORITHM_DESIGN.md)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Cloud vector databases | Must be local and git-trackable |
| Real-time multi-user collaboration | Separate files per user handles multi-dev |
| Full session history persistence | Only extracted knowledge/principles stored |
| Breaking changes to existing commands | All new features additive |
| Mobile app for notifications | Telegram integration covers this use case |
| Custom embedding model training | Use pre-trained models (nomic-embed) |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTO-01 | Phase 1 | Pending |
| AUTO-02 | Phase 1 | Pending |
| AUTO-03 | Phase 1 | Pending |
| AUTO-04 | Phase 1 | Pending |
| AUTO-05 | Phase 2 | Pending |
| AUTO-06 | Phase 2 | Pending |
| AUTO-07 | Phase 1 | Pending |
| AUTO-08 | Phase 1 | Pending |
| AUTO-09 | Phase 1 | Pending |
| AUTO-10 | Phase 1 | Pending |
| AUTO-11 | Phase 2 | Pending |
| AUTO-12 | Phase 2 | Pending |
| AUTO-13 | Phase 2 | Pending |
| AUTO-14 | Phase 2 | Pending |
| EXEC-01 | Phase 6 | Pending |
| EXEC-02 | Phase 6 | Pending |
| EXEC-03 | Phase 6 | Pending |
| EXEC-04 | Phase 6 | Pending |
| EXEC-05 | Phase 6 | Pending |
| EXEC-06 | Phase 6 | Pending |
| EXEC-07 | Phase 6 | Pending |
| EXEC-08 | Phase 6 | Pending |
| EXEC-09 | Phase 6 | Pending |
| EXEC-10 | Phase 6 | Pending |
| EXEC-11 | Phase 6 | Pending |
| EXEC-12 | Phase 7 | Pending |
| EXEC-13 | Phase 7 | Pending |
| EXEC-14 | Phase 7 | Pending |
| EXEC-15 | Phase 7 | Pending |
| EXEC-16 | Phase 7 | Pending |
| EXEC-17 | Phase 7 | Pending |
| EXEC-18 | Phase 7 | Pending |
| EXEC-19 | Phase 7 | Pending |
| EXEC-20 | Phase 7 | Pending |
| EXEC-21 | Phase 7 | Pending |
| EXEC-22 | Phase 7 | Pending |
| KNOW-01 | Phase 3 | Pending |
| KNOW-02 | Phase 3 | Pending |
| KNOW-03 | Phase 3 | Pending |
| KNOW-04 | Phase 3 | Pending |
| KNOW-05 | Phase 3 | Pending |
| KNOW-06 | Phase 4 | Pending |
| KNOW-07 | Phase 4 | Pending |
| KNOW-08 | Phase 4 | Pending |
| KNOW-09 | Phase 4 | Pending |
| KNOW-10 | Phase 4 | Pending |
| KNOW-11 | Phase 4 | Pending |
| KNOW-12 | Phase 4 | Pending |
| KNOW-13 | Phase 5 | Pending |
| KNOW-14 | Phase 5 | Pending |
| KNOW-15 | Phase 5 | Pending |
| KNOW-16 | Phase 5 | Pending |
| KNOW-17 | Phase 5 | Pending |
| KNOW-18 | Phase 5 | Pending |
| KNOW-19 | Phase 5 | Pending |
| KNOW-20 | Phase 5 | Pending |
| HOOK-01 | Phase 8 | Pending |
| HOOK-02 | Phase 8 | Pending |
| HOOK-03 | Phase 8 | Pending |
| HOOK-04 | Phase 8 | Pending |
| HOOK-05 | Phase 8 | Pending |
| TELE-01 | Phase 8 | Pending |
| TELE-02 | Phase 8 | Pending |
| TELE-03 | Phase 8 | Pending |
| TELE-04 | Phase 8 | Pending |
| TELE-05 | Phase 8 | Pending |
| OBSV-01 | Phase 8 | Pending |
| OBSV-02 | Phase 8 | Pending |
| OBSV-03 | Phase 8 | Pending |
| OBSV-04 | Phase 8 | Pending |
| OBSV-05 | Phase 8 | Pending |

**Coverage:**
- v1 requirements: 66 total
- Mapped to phases: 66
- Unmapped: 0 ✓

---
*Requirements defined: 2025-02-15*
*Last updated: 2026-02-15 after roadmap creation*
