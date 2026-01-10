---
name: gsd:status
description: Check status of background agents and running tasks
argument-hint: "[agent-id] [--wait] [--resume]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - TaskOutput
  - Task
---

<objective>
Monitor background agent status and retrieve execution results.

Shows all running/recent background agents from agent-history.json.
Groups agents by parallel_group for coordinated display.
Uses TaskOutput tool to check status of background tasks.
With agent-id argument, shows detailed output from specific agent.
With --wait flag, blocks until all background agents complete.
With --resume flag, resumes all incomplete agents in most recent parallel group.
</objective>

<execution_context>
@~/.claude/get-shit-done/templates/agent-history.md
</execution_context>

<context>
Arguments: $ARGUMENTS

**Load agent history:**
@.planning/agent-history.json
</context>

<process>

## Default: Show all background agents

1. **Read agent-history.json:**
   ```bash
   cat .planning/agent-history.json 2>/dev/null || echo '{"entries":[]}'
   ```

2. **Filter to background agents:**
   Extract entries where `execution_mode === "background"`

3. **Check status of running agents:**
   For each agent with `background_status === "running"`:

   Use TaskOutput tool:
   ```
   task_id: [agent_id]
   block: false
   timeout: 1000
   ```

   **If TaskOutput returns result:** Agent completed
   - Update agent-history.json: background_status → "completed"
   - Set completion_timestamp

   **If TaskOutput returns "still running":** Keep as running

   **If TaskOutput returns error:** Agent failed
   - Update agent-history.json: background_status → "failed"

4. **Display summary table (grouped by parallel_group):**

   **If plan-level parallel groups exist:**
   ```
   Background Tasks
   ════════════════════════════════════════

   Plan-Level Parallel Group: phase-11-batch-1736502345
   ───────────────────────────────────────

   Running (2):
     → 11-01: agent_01HXXX (1m 23s elapsed)
     → 11-03: agent_01HYYY (1m 23s elapsed)
       ⚠️ 2 checkpoints will be skipped

   Queued (1):
     ⏳ 11-02: waiting for 11-01

   Completed (1):
     ✓ 11-04: 45s (3 files modified)

   ───────────────────────────────────────
   Progress: 1/4 plans complete (25%)
   Commits: Pending (created after all complete)

   ════════════════════════════════════════

   Other Background Agents
   ───────────────────────────────────────
   | Plan | Status | Duration | Agent ID |
   |------|--------|----------|----------|
   | 10-01 | ✓ Complete | 2m 00s | agent_01G... |

   ════════════════════════════════════════
   View details: /gsd:status <agent-id>
   Wait for all: /gsd:status --wait
   Resume group: /gsd:status --resume
   ```

   **If task-level parallel groups exist within a plan:**
   ```
   Plan Execution: 11-02-PLAN.md
   ════════════════════════════════════════

   Task Parallel Execution Active
   Group: plan-11-02-tasks-batch-1736955600
   Concurrency: 2/3 slots in use

   Group 1 (Running):
     → Tasks 1, 3: agent_01HXXX (45s elapsed)

   Sequential (Waiting):
     ⏳ Task 2: waiting for Task 1 (file conflict)

   Group 2 (Queued):
     ⏳ Tasks 4, 5: waiting for concurrency slot
     ⚠️ Task 4 checkpoint will be skipped

   Sequential (After Group 2):
     ⏳ Task 6: depends on Task 5 (file conflict)

   ════════════════════════════════════════
   Progress: 0/6 tasks complete
   Parallelization: 2 groups (4 tasks parallelized)
   Checkpoints: 1 will be skipped
   ```

   **If both plan-level and task-level parallel execution active:**
   ```
   Phase 11 Parallel Execution
   ════════════════════════════════════════
   Concurrency: 3/3 slots in use

   Plan-Level:
     → 11-01: Running
       └─ Tasks 1,3: parallel (agent_01HAAA)
       └─ Task 2: sequential (pending)
     → 11-03: Running (all tasks sequential)
     ⏳ 11-02: Queued (waiting for 11-01)

   ════════════════════════════════════════
   Plans: 0/3 complete
   Active agents: 3 (2 plan-level, 1 task-level)
   ```

   **If no parallel groups (single agents only):**
   ```
   Background Tasks
   ════════════════════════════════════════

   Phase 11: Async Parallel Execution
   ───────────────────────────────────
   | Plan | Status | Duration | Agent ID |
   |------|--------|----------|----------|
   | 11-01 | ✓ Complete | 2m 15s | agent_01H... |
   | 11-02 | ⏳ Running | 1m 30s | agent_01H... |

   Progress: 1/2 complete (50%)

   ════════════════════════════════════════
   View details: /gsd:status <agent-id>
   Wait for all: /gsd:status --wait
   ```

