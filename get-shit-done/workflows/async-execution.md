<purpose>
Orchestrate async and parallel execution of plans with dependency awareness and queue management.
</purpose>

<overview>
This workflow provides shared logic for:
- `/gsd:execute-async` - Single plan background execution
- `/gsd:execute-phase` - Parallel multi-plan execution
- `/gsd:status` - Background agent monitoring

Key capabilities:
- Background agent spawning via Task tool run_in_background
- Dependency detection between plans
- Queue management with configurable concurrency
- Agent tracking in agent-history.json
</overview>

<background_spawning>
## Spawning Background Agents

Use Task tool with run_in_background: true to spawn non-blocking agents.

**Task tool parameters:**
```
subagent_type: "general-purpose"
run_in_background: true
prompt: [execution instructions]
```

**Response includes:**
- agent_id: Unique identifier for the agent
- output_file: Path to file where output is written

**Record to agent-history.json:**
```json
{
  "agent_id": "[from response]",
  "task_description": "[plan description]",
  "phase": "[phase number]",
  "plan": "[plan number]",
  "segment": null,
  "timestamp": "[ISO timestamp]",
  "status": "spawned",
  "completion_timestamp": null,
  "execution_mode": "background",
  "output_file": "[from response]",
  "background_status": "running"
}
```

**Checking status:**
Use TaskOutput tool with block: false for non-blocking status check:
```
task_id: [agent_id]
block: false
timeout: 1000
```
</background_spawning>

<dependency_detection>
## Dependency Detection Between Plans

Analyze plans in a phase to determine safe parallelization.

**Step 1: Parse all plans in phase:**
```bash
ls .planning/phases/XX-name/*-PLAN.md | sort
```

**Step 2: Extract dependencies from each plan:**

Check for explicit dependencies:
- Context section references to other plans: `@.planning/phases/XX-name/YY-ZZ-SUMMARY.md`
- Objective mentions "depends on" or "requires"
- Frontmatter requires field

Check for file dependencies:
- Parse `<files>` elements from all tasks
- If Plan A creates file X and Plan B reads file X → B depends on A

**Step 3: Build dependency graph:**
```
Plans: [11-01, 11-02, 11-03]

Dependencies:
- 11-01: none (independent)
- 11-02: requires 11-01-SUMMARY.md (depends on 11-01)
- 11-03: none (independent)

Parallelizable groups:
- Group 1: [11-01, 11-03] (can run together)
- Group 2: [11-02] (must wait for 11-01)
```

**Step 4: Apply safe parallelization rules:**

| Condition | Action |
|-----------|--------|
| No shared files, no dependencies | ✓ Run in parallel |
| Plan B reads file created by Plan A | Wait for A |
| Plan B references A's SUMMARY.md | Wait for A |
| Same files modified by both plans | Run sequentially |

**Default behavior:**
If dependency detection is uncertain, default to sequential execution (safer).
</dependency_detection>

<queue_management>
## Queue Management

Control concurrent background agents to prevent resource exhaustion.

**Configuration:**
```json
{
  "async": {
    "max_concurrent": 3,
    "queue_strategy": "fifo"
  }
}
```

Default: max_concurrent = 3 (if config not present)

**Queue states:**
- `running`: Currently executing (count toward max_concurrent)
- `queued`: Waiting for slot to open
- `completed`: Finished (slot freed)
- `failed`: Error occurred (slot freed)

**Queue algorithm:**

1. **Count running agents:**
   ```bash
   # Count entries with background_status === "running"
   RUNNING=$(jq '[.entries[] | select(.background_status == "running")] | length' .planning/agent-history.json)
   ```

2. **If running < max_concurrent:**
   Spawn next queued plan immediately

3. **If running >= max_concurrent:**
   Add to queue with status "queued"
   ```json
   {
     "status": "queued",
     "execution_mode": "background",
     "background_status": null,
     "queue_position": [1-based position]
   }
   ```

