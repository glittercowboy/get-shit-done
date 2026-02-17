---
phase: 08-workflow-integration
verified: 2026-02-17T17:30:00Z
status: gaps_found
score: 10/13 must-haves verified
re_verification:
  previous_status: passed
  previous_score: 13/13
  gaps_closed: []
  gaps_remaining:
    - "Truth 4 — CO_PLANNER_REVISED flag never set, conditional commit is dead code (plan-phase.md, execute-phase.md)"
    - "Truth 11 — commit message hardcoded as docs(08): instead of variable phase scope"
    - "Truth 13 — synthesis sections in plan-phase.md and execute-phase.md lack explicit acceptance criteria"
  regressions:
    - "Truth 6 — no all-agents-failed handler in plan-phase.md or execute-phase.md (previously marked Info, now assessed MINOR gap)"
gaps:
  - truth: "An explicit accept/reject log is displayed after synthesizing co-planner feedback"
    status: partial
    reason: "The accept/reject log table is present in all four sections, but the conditional commit in plan-phase.md (step 12.3) and execute-phase.md (step 7.3) is dead code: the flag CO_PLANNER_REVISED_PLANS / CO_PLANNER_REVISED_VERIFICATION is never assigned anywhere in those sections. new-project.md correctly assigns the flag before checking it; plan-phase.md and execute-phase.md only check it."
    artifacts:
      - path: "commands/gsd/plan-phase.md"
        issue: "Line 577 checks `CO_PLANNER_REVISED_PLANS = true` but no instruction assigns this flag when changes are accepted. The conditional commit block will never fire."
      - path: "commands/gsd/execute-phase.md"
        issue: "Line 217 checks `CO_PLANNER_REVISED_VERIFICATION = true` but no instruction assigns this flag when changes are accepted. The conditional commit block will never fire."
    missing:
      - "In plan-phase.md synthesis section: add instruction to set CO_PLANNER_REVISED_PLANS=true when any accepted change is applied to PLAN.md files"
      - "In execute-phase.md synthesis section: add instruction to set CO_PLANNER_REVISED_VERIFICATION=true when any accepted change is applied to VERIFICATION.md"
  - truth: "User can trigger a workflow checkpoint and see Claude draft artifact, send to agent, receive structured feedback"
    status: partial
    reason: "The commit message for co-planner feedback integration is hardcoded as `docs(08):` scope in both plan-phase.md (line 581) and execute-phase.md (line 221). When these commands run on any phase other than 08, the git commit scope will be incorrect, polluting git history."
    artifacts:
      - path: "commands/gsd/plan-phase.md"
        issue: "Line 581: `docs(08): incorporate co-planner feedback (plans)` — phase number hardcoded"
      - path: "commands/gsd/execute-phase.md"
        issue: "Line 221: `docs(08): incorporate co-planner feedback (verification)` — phase number hardcoded"
    missing:
      - "In plan-phase.md: replace hardcoded `docs(08):` with variable phase scope, e.g. `docs(${PHASE_NUM}):` or the same dynamic scope pattern used elsewhere in plan-phase.md"
      - "In execute-phase.md: same fix for the verification commit message"
  - truth: "Claude synthesizes external feedback and makes the final decision"
    status: partial
    reason: "plan-phase.md and execute-phase.md synthesis sections instruct 'Review all suggestions and challenges. For each: Accept / Reject' but provide no criteria for making the accept/reject decision. new-project.md has explicit Accept-if, Reject-if, and Note-if criteria (lines 970-972) that give Claude a repeatable decision framework. Without these, synthesis quality is inconsistent and depends on Claude's implicit judgment rather than specified policy."
    artifacts:
      - path: "commands/gsd/plan-phase.md"
        issue: "Step 12.3 synthesis section (around line 560) says 'Accept: apply change' and 'Reject: note with brief reasoning' but specifies no decision criteria"
      - path: "commands/gsd/execute-phase.md"
        issue: "Step 7.3 synthesis section (around line 200) has the same bare Accept/Reject bullets with no criteria"
    missing:
      - "In plan-phase.md step 12.3 synthesis: add explicit acceptance criteria mirroring new-project.md lines 968-972, adapted for plan artifacts (e.g. Accept if: identifies a logical gap in the plan, a dependency conflict, an incorrect task ordering; Reject if: stylistic preference, scope expansion; Note if: valid but deferred)"
      - "In execute-phase.md step 7.3 synthesis: add explicit acceptance criteria adapted for verification artifacts (e.g. Accept if: identifies a missed verification case, a factually incorrect status; Reject if: stylistic preference; Note if: valid concern already captured)"
---

# Phase 8: Workflow Integration Verification Report

