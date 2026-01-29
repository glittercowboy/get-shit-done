---
name: gsd:plan-phase
description: Create detailed execution plan for a phase (PLAN.md) with verification loop
argument-hint: "[phase] [--research] [--skip-research] [--gaps] [--skip-verify]"
agent: gsd-planner
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - Task
  - WebFetch
  - mcp__context7__*
---

<execution_context>
@~/.claude/get-shit-done/references/ui-brand.md
</execution_context>

<objective>
Create executable phase prompts (PLAN.md files) for a roadmap phase with integrated research and verification.

**Default flow:** Research (if needed) → Plan → Verify → Done

**Orchestrator role:** Parse arguments, validate phase, research domain (unless skipped or exists), spawn gsd-planner agent, verify plans with gsd-plan-checker, iterate until plans pass or max iterations reached, present results.

**Why subagents:** Research and planning burn context fast. Verification uses fresh context. User sees the flow between agents in main context.
</objective>

<context>
Phase number: $ARGUMENTS (optional - auto-detects next unplanned phase if not provided)

**Flags:**
- `--research` — Force re-research even if RESEARCH.md exists
- `--skip-research` — Skip research entirely, go straight to planning
- `--gaps` — Gap closure mode (reads VERIFICATION.md, skips research)
- `--skip-verify` — Skip planner → checker verification loop

Normalize phase input in step 2 before any directory lookups.
</context>

<process>

## 1. Validate Environment and Resolve Model Profile

```bash
ls .planning/ 2>/dev/null
```

**If not found:** Error - user should run `/gsd:new-project` first.

**Resolve model profile for agent spawning:**

```bash
MODEL_PROFILE=$(cat .planning/config.json 2>/dev/null | grep -o '"model_profile"[[:space:]]*:[[:space:]]*"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"' || echo "balanced")
```

Default to "balanced" if not set.

**Model lookup table:**

| Agent | quality | balanced | budget |
|-------|---------|----------|--------|
| gsd-phase-researcher | opus | sonnet | haiku |
| gsd-planner | opus | opus | sonnet |
| gsd-plan-checker | sonnet | sonnet | haiku |

Store resolved models for use in Task calls below.

## 1.5 Check Session Continuity (CRITICAL)

**Before any planning, check STATE.md for current context and warnings:**

```bash
# Parse YAML frontmatter from STATE.md
NEXT_ACTION=$(grep "^next_action:" .planning/STATE.md 2>/dev/null | sed 's/next_action: //')
LAST_CHECKPOINT=$(grep "^last_checkpoint:" .planning/STATE.md 2>/dev/null | sed 's/last_checkpoint: //')
CURRENT_PHASE_DIR=$(grep "^current_phase_dir:" .planning/STATE.md 2>/dev/null | sed 's/current_phase_dir: //')

# Fallback: Parse Session Continuity section if no frontmatter
if [ -z "$NEXT_ACTION" ]; then
  NEXT_ACTION=$(grep "^Next step:" .planning/STATE.md 2>/dev/null | sed 's/Next step: //')
fi

# Check for .continue-here files in any phase
CONTINUE_FILES=$(ls .planning/phases/*/.continue-here*.md 2>/dev/null)
```

**If .continue-here file exists:**
- Read the file to understand current state
- Extract `<remaining_work>` section for scope context
- Display warning:
  ```
  ⚠️ ACTIVE CHECKPOINT FOUND:
      [path to .continue-here.md]

  This file contains important context about incomplete work.
  Reading it now...
  ```
- Read and display key sections (`<current_state>`, `<remaining_work>`, `<next_action>`)

**If requested phase differs from NEXT_ACTION:**
- Display warning:
  ```
  ⚠️ STATE.md suggests: [NEXT_ACTION]
     But you requested: [PHASE]

  This may skip important context from previous session.
  ```
- Ask user to confirm: "Proceed anyway? [y/N]"

**If CURRENT_PHASE_DIR exists and differs from requested phase directory:**
- Check if old directory has incomplete plans (PLAN without SUMMARY)
- Warn about potential orphaned work

## 1.6 Check for Scope Conflicts (DEFER LOGIC)

**After parsing phase, check if directory exists with different scope:**

