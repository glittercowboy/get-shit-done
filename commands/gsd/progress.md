---
name: gsd:progress
description: Check project progress, show context, and route to next action (execute or plan)
arguments:
  - name: --full
    description: Show complete milestone tree with all phases, plans, and key decisions
    required: false
allowed-tools:
  - Read
  - Bash
  - Grep
  - Glob
  - SlashCommand
---

<objective>
Check project progress, summarize recent work and what's ahead, then intelligently route to the next action - either executing an existing plan or creating the next one.

Provides situational awareness before continuing work.

**With `--full` flag:** Additionally shows complete milestone tree with task-level detail and key decisions per phase — useful for recalling what was planned and decided across the entire milestone.
</objective>


<process>

<step name="parse_args">
**Parse arguments:**

Check if `--full` flag is present in the command arguments.

```
FULL_MODE = true if --full flag provided, otherwise false
```

Default behavior (no flag) remains unchanged. The `--full` flag adds expanded output after the standard report.
</step>

<step name="verify">
**Verify planning structure exists:**

If no `.planning/` directory:

```
No planning structure found.

Run /gsd:new-project to start a new project.
```

Exit.

If missing STATE.md or ROADMAP.md: inform what's missing, suggest running `/gsd:new-project`.
</step>

<step name="load">
**Load full project context:**

- Read `.planning/STATE.md` for living memory (position, decisions, issues)
- Read `.planning/ROADMAP.md` for phase structure and objectives
- Read `.planning/PROJECT.md` for current state (What This Is, Core Value, Requirements)
  </step>

<step name="recent">
**Gather recent work context:**

- Find the 2-3 most recent SUMMARY.md files
- Extract from each: what was accomplished, key decisions, any issues logged
- This shows "what we've been working on"
  </step>

<step name="position">
**Parse current position:**

- From STATE.md: current phase, plan number, status
- Calculate: total plans, completed plans, remaining plans
- Note any blockers, concerns, or deferred issues
- Check for CONTEXT.md: For phases without PLAN.md files, check if `{phase}-CONTEXT.md` exists in phase directory
- Count pending todos: `ls .planning/todos/pending/*.md 2>/dev/null | wc -l`
- Check for active debug sessions: `ls .planning/debug/*.md 2>/dev/null | grep -v resolved | wc -l`
  </step>

<step name="report">
**Present rich status report:**

```
# [Project Name]

**Progress:** [████████░░] 8/10 plans complete

## Recent Work
- [Phase X, Plan Y]: [what was accomplished - 1 line]
- [Phase X, Plan Z]: [what was accomplished - 1 line]

## Current Position
Phase [N] of [total]: [phase-name]
Plan [M] of [phase-total]: [status]
CONTEXT: [✓ if CONTEXT.md exists | - if not]

## Key Decisions Made
- [decision 1 from STATE.md]
- [decision 2]

## Open Issues
- [any deferred issues or blockers]

## Pending Todos
- [count] pending — /gsd:check-todos to review

## Active Debug Sessions
- [count] active — /gsd:debug to continue
(Only show this section if count > 0)

## What's Next
[Next phase/plan objective from ROADMAP]
```

</step>

<step name="full_tree" condition="FULL_MODE=true">
**Generate full milestone tree (only when --full flag provided):**

This step runs AFTER the standard report, providing expanded context for recall.

**1. Identify current milestone phases:**

Read ROADMAP.md and extract all phases in the current milestone section.

**2. For each phase, gather plan status:**

```bash
# For each phase directory in .planning/phases/
ls -1 .planning/phases/[phase-dir]/*-PLAN.md 2>/dev/null
ls -1 .planning/phases/[phase-dir]/*-SUMMARY.md 2>/dev/null
```

**3. Determine status for each plan:**

- `✓` = complete (matching SUMMARY.md exists)
- `→` = current (next plan to execute — first PLAN.md without SUMMARY.md)
- `○` = planned (PLAN.md exists, no SUMMARY.md yet)
- `(not yet planned)` = phase has no PLAN.md files

