<purpose>
Sprint orchestrator: run multiple phases end-to-end without manual intervention.

Uses a checkpoint-and-respawn pattern to keep the context window fresh:
- After each phase, the orchestrator writes its state to SPRINT-STATE.json
- Then spawns a FRESH copy of itself as a Task() and exits
- The new orchestrator reads the state file and continues from the next phase
- Each orchestrator instance only handles ONE phase — zero context accumulation

This is the same pattern GSD uses everywhere else: externalize state to files,
spawn fresh contexts. The sprint orchestrator never degrades because it never
accumulates context from previous phases.

State file: .planning/SPRINT-STATE.json
Report file: .planning/SPRINT-REPORT.md
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<process>

<step name="check_for_resume">
**FIRST:** Check if a sprint is already in progress by looking for `.planning/SPRINT-STATE.json`.

```bash
if [ -f ".planning/SPRINT-STATE.json" ]; then
  RESUMING=true
else
  RESUMING=false
fi
```

**If RESUMING is true AND no `--dry-run` or range arguments that would start a new sprint:**
Skip directly to `resume_sprint` step.

**If RESUMING is true AND new arguments provided:**
Ask the user:
```
AskUserQuestion([
  {
    question: "A sprint is already in progress. What would you like to do?",
    header: "Sprint",
    multiSelect: false,
    options: [
      { label: "Resume", description: "Continue the existing sprint from where it left off" },
      { label: "Start New", description: "Discard the previous sprint state and start fresh" }
    ]
  }
])
```

If "Resume": skip to `resume_sprint`.
If "Start New": delete `SPRINT-STATE.json` and continue to `parse_arguments`.

**If NOT resuming:** Continue to `parse_arguments`.
</step>

<step name="parse_arguments">
Parse $ARGUMENTS for:

- **Range**: e.g., `3-5` → phases 3, 4, 5. Single number `3` → just phase 3. Omit → all remaining.
- **`--dry-run`**: Show plan without executing.
- **`--skip-failures`**: Continue to next phase if current phase fails after retry.
- **`--consolidated`**: Force consolidated workflow for all phases.
- **`--prd <file>`**: Pass PRD file to skip discuss phase.

Store as: `RANGE_START`, `RANGE_END`, `DRY_RUN`, `SKIP_FAILURES`, `USE_CONSOLIDATED`, `PRD_FILE`.
</step>

<step name="determine_phases">
Read ROADMAP.md and STATE.md to determine:

1. Current milestone's phase list (number, name, goal, status)
2. Which phases are incomplete (not marked `[x]`)
3. Current phase from STATE.md

```bash
INIT=$(node ~/.claude/get-shit-done/bin/gsd-tools.cjs init plan-phase "${RANGE_START:-current}" --include state,roadmap)
```

**If range specified:** Filter to phases within `RANGE_START` through `RANGE_END`.
**If no range:** Use all incomplete phases from current phase onward.

Build `SPRINT_PHASES` — an ordered list of phase objects: `{ number, name, goal }`.

**Validation:**
- Error if no incomplete phases found
- Error if range references non-existent phases
- Error if all phases in range are already complete
- Warn if any phases in range already have partial progress (plans exist but no summaries)

```bash
CONSOLIDATED_CFG=$(node ~/.claude/get-shit-done/bin/gsd-tools.cjs config-get workflow.consolidated 2>/dev/null || echo "false")
```

If `--consolidated` flag or `CONSOLIDATED_CFG` is `"true"`, set `USE_CONSOLIDATED=true`.

```bash
SKIP_CFG=$(node ~/.claude/get-shit-done/bin/gsd-tools.cjs config-get sprint.skip_on_failure 2>/dev/null || echo "false")
```

If `--skip-failures` flag or `SKIP_CFG` is `"true"`, set `SKIP_FAILURES=true`.
</step>

<step name="show_sprint_plan">
Display the sprint plan:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► SPRINT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phases: {first} → {last} ({count} phases)
Mode: {Standard / Consolidated}
On Failure: {Stop / Skip & Continue}
PRD: {filename / None}
Context: Checkpoint-and-respawn (fresh window per phase)

| # | Phase | Status |
|---|-------|--------|
| {N} | {Name} | Pending |
| {N+1} | {Name} | Pending |
| ... | ... | ... |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**If `--dry-run`:** Display the plan and stop. Do not execute.

```
DRY RUN — no phases will be executed.
To run this sprint: /gsd:sprint {range}
```

Return early.

**If NOT dry-run:** Ask for confirmation before proceeding:

