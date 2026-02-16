<purpose>
Execute all remaining phases in the current milestone unattended. Loops: plan → execute → extract learnings → transition → next phase. Designed for overnight runs.

Key behaviors:
- Auto-approve checkpoints (tasks still run, human gate bypassed)
- Skip failed phases and continue (log errors for morning review)
- Extract learnings after each phase (compound learning)
- Complete milestone when all phases done
</purpose>

<required_reading>
@~/.claude/get-shit-done/references/ui-brand.md
</required_reading>

<process>

<step name="initialize" priority="first">

Load project state and analyze roadmap:

```bash
INIT=$(node ~/.claude/get-shit-done/bin/gsd-tools.cjs init execute-phase "1" --include state,config 2>/dev/null)
STATE_CONTENT=$(cat .planning/STATE.md 2>/dev/null)
ROADMAP_CONTENT=$(cat .planning/ROADMAP.md 2>/dev/null)
```

**If `.planning/` missing:** Error — run `/gsd:new-project` first.

Get all phases and their status:

```bash
ROADMAP_ANALYSIS=$(node ~/.claude/get-shit-done/bin/gsd-tools.cjs roadmap analyze 2>/dev/null)
```

Parse: total phases, completed phases, remaining phases (with numbers and names).

Get milestone version:

```bash
MILESTONE_VERSION=$(grep -oE 'v[0-9]+\.[0-9]+(\.[0-9]+)?' .planning/PROJECT.md 2>/dev/null | head -1)
```

**Parse flags from $ARGUMENTS:**
- `--from N` → Start from phase N
- `--dry-run` → Show plan only

**Determine starting phase:**
- If `--from N`: start from phase N
- Otherwise: first phase with `disk_status` != `complete`

**Determine remaining phases:**
Build ordered list of phases to execute (from starting phase to last phase).

**If no phases remaining:** Display "All phases complete. Run `/gsd:complete-milestone`." and exit.

</step>

<step name="display_execution_plan">

Display autopilot plan:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► AUTOPILOT MODE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Milestone: {version}
Phases to execute: {remaining_count} of {total_count}

  Phase {N}: {Name} — {status}
  Phase {N+1}: {Name} — {status}
  ...

Checkpoints: auto-approved
Learning extraction: after each phase
Error handling: skip and continue

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**If `--dry-run`:** Display the plan above and exit. Do not execute.

Initialize autopilot log:

```bash
AUTOPILOT_LOG=".planning/autopilot-log.md"
```

Write log header:

```markdown
# Autopilot Log — {milestone_version}

**Started:** {timestamp}
**Phases:** {remaining_count} remaining of {total_count} total

| Phase | Status | Plans | Learnings | Duration | Notes |
|-------|--------|-------|-----------|----------|-------|
```

</step>

<step name="phase_loop">

For each phase in the remaining phases list:

