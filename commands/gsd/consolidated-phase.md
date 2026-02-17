---
name: gsd:consolidated-phase
description: Run a phase using the consolidated 3-phase workflow (consensus+plan → execute+gate → ship)
argument-hint: "<phase-number> [--prd <file>] [--skills <skill1,skill2,...>]"
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
Execute a complete phase using the consolidated 3-phase workflow.

Phase 1: Consensus + Plan (one agent, advisory + planning)
Phase 2: Execute + Gate (wave execution + ship-readiness gate)
Phase 3: Ship (orchestrator handles directly)

Reduces agent spawns from 8+ to 2+N (N = executor count).
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/consolidated-phase.md
@~/.claude/get-shit-done/references/ui-brand.md
</execution_context>

<context>
Phase: $ARGUMENTS
@.planning/ROADMAP.md
@.planning/STATE.md
</context>

<process>
Execute the consolidated-phase workflow from @~/.claude/get-shit-done/workflows/consolidated-phase.md end-to-end.
</process>