```
AskUserQuestion([
  {
    question: "Start sprint? This will run {count} phases unattended.",
    header: "Sprint",
    multiSelect: false,
    options: [
      { label: "Start Sprint", description: "Run all listed phases end-to-end" },
      { label: "Cancel", description: "Return without executing" }
    ]
  }
])
```

If cancelled, return early.
</step>

<step name="initialize_sprint_state">
Save current auto_advance value and write initial sprint state:

```bash
ORIGINAL_AUTO=$(node ~/.claude/get-shit-done/bin/gsd-tools.cjs config-get workflow.auto_advance 2>/dev/null || echo "false")
node ~/.claude/get-shit-done/bin/gsd-tools.cjs config-set workflow.auto_advance true
SPRINT_START_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
```

Write `.planning/SPRINT-STATE.json`:

```json
{
  "status": "running",
  "start_time": "{SPRINT_START_TIME}",
  "phases": [
    { "number": 1, "name": "Foundation", "status": "pending" },
    { "number": 2, "name": "Core Features", "status": "pending" },
    ...
  ],
  "current_index": 0,
  "completed": [],
  "failed": [],
  "flags": {
    "skip_failures": false,
    "consolidated": true,
    "prd": "spec.md"
  },
  "original_auto_advance": false
}
```

Commit the state file:
```bash
node ~/.claude/get-shit-done/bin/gsd-tools.cjs commit "docs: sprint started" --files .planning/SPRINT-STATE.json
```

Now proceed to `execute_current_phase`.
</step>

<step name="resume_sprint">
**Entry point when resuming from an existing SPRINT-STATE.json.**

Read the state file:
```bash
cat .planning/SPRINT-STATE.json
```

Parse all fields. Restore flags from the state file.

Ensure auto_advance is still enabled:
```bash
node ~/.claude/get-shit-done/bin/gsd-tools.cjs config-set workflow.auto_advance true
```