```bash
# Check for existing phase directory (both new and legacy format)
EXISTING_DIR=$(ls -d .planning/phases/${PHASE}/ 2>/dev/null || ls -d .planning/phases/${PHASE}-* 2>/dev/null | head -1)

if [ -n "$EXISTING_DIR" ]; then
  # Get existing scope from SCOPE.md or directory name
  if [ -f "${EXISTING_DIR}/SCOPE.md" ]; then
    EXISTING_SCOPE=$(grep "^**Goal:**" "${EXISTING_DIR}/SCOPE.md" | sed 's/\*\*Goal:\*\* //')
  else
    # Legacy: extract from directory name
    EXISTING_SCOPE=$(basename "$EXISTING_DIR" | sed "s/${PHASE}-//")
  fi

  # Get requested scope from ROADMAP
  ROADMAP_GOAL=$(grep -A3 "Phase ${PHASE}:" .planning/ROADMAP.md | grep -E "Goal:|goal:" | head -1 | sed 's/.*[Gg]oal: //')

  # Check for existing plans
  EXISTING_PLANS=$(ls "${EXISTING_DIR}"/*-PLAN.md 2>/dev/null | wc -l)
fi
```

**If scope conflict detected (existing scope ≠ roadmap goal AND plans exist):**

Display conflict resolution options:

```
╔══════════════════════════════════════════════════════════════╗
║  SCOPE CONFLICT: Phase ${PHASE}                              ║
╚══════════════════════════════════════════════════════════════╝

Existing directory: ${EXISTING_DIR}
Existing scope: ${EXISTING_SCOPE}
Existing plans: ${EXISTING_PLANS} plan(s)

Requested scope: ${ROADMAP_GOAL}

┌─────────────────────────────────────────────────────────────┐
│ [1] Redefine scope (keep directory, update SCOPE.md)        │
│     → Existing plans will be reviewed/replaced              │
│                                                             │
│ [2] Defer existing to Phase ${NEXT_PHASE} (RECOMMENDED)     │
│     → Moves existing plans to Phase ${NEXT_PHASE}           │
│     → Creates fresh Phase ${PHASE} for new scope            │
│                                                             │
│ [3] Archive existing (move to _deferred/)                   │
│     → Preserves plans but removes from active phases        │
│                                                             │
│ [4] Cancel (review situation first)                         │
└─────────────────────────────────────────────────────────────┘
```

Use AskUserQuestion tool to get user choice.

**If user chooses [2] Defer:**

Execute defer operation:

```bash
# Calculate next available phase number
NEXT_PHASE="${PHASE}+1"  # Or find next gap in numbering

# 1. Rename directory
NEW_DIR=".planning/phases/${NEXT_PHASE}"
mv "${EXISTING_DIR}" "${NEW_DIR}"
echo "✓ Moved ${EXISTING_DIR} → ${NEW_DIR}"

# 2. Rename all files within directory
cd "${NEW_DIR}"
for f in *${PHASE}*; do
  NEW_NAME="${f//${PHASE}/${NEXT_PHASE}}"
  mv "$f" "$NEW_NAME"
  echo "  Renamed: $f → $NEW_NAME"
done

# 3. Update frontmatter references in all .md files
for f in *.md; do
  sed -i "s/phase: .*${PHASE}/phase: ${NEXT_PHASE}/g" "$f"
  sed -i "s/${PHASE}-/${NEXT_PHASE}-/g" "$f"
done
echo "✓ Updated internal references"

# 4. Update SCOPE.md phase reference
if [ -f "SCOPE.md" ]; then
  sed -i "s/Phase ${PHASE}/Phase ${NEXT_PHASE}/g" SCOPE.md
fi

cd -  # Return to original directory
```

Update ROADMAP.md:
- Add new phase entry for deferred phase
- Keep original phase number for new scope

```
✓ Defer complete:
  - Phase ${PHASE} (${EXISTING_SCOPE}) → Phase ${NEXT_PHASE}
  - Phase ${PHASE} now available for: ${ROADMAP_GOAL}

Continuing with planning for Phase ${PHASE}...
```

**If user chooses [1] Redefine:**
- Continue to Step 4 (directory exists, will update SCOPE.md)
- Warn that existing plans may need review

**If user chooses [3] Archive:**
```bash
mkdir -p .planning/phases/_deferred
mv "${EXISTING_DIR}" ".planning/phases/_deferred/$(basename ${EXISTING_DIR})-$(date +%Y%m%d)"
echo "✓ Archived to .planning/phases/_deferred/"
```
- Continue to Step 4 (create fresh directory)

**If user chooses [4] Cancel:**
- Exit with message: "Review the situation and run /gsd:plan-phase again when ready"

## 2. Parse and Normalize Arguments

Extract from $ARGUMENTS:

- Phase number (integer or decimal like `2.1`)
- `--research` flag to force re-research
- `--skip-research` flag to skip research
- `--gaps` flag for gap closure mode
- `--skip-verify` flag to bypass verification loop

