# Phase 4: Plan Integration - Context

**Gathered:** 2026-02-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Integrate adversary checkpoint into the `/gsd:plan-phase` workflow so each plan gets stress-tested after creation. The adversary challenges each PLAN.md after the plan checker completes, the planner revises if needed, and the user sees a per-plan summary. Reuses the debate loop pattern from Phase 3 (new-project integration). No new config fields — uses existing `adversary.checkpoints.plan` setting.

</domain>

<decisions>
## Implementation Decisions

### Adversary Placement
- Adversary runs **after plan checker passes** (flow: planner → checker → revise → adversary → revise → commit)
- Adversary sees the **revised version** of the plan (post-checker), not the original
- Adversary runs **independently** of checker config — if adversary is enabled, it runs regardless of whether `plan_check` is true/false

### Artifact Scope
- **Per-plan review** — each PLAN.md gets its own adversary challenge round
- Adversary reviews **after each plan is created**, not batched at the end of all plans
- **Include prior plans as context** when reviewing the current plan (so adversary can catch cross-plan gaps)

### Revision Strategy
- Same severity handling as Phase 3: **BLOCKING auto-revises, MAJOR/MINOR at Claude's discretion**
- **Planner agent** generates the defense/revision (re-spawned with adversary feedback), not the orchestrator
- Config: **Reuse existing** `adversary.checkpoints.plan` structure (boolean/object with optional max_rounds) — no new config fields

### Display & Convergence
- Each plan gets its own **ADVERSARY REVIEW banner + consolidated summary**, same pattern as Phase 3
- Debate stops on **adversary CONVERGE recommendation or max rounds** (3), consistent with Phase 3
- **Clean artifacts** — PLAN.md files contain no trace of adversary review, revisions folded in silently

### Claude's Discretion
- Exact prompt structure for feeding adversary challenges back to planner agent
- How prior plans are summarized for adversary context (full content vs. summary)
- Whether to show plan number in the adversary banner ("Plan 2/3: ADVERSARY REVIEW")
- MAJOR/MINOR challenge handling (revise vs. note) on a case-by-case basis

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-plan-integration*
*Context gathered: 2026-02-13*