Display resume banner:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPRINT ► Resuming
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Completed: {completed count}
 Remaining: {remaining count}
 Next: Phase {N}: {Name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Proceed to `execute_current_phase`.
</step>

<step name="execute_current_phase">
**This step handles exactly ONE phase, then checkpoints.**

Read `current_index` from state to determine which phase to run.

If `current_index >= phases.length`: skip to `finalize_sprint` (all phases done).

Get the current phase: `PHASE = phases[current_index]`.

### Display Phase Banner

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPRINT ► Phase {current_index + 1}/{total}: {Name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Progress: [{completed}✓ {failed}✗ {remaining}…]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Determine Phase Entry Point

Check what state this phase is in:

```bash
PHASE_DIR=$(node ~/.claude/get-shit-done/bin/gsd-tools.cjs phase dir "${PHASE_NUM}")
```

1. **Has VERIFICATION.md with `passed`** → Phase already complete, mark as completed, skip to checkpoint.
2. **Has SUMMARY.md files** → Phase partially executed, resume with execute-phase.
3. **Has PLAN.md files but no SUMMARY.md** → Plans exist, start at execute-phase.
4. **Has CONTEXT.md but no PLAN.md** → Context gathered, start at plan-phase.
5. **Nothing** → Start from beginning (discuss-phase or consolidated-phase).

### Invoke Phase Workflow

Build the invocation command based on entry point and mode:

**If `flags.consolidated` and starting from beginning:**
```
Task(
  prompt="Execute /gsd:consolidated-phase {phase_num} --auto" + (flags.prd ? " --prd " + flags.prd : ""),
  subagent_type="general-purpose",
  description="Sprint: Consolidated Phase {phase_num}"
)
```

**If standard mode, starting from beginning, no PRD:**
```
Task(
  prompt="Execute /gsd:discuss-phase {phase_num} --auto",
  subagent_type="general-purpose",
  description="Sprint: Discuss Phase {phase_num}"
)
```

**If standard mode with PRD (skip discuss):**
```
Task(
  prompt="Execute /gsd:plan-phase {phase_num} --auto --prd {flags.prd}",
  subagent_type="general-purpose",
  description="Sprint: Plan Phase {phase_num}"
)
```

**If resuming from a later entry point:** invoke the appropriate command (plan-phase, execute-phase) with `--auto`.

### Check Phase Result

After the Task returns, check the phase outcome:

```bash
PHASE_STATUS=$(node ~/.claude/get-shit-done/bin/gsd-tools.cjs phase status "${PHASE_NUM}" 2>/dev/null || echo "incomplete")
```

Also check for VERIFICATION.md:
```bash
VERIFICATION_FILE=$(find ".planning/phases/${PHASE_DIR}" -name "*-VERIFICATION.md" -type f 2>/dev/null | head -1)
```

If VERIFICATION.md exists, read its status field.

### Handle Outcome

**If phase completed (status = complete):**
- Update state: add to `completed`, set phase status to `"passed"`
- Proceed to `checkpoint_and_respawn`

**If phase has gaps (VERIFICATION.md status = gaps_found):**

Attempt gap closure:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPRINT ► Gap Closure: Phase {N}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

```
Task(
  prompt="Execute /gsd:plan-phase {phase_num} --gaps --auto",
  subagent_type="general-purpose",
  description="Sprint: Gap Closure Plan Phase {phase_num}"
)
```

Then:
```
Task(
  prompt="Execute /gsd:execute-phase {phase_num} --gaps-only --auto",
  subagent_type="general-purpose",
  description="Sprint: Gap Closure Execute Phase {phase_num}"
)
```

Re-check phase status after gap closure.

**If gap closure succeeded:**
- Update state: add to `completed`, set phase status to `"passed_after_retry"`
- Proceed to `checkpoint_and_respawn`

**If gap closure failed AND `flags.skip_failures`:**
- Update state: add to `failed` with reason, set phase status to `"failed"`
- Proceed to `checkpoint_and_respawn` (continues to next phase)

**If gap closure failed AND NOT `flags.skip_failures`:**
- Update state: set phase status to `"blocked"`, set sprint status to `"blocked"`
- Proceed to `finalize_sprint` (sprint stops here)

**If phase failed for other reasons (agent error, planning failure):**

Same logic: skip if `flags.skip_failures`, otherwise block and finalize.
</step>

<step name="checkpoint_and_respawn">
**This is the key step that keeps the context window fresh.**

After handling one phase, the orchestrator:

1. **Updates SPRINT-STATE.json** with the result of the current phase:

```json
{
  "status": "running",
  "start_time": "...",
  "phases": [
    { "number": 1, "name": "Foundation", "status": "passed" },
    { "number": 2, "name": "Core Features", "status": "pending" },
    ...
  ],
  "current_index": 1,
  "completed": [1],
  "failed": [],
  "flags": { ... },
  "original_auto_advance": false
}
```

Increment `current_index` to point to the next phase.

2. **Commits the state file:**
```bash
node ~/.claude/get-shit-done/bin/gsd-tools.cjs commit "docs: sprint checkpoint after phase {N}" --files .planning/SPRINT-STATE.json
```

3. **Checks if more phases remain:**

If `current_index >= phases.length` → skip to `finalize_sprint` (no respawn needed).

4. **Spawns a fresh copy of itself and exits:**

```
Task(
  prompt="""
Resume the sprint from .planning/SPRINT-STATE.json.
Execute /gsd:sprint (the workflow will detect the state file and resume automatically).
""",
  subagent_type="general-purpose",
  description="Sprint: Continue from Phase {next_phase_num}"
)
```

**IMPORTANT:** After spawning the continuation Task, this orchestrator instance is DONE.
It does NOT wait for the Task to complete. It does NOT continue processing.
The fresh Task() gets a clean 200k context window and picks up from the state file.

**Why this works:**
- The new orchestrator reads SPRINT-STATE.json → knows exactly where it is
- It has zero accumulated context from previous phases
- Each orchestrator instance only processes ONE phase
- State is fully externalized to the JSON file
- This is the same pattern GSD uses for plan execution (fresh context per plan)
</step>

<step name="finalize_sprint">
**Called when all phases are done OR the sprint is blocked.**

1. **Restore original auto_advance setting:**
```bash
ORIGINAL_AUTO=$(cat .planning/SPRINT-STATE.json | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).original_auto_advance))")
node ~/.claude/get-shit-done/bin/gsd-tools.cjs config-set workflow.auto_advance ${ORIGINAL_AUTO}
```

2. **Record end time in state:**
```bash
SPRINT_END_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
```

3. **Write SPRINT-REPORT.md** from state file:

Read `.planning/SPRINT-STATE.json` and generate the report:

```markdown
# Sprint Report

**Started:** {start_time from state}
**Ended:** {SPRINT_END_TIME}
**Mode:** {Standard / Consolidated based on flags}
**Phases Attempted:** {count of non-pending phases}
**Phases Completed:** {completed.length}
**Phases Failed:** {failed.length}
**Phases Skipped:** {count of still-pending phases, if sprint was blocked}

## Results

| Phase | Name | Status | Notes |
|-------|------|--------|-------|
{For each phase in state.phases:}
| {number} | {name} | {✓ / ✗ / ⊘} | {status detail} |

## Quality Gates

{Read VERIFICATION.md from each completed phase, extract quality gate results}
{If no quality gates configured: "No quality gates configured."}

## Completed Phases

{For each completed phase, read one-line summary from VERIFICATION.md}

## Failed Phases

{For each failed phase, details of what went wrong from VERIFICATION.md}

## Next Steps

{Based on state.status:}
- If "completed": "All phases complete. Run `/gsd:complete-milestone` to archive."
- If "blocked": "Sprint stopped at Phase {N}. Resolve with `/gsd:plan-phase {N} --gaps` then `/gsd:sprint` to resume."
- If has failures but completed: "{completed} of {total} passed. {failed} need attention. Run `/gsd:progress`."
```

4. **Update state to finalized:**
```json
{
  "status": "completed" | "blocked",
  "end_time": "...",
  ...rest of state
}
```

5. **Commit report and final state:**
```bash
node ~/.claude/get-shit-done/bin/gsd-tools.cjs commit "docs: sprint report" --files .planning/SPRINT-REPORT.md .planning/SPRINT-STATE.json
```

6. **Clean up state file** (only if sprint completed successfully — leave it for resume if blocked):
If `status === "completed"` (all phases done, no blocks):
```bash
rm .planning/SPRINT-STATE.json
node ~/.claude/get-shit-done/bin/gsd-tools.cjs commit "chore: clean up sprint state" --files .planning/SPRINT-STATE.json
```

7. **Display final results:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► SPRINT COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{completed}✓  {failed}✗  {skipped}⊘

| Phase | Status |
|-------|--------|
| {N}: {Name} | ✓ |
| {N+1}: {Name} | ✗ gaps |
| ... | ... |

Report: .planning/SPRINT-REPORT.md
```

**If all phases completed:**
```
All {count} phases passed.

▶ /gsd:complete-milestone
```

**If some failed with skip_failures:**
```
{completed} of {total} phases passed. {failed} need attention.

▶ /gsd:progress — see what needs fixing
```

**If blocked:**
```
Sprint stopped at Phase {N}: {Name}

▶ /gsd:plan-phase {N} --gaps — resolve gaps
▶ /gsd:sprint — resume from where it stopped
```
</step>

</process>

<context_management>
**Why checkpoint-and-respawn?**

The sprint orchestrator faces the same problem GSD solves for plan execution:
a long-running context accumulates garbage and degrades. The solution is the
same too — externalize state to files and spawn fresh contexts.

Without this pattern, a sprint running 8 phases would have the orchestrator's
context window at ~80% by phase 6, causing degraded decision-making for gap
closure, phase entry point detection, and error handling.

With checkpoint-and-respawn:
- Each orchestrator instance handles exactly ONE phase
- State lives in SPRINT-STATE.json, not in the context window
- Every phase gets a fresh 200k context for the orchestrator
- The pattern is invisible to the user — it's still one `/gsd:sprint` command

**State file lifecycle:**
1. Created at sprint start (initialize_sprint_state)
2. Updated after each phase (checkpoint_and_respawn)
3. Read by each new orchestrator instance (resume_sprint)
4. Used to generate SPRINT-REPORT.md (finalize_sprint)
5. Deleted on successful completion (finalize_sprint)
6. Left in place if blocked (enables `/gsd:sprint` to resume)
</context_management>

<success_criteria>
- [ ] Phase range correctly determined from ROADMAP.md and STATE.md
- [ ] Dry-run shows plan without executing
- [ ] User confirms before sprint starts
- [ ] SPRINT-STATE.json created with full sprint plan
- [ ] Auto-advance enabled temporarily, restored on completion
- [ ] Each phase invoked with correct entry point (discuss/plan/execute based on existing state)
- [ ] Orchestrator respawns with fresh context after each phase (checkpoint-and-respawn)
- [ ] Gap closure attempted automatically on verification failures
- [ ] Failed phases either block sprint or are skipped (based on flags.skip_failures)
- [ ] SPRINT-REPORT.md generated from state file, not from orchestrator memory
- [ ] State file cleaned up on success, left for resume on block
- [ ] Sprint resumes correctly from existing SPRINT-STATE.json
- [ ] Sprint does not cross milestone boundaries
- [ ] Original auto_advance config restored on completion
</success_criteria>
