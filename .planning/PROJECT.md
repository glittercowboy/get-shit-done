# GSD Enhancements v2.0

## What This Is

A major upgrade to the Get Shit Done framework that introduces intelligent model selection based on task complexity, autonomous roadmap execution without human intervention, and a knowledge system that learns user reasoning patterns to enable autonomous decision-making. Built for developers who want maximum efficiency from AI-assisted development while maintaining control over critical decisions.

## Core Value

Claude learns to make autonomous decisions based on the user's reasoning patterns, only stopping for actions that are irreversible, external, or cost money — dramatically reducing interaction overhead while preserving safety.

## Requirements

### Validated

- Existing GSD codebase mapped (`.planning/codebase/`)
- Three-tier model profiles work (quality/balanced/budget)
- Phase-based roadmap execution via manual commands

### Active

**Target 1: Auto Mode (Smart Model Selection)**
- [ ] Complexity detection algorithm (keywords + task analysis → tier)
- [ ] Default to Sonnet when complexity unclear
- [ ] Haiku can participate in complexity detection (meta-task)
- [ ] Sonnet validates Haiku output for quality assurance
- [ ] `/gsd:set-profile auto` as new profile option
- [ ] Token/cost tracking for savings measurement
- [ ] Quota awareness: track session/weekly limits, adjust model usage accordingly

**Target 2: Autonomous Roadmap Execution**
- [ ] `/gsd:execute-roadmap` command
- [ ] Opus coordinator spawns sub-coordinators per phase
- [ ] Sub-coordinator handles full cycle: research → plan → execute → verify
- [ ] Fresh context per phase (no context rot)
- [ ] Mid-level detail in roadmaps (not just high-level vision)
- [ ] EXECUTION_LOG.md for real-time progress tracking
- [ ] Session/quota tracking integration
- [ ] Failure handling with retry/skip options
- [ ] Task splitting optimized for parallel execution + model matching
- [ ] Parallel phase execution where dependency graph allows

**Target 3: Knowledge System ("Principles")**
- [ ] Local vector database (git-friendly, single file per user)
- [ ] Dual scope: global (`~/.claude/knowledge/`) + project (`.planning/knowledge/`)
- [ ] Input channel: on-the-fly extraction during GSD flows (Haiku)
- [ ] Input channel: Q&A sessions (Claude asks, user answers)
- [ ] Input channel: session scanning (batch review past conversations)
- [ ] Input channel: synthesis passes (knowledge → principles)
- [ ] Safety model: stop-and-ask for irreversible/external/costs
- [ ] Explicit permission tracking with boundaries (e.g., "max $20")
- [ ] Hooks integration: configurable timing (per-turn vs session-end)
- [ ] Enable/disable configuration
- [ ] Fallback: works like current GSD if DB not present
- [ ] Multi-user support: separate files/namespaces per developer

**Research Items**
- [ ] Investigate zvec (Alibaba) for vector storage patterns
- [ ] Investigate Athena Quadrant_IV for local context DB design
- [ ] Research thinking improvements: self-checking, domain research, technology selection
- [ ] Explore cursor-memory-bank optimization patterns not yet captured

### Out of Scope

- Cloud vector databases — must be local and git-trackable
- Real-time collaboration — separate files per user handles multi-dev
- Full session history persistence — only extracted knowledge/principles stored
- Breaking changes to existing GSD commands — all new features additive

## Context

### Existing Codebase

GSD is a mature framework with:
- `gsd-tools.js`: ~4000+ lines, handles model resolution, init commands, state management
- Agent definitions in `/agents/`: gsd-planner, gsd-executor, gsd-verifier, etc.
- Workflows in `/workflows/`: new-project, plan-phase, execute-phase, etc.
- Commands in `/commands/gsd/`: user-facing slash commands
- Model profiles already implemented (quality/balanced/budget)

### Prior Research

Two analysis documents completed:
- `CURSOR_MEMORY_BANK_ANALYSIS.md`: Detailed implementation plan for Targets 1 & 2
- `MODEL_SELECTION_ANALYSIS.md`: Current model selection architecture and integration points

### External References

- zvec: https://github.com/alibaba/zvec — vector embedding library
- Athena Quadrant_IV: https://github.com/winstonkoh87/Athena-Public/blob/main/docs/concepts/Quadrant_IV.md — local context DB design
- cursor-memory-bank: https://github.com/vanzan01/cursor-memory-bank — optimization patterns, creative thinking

## Constraints

- **Git-friendly storage**: Knowledge DB must be a single file or small folder that commits cleanly
- **Fallback behavior**: If knowledge DB missing, all features work as current GSD
- **Token limits**: Must track and respect session/weekly quotas
- **Context window**: Fresh context per phase to avoid rot during autonomous execution
- **Multi-developer**: Support for shared projects with separate user namespaces
- **Backward compatibility**: Existing `/gsd:` commands unchanged; all new features additive

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Sequence: 1 → 2 → 3 | Auto mode enables autonomous roadmap; both enhance knowledge system | — Pending |
| Sonnet as default when unclear | Better to over-invest than under-invest in reasoning | — Pending |
| Separate files per user | Avoids merge conflicts, simpler than namespaced entries | — Pending |
| Both per-turn and session-end hooks | Flexibility for performance vs. completeness tradeoff | — Pending |
| Stop-and-ask for irreversible/external/costs | Clear safety boundary that enables trust in autonomous mode | — Pending |

---
*Last updated: 2025-02-15 after initialization*
