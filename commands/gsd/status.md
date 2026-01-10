---
name: gsd:status
description: Check status of background agents and running tasks
argument-hint: "[agent-id] [--wait]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - TaskOutput
---

<objective>
Monitor background agent status and retrieve execution results.

Shows all running/recent background agents from agent-history.json.
Uses TaskOutput tool to check status of background tasks.
With agent-id argument, shows detailed output from specific agent.
With --wait flag, blocks until all background agents complete.
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

4. **Display summary table (grouped by phase):**
   ```
   Background Tasks
   ════════════════════════════════════════

   Phase 11: Async Parallel Execution
   ───────────────────────────────────
   | Plan | Status | Duration | Agent ID |
   |------|--------|----------|----------|
   | 11-01 | ✓ Complete | 2m 15s | agent_01H... |
   | 11-02 | ⏳ Running | 1m 30s | agent_01H... |
   | 11-03 | ⌛ Queued | - | - |

   Progress: 1/3 complete (33%)

   Phase 10: Subagent Resume
   ───────────────────────────────────
   | Plan | Status | Duration | Agent ID |
   |------|--------|----------|----------|
   | 10-01 | ✓ Complete | 2m 00s | agent_01G... |

   ════════════════════════════════════════
   View details: /gsd:status <agent-id>
   Wait for all: /gsd:status --wait
   ```

5. **Show queue positions for waiting plans:**
   For plans with status "queued":
   - Show queue position
   - Show what they're waiting for
   - Estimate when they might start

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

<status_icons>
| Status | Icon | Meaning |
|--------|------|---------|
| running | ⏳ | Agent still executing |
| completed | ✓ | Agent finished successfully |
| failed | ✗ | Agent encountered error |
| spawned | ○ | Just spawned, not yet checked |
| queued | ⌛ | Waiting for slot (parallel execution) |
</status_icons>

<success_criteria>
- [ ] Reads agent-history.json for background agents
- [ ] Uses TaskOutput to check running agent status
- [ ] Updates history with current status
- [ ] Shows summary table for all agents
- [ ] Shows detailed output for specific agent
- [ ] --wait flag blocks until all complete
</success_criteria>