**Phase Goal:** External agents participate as co-planners at workflow checkpoints with clear, attributed feedback that Claude synthesizes
**Verified:** 2026-02-17T17:30:00Z
**Status:** gaps_found (adversary revision)
**Re-verification:** Yes — adversary revision of initial verification (previous status: passed 13/13)

## Adversary Revision Summary

The adversary identified four challenges. All four were confirmed by direct examination of the files. The initial verification incorrectly marked three truths as VERIFIED and downgraded one gap (all-agents-failed handler) to Info level. The revised assessment finds three FAILED truths and one MINOR gap, changing overall status from passed to gaps_found.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Co-planner review runs before adversary review at the requirements checkpoint in new-project | VERIFIED | Phase 7.3 at line 870, Phase 7.5 at line 1001 -- correct ordering |
| 2 | Co-planner review runs before adversary review at the roadmap checkpoint in new-project | VERIFIED | Phase 8.3 at line 1274, Phase 8.5 at line 1405 -- correct ordering |
| 3 | Each co-planner agent's feedback is displayed in a bordered, attributed block before synthesis | VERIFIED | `--- {Display Name} Feedback ---` blocks in new-project.md; `--- {Agent Name} Feedback ---` blocks in plan-phase.md and execute-phase.md |
| 4 | An explicit accept/reject log is displayed after synthesizing co-planner feedback | FAILED | Log table present in all four sections; but CO_PLANNER_REVISED_PLANS (plan-phase.md line 577) and CO_PLANNER_REVISED_VERIFICATION (execute-phase.md line 217) are never assigned — conditional commits are dead code in both files |
| 5 | When no co-planner agents are configured, the section is silently skipped and adversary review runs normally | VERIFIED | All four sections: "If agents array is empty: Skip to Phase X.5" with no banner or output |
| 6 | When a co-planner agent fails, a warning is displayed and the workflow continues | VERIFIED (partial) | Per-agent error handling present in all four sections; new-project.md also has explicit all-agents-failed handler (lines 938-941, 1342-1344); plan-phase.md and execute-phase.md lack the all-agents-failed handler (MINOR gap, does not block core goal) |
| 7 | Co-planner review runs before adversary review at the plan checkpoint in plan-phase | VERIFIED | Step 12.3 at line 472, Step 12.5 at line 586 -- correct ordering |
| 8 | Co-planner review runs before adversary review at the verification checkpoint in execute-phase | VERIFIED | Step 7.3 at line 113, Step 7.5 at line 226 -- correct ordering |
| 9 | Skip-to references in plan-phase route through co-planner review (12.3) before adversary (12.5) | VERIFIED | Three references updated at lines 333, 335, 403 |
| 10 | Skip-to reference in execute-phase routes through co-planner review (7.3) before adversary (7.5) | VERIFIED | Line 111 updated; line 104 skip comment updated to mention co-planner review |
| 11 | User can trigger a workflow checkpoint and see Claude draft artifact, send to agent, receive structured feedback | FAILED | The co-planner invoke and review flow is wired correctly; however the conditional commit messages are hardcoded as `docs(08):` in plan-phase.md (line 581) and execute-phase.md (line 221), causing incorrect git history on all phases except 08 |
| 12 | External agent feedback shows Suggestions, Challenges, Endorsements in a formatted block | VERIFIED | Three-section response format explicitly required in all four review prompts |
| 13 | Claude synthesizes external feedback and makes the final decision | FAILED | Synthesis sections in plan-phase.md and execute-phase.md lack explicit Accept-if / Reject-if / Note-if criteria present in new-project.md (lines 968-972). Bare "Accept" / "Reject" bullets with no decision framework provide inconsistent synthesis guidance |

**Score:** 10/13 truths verified (3 FAILED)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `commands/gsd/new-project.md` | Co-planner review sections at Phase 7.3 (requirements) and Phase 8.3 (roadmap) | VERIFIED | 1684 lines total; both sections substantive with flag assignment and all-agents-failed handlers |
| `commands/gsd/plan-phase.md` | Co-planner review section at step 12.3 (plan) | PARTIAL | 888 lines total; step 12.3 present and substantive; missing flag assignment and acceptance criteria |
| `commands/gsd/execute-phase.md` | Co-planner review section at step 7.3 (verification) | PARTIAL | 653 lines total; step 7.3 present and substantive; missing flag assignment and acceptance criteria |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| new-project.md Phase 7.3 | gsd-tools.cjs coplanner agents requirements | `coplanner agents "requirements"` bash invocation | WIRED | Line 875 |
| new-project.md Phase 8.3 | gsd-tools.cjs coplanner agents roadmap | `coplanner agents "roadmap"` bash invocation | WIRED | Line 1279 |
| plan-phase.md step 12.3 | gsd-tools.cjs coplanner agents plan | `coplanner agents "plan"` bash invocation | WIRED | Line 477 |
| execute-phase.md step 7.3 | gsd-tools.cjs coplanner agents verification | `coplanner agents "verification"` bash invocation | WIRED | Line 118 |
| plan-phase.md step 12.3 | conditional commit | CO_PLANNER_REVISED_PLANS flag | NOT WIRED | Flag checked at line 577 but never assigned; commit will never fire |
| execute-phase.md step 7.3 | conditional commit | CO_PLANNER_REVISED_VERIFICATION flag | NOT WIRED | Flag checked at line 217 but never assigned; commit will never fire |