**If no phase number:** Detect next unplanned phase from roadmap.

**Normalize phase to zero-padded format:**

```bash
# Normalize phase number (8 → 08, but preserve decimals like 2.1 → 02.1)
if [[ "$PHASE" =~ ^[0-9]+$ ]]; then
  PHASE=$(printf "%02d" "$PHASE")
elif [[ "$PHASE" =~ ^([0-9]+)\.([0-9]+)$ ]]; then
  PHASE=$(printf "%02d.%s" "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}")
fi
```

**Check for existing research and plans:**

```bash
ls .planning/phases/${PHASE}-*/*-RESEARCH.md 2>/dev/null
ls .planning/phases/${PHASE}-*/*-PLAN.md 2>/dev/null
```

## 3. Validate Phase

```bash
grep -A5 "Phase ${PHASE}:" .planning/ROADMAP.md 2>/dev/null
```

**If not found:** Error with available phases. **If found:** Extract phase number, name, description.

## 4. Ensure Phase Directory Exists (Scope-Stable Naming)

**Phase directories use STABLE IDs, not scope names:**

```bash
# PHASE is already normalized (08, 02.1, track-minus-0.5-phase-6, etc.) from step 2
PHASE_DIR=$(ls -d .planning/phases/${PHASE}/ 2>/dev/null | head -1)

# Also check for legacy format with scope suffix
if [ -z "$PHASE_DIR" ]; then
  PHASE_DIR=$(ls -d .planning/phases/${PHASE}-* 2>/dev/null | head -1)
fi

if [ -z "$PHASE_DIR" ]; then
  # Create phase directory with STABLE ID only (no scope suffix)
  mkdir -p ".planning/phases/${PHASE}"
  PHASE_DIR=".planning/phases/${PHASE}"

  # Create SCOPE.md to track scope separately (can change without renaming directory)
  PHASE_NAME=$(grep "Phase ${PHASE}:" .planning/ROADMAP.md | sed 's/.*Phase [0-9]*: //')
  PHASE_GOAL=$(grep -A2 "Phase ${PHASE}:" .planning/ROADMAP.md | grep "Goal:" | sed 's/.*Goal: //')

  cat > "${PHASE_DIR}/SCOPE.md" << EOF
# Phase ${PHASE}: ${PHASE_NAME}

**Goal:** ${PHASE_GOAL:-TBD}
**Scope Version:** 1
**Created:** $(date +%Y-%m-%d)
**Last Modified:** $(date +%Y-%m-%d)

## Current Scope

[Scope details will be added during planning]

## Scope History

| Version | Date | Change |
|---------|------|--------|
| 1 | $(date +%Y-%m-%d) | Initial scope |
EOF

  echo "Created phase directory: ${PHASE_DIR}"
  echo "Created SCOPE.md for scope tracking"
fi
```

**Why stable naming:**
- Directory name is `${PHASE}/` not `${PHASE}-${scope-name}/`
- Scope changes don't require directory renaming
- SCOPE.md tracks scope evolution with version history
- Prevents orphaned directories when scope changes

## 5. Handle Research

**If `--gaps` flag:** Skip research (gap closure uses VERIFICATION.md instead).

**If `--skip-research` flag:** Skip to step 6.

**Check config for research setting:**

```bash
WORKFLOW_RESEARCH=$(cat .planning/config.json 2>/dev/null | grep -o '"research"[[:space:]]*:[[:space:]]*[^,}]*' | grep -o 'true\|false' || echo "true")
```

**If `workflow.research` is `false` AND `--research` flag NOT set:** Skip to step 6.

**Otherwise:**

Check for existing research:

```bash
ls "${PHASE_DIR}"/*-RESEARCH.md 2>/dev/null
```

**If RESEARCH.md exists AND `--research` flag NOT set:**
- Display: `Using existing research: ${PHASE_DIR}/${PHASE}-RESEARCH.md`
- Skip to step 6

**If RESEARCH.md missing OR `--research` flag set:**

Display stage banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► RESEARCHING PHASE {X}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ Spawning researcher...
```

Proceed to spawn researcher

### Spawn gsd-phase-researcher

Gather context for research prompt:

```bash
# Get phase description from roadmap
PHASE_DESC=$(grep -A3 "Phase ${PHASE}:" .planning/ROADMAP.md)

# Get requirements if they exist
REQUIREMENTS=$(cat .planning/REQUIREMENTS.md 2>/dev/null | grep -A100 "## Requirements" | head -50)

# Get prior decisions from STATE.md
DECISIONS=$(grep -A20 "### Decisions Made" .planning/STATE.md 2>/dev/null)

