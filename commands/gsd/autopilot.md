---
name: gsd:autopilot
description: Run all remaining phases unattended — plan, execute, extract learnings, repeat
argument-hint: "[--from N] [--dry-run]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - Task
  - TodoWrite
  - AskUserQuestion
---
<objective>
Execute all remaining phases in the current milestone unattended. For each phase: plan → execute (auto-approve checkpoints) → extract learnings → transition. Designed for overnight runs where all context has been provided upfront.

Orchestrator loops through phases, delegating to existing /gsd:plan-phase and /gsd:execute-phase workflows. Per-phase learning extraction enables compound learning where later phases benefit from earlier ones.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/autopilot.md
@~/.claude/get-shit-done/references/ui-brand.md
</execution_context>

<context>
$ARGUMENTS

**Flags:**
- `--from N` — Start from phase N (default: next incomplete phase)
- `--dry-run` — Show execution plan without running anything

@.planning/ROADMAP.md
@.planning/STATE.md
</context>

<process>
Execute the autopilot workflow from @~/.claude/get-shit-done/workflows/autopilot.md end-to-end.
Loop through all remaining phases: plan → execute → extract learnings → transition.
Auto-approve checkpoints. Skip failed phases and continue. Log everything.
</process>