**4. Extract key decisions:**

For each completed plan (has SUMMARY.md):
- Read SUMMARY.md frontmatter for `key-decisions` field
- If present, take first decision (most important)
- If absent, check STATE.md Decisions table for that phase
- Show max 1 decision per plan to keep output scannable

**5. Output format:**

```
## Full Milestone Tree

Phase 70: Database Schema [DONE]
├─ 70-01: Core tables ✓
├─ 70-02: Indexes ✓
└─ 70-03: Migrations ✓

Phase 71: API Layer [DONE]
├─ 71-01: Auth endpoints ✓
│  └─ Decision: JWT with refresh rotation
├─ 71-02: User CRUD ✓
└─ 71-03: Rate limiting ✓

Phase 72: Frontend [IN PROGRESS]
├─ 72-01: Login form ✓
├─ 72-02: Dashboard → CURRENT
└─ 72-03: Settings ○

Phase 73: Testing [PLANNED]
└─ (not yet planned)

## Milestone Summary
- **Phases:** 2 of 4 complete
- **Plans:** 8 of 12 complete
- **Decisions logged:** 5
```

**Phase status labels:**
- `[DONE]` = all plans have SUMMARY.md
- `[IN PROGRESS]` = some plans complete, some remaining
- `[PLANNED]` = no plans executed yet (or no plans created)

**Tree formatting:**
- Use `├─` for non-last items, `└─` for last item in each phase
- Use `│` for vertical continuation when showing decisions
- Indent decisions under their parent plan

**Statistics calculation:**
- Count phases: done = all plans have summaries, total = all phases in milestone
- Count plans: completed = SUMMARY.md count, total = PLAN.md count across all phases
- Count decisions: from SUMMARY.md frontmatter `key-decisions` arrays

</step>

<step name="route">
**Determine next action based on verified counts.**

**Step 1: Count plans, summaries, and issues in current phase**

List files in the current phase directory:

```bash
ls -1 .planning/phases/[current-phase-dir]/*-PLAN.md 2>/dev/null | wc -l
ls -1 .planning/phases/[current-phase-dir]/*-SUMMARY.md 2>/dev/null | wc -l
ls -1 .planning/phases/[current-phase-dir]/*-ISSUES.md 2>/dev/null | wc -l
ls -1 .planning/phases/[current-phase-dir]/*-FIX.md 2>/dev/null | wc -l
ls -1 .planning/phases/[current-phase-dir]/*-FIX-SUMMARY.md 2>/dev/null | wc -l
```

State: "This phase has {X} plans, {Y} summaries, {Z} issues files, {W} fix plans."

**Step 1.5: Check for unaddressed UAT issues**

For each *-ISSUES.md file, check if matching *-FIX.md exists.
For each *-FIX.md file, check if matching *-FIX-SUMMARY.md exists.

Track:
- `issues_without_fix`: ISSUES.md files without FIX.md
- `fixes_without_summary`: FIX.md files without FIX-SUMMARY.md

**Step 2: Route based on counts**

| Condition | Meaning | Action |
|-----------|---------|--------|
| fixes_without_summary > 0 | Unexecuted fix plans exist | Go to **Route A** (with FIX.md) |
| issues_without_fix > 0 | UAT issues need fix plans | Go to **Route E** |
| summaries < plans | Unexecuted plans exist | Go to **Route A** |
| summaries = plans AND plans > 0 | Phase complete | Go to Step 3 |
| plans = 0 | Phase not yet planned | Go to **Route B** |

---

**Route A: Unexecuted plan exists**

Find the first PLAN.md without matching SUMMARY.md.
Read its `<objective>` section.

```
---

## ▶ Next Up

**{phase}-{plan}: [Plan Name]** — [objective summary from PLAN.md]

`/gsd:execute-plan [full-path-to-PLAN.md]`

<sub>`/clear` first → fresh context window</sub>

---
```

