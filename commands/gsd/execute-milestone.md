---
name: gsd:execute-milestone
description: Execute all phases in the current milestone sequentially
argument-hint: "[--from <phase>] [--auto]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - Task
  - AskUserQuestion
---

<objective>
Execute all phases in the current milestone one by one automatically.

For each phase:
1. Check if plans exist (if not, prompt to plan first)
2. Execute all plans via /gsd:execute-phase
3. Verify phase completion
4. Prompt user to continue or pause (unless --auto)
5. Proceed to next phase

This is a convenience wrapper that chains execute-phase calls, handling the /clear recommendation between phases automatically.
</objective>

<context>
Flags: $ARGUMENTS

- `--from <phase>` — Start from a specific phase number (skip earlier completed phases)
- `--auto` — Don't pause between phases (fully autonomous execution)

@.planning/ROADMAP.md
@.planning/STATE.md
</context>

<process>

## Step 0: Resolve Model Profile

```bash
MODEL_PROFILE=$(cat .planning/config.json 2>/dev/null | grep -o '"model_profile"[[:space:]]*:[[:space:]]*"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"' || echo "balanced")
```

## Step 1: Parse Milestone Phases

Extract all phases from ROADMAP.md:

```bash
# Get all phase lines
grep -E "^## Phase [0-9]+" .planning/ROADMAP.md
```

Parse each phase:
- Phase number
- Phase name
- Status (from ROADMAP.md indicators or SUMMARY.md existence)

Build ordered list of phases.

## Step 2: Determine Starting Point

**If `--from <phase>` specified:**
- Start from that phase number
- Skip all phases before it

**Otherwise:**
- Find first incomplete phase (no SUMMARY.md for all plans, or no plans yet)
- Start from there

**If all phases complete:**
```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► MILESTONE ALREADY COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

All {N} phases have been executed and verified.

**Next steps:**
- `/gsd:audit-milestone` — verify requirements and integration
- `/gsd:complete-milestone` — archive and start next version
```
STOP here.

## Step 3: Present Execution Plan

Show what will be executed:

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► EXECUTE MILESTONE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Phases to execute:**

| # | Phase | Plans | Status |
|---|-------|-------|--------|
| {N} | {Name} | {X} plans | Ready |
| {N+1} | {Name} | {X} plans | Ready |
| {N+2} | {Name} | 0 plans | Needs planning |
...

**Mode:** {Sequential | Autonomous (--auto)}

[If any phase needs planning:]
⚠️  Phase {X} has no plans. Will pause to plan before executing.
```

**If not --auto, confirm:**

Use AskUserQuestion:
- Question: "Start executing {N} phases?"
- Options:
  - "Yes, start execution"
  - "No, cancel"

## Step 4: Execute Phase Loop

For each phase in order:

### 4a. Check Phase Readiness

```bash
# Check for plans
ls .planning/phases/{phase_dir}/*-PLAN.md 2>/dev/null | wc -l
```

**If no plans exist:**
```markdown
───────────────────────────────────────────────────────────────
## Phase {N}: {Name} — Needs Planning
───────────────────────────────────────────────────────────────

This phase has no plans yet.

**Required:** Run `/gsd:plan-phase {N}` first.
```

Use AskUserQuestion:
- Question: "Phase {N} needs planning. What would you like to do?"
- Options:
  - "Plan now (spawn planner)"
  - "Skip this phase"
  - "Stop milestone execution"

**If plan now:** Spawn gsd-planner, then continue to execution.
**If skip:** Move to next phase.
**If stop:** End milestone execution.

### 4b. Execute Phase

Show phase header:

```markdown
───────────────────────────────────────────────────────────────
## Executing Phase {N}: {Name}
───────────────────────────────────────────────────────────────

{X} plans to execute
```

Execute using the execute-phase workflow:

```bash
# Read all required context
ROADMAP=$(cat .planning/ROADMAP.md)
STATE=$(cat .planning/STATE.md)
```

Spawn orchestration for this phase (delegate to execute-phase logic):
- Discover plans
- Group by wave
- Execute waves in parallel
- Verify phase goal
- Update roadmap and state

### 4c. Handle Phase Result

**If phase passed:**
```markdown
✓ Phase {N}: {Name} — Complete

{X} plans executed, goal verified.
```

**If gaps found:**
```markdown
⚠️ Phase {N}: {Name} — Gaps Found

Score: {X}/{Y} must-haves verified
See: .planning/phases/{phase_dir}/{phase}-VERIFICATION.md
```

Use AskUserQuestion:
- Question: "Phase {N} has gaps. What would you like to do?"
- Options:
  - "Plan gap closure and continue"
  - "Skip gaps, continue to next phase"
  - "Stop milestone execution"

**If plan gap closure:**
- Spawn planner with --gaps flag
- Execute gap closure plans
- Re-verify
- Continue loop

**If human_needed:**
- Present checklist items
- Get user confirmation
- Continue or stop based on response

### 4d. Pause Between Phases (unless --auto)

**If not --auto and more phases remain:**

```markdown
───────────────────────────────────────────────────────────────
## Phase {N} Complete — {M} phases remaining
───────────────────────────────────────────────────────────────

**Next:** Phase {N+1}: {Name}
```

Use AskUserQuestion:
- Question: "Continue to next phase?"
- Options:
  - "Yes, continue"
  - "Pause here (resume later with /gsd:execute-milestone --from {N+1})"

**If pause:** End execution, show resume command.

## Step 5: Milestone Complete

After all phases executed:

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► MILESTONE COMPLETE 🎉
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**{N} phases executed**

| Phase | Status |
|-------|--------|
| 1. {Name} | ✓ Complete |
| 2. {Name} | ✓ Complete |
| 3. {Name} | ✓ Complete |
...

───────────────────────────────────────────────────────────────

## ▶ Next Up

**Audit milestone** — verify requirements, integration, E2E flows

`/gsd:audit-milestone`

<sub>`/clear` first → fresh context window</sub>

───────────────────────────────────────────────────────────────

**Also available:**
- `/gsd:verify-work` — manual acceptance testing
- `/gsd:complete-milestone` — skip audit, archive directly

───────────────────────────────────────────────────────────────
```

</process>

<context_management>
**Between phases:**

This command handles context automatically by:
1. Spawning fresh subagents for each phase (via gsd-executor)
2. Keeping orchestrator context lean (just tracking progress)
3. Subagents get fresh 200k context each

**The /clear recommendation between phases is handled internally** — each phase execution uses fresh subagent context.

**For very large milestones (10+ phases):**
- Consider running in batches: `--from 1` through `--from 5`, then `--from 6` through `--from 10`
- Or use `--auto` for fully autonomous execution
</context_management>

<recovery>
**If execution is interrupted:**

Resume with:
```bash
/gsd:execute-milestone --from {last_incomplete_phase}
```

The command will:
1. Skip already-completed phases (those with all SUMMARYs)
2. Resume from the specified phase
3. Continue through remaining phases

**Checking progress:**
```bash
/gsd:progress
```
Shows current phase status and what's remaining.
</recovery>

<success_criteria>
- [ ] All phases in milestone identified
- [ ] Incomplete phases executed in order
- [ ] Each phase verified before proceeding
- [ ] Gaps handled (plan closure or skip)
- [ ] User prompted between phases (unless --auto)
- [ ] Milestone completion reported
- [ ] Next steps offered (audit or complete)
</success_criteria>