# Get phase context if exists
PHASE_CONTEXT=$(cat "${PHASE_DIR}"/*-CONTEXT.md 2>/dev/null)
```

Fill research prompt and spawn:

```markdown
<objective>
Research how to implement Phase {phase_number}: {phase_name}

Answer: "What do I need to know to PLAN this phase well?"
</objective>

<context>
**Phase description:**
{phase_description}

**Requirements (if any):**
{requirements}

**Prior decisions:**
{decisions}

**Phase context (if any):**
{phase_context}
</context>

<output>
Write research findings to: {phase_dir}/{phase}-RESEARCH.md
</output>
```

```
Task(
  prompt="First, read ~/.claude/agents/gsd-phase-researcher.md for your role and instructions.\n\n" + research_prompt,
  subagent_type="general-purpose",
  model="{researcher_model}",
  description="Research Phase {phase}"
)
```

### Handle Researcher Return

**`## RESEARCH COMPLETE`:**
- Display: `Research complete. Proceeding to planning...`
- Continue to step 6

**`## RESEARCH BLOCKED`:**
- Display blocker information
- Offer: 1) Provide more context, 2) Skip research and plan anyway, 3) Abort
- Wait for user response

## 6. Check Existing Plans

```bash
ls "${PHASE_DIR}"/*-PLAN.md 2>/dev/null
```

**If exists:** Offer: 1) Continue planning (add more plans), 2) View existing, 3) Replan from scratch. Wait for response.

## 7. Read Context Files

Read and store context file contents for the planner agent. The `@` syntax does not work across Task() boundaries - content must be inlined.

```bash
# Read required files
STATE_CONTENT=$(cat .planning/STATE.md)
ROADMAP_CONTENT=$(cat .planning/ROADMAP.md)

# Read optional files (empty string if missing)
REQUIREMENTS_CONTENT=$(cat .planning/REQUIREMENTS.md 2>/dev/null)
CONTEXT_CONTENT=$(cat "${PHASE_DIR}"/*-CONTEXT.md 2>/dev/null)
RESEARCH_CONTENT=$(cat "${PHASE_DIR}"/*-RESEARCH.md 2>/dev/null)

# Gap closure files (only if --gaps mode)
VERIFICATION_CONTENT=$(cat "${PHASE_DIR}"/*-VERIFICATION.md 2>/dev/null)
UAT_CONTENT=$(cat "${PHASE_DIR}"/*-UAT.md 2>/dev/null)
```

## 8. Spawn gsd-planner Agent

Display stage banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► PLANNING PHASE {X}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ Spawning planner...
```

Fill prompt with inlined content and spawn:

```markdown
<planning_context>

**Phase:** {phase_number}
**Mode:** {standard | gap_closure}

**Project State:**
{state_content}

**Roadmap:**
{roadmap_content}

**Requirements (if exists):**
{requirements_content}

**Phase Context (if exists):**
{context_content}

**Research (if exists):**
{research_content}

**Gap Closure (if --gaps mode):**
{verification_content}
{uat_content}

</planning_context>

<downstream_consumer>
Output consumed by /gsd:execute-phase
Plans must be executable prompts with:

- Frontmatter (wave, depends_on, files_modified, autonomous)
- Tasks in XML format
- Verification criteria
- must_haves for goal-backward verification
</downstream_consumer>

<quality_gate>
Before returning PLANNING COMPLETE:

- [ ] PLAN.md files created in phase directory
- [ ] Each plan has valid frontmatter
- [ ] Tasks are specific and actionable
- [ ] Dependencies correctly identified
- [ ] Waves assigned for parallel execution
- [ ] must_haves derived from phase goal
</quality_gate>
```

```
Task(
  prompt="First, read ~/.claude/agents/gsd-planner.md for your role and instructions.\n\n" + filled_prompt,
  subagent_type="general-purpose",
  model="{planner_model}",
  description="Plan Phase {phase}"
)
```

## 9. Handle Planner Return

Parse planner output:

**`## PLANNING COMPLETE`:**
- Display: `Planner created {N} plan(s). Files on disk.`
- If `--skip-verify`: Skip to step 13
- Check config: `WORKFLOW_PLAN_CHECK=$(cat .planning/config.json 2>/dev/null | grep -o '"plan_check"[[:space:]]*:[[:space:]]*[^,}]*' | grep -o 'true\|false' || echo "true")`
- If `workflow.plan_check` is `false`: Skip to step 13
- Otherwise: Proceed to step 10

**`## CHECKPOINT REACHED`:**
- Present to user, get response, spawn continuation (see step 12)

**`## PLANNING INCONCLUSIVE`:**
- Show what was attempted
- Offer: Add context, Retry, Manual
- Wait for user response

## 10. Spawn gsd-plan-checker Agent

Display:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► VERIFYING PLANS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ Spawning plan checker...
```

Read plans and requirements for the checker:

```bash
# Read all plans in phase directory
PLANS_CONTENT=$(cat "${PHASE_DIR}"/*-PLAN.md 2>/dev/null)

# Read requirements (reuse from step 7 if available)
REQUIREMENTS_CONTENT=$(cat .planning/REQUIREMENTS.md 2>/dev/null)
```

Fill checker prompt with inlined content and spawn:

```markdown
<verification_context>

**Phase:** {phase_number}
**Phase Goal:** {goal from ROADMAP}

**Plans to verify:**
{plans_content}

**Requirements (if exists):**
{requirements_content}

</verification_context>

<expected_output>
Return one of:
- ## VERIFICATION PASSED — all checks pass
- ## ISSUES FOUND — structured issue list
</expected_output>
```

```
Task(
  prompt=checker_prompt,
  subagent_type="gsd-plan-checker",
  model="{checker_model}",
  description="Verify Phase {phase} plans"
)
```

## 11. Handle Checker Return

**If `## VERIFICATION PASSED`:**
- Display: `Plans verified. Ready for execution.`
- Proceed to step 13

**If `## ISSUES FOUND`:**
- Display: `Checker found issues:`
- List issues from checker output
- Check iteration count
- Proceed to step 12

## 12. Revision Loop (Max 3 Iterations)

Track: `iteration_count` (starts at 1 after initial plan + check)

**If iteration_count < 3:**

Display: `Sending back to planner for revision... (iteration {N}/3)`

Read current plans for revision context:

```bash
PLANS_CONTENT=$(cat "${PHASE_DIR}"/*-PLAN.md 2>/dev/null)
```

Spawn gsd-planner with revision prompt:

```markdown
<revision_context>

**Phase:** {phase_number}
**Mode:** revision

**Existing plans:**
{plans_content}

**Checker issues:**
{structured_issues_from_checker}

</revision_context>

<instructions>
Make targeted updates to address checker issues.
Do NOT replan from scratch unless issues are fundamental.
Return what changed.
</instructions>
```

```
Task(
  prompt="First, read ~/.claude/agents/gsd-planner.md for your role and instructions.\n\n" + revision_prompt,
  subagent_type="general-purpose",
  model="{planner_model}",
  description="Revise Phase {phase} plans"
)
```

- After planner returns → spawn checker again (step 10)
- Increment iteration_count

**If iteration_count >= 3:**

Display: `Max iterations reached. {N} issues remain:`
- List remaining issues

Offer options:
1. Force proceed (execute despite issues)
2. Provide guidance (user gives direction, retry)
3. Abandon (exit planning)

Wait for user response.

## 13. Present Final Status

Route to `<offer_next>`.

</process>

<offer_next>
Output this markdown directly (not as a code block):

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► PHASE {X} PLANNED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Phase {X}: {Name}** — {N} plan(s) in {M} wave(s)

| Wave | Plans | What it builds |
|------|-------|----------------|
| 1    | 01, 02 | [objectives] |
| 2    | 03     | [objective]  |

Research: {Completed | Used existing | Skipped}
Verification: {Passed | Passed with override | Skipped}

───────────────────────────────────────────────────────────────

## ▶ Next Up

**Execute Phase {X}** — run all {N} plans

/gsd:execute-phase {X}

<sub>/clear first → fresh context window</sub>

───────────────────────────────────────────────────────────────

**Also available:**
- cat .planning/phases/{phase-dir}/*-PLAN.md — review plans
- /gsd:plan-phase {X} --research — re-research first

───────────────────────────────────────────────────────────────
</offer_next>

<success_criteria>
- [ ] .planning/ directory validated
- [ ] Phase validated against roadmap
- [ ] Phase directory created if needed
- [ ] Research completed (unless --skip-research or --gaps or exists)
- [ ] gsd-phase-researcher spawned if research needed
- [ ] Existing plans checked
- [ ] gsd-planner spawned with context (including RESEARCH.md if available)
- [ ] Plans created (PLANNING COMPLETE or CHECKPOINT handled)
- [ ] gsd-plan-checker spawned (unless --skip-verify)
- [ ] Verification passed OR user override OR max iterations with user decision
- [ ] User sees status between agent spawns
- [ ] User knows next steps (execute or review)
</success_criteria>
