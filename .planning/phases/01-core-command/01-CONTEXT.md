# Phase 1: Core Command - Context

**Gathered:** 2025-01-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete `/gsd:quick` command that executes small tasks with GSD guarantees (atomic commits, STATE.md tracking) while skipping optional agents (research, plan-checker, verifier). Quick tasks live in `.planning/quick/` separate from planned phases.

</domain>

<decisions>
## Implementation Decisions

### Invocation & Arguments
- Interactive prompt for task description (no inline args)
- No flags — keep it minimal
- Fail with clear error if no ROADMAP.md exists
- Can run mid-phase — quick tasks always allowed regardless of current phase status

### Task Scope & Execution
- No scope limits — user decides what's "quick"
- Skip research agent, plan-checker agent, and verifier agent
- On failure: no resume tracking — user re-runs `/gsd:quick` from scratch
- Creates PLAN.md before execution (lightweight, single task)

### Output & Feedback
- Standard GSD output during execution (same task status updates)
- Creates SUMMARY.md matching regular phase format
- No commit if no changes (current GSD behavior)

### Directory Structure
- Quick tasks go to `.planning/quick/NNN-slug/` (NOT `.planning/phases/`)
- 3-digit padded ascending numbers: `001-fix-button-spacing/`, `002-update-readme/`
- Each directory contains: PLAN.md, SUMMARY.md

### State Integration
- Do NOT update ROADMAP.md — quick tasks are ad-hoc, not planned work
- Update STATE.md with "Quick Tasks Completed" table
- Table includes: number, description, date, commit hash, link to /quick/ dir

### Claude's Discretion
- Exact PLAN.md format for quick tasks (simplified vs full)
- Slug generation from task description
- Error message wording

</decisions>

<specifics>
## Specific Ideas

- Keep roadmap clean — it's the plan, not the execution log
- Quick tasks are interruptions, not planned phases — structure should reflect that
- Date is in git commit, no need in directory name

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-core-command*
*Context gathered: 2025-01-19*