### Requirements Coverage

| Success Criterion | Status | Blocking Issue |
|-------------------|--------|----------------|
| 1. User can trigger checkpoint -- Claude drafts artifact, sends to agent, receives structured feedback | PARTIAL | Hardcoded `docs(08):` commit scope in plan-phase.md and execute-phase.md |
| 2. External agent feedback displayed in clearly formatted block (challenges, suggestions, endorsements) | SATISFIED | Bordered attributed blocks in all four sections |
| 3. Each piece of feedback shows which agent provided it (attribution) | SATISFIED | Attribution blocks in all four sections |
| 4. Claude synthesizes external feedback and makes the final decision | PARTIAL | Synthesis lacks explicit Accept/Reject/Note criteria in plan-phase.md and execute-phase.md |
| 5. Draft-review-synthesize pattern works at all four checkpoint types | PARTIAL | Pattern present but conditional commit is dead code at plan and verification checkpoints |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `commands/gsd/plan-phase.md` | 577 | `CO_PLANNER_REVISED_PLANS` checked but never assigned | Blocker | Conditional commit never fires; co-planner feedback not committed even when accepted changes applied |
| `commands/gsd/execute-phase.md` | 217 | `CO_PLANNER_REVISED_VERIFICATION` checked but never assigned | Blocker | Same issue at verification checkpoint |
| `commands/gsd/plan-phase.md` | 581 | `docs(08):` hardcoded in commit message | Warning | Incorrect git scope on all phases except phase 08 |
| `commands/gsd/execute-phase.md` | 221 | `docs(08):` hardcoded in commit message | Warning | Same issue |
| `commands/gsd/plan-phase.md` | ~560 | Accept/Reject with no decision criteria | Warning | Inconsistent synthesis quality; depends on Claude's implicit judgment |
| `commands/gsd/execute-phase.md` | ~200 | Accept/Reject with no decision criteria | Warning | Same issue |
| `commands/gsd/plan-phase.md` | ~540 | No all-agents-failed handler | Minor | Implied by skip logic but not explicit; new-project.md has explicit handler |
| `commands/gsd/execute-phase.md` | ~160 | No all-agents-failed handler | Minor | Same issue |

### Human Verification Required

None -- all gaps are in instruction documents (prompts for Claude) that can be verified by static analysis of the text.

### Gaps Summary

Three gaps block full goal achievement, all rooted in plan-phase.md and execute-phase.md being implemented to a lower standard than new-project.md:

**Gap 1 (Blocker): Dead conditional commit.** Both plan-phase.md (step 12.3) and execute-phase.md (step 7.3) check a boolean flag before committing co-planner feedback changes, but never assign that flag. The flag assignment instruction is present in new-project.md's synthesis sections ("Set CO_PLANNER_REVISED_REQUIREMENTS=true if any changes were made") but was omitted from the other two files. Fix: add the flag-assignment instruction immediately after "Apply accepted changes" in each synthesis section.

**Gap 2 (Warning): Hardcoded phase scope in commit messages.** The commit messages for co-planner feedback use `docs(08):` as the scope. plan-phase.md and execute-phase.md are general-purpose commands that run on any phase; the `08` scope will produce misleading git history for all other phases. Fix: use a variable scope derived from the current phase number (the same pattern used in other commit messages in these files).

**Gap 3 (Warning): Missing acceptance criteria in synthesis.** new-project.md specifies explicit "Accept if / Reject if / Note if" criteria that guide Claude's synthesis decisions. plan-phase.md and execute-phase.md only say "Accept: apply change / Reject: note with brief reasoning" — no criteria. This makes synthesis guidance weaker and less consistent across runs. Fix: add criteria statements analogous to new-project.md lines 968-972, adapted for plan and verification artifact types.

**Gap 4 (Minor, non-blocking): No all-agents-failed handler** in plan-phase.md and execute-phase.md. new-project.md has explicit "If ALL agents failed: Display warning and skip to Phase X.5" blocks. The behavior is implied in plan-phase.md and execute-phase.md by the per-agent error loop, but not stated explicitly. This is the lowest-priority fix.

---

_Verified: 2026-02-17T17:30:00Z_
_Verifier: Claude (gsd-verifier) — adversary revision_
