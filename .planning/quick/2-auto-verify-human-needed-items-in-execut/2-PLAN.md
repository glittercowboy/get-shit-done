---
phase: quick-2
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - get-shit-done/workflows/execute-phase.md
autonomous: true
must_haves:
  truths:
    - "Orchestrator attempts auto-verification of human_needed items before presenting to user"
    - "Items with testable why_human reasons are programmatically checked"
    - "Only truly human-required items are presented to the user"
    - "If ALL items auto-verify successfully, status escalates to passed"
  artifacts:
    - path: "get-shit-done/workflows/execute-phase.md"
      provides: "Auto-verification logic in verify_phase_goal step"
      contains: "auto-verify"
  key_links:
    - from: "execute-phase.md verify_phase_goal"
      to: "VERIFICATION.md human_verification frontmatter"
      via: "parsing why_human field to classify items"
      pattern: "why_human"
---

<objective>
Add auto-verification sub-step to the execute-phase workflow's `verify_phase_goal` step so that `human_needed` items are programmatically tested before being presented to the user.

Purpose: Reduce unnecessary human interaction. Many items flagged as "human_needed" by the verifier (file existence, CLI behavior, import checks) can actually be auto-verified by the orchestrator. Only items that are truly human-only (visual appearance, UX feel, real-time behavior) should require manual verification.

Output: Updated `execute-phase.md` with auto-verification logic between receiving `human_needed` status and presenting items to the user.
</objective>

<execution_context>
@/Users/zpyoung/.claude/get-shit-done/workflows/execute-plan.md
@/Users/zpyoung/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@get-shit-done/workflows/execute-phase.md
@agents/gsd-verifier.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add auto-verification sub-step for human_needed items</name>
  <files>get-shit-done/workflows/execute-phase.md</files>
  <action>
In the `verify_phase_goal` step (currently lines 279-337), replace the `**If human_needed:**` block (lines 304-313) with an expanded auto-verification flow. The new block should:

1. **Parse human_verification items from VERIFICATION.md frontmatter.** The verifier already outputs structured items:
   ```yaml
   human_verification:
     - test: "What to do"
       expected: "What should happen"
       why_human: "Why can't verify programmatically"
   ```

2. **Classify each item by its `why_human` field.** Add a classification heuristic the orchestrator uses to decide if auto-verification is possible:

   Auto-verifiable signals in `why_human` (attempt programmatic check):
   - Contains "file", "exists", "content" -> check file existence/content with Read/Grep
   - Contains "CLI", "command", "output", "runs" -> execute command and check output
   - Contains "import", "export", "module" -> grep for import/export patterns
   - Contains "endpoint", "route", "API", "returns" -> curl/fetch and check response
   - Contains "build", "compile", "lint" -> run build/lint command

   Truly human-only signals in `why_human` (skip auto-verification):
   - Contains "visual", "appearance", "look", "style", "layout", "design"
   - Contains "UX", "feel", "intuitive", "usability", "flow"
   - Contains "real-time", "animation", "transition", "responsive"
   - Contains "external service", "third-party", "browser"
   - Contains "subjective", "preference", "judgment"

   Default: If `why_human` doesn't match either set, keep as human-needed (conservative).

3. **For each auto-verifiable item, attempt verification.** The orchestrator should:
   - Use the `test` and `expected` fields to construct a check
   - Run the check (Read, Grep, Bash as appropriate)
   - Record result as `auto_passed` or `auto_failed`

4. **Triage results into three buckets:**
   - `auto_passed`: Items that were auto-verified successfully (report but don't require human action)
   - `auto_failed`: Items that failed auto-verification (become gaps, not human items)
   - `still_needs_human`: Items that genuinely require human judgment

5. **Determine final status based on triage:**
   - If `still_needs_human` is empty AND `auto_failed` is empty -> escalate to `passed`
   - If `still_needs_human` is empty AND `auto_failed` has items -> treat as `gaps_found` (route to gap closure)
   - If `still_needs_human` has items -> present only those to the user (reduced list)

6. **Present the reduced verification request to the user.** The new output format:

```
## Phase {X}: {Name} -- Human Verification Required

{If auto_passed items exist:}
### Auto-Verified ({N} items passed programmatic checks)
{List of auto_passed items with brief evidence}

{If auto_failed items exist:}
### Auto-Verification Failures ({N} items)
{List of auto_failed items -- these will route to gap closure}

### Human Testing Required ({M} items)
{Only the still_needs_human items from VERIFICATION.md}

"approved" -> continue | Report issues -> gap closure
```

If ALL items auto-verified: skip human presentation entirely and flow to `update_roadmap` (same as `passed` status).

IMPORTANT: Keep the existing `passed` and `gaps_found` handling unchanged. Only modify the `human_needed` block. The new logic sits between reading the VERIFICATION.md status and presenting to the user -- it's an intermediary processing step.

IMPORTANT: This is a workflow prompt file (markdown instructions for Claude orchestrator), NOT executable code. Write the auto-verification logic as clear orchestrator instructions with code blocks showing what to run, matching the existing style of the file (e.g., the `execute_waves` step shows bash commands and Task() calls as examples for the orchestrator to follow).
  </action>
  <verify>
    1. Read the updated execute-phase.md and confirm the `verify_phase_goal` step contains the new auto-verification sub-step
    2. Confirm the `why_human` classification heuristic is present with both auto-verifiable and human-only signal lists
    3. Confirm the three-bucket triage (auto_passed, auto_failed, still_needs_human) is documented
    4. Confirm the escalation logic (all auto-verified -> passed, failures -> gaps_found) is present
    5. Confirm the existing `passed` and `gaps_found` blocks are unchanged
    6. Confirm the file follows the existing XML/markdown style of the workflow
  </verify>
  <done>
    The `verify_phase_goal` step in execute-phase.md contains auto-verification logic that classifies human_needed items by their `why_human` field, attempts programmatic verification where possible, and only presents truly human-required items to the user. The existing passed/gaps_found flows are untouched.
  </done>
</task>

</tasks>

<verification>
- The execute-phase.md file parses correctly (valid XML structure, all steps intact)
- The verify_phase_goal step still handles all three statuses: passed, human_needed, gaps_found
- The human_needed path now includes auto-verification before human presentation
- The auto-verification heuristic references the existing VERIFICATION.md frontmatter format
</verification>

<success_criteria>
- execute-phase.md contains auto-verification sub-step in verify_phase_goal
- Classification heuristic for why_human field is documented with both signal sets
- Three-bucket triage system (auto_passed, auto_failed, still_needs_human) is present
- Escalation paths are clear: all-auto-passed -> passed, auto-failed -> gaps_found, remaining -> human
- Existing workflow steps and handling for passed/gaps_found are unchanged
</success_criteria>

<output>
After completion, create `.planning/quick/2-auto-verify-human-needed-items-in-execut/2-SUMMARY.md`
</output>