5. **Show queue positions for waiting plans/tasks:**
   For entries with status "queued":
   - Show queue position
   - Show what they're waiting for (from depends_on field)
   - Show checkpoint warnings if applicable
   - For task-level: show which tasks are queued together

## With agent-id argument

1. **Find agent in history:**
   Match agent_id prefix (user can provide abbreviated ID)

2. **Fetch full output:**
   Use TaskOutput tool:
   ```
   task_id: [full agent_id]
   block: false
   timeout: 5000
   ```

3. **Display detailed view:**
   ```
   Agent: [agent_id]
   Plan: [phase]-[plan]
   Status: [status]
   Started: [timestamp]
   Duration: [calculated]

   ════════════════════════════════════════
   Output:
   ════════════════════════════════════════

   [Full output from TaskOutput]

   ════════════════════════════════════════
   ```

## With --wait flag

1. **Identify running background agents:**
   Filter where `execution_mode === "background"` AND `background_status === "running"`

2. **Wait for each:**
   For each running agent, use TaskOutput with block: true:
   ```
   task_id: [agent_id]
   block: true
   timeout: 600000  # 10 minutes max
   ```

3. **Update history and report:**
   As each completes, update agent-history.json and report:
   ```
   ⏳ Waiting for 3 background agents...

   ✓ [1/3] 11-01 complete (2m 15s)
   ✓ [2/3] 11-02 complete (3m 45s)
   ✓ [3/3] 11-03 complete (1m 30s)

   ════════════════════════════════════════
   All background tasks complete!

   Total time: 4m 30s (parallel execution)
   Sequential estimate: 7m 30s
   Time saved: 3m 00s (40%)
   ════════════════════════════════════════
   ```

</process>

## With --resume flag

1. **Find most recent parallel group:**
   ```bash
   # Get most recent parallel_group with incomplete agents
   jq -r '[.entries[] | select(.parallel_group != null and .status != "completed")] | sort_by(.timestamp) | reverse | .[0].parallel_group' .planning/agent-history.json
   ```

2. **Find all incomplete agents in group:**
   ```bash
   # Get all agents in this group that aren't completed
   jq '.entries[] | select(.parallel_group == "GROUP_ID" and .status != "completed")' .planning/agent-history.json
   ```

3. **Resume each incomplete agent:**
   For each agent with status "spawned", "running", or "interrupted":

   Use Task tool with resume parameter:
   ```
   Task(
     resume: [agent_id],
     description: "Resume plan execution"
   )
   ```

   For each agent with status "queued":
   - Check if dependencies are now satisfied
   - If yes, spawn new agent
   - If no, keep in queue

4. **Report resume status:**
   ```
   Resuming Parallel Group: phase-11-batch-1736502345
   ════════════════════════════════════════

   Resuming (2):
     → 11-01: agent_01HXXX (was running)
     → 11-03: agent_01HYYY (was interrupted)

   Spawning (1):
     → 11-02: dependencies satisfied, starting now

   Already complete (1):
     ✓ 11-04

   ════════════════════════════════════════
   Monitoring progress...
   ```

5. **Continue with monitoring:**
   After resuming, enter monitor_parallel_completion loop from execute-phase workflow.

<status_icons>
| Status | Icon | Meaning |
|--------|------|---------|
| running | ⏳ | Agent still executing |
| completed | ✓ | Agent finished successfully |
| failed | ✗ | Agent encountered error |
| spawned | ○ | Just spawned, not yet checked |
| queued | ⌛ | Waiting for dependency or slot |
| interrupted | ⊘ | Session ended before completion |
</status_icons>

<success_criteria>
- [ ] Reads agent-history.json for background agents
- [ ] Groups agents by parallel_group when displaying
- [ ] Distinguishes plan-level from task-level agents (via granularity field)
- [ ] Uses TaskOutput to check running agent status
- [ ] Updates history with current status
- [ ] Shows summary table with parallel group context
- [ ] Shows task-level parallel execution within plans
- [ ] Shows nested plan/task parallel execution when both active
- [ ] Shows detailed output for specific agent
- [ ] --wait flag blocks until all complete
- [ ] --resume flag resumes incomplete agents in parallel group
</success_criteria>
