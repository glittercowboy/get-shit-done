<purpose>
Core execution loop for GSD plans. Always loaded by executor agents.
</purpose>

<required_reading>
Read STATE.md before any operation to load project context.
Read config.json for planning behavior settings.
</required_reading>

<process>

<step name="resolve_model_profile" priority="first">
Read model profile for agent spawning:

```bash
MODEL_PROFILE=$(cat .planning/config.json 2>/dev/null | grep -o '"model_profile"[[:space:]]*:[[:space:]]*"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"' || echo "balanced")
```

Default to "balanced" if not set.

**Model lookup table:**

| Agent | quality | balanced | budget |
|-------|---------|----------|--------|
| gsd-executor | opus | sonnet | sonnet |

Store resolved model for use in Task calls below.
</step>

<step name="load_project_state">
Before any operation, read project state:

```bash
cat .planning/STATE.md 2>/dev/null
```

**If file exists:** Parse and internalize:

- Current position (phase, plan, status)
- Accumulated decisions (constraints on this execution)
- Blockers/concerns (things to watch for)
- Brief alignment status

**If file missing but .planning/ exists:**

```
STATE.md missing but planning artifacts exist.
Options:
1. Reconstruct from existing artifacts
2. Continue without project state (may lose accumulated context)
```

**If .planning/ doesn't exist:** Error - project not initialized.

This ensures every execution has full project context.

**Load planning config:**

```bash
# Check if planning docs should be committed (default: true)
COMMIT_PLANNING_DOCS=$(cat .planning/config.json 2>/dev/null | grep -o '"commit_docs"[[:space:]]*:[[:space:]]*[^,}]*' | grep -o 'true\|false' || echo "true")
# Auto-detect gitignored (overrides config)
git check-ignore -q .planning 2>/dev/null && COMMIT_PLANNING_DOCS=false
```

Store `COMMIT_PLANNING_DOCS` for use in git operations.
</step>

<step name="identify_plan">
Find the next plan to execute:
- Check roadmap for "In progress" phase
- Find plans in that phase directory
- Identify first plan without corresponding SUMMARY

```bash
cat .planning/ROADMAP.md
# Look for phase with "In progress" status
# Then find plans in that phase
ls .planning/phases/XX-name/*-PLAN.md 2>/dev/null | sort
ls .planning/phases/XX-name/*-SUMMARY.md 2>/dev/null | sort
```

**Logic:**

- If `01-01-PLAN.md` exists but `01-01-SUMMARY.md` doesn't → execute 01-01
- If `01-01-SUMMARY.md` exists but `01-02-SUMMARY.md` doesn't → execute 01-02
- Pattern: Find first PLAN file without matching SUMMARY file

**Decimal phase handling:**

Phase directories can be integer or decimal format:

- Integer: `.planning/phases/01-foundation/01-01-PLAN.md`
- Decimal: `.planning/phases/01.1-hotfix/01.1-01-PLAN.md`

Parse phase number from path (handles both formats):

```bash
# Extract phase number (handles XX or XX.Y format)
PHASE=$(echo "$PLAN_PATH" | grep -oE '[0-9]+(\.[0-9]+)?-[0-9]+')
```

SUMMARY naming follows same pattern:

- Integer: `01-01-SUMMARY.md`
- Decimal: `01.1-01-SUMMARY.md`

Confirm with user if ambiguous.

<config-check>
```bash
cat .planning/config.json 2>/dev/null
```
</config-check>

<if mode="yolo">
```
Auto-approved: Execute {phase}-{plan}-PLAN.md
[Plan X of Y for Phase Z]

Starting execution...
```

Proceed directly to parse_segments step.
</if>

<if mode="interactive" OR="custom with gates.execute_next_plan true">
Present:

```
Found plan to execute: {phase}-{plan}-PLAN.md
[Plan X of Y for Phase Z]

Proceed with execution?
```

Wait for confirmation before proceeding.
</if>
</step>

<step name="record_start_time">
Record execution start time for performance tracking:

```bash
PLAN_START_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
PLAN_START_EPOCH=$(date +%s)
```

Store in shell variables for duration calculation at completion.
</step>

<step name="load_prompt">
Read the plan prompt:
```bash
cat .planning/phases/XX-name/{phase}-{plan}-PLAN.md
```

