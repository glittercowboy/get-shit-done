# GSD Quick Mode

## What This Is

A fast-path command (`/gsd:quick`) for GSD that executes small tasks with the same guarantees (atomic commits, STATE.md tracking, ROADMAP.md integration) but skips optional verification agents. Reduces agent spawns from 5-8 to 2 (planner + executor) for tasks where the user already knows what to do.

## Core Value

Same guarantees, 50-70% fewer tokens for simple tasks.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] `/gsd:quick "description"` command executes end-to-end
- [ ] Creates decimal phase (3.1, 3.2) in ROADMAP.md
- [ ] Spawns gsd-planner (unchanged, just skips researcher/checker)
- [ ] Spawns gsd-executor for each plan
- [ ] Handles multiple plans with wave-based parallel execution
- [ ] Commits only files it edits/creates (not entire working dir)
- [ ] Updates STATE.md with "Quick Tasks Completed" table
- [ ] Updates STATE.md "Last activity" line
- [ ] Marks decimal phase complete in ROADMAP.md
- [ ] Errors if no ROADMAP.md exists
- [ ] `/gsd:resume-work` handles decimal phases (3.1, 3.2)
- [ ] help.md updated with quick command
- [ ] README.md updated with quick mode section
- [ ] GSD-STYLE.md updated with quick mode patterns

### Out of Scope

- `--plan-only` flag — MVP is always execute
- `--after N` flag — always inserts after current phase
- `--standalone` flag — requires active project, no exceptions
- Node.js helper scripts — Claude handles decimal parsing inline
- Git status warnings — commits only its own files anyway
- Planner modifications — planner unchanged, orchestrator skips agents
- gsd-verifier — verification skipped by design
- Requirements mapping — quick tasks are ad-hoc
- `/gsd:squash-quick` — future enhancement if fragmentation becomes a problem

## Context

GSD's current flow spawns 5-8 agents for every task:
1. gsd-phase-researcher (research)
2. gsd-planner (planning)
3. gsd-plan-checker (verification loop, 2-6 spawns)
4. gsd-executor (execution)
5. gsd-verifier (verification)

For simple tasks like "transition cards to table layout", only planner + executor are needed. The research, checker loops, and verifier add no value when the user knows exactly what to do.

Quick mode is the normal flow with 3 agent types removed:
- No gsd-phase-researcher
- No gsd-plan-checker
- No gsd-verifier

Everything else stays the same: same planner, same executor, same artifacts, same commits, same state tracking.

## Constraints

- **Integration**: Must use decimal phases for ROADMAP.md integration (borrowing from /gsd:insert-phase)
- **Compatibility**: Must work with /gsd:resume-work for failed quick tasks
- **Artifacts**: Same artifacts as full mode (PLAN.md, SUMMARY.md)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| No planner changes | Quick mode is orchestrator-level, not agent-level | — Pending |
| Decimal phases required | Maintains full traceability and state integrity | — Pending |
| No flags for MVP | Simplest possible interface | — Pending |
| Parallel wave execution | Matches execute-phase behavior for multi-plan tasks | — Pending |
| Quick Tasks table in STATE.md | Better tracking than just Last activity | — Pending |
| Error if no ROADMAP | Maintains state integrity, no standalone mode | — Pending |

---
*Last updated: 2025-01-19 after initialization*