### a. Display Phase Banner

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► AUTOPILOT — Phase {X}/{N}: {Name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Record phase start time.

### b. Plan Phase

Check if phase already has plans:

```bash
ls .planning/phases/${PADDED_PHASE}-*/*-PLAN.md 2>/dev/null
```

**If plans exist:** Skip planning, go to execute.

**If no plans:** Spawn plan-phase:

```
Task(
  prompt="Run /gsd:plan-phase ${PHASE} --auto --auto-approve-checkpoints\n\nIMPORTANT: This is running in autopilot mode. Auto-approve all checkpoints. Do not pause for human input.",
  subagent_type="general-purpose",
  description="Autopilot: Plan Phase ${PHASE}"
)
```

**Handle plan-phase return:**
- **PHASE COMPLETE / plans created** → Continue to execute
- **PLANNING INCONCLUSIVE / error** → Log to autopilot-log, skip to next phase

### c. Execute Phase

Check if phase already executed (all plans have summaries):

```bash
PLAN_INDEX=$(node ~/.claude/get-shit-done/bin/gsd-tools.cjs phase-plan-index "${PHASE}" 2>/dev/null)
```

**If `incomplete_count` is 0:** Skip execution, go to learnings.

**If incomplete plans exist:** Spawn execute-phase:

```
Task(
  prompt="Run /gsd:execute-phase ${PHASE}\n\nIMPORTANT: This is running in autopilot mode. Auto-approve all checkpoints — when an agent returns with a checkpoint, respond 'approved' and spawn continuation. Do not pause for human input at any point.",
  subagent_type="general-purpose",
  description="Autopilot: Execute Phase ${PHASE}"
)
```

**Handle execute-phase return:**
- **PHASE COMPLETE / verification passed** → Continue to learnings
- **GAPS FOUND** → Log to autopilot-log with gap details, skip to next phase
- **Agent failure** → Log error, skip to next phase

### d. Extract Learnings

```bash
node scripts/extract-learnings.js --milestone "${MILESTONE_VERSION}" --phase "${PADDED_PHASE}" 2>/dev/null || true
```

Count extracted learnings:

```bash
LEARNING_COUNT=$(ls .planning/learnings/${MILESTONE_VERSION}/phase-${PADDED_PHASE}*.json 2>/dev/null | wc -l | tr -d ' ')
```

### e. Transition

Mark phase complete and advance state:

```bash
COMPLETION=$(node ~/.claude/get-shit-done/bin/gsd-tools.cjs phase complete "${PHASE}" 2>/dev/null)
```

Extract: `next_phase`, `next_phase_name`, `is_last_phase`.

Commit phase completion:

```bash
node ~/.claude/get-shit-done/bin/gsd-tools.cjs commit "docs(phase-${PADDED_PHASE}): autopilot complete" --files .planning/ROADMAP.md .planning/STATE.md .planning/REQUIREMENTS.md
```

### f. Log Progress

Calculate duration. Append to autopilot log:

```markdown
| Phase {X}: {Name} | {status_emoji} {status} | {plan_count} | {learning_count} | {duration} | {notes} |
```

Where status is: `Complete`, `Skipped (gaps)`, `Skipped (plan failed)`, `Skipped (exec failed)`.

### g. Status Banner

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► AUTOPILOT — Phase {X}/{N} Complete ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Completed: {completed}/{total} phases | Learnings: {total_learnings} extracted
Next: Phase {X+1} — {Name}
```

**If `is_last_phase`:** Break loop, go to milestone complete.

</step>

<step name="milestone_complete">

**If all phases completed successfully (no skips):**

Display:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► AUTOPILOT COMPLETE — Milestone {version} ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

All {N} phases executed successfully.
Learnings extracted: {total}
```

Suggest: `Run /gsd:complete-milestone to archive and tag.`

**If some phases were skipped:**

Display:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► AUTOPILOT FINISHED — {completed}/{total} Phases
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Completed: {completed} | Skipped: {skipped}

Skipped phases:
  Phase {X}: {Name} — {reason}
  Phase {Y}: {Name} — {reason}

Review: cat .planning/autopilot-log.md
Fix gaps: /gsd:plan-phase {X} --gaps
```

Finalize autopilot log with summary footer:

```markdown

---

**Finished:** {timestamp}
**Duration:** {total_duration}
**Result:** {completed}/{total} phases completed, {skipped} skipped
**Learnings extracted:** {total_learnings}
```

</step>

</process>

<failure_handling>
- **Plan-phase fails:** Log reason, skip to next phase. Phase can be planned manually later.
- **Execute-phase fails:** Log reason and any partial progress. Phase can be resumed with `/gsd:execute-phase {N}`.
- **Learning extraction fails:** Non-blocking (exit 0). Log and continue.
- **Phase complete fails:** Log error. May need manual state fixup.
- **All phases skip:** Display full log and suggest manual intervention.
</failure_handling>

<context_efficiency>
Autopilot orchestrator stays lean (~10-15% context). Each plan-phase and execute-phase spawns as a fresh Task with full 200k context. Learning extraction runs as a bash script (no context cost). The loop itself is just state tracking and Task spawning.
</context_efficiency>