---

**Route B: Phase needs planning**

Check if `{phase}-CONTEXT.md` exists in phase directory.

**If CONTEXT.md exists:**

```
---

## ▶ Next Up

**Phase {N}: {Name}** — {Goal from ROADMAP.md}
<sub>✓ Context gathered, ready to plan</sub>

`/gsd:plan-phase {phase-number}`

<sub>`/clear` first → fresh context window</sub>

---
```

**If CONTEXT.md does NOT exist:**

```
---

## ▶ Next Up

**Phase {N}: {Name}** — {Goal from ROADMAP.md}

`/gsd:plan-phase {phase}`

<sub>`/clear` first → fresh context window</sub>

---

**Also available:**
- `/gsd:discuss-phase {phase}` — gather context first
- `/gsd:research-phase {phase}` — investigate unknowns
- `/gsd:list-phase-assumptions {phase}` — see Claude's assumptions

---
```

---

**Route E: UAT issues need fix plans**

ISSUES.md exists without matching FIX.md. User needs to plan fixes.

```
---

## ⚠ UAT Issues Found

**{plan}-ISSUES.md** has {N} issues without a fix plan.

`/gsd:plan-fix {plan}`

<sub>`/clear` first → fresh context window</sub>

---

**Also available:**
- `/gsd:execute-plan [path]` — continue with other work first
- `/gsd:verify-work {phase}` — run more UAT testing

---
```

---

**Step 3: Check milestone status (only when phase complete)**

Read ROADMAP.md and identify:
1. Current phase number
2. All phase numbers in the current milestone section

Count total phases and identify the highest phase number.

State: "Current phase is {X}. Milestone has {N} phases (highest: {Y})."

**Route based on milestone status:**

| Condition | Meaning | Action |
|-----------|---------|--------|
| current phase < highest phase | More phases remain | Go to **Route C** |
| current phase = highest phase | Milestone complete | Go to **Route D** |

---

**Route C: Phase complete, more phases remain**

Read ROADMAP.md to get the next phase's name and goal.

```
---

## ✓ Phase {Z} Complete

## ▶ Next Up

**Phase {Z+1}: {Name}** — {Goal from ROADMAP.md}

`/gsd:plan-phase {Z+1}`

<sub>`/clear` first → fresh context window</sub>

---

**Also available:**
- `/gsd:verify-work {Z}` — user acceptance test before continuing
- `/gsd:discuss-phase {Z+1}` — gather context first
- `/gsd:research-phase {Z+1}` — investigate unknowns

---
```

---

**Route D: Milestone complete**

```
---

## 🎉 Milestone Complete

All {N} phases finished!

## ▶ Next Up

**Complete Milestone** — archive and prepare for next

`/gsd:complete-milestone`

<sub>`/clear` first → fresh context window</sub>

---

**Also available:**
- `/gsd:verify-work` — user acceptance test before completing milestone

---
```

</step>

<step name="edge_cases">
**Handle edge cases:**

- Phase complete but next phase not planned → offer `/gsd:plan-phase [next]`
- All work complete → offer milestone completion
- Blockers present → highlight before offering to continue
- Handoff file exists → mention it, offer `/gsd:resume-work`
  </step>

</process>

<success_criteria>

**Standard mode (default):**
- [ ] Rich context provided (recent work, decisions, issues)
- [ ] Current position clear with visual progress
- [ ] What's next clearly explained
- [ ] Smart routing: /gsd:execute-plan if plan exists, /gsd:plan-phase if not
- [ ] User confirms before any action
- [ ] Seamless handoff to appropriate gsd command

**Full mode (--full flag):**
- [ ] All standard mode criteria met
- [ ] Tree shows all phases in current milestone
- [ ] Each phase shows all plans with correct status indicator (✓ → ○)
- [ ] Key decisions extracted from completed plan summaries
- [ ] Milestone statistics accurate (phases, plans, decisions)
- [ ] Output renders correctly in terminal
      </success_criteria>
