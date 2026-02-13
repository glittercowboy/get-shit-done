---
phase: 04-plan-integration
plan: 01
subsystem: commands
tags: [adversary, debate-loop, plan-phase, planner-as-defender, config-reading, orchestration]

# Dependency graph
requires:
  - phase: 01-core-agent
    provides: gsd-adversary agent definition with input/output format
  - phase: 02-configuration
    provides: adversary config schema and node-e reading block
  - phase: 03-new-project-integration
    provides: debate loop pattern, adversary spawn template, summary display format
provides:
  - Per-plan adversary debate loop in plan-phase with planner-as-defender revision
  - Model table entry for gsd-adversary in plan-phase (sonnet/sonnet/haiku)
  - Prior plans as cross-plan context for adversary review
  - Adversary independence from checker config (--skip-verify and plan_check)
  - Reusable planner-as-defender pattern for future orchestrators
affects: [05-verify-work-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Planner-as-defender: re-spawn planner agent in adversary_revision mode instead of orchestrator editing inline"
    - "Per-plan iteration: loop over each PLAN.md with prior plans as context for cross-plan gap detection"
    - "Consolidated commit: single commit for all adversary-driven plan revisions after all plans reviewed"
    - "Adversary independence: adversary runs regardless of checker config via step 12.5 routing"

key-files:
  created: []
  modified:
    - commands/gsd/plan-phase.md

key-decisions:
  - "Planner-as-defender pattern: re-spawn planner for revisions instead of orchestrator editing inline, leveraging planner's plan-level knowledge"
  - "Step 11 routing fix: checker VERIFICATION PASSED routes to step 12.5 not step 13 to ensure adversary always runs"

patterns-established:
  - "Planner-as-defender: adversary challenges fed to planner agent for revision, not edited inline by orchestrator"
  - "Per-plan adversary loop: each PLAN.md gets independent review with prior plans as context"
  - "Consolidated adversary commit: one commit after all plan reviews, separate from planner and checker commits"

# Metrics
duration: 3min
completed: 2026-02-13
---

# Phase 4 Plan 01: Plan Integration Summary

**Per-plan adversary debate loop in /gsd:plan-phase with planner-as-defender revision pattern, prior plans as cross-plan context, and adversary independence from checker config**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-13T15:09:16Z
- **Completed:** 2026-02-13T15:12:39Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Integrated per-plan adversary review at Step 12.5 with full debate loop and planner-as-defender pattern
- Added planning-config.md to execution_context and gsd-adversary to model lookup table
- Updated Step 9 flow control to route through adversary review regardless of checker config
- Updated Step 11 to route checker pass through adversary review (bug fix)
- Added adversary status line to completion banner and adversary items to success_criteria
- CONV-01 hard cap of 3 rounds enforced, skip logic for disabled config and --gaps mode

## Task Commits

Each task was committed atomically:

1. **Task 1: Add adversary infrastructure and per-plan review loop** - `1576c39` (feat)
2. **Task 2: Wire adversary into flow control and update completion display** - `93a360e` (feat)
3. **Bug fix: Route checker pass through adversary review** - `9c97ff9` (fix)

## Files Created/Modified

- `commands/gsd/plan-phase.md` (765 lines, +242 lines) - Added:
  - planning-config.md to execution_context (line 19)
  - gsd-adversary row in model lookup table (line 69)
  - Step 12.5: Adversary Review -- Plans (lines 472-704)
  - Step 9 routing to step 12.5 when checker skipped (lines 333, 335)
  - Step 11 routing to step 12.5 when checker passes (line 403)
  - Adversary status line in offer_next (line 728)
  - Adversary verification items in success_criteria (lines 760-762)

## Decisions Made

1. **Planner-as-defender pattern** - Re-spawn planner agent for adversary revisions instead of orchestrator editing inline. The planner has plan-level domain knowledge for higher-quality revisions.

2. **Step 11 routing fix** - Changed checker VERIFICATION PASSED to route to step 12.5 instead of step 13. Without this fix, the adversary would be skipped whenever the checker passed, breaking the independence requirement.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Step 11 VERIFICATION PASSED routed to step 13, skipping adversary**
- **Found during:** Task 2 verification (tracing routing paths)
- **Issue:** Step 11 said "Proceed to step 13" when checker passed. Since step 12.5 (adversary) is between steps 12 and 13, this explicit jump bypassed adversary review entirely when checker passed.
- **Fix:** Changed "Proceed to step 13" to "Proceed to step 12.5 (adversary review)" in step 11
- **Files modified:** commands/gsd/plan-phase.md
- **Verification:** Traced all 8 routing paths; all correctly flow through step 12.5
- **Committed in:** `9c97ff9`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Essential fix for correctness. Without it, adversary would only run when checker is skipped, defeating the independence requirement.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The plan-phase adversary integration is complete and ready for use
- Phase 5 (verify-work integration) can reuse the same debate loop pattern with the "verification" checkpoint name
- Key difference for Phase 5: artifact is VERIFICATION.md, checkpoint name is "verification"
- The planner-as-defender pattern may or may not apply to Phase 5 (depends on whether the verifier agent has a revision mode)

### Requirements Covered

| Requirement | Status | Notes |
|-------------|--------|-------|
| INTG-03 | Covered | Adversary challenges PLAN.md after creation in /gsd:plan-phase (if enabled) |
| CONV-01 | Covered | Debate loop hard cap at 3 rounds enforced |

---
*Phase: 04-plan-integration*
*Completed: 2026-02-13*