This IS the execution instructions. Follow it exactly.

**If plan references CONTEXT.md:**
The CONTEXT.md file provides the user's vision for this phase — how they imagine it working, what's essential, and what's out of scope. Honor this context throughout execution.
</step>

<step name="previous_phase_check">
Before executing, check if previous phase had issues:

```bash
# Find previous phase summary
ls .planning/phases/*/SUMMARY.md 2>/dev/null | sort -r | head -2 | tail -1
```

If previous phase SUMMARY.md has "Issues Encountered" != "None" or "Next Phase Readiness" mentions blockers:

Use AskUserQuestion:

- header: "Previous Issues"
- question: "Previous phase had unresolved items: [summary]. How to proceed?"
- options:
  - "Proceed anyway" - Issues won't block this phase
  - "Address first" - Let's resolve before continuing
  - "Review previous" - Show me the full summary
</step>

<step name="execute">
Execute each task in the prompt. **Deviations are normal** - handle them automatically using deviation rules.

1. Read the @context files listed in the prompt

2. For each task:

   **If `type="auto"`:**

   **Before executing:** Check if task has `tdd="true"` attribute:
   - If yes: Follow TDD execution flow (RED -> GREEN -> REFACTOR cycle)
   - If no: Standard implementation

   - Work toward task completion
   - **If CLI/API returns authentication error:** Handle as authentication gate
   - **When you discover additional work not in plan:** Apply deviation rules automatically
   - Continue implementing, applying rules as needed
   - Run the verification
   - Confirm done criteria met
   - **Commit the task** (see commit rules)
   - Track task completion and commit hash for Summary documentation
   - Continue to next task

   **If `type="checkpoint:*"`:**

   - STOP immediately (do not continue to next task)
   - Execute checkpoint protocol
   - Wait for user response
   - Verify if possible (check files, env vars, etc.)
   - Only after user confirmation: continue to next task

3. Run overall verification checks from `<verification>` section
4. Confirm all success criteria from `<success_criteria>` section met
5. Document all deviations in Summary
</step>

<step name="verification_failure_gate">
If any task verification fails:

STOP. Do not continue to next task.

Present inline:
"Verification failed for Task [X]: [task name]

Expected: [verification criteria]
Actual: [what happened]

How to proceed?

1. Retry - Try the task again
2. Skip - Mark as incomplete, continue
3. Stop - Pause execution, investigate"

Wait for user decision.

If user chose "Skip", note it in SUMMARY.md under "Issues Encountered".
</step>

<step name="record_completion_time">
Record execution end time and calculate duration:

```bash
PLAN_END_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
PLAN_END_EPOCH=$(date +%s)

DURATION_SEC=$(( PLAN_END_EPOCH - PLAN_START_EPOCH ))
DURATION_MIN=$(( DURATION_SEC / 60 ))

if [[ $DURATION_MIN -ge 60 ]]; then
  HRS=$(( DURATION_MIN / 60 ))
  MIN=$(( DURATION_MIN % 60 ))
  DURATION="${HRS}h ${MIN}m"
else
  DURATION="${DURATION_MIN} min"
fi
```

Pass timing data to SUMMARY.md creation.
</step>

<step name="create_summary">
Create `{phase}-{plan}-SUMMARY.md` as specified in the prompt's `<output>` section.
Use ~/.claude/get-shit-done/templates/summary.md for structure.

**File location:** `.planning/phases/XX-name/{phase}-{plan}-SUMMARY.md`

**Frontmatter population:**

Before writing summary content, populate frontmatter fields from execution context:

1. **Basic identification:**
   - phase: From PLAN.md frontmatter
   - plan: From PLAN.md frontmatter
   - subsystem: Categorize based on phase focus (auth, payments, ui, api, database, infra, testing, etc.)
   - tags: Extract tech keywords (libraries, frameworks, tools used)

2. **Dependency graph:**
   - requires: List prior phases this built upon (check PLAN.md context section for referenced prior summaries)
   - provides: Extract from accomplishments - what was delivered
   - affects: Infer from phase description/goal what future phases might need this

3. **Tech tracking:**
   - tech-stack.added: New libraries from package.json changes or requirements
   - tech-stack.patterns: Architectural patterns established (from decisions/accomplishments)

