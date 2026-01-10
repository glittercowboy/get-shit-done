---
name: gsd:execute-phase-async
description: Execute all plans in a phase as parallel background agents
argument-hint: "[phase-number]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
  - TaskOutput
  - AskUserQuestion
---

<objective>
Spawn all unexecuted plans in a phase as parallel background agents with dependency awareness.

Analyzes plan dependencies to determine safe parallelization.
Respects max_concurrent limit for resource management.
Queues dependent plans to run after their prerequisites complete.
Enables true "walk away" workflow for entire phases.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/async-execution.md
@~/.claude/get-shit-done/templates/agent-history.md
</execution_context>

<context>
Phase number: $ARGUMENTS (optional - auto-detects from STATE.md if not provided)

**Load project state:**
@.planning/STATE.md

**Load workflow config:**
@.planning/config.json

**Load async config (if present):**
Default max_concurrent: 3
</context>

<process>

## Step 1: Identify phase and plans

1. **Determine phase:**
   ```bash
   # If argument provided, use it
   # Otherwise, extract current phase from STATE.md
   PHASE="${ARGUMENTS:-$(grep "Phase:" .planning/STATE.md | grep -oE '[0-9]+')}"
   ```

2. **Find phase directory:**
   ```bash
   PHASE_DIR=$(ls -d .planning/phases/${PHASE}-* 2>/dev/null | head -1)
   ```

3. **Discover unexecuted plans:**
   ```bash
   for plan in "$PHASE_DIR"/*-PLAN.md; do
     summary="${plan//-PLAN.md/-SUMMARY.md}"
     [ ! -f "$summary" ] && echo "$plan"
   done
   ```

## Step 2: Analyze dependencies

1. **Parse each plan for dependencies:**
   For each unexecuted plan:
   - Check context section for `@...SUMMARY.md` references
   - Check `<files>` elements for shared files
   - Check frontmatter `requires` field

2. **Build dependency graph:**
   ```
   Example:
   11-01: [] (no dependencies)
   11-02: [11-01] (needs 11-01 SUMMARY)
   11-03: [] (no dependencies)
   ```

3. **Identify parallelizable sets:**
   - Independent: Can start immediately
   - Dependent: Must wait for prerequisites

## Step 3: Check for checkpoints

```bash
for plan in [unexecuted plans]; do
  CHECKPOINTS=$(grep -c "type=\"checkpoint" "$plan" 2>/dev/null || echo "0")
  [ "$CHECKPOINTS" -gt 0 ] && echo "$plan has $CHECKPOINTS checkpoints"
done
```

**If any plans have checkpoints:**
```
⚠️ Some plans contain checkpoints:
  - 11-02-PLAN.md: 2 checkpoints (will be skipped in background)

Continue with background execution? Checkpoints will be skipped.
(yes / run-foreground / cancel)
```

## Step 4: Present execution plan

```
Phase [X]: [Phase Name]
═══════════════════════════════════════════════════════

Found [N] unexecuted plans

⚡ Starting immediately (no dependencies):
  → [plan-1]-PLAN.md
  → [plan-3]-PLAN.md

⏳ Queued (waiting for dependencies):
  → [plan-2]-PLAN.md (needs [plan-1])

Max concurrent agents: [max_concurrent]

═══════════════════════════════════════════════════════

Proceed? (yes / adjust / cancel)
```

## Step 5: Spawn background agents

1. **Initialize tracking:**
   Ensure agent-history.json exists

2. **Spawn independent plans:**
   For each independent plan (up to max_concurrent):

   Use Task tool:
   ```
   subagent_type: "general-purpose"
   run_in_background: true
   prompt: [plan execution instructions]
   ```

   Record to agent-history.json with execution_mode: "background"

3. **Queue dependent plans:**
   Add to history with status: "queued"

4. **Report launch status:**
   ```
   ⚡ Background execution started

   Running:
     → 11-01: agent_01HXXX... (output: /tmp/...)
     → 11-03: agent_01HYYY... (output: /tmp/...)

   Queued:
     → 11-02 (waiting for 11-01)

   ════════════════════════════════════════
   You can continue working.

   Check progress: /gsd:status
   Wait for all:   /gsd:status --wait
   ════════════════════════════════════════
   ```

## Step 6: Return control

Return immediately to user. Background agents continue executing.

User can:
- Continue other work
- `/gsd:status` to check progress
- `/gsd:status --wait` to block until all complete

</process>

<dependency_spawn_logic>
## Spawning Dependents After Prerequisites Complete

When checking status (via /gsd:status or automatic monitoring):

1. For each queued plan, check if prerequisites complete:
   ```
   Plan 11-02 requires: [11-01]
   Status of 11-01: completed ✓

   All prerequisites met → spawn 11-02
   ```

2. If slot available (running < max_concurrent):
   Spawn the dependent plan as background agent

3. Update history:
   - Change status from "queued" to "spawned"
   - Add agent_id and output_file
   - Set background_status to "running"
</dependency_spawn_logic>

<yolo_mode>
## YOLO Mode Behavior

If config.json has `"mode": "yolo"`:

1. Skip confirmation prompts
2. Auto-proceed with execution plan
3. Skip checkpoint warnings (just note them)
4. Spawn all immediately

```
⚡ YOLO: Starting phase [X] parallel execution

Spawning 3 background agents...
  ✓ 11-01: agent_01HXXX...
  ✓ 11-03: agent_01HYYY...
  ⌛ 11-02: queued (needs 11-01)

Check progress: /gsd:status
```
</yolo_mode>

<success_criteria>
- [ ] Phase identified correctly
- [ ] All unexecuted plans discovered
- [ ] Dependencies analyzed
- [ ] Execution plan presented to user
- [ ] Independent plans spawned as background agents
- [ ] Dependent plans queued appropriately
- [ ] All agents tracked in agent-history.json
- [ ] Control returned immediately to user
</success_criteria>