4. **On agent completion:**
   Check queue, spawn next if available

**Monitoring queue:**
```
Background Tasks
════════════════════════════════════════
Running (2/3 slots):
| Plan | Status | Duration |
|------|--------|----------|
| 11-01 | ⏳ Running | 1m 30s |
| 11-03 | ⏳ Running | 45s |

Queued (1 waiting):
| Plan | Position | Depends On |
|------|----------|------------|
| 11-02 | #1 | 11-01 |
════════════════════════════════════════
```
</queue_management>

<parallel_phase_execution>
## Parallel Phase Execution Flow

When executing entire phase in parallel:

**1. Discover plans:**
```bash
# Find all unexecuted plans
for plan in .planning/phases/XX-name/*-PLAN.md; do
  summary="${plan//-PLAN.md/-SUMMARY.md}"
  [ ! -f "$summary" ] && echo "$plan"
done
```

**2. Analyze dependencies:**
Apply dependency_detection rules to identify:
- Independent plans (can start immediately)
- Dependent plans (must wait)

**3. Create execution plan:**
```
Phase 11: Async Parallel Execution
═══════════════════════════════════════════════

Found 3 plans, 2 can run in parallel:

⚡ Starting immediately (no dependencies):
  → 11-01-PLAN.md
  → 11-03-PLAN.md

⏳ Queued (waiting for dependencies):
  → 11-02-PLAN.md (needs 11-01)

Max concurrent: 3
═══════════════════════════════════════════════
```

**4. Spawn independent plans:**
For each independent plan, spawn background agent (up to max_concurrent)

**5. Monitor and spawn dependents:**
When dependency completes:
- Check if dependent's requirements are all met
- If yes, spawn dependent (if slot available)
- If no, keep in queue

**6. Report completion:**
```
✓ Phase 11 complete!

Execution summary:
| Plan | Duration | Status |
|------|----------|--------|
| 11-01 | 2m 15s | ✓ Complete |
| 11-03 | 1m 30s | ✓ Complete |
| 11-02 | 3m 00s | ✓ Complete |

Total time: 4m 30s (parallel)
Sequential estimate: 6m 45s
Time saved: 2m 15s (33%)
```
</parallel_phase_execution>

<checkpoint_handling>
## Checkpoint Handling in Background

Background agents cannot interact with users for checkpoints.

**When spawning background agent for plan with checkpoints:**

1. Warn user:
   ```
   ⚠️ Plan contains checkpoints
   Background execution will skip verification/decision points.
   ```

2. Agent behavior:
   - `checkpoint:human-verify`: Log "skipped - background mode" and continue
   - `checkpoint:decision`: Use first option (or fail if critical)
   - `checkpoint:human-action`: Skip and log warning

3. In SUMMARY.md:
   ```markdown
   ## Checkpoints Skipped (Background Mode)
   - Task 4: human-verify (visual check skipped)
   - Task 7: decision (used default: option-a)
   ```

**Recommendation:**
For plans with critical checkpoints, use `/gsd:execute-plan` (foreground) instead.
</checkpoint_handling>

<error_handling>
## Error Handling

**Agent failure:**
1. TaskOutput returns error
2. Update agent-history.json: background_status → "failed"
3. Log error details to output file
4. Free queue slot for next agent

**Partial phase completion:**
If some plans complete and others fail:
```
⚠️ Phase partially complete

✓ Complete:
  - 11-01 (2m 15s)
  - 11-03 (1m 30s)

✗ Failed:
  - 11-02: Build error in task 2

Options:
1. /gsd:status 11-02 - View error details
2. /gsd:execute-plan 11-02 - Retry in foreground
3. /gsd:resume-task [agent-id] - Resume from failure point
```

**Recovery:**
- Use `/gsd:resume-task` to resume failed agent
- Or use `/gsd:execute-plan` to retry from start
</error_handling>