4. **File tracking:**
   - key-files.created: From "Files Created/Modified" section
   - key-files.modified: From "Files Created/Modified" section

5. **Decisions:**
   - key-decisions: Extract from "Decisions Made" section

6. **Metrics:**
   - duration: From $DURATION variable
   - completed: From $PLAN_END_TIME (date only, format YYYY-MM-DD)

Note: If subsystem/affects are unclear, use best judgment based on phase name and accomplishments.

**Title format:** `# Phase [X] Plan [Y]: [Name] Summary`

The one-liner must be SUBSTANTIVE:

- Good: "JWT auth with refresh rotation using jose library"
- Bad: "Authentication implemented"

**Include performance data:**

- Duration: `$DURATION`
- Started: `$PLAN_START_TIME`
- Completed: `$PLAN_END_TIME`
- Tasks completed: (count from execution)
- Files modified: (count from execution)

**Next Step section:**

- If more plans exist in this phase: "Ready for {phase}-{next-plan}-PLAN.md"
- If this is the last plan: "Phase complete, ready for transition"
</step>

<step name="update_current_position">
**If `<parallel_context>` in prompt:** Skip this step. Include a "State Fragment" section in SUMMARY.md instead. Orchestrator consolidates state after wave.

Update Current Position section in STATE.md to reflect plan completion.

**Format:**

```markdown
Phase: [current] of [total] ([phase name])
Plan: [just completed] of [total in phase]
Status: [In progress / Phase complete]
Last activity: [today] - Completed {phase}-{plan}-PLAN.md

Progress: [progress bar]
```

**Calculate progress bar:**

- Count total plans across all phases (from ROADMAP.md)
- Count completed plans (count SUMMARY.md files that exist)
- Progress = (completed / total) x 100%
- Render: (empty) for incomplete, (filled) for complete
</step>

<step name="extract_decisions_and_issues">
**If `<parallel_context>` in prompt:** Skip this step. Decisions and issues go in SUMMARY.md's "State Fragment" section.

Extract decisions, issues, and concerns from SUMMARY.md into STATE.md accumulated context.

**Decisions Made:**

- Read SUMMARY.md "## Decisions Made" section
- If content exists (not "None"):
  - Add each decision to STATE.md Decisions table
  - Format: `| [phase number] | [decision summary] | [rationale] |`

**Blockers/Concerns:**

- Read SUMMARY.md "## Next Phase Readiness" section
- If contains blockers or concerns:
  - Add to STATE.md "Blockers/Concerns Carried Forward"
</step>

<step name="update_session_continuity">
**If `<parallel_context>` in prompt:** Skip this step. Orchestrator updates session continuity after wave.

Update Session Continuity section in STATE.md to enable resumption in future sessions.

**Format:**

```markdown
Last session: [current date and time]
Stopped at: Completed {phase}-{plan}-PLAN.md
Resume file: [path to .continue-here if exists, else "None"]
```

**Size constraint note:** Keep STATE.md under 150 lines total.
</step>

<step name="issues_review_gate">
Before proceeding, check SUMMARY.md content.

If "Issues Encountered" is NOT "None":

<if mode="yolo">
```
Auto-approved: Issues acknowledgment
Note: Issues were encountered during execution:
- [Issue 1]
- [Issue 2]
(Logged - continuing in yolo mode)
```

Continue without waiting.
</if>

<if mode="interactive" OR="custom with gates.issues_review true">
Present issues and wait for acknowledgment before proceeding.
</if>
</step>

<step name="update_roadmap">
Update the roadmap file:

```bash
ROADMAP_FILE=".planning/ROADMAP.md"
```

**If more plans remain in this phase:**

- Update plan count: "2/3 plans complete"
- Keep phase status as "In progress"

**If this was the last plan in the phase:**

- Mark phase complete: status -> "Complete"
- Add completion date
</step>

<step name="offer_next">
**MANDATORY: Verify remaining work before presenting next steps.**

Do NOT skip this verification. Do NOT assume phase or milestone completion without checking.

**Step 1: Count plans and summaries in current phase**

List files in the phase directory:

