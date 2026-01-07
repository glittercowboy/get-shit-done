---
description: Execute a GSD Plan
---

# GSD: Execute Plan

This workflow guides you through executing a specific `.planning/phases/XX-name/YY-ZZ-PLAN.md`.

## 1. Setup

// turbo
1. **Identify Plan**: If not provided, find the next unexecuted plan in `.planning/phases/`.
2. **Read Plan**: Read the `PLAN.md` file. It IS your prompt.
   - Note the `execution_context` files and read them if referenced.
   - Note the `<context>` section and read those files.

## 2. Execution Loop

**CRITICAL**: You must execute the tasks defined in the plan **sequentially**.

For each `<task>` in the PLAN:

1. **Set Task Boundary**: Call `task_boundary` with:
   - `TaskName`: [Plan Name] - [Task Name]
   - `TaskStatus`: Executing task...
2. **Read Context**: If the task specifies `<files>`, read them.
3. **Execute**: Perform the action specified in `<action>`.
   - Use `write_to_file`, `run_command`, etc.
   - **Deviations**: If you find bugs or missing dependencies, fix them (Rule 1 & 3). If you find architectural changes, ASK first (Rule 4).
4. **Verify**: Run the verification steps in `<verify>`.
5. **Commit**:
   ```bash
   git add [modified files]
   git commit -m "feat([Phase]): [Task Name]"
   ```
   *Note: Adapt commit type (feat/fix/refactor) as appropriate.*

## 3. Summary Generation

After all tasks are complete:

1. **Read Template**: Read `.agent/templates/gsd/summary.md`.
2. **Synthesize**: Create `SUMMARY.md` in the phase directory.
   - Document what was built.
   - Document any deviations or decisions.
   - List the commits made.

## 4. Final Commit

```bash
git add .planning/phases/[Phase]/*.md
git commit -m "docs([Phase]): complete [Plan] plan"
```

## 5. Update State

1. Update `.planning/STATE.md`:
   - Mark the plan as complete.
   - Update stats (if you can).
2. Inform user: "Plan complete. Ready for next plan or phase completion."
