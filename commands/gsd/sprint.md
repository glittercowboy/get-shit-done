---
name: gsd:sprint
description: Run all remaining phases (or a range) unattended — chained discuss → plan → execute → verify
argument-hint: "[range] [--dry-run] [--skip-failures] [--consolidated] [--prd <file>]"
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
Sprint: run multiple phases end-to-end without manual intervention.

Uses checkpoint-and-respawn to keep the context window fresh:
1. Determines which phases to run (all remaining or a specified range)
2. Runs ONE phase (discuss → plan → execute → verify via auto-advance)
3. Writes state to SPRINT-STATE.json
4. Spawns a fresh copy of itself and exits
5. The new instance reads state and continues from the next phase
6. Repeats until all phases done, then writes SPRINT-REPORT.md

Each orchestrator instance handles exactly one phase — zero context accumulation.
If a state file exists from a previous run, the sprint resumes automatically.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/sprint.md
@~/.claude/get-shit-done/references/ui-brand.md
</execution_context>

<context>
Arguments: $ARGUMENTS

**Flags:**
- `[range]` — Phase range like `3-5` or single phase `3`. Omit for all remaining phases.
- `--dry-run` — Show what would run without executing
- `--skip-failures` — Log blocked phases and continue to next (default: stop on first failure)
- `--consolidated` — Use consolidated workflow for each phase (overrides config)
- `--prd <file>` — Pass PRD to skip discuss phase for all phases in the sprint

**Resume:** If `.planning/SPRINT-STATE.json` exists, the sprint resumes from where it left off.

@.planning/ROADMAP.md
@.planning/STATE.md
</context>

<process>
Execute the sprint workflow from @~/.claude/get-shit-done/workflows/sprint.md end-to-end.
</process>
