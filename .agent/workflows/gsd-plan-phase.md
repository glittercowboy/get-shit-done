---
description: Create detailed execution plan for a phase
---

# GSD: Plan Phase

This workflow helps you break down a roadmap phase into executable Plans.

## 1. Context Loading

First, load the necessary context to understand where we are.

// turbo
1. Read `.planning/STATE.md` to identify the current phase.
2. Read `.planning/ROADMAP.md` to understand the goal of the current phase.
3. Read `.planning/PROJECT.md` to keep the big picture in mind.

## 2. Phase Identification

1. **Identify Phase**: Based on `STATE.md`, identify which phase is "Ready to plan".
   - If multiple, ask the user to confirm.
2. **Directory Check**: Ensure the directory `.planning/phases/[PhaseNumber]-[Name]` exists.

## 3. Discovery (Optional)

Assess if we need to do any discovery before planning.
- **Legacy Code**: If modifying existing code, read the relevant files now.
- **New Tech**: If using a new library, verify we know how to use it.

## 4. Task Breakdown

**Core Logic**: Break the phase goal into atomic "Plans".
- **Rule**: Each Plan should contain 2-3 tasks maximum.
- **Rule**: Each task should be "atomic" (implementable in ~10 mins).
- **Rule**: Independent tasks that can be committed separately.

**Prompting**:
Think about the tasks needed to complete this phase.
Group them into Plans (e.g., `01-setup`, `02-core-logic`, `03-ui`).

## 5. Write Plans

For each identified Plan in the breakdown:

1. **Read Template**: Read `.agent/templates/gsd/phase-prompt.md`.
2. **Synthesize**: Create the Plan file at `.planning/phases/[Phase]/[Phase]-[PlanNumber]-PLAN.md`.
   - **Content**: Fill the template.
   - **Context**: Explicitly list files/docs that are needed for this plan.
   - **Tasks**: Use the XML format `<task type="auto|checkpoint">...</task>`.

   *Example Task XML*:
   ```xml
   <task type="auto">
     <name>Create login component</name>
     <files>src/components/Login.tsx</files>
     <action>Scaffold the login component with email/password fields...</action>
     <verify>Check if component renders</verify>
     <done>Component exists and exports correctly</done>
   </task>
   ```

## 6. git Commit

```bash
git add .planning/phases/[Phase]-[Name]/*.md
git commit -m "docs([Phase]): create phase plans"
```

## 7. Next Steps

Inform the user: "Plans created. Ready to execute."
Suggest command: `Run workflow: GSD Execute Plan .planning/phases/...`
