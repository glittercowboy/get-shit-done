<purpose>
Guide to understanding GSD's context engineering by reading actual implementation.
</purpose>

<core_concept>
Context engineering = managing Claude's context window to maintain quality.

Key insight: Claude degrades at high context usage. GSD solves this by:
- Fresh subagents per plan
- Small plans (2-3 tasks)
- Thin orchestrators
</core_concept>

<where_to_find>

## Agent Spawning Pattern

Read any workflow that spawns agents:
```bash
grep -l "Task tool" {GSD_ROOT}/get-shit-done/workflows/*.md
```

Key file:
```bash
cat {GSD_ROOT}/get-shit-done/workflows/execute-plan.md
```

Look for `Task tool with subagent_type=` calls.

## Plan Sizing Rules

Read planner constraints:
```bash
cat {GSD_ROOT}/agents/gsd-planner.md | grep -A20 "task"
```

## Wave Parallelization

```bash
grep -A30 "wave" {GSD_ROOT}/get-shit-done/workflows/execute-phase.md
```

## Orchestrator Pattern

Read any command + workflow pair:
```bash
cat {GSD_ROOT}/commands/gsd/execute-phase.md
cat {GSD_ROOT}/get-shit-done/workflows/execute-phase.md
```

Notice: command is thin (routing), workflow orchestrates, agents do work.

</where_to_find>

<understanding_check>
When reading source, look for:
- Fresh context: Task tool spawns with full context
- Small scope: 2-3 tasks per plan, 3-5 plans per phase
- Thin orchestrators: No heavy work in main workflows
</understanding_check>