```bash
ls -1 .planning/phases/[current-phase-dir]/*-PLAN.md 2>/dev/null | wc -l
ls -1 .planning/phases/[current-phase-dir]/*-SUMMARY.md 2>/dev/null | wc -l
```

State the counts: "This phase has [X] plans and [Y] summaries."

**Step 2: Route based on plan completion**

Compare the counts from Step 1:

| Condition | Meaning | Action |
|-----------|---------|--------|
| summaries < plans | More plans remain | Go to **Route A** |
| summaries = plans | Phase complete | Go to Step 3 |

---

**Route A: More plans remain in this phase**

Identify the next unexecuted plan:
- Find the first PLAN.md file that has no matching SUMMARY.md
- Read its `<objective>` section

<if mode="yolo">
```
Plan {phase}-{plan} complete.
Summary: .planning/phases/{phase-dir}/{phase}-{plan}-SUMMARY.md

{Y} of {X} plans complete for Phase {Z}.

Auto-continuing: Execute next plan ({phase}-{next-plan})
```

Loop back to identify_plan step automatically.
</if>

<if mode="interactive" OR="custom with gates.execute_next_plan true">
```
Plan {phase}-{plan} complete.
Summary: .planning/phases/{phase-dir}/{phase}-{plan}-SUMMARY.md

{Y} of {X} plans complete for Phase {Z}.

---

## Next Up

**{phase}-{next-plan}: [Plan Name]** -- [objective from next PLAN.md]

`/gsd:execute-phase {phase}`

<sub>`/clear` first -> fresh context window</sub>

---

**Also available:**
- `/gsd:verify-work {phase}-{plan}` -- manual acceptance testing before continuing
- Review what was built before continuing

---
```

Wait for user to clear and run next command.
</if>

**STOP here if Route A applies. Do not continue to Step 3.**

---

**Step 3: Check milestone status (only when all plans in phase are complete)**

Read ROADMAP.md and extract:
1. Current phase number (from the plan just completed)
2. All phase numbers listed in the current milestone section

To find phases in the current milestone, look for:
- Phase headers: lines starting with `### Phase` or `#### Phase`
- Phase list items: lines like `- [ ] **Phase X:` or `- [x] **Phase X:`

Count total phases in the current milestone and identify the highest phase number.

State: "Current phase is {X}. Milestone has {N} phases (highest: {Y})."

**Step 4: Route based on milestone status**

| Condition | Meaning | Action |
|-----------|---------|--------|
| current phase < highest phase | More phases remain | Go to **Route B** |
| current phase = highest phase | Milestone complete | Go to **Route C** |

---

**Route B: Phase complete, more phases remain in milestone**

Read ROADMAP.md to get the next phase's name and goal.

```
Plan {phase}-{plan} complete.
Summary: .planning/phases/{phase-dir}/{phase}-{plan}-SUMMARY.md

## Phase {Z}: {Phase Name} Complete

All {Y} plans finished.

---

## Next Up

**Phase {Z+1}: {Next Phase Name}** -- {Goal from ROADMAP.md}

`/gsd:plan-phase {Z+1}`

<sub>`/clear` first -> fresh context window</sub>

---

**Also available:**
- `/gsd:verify-work {Z}` -- manual acceptance testing before continuing
- `/gsd:discuss-phase {Z+1}` -- gather context first
- Review phase accomplishments before continuing

---
```

---

**Route C: Milestone complete (all phases done)**

```
MILESTONE COMPLETE!

Plan {phase}-{plan} complete.
Summary: .planning/phases/{phase-dir}/{phase}-{plan}-SUMMARY.md

## Phase {Z}: {Phase Name} Complete

All {Y} plans finished.

All {N} phases complete! Milestone is 100% done.

---

## Next Up

**Complete Milestone** -- archive and prepare for next

`/gsd:complete-milestone`

<sub>`/clear` first -> fresh context window</sub>

---

**Also available:**
- `/gsd:verify-work` -- manual acceptance testing before completing milestone
- `/gsd:add-phase <description>` -- add another phase before completing
- Review accomplishments before archiving

---
```

</step>

</process>

<success_criteria>

- All tasks from PLAN.md completed
- All verifications pass
- SUMMARY.md created with substantive content
- STATE.md updated (position, decisions, issues, session)
- ROADMAP.md updated
</success_criteria>
