---
created: 2026-02-16T21:37:05.900Z
title: Add phase-specific context files to GSD workflow
area: workflows
files:
  - commands/gsd/plan-phase.md
  - commands/gsd/execute-phase.md
  - commands/gsd/research-phase.md
  - agents/gsd-executor.md
  - agents/gsd-planner.md
  - get-shit-done/templates/
---

## Problem

GSD workflow steps (research, plan, execute, verify) lack step-specific contextual instructions. Currently, all behavioral guidance comes from global CLAUDE.md and the command/agent prompts themselves. There's no mechanism for users to provide per-phase or per-step context — like a scoped CLAUDE.md that only applies during a specific workflow stage.

Use cases:
- A user wants to enforce "always use TDD" during execution but not during research
- Phase-specific architectural constraints (e.g., "this phase must not add new dependencies")
- Step-specific reminders (e.g., "when planning this phase, consider the existing auth system")
- Per-phase coding standards or review criteria for verification

Without this, users must either put everything in the global CLAUDE.md (cluttering it) or manually remind Claude each session.

## Solution

Introduce phase/step-scoped context files that GSD commands auto-load:

1. **File location options:**
   - `.planning/phases/NN-name/CONTEXT.md` — phase-specific context loaded by all GSD commands operating in that phase
   - `.planning/context/research.md`, `.planning/context/execute.md` — step-type-specific context loaded during that workflow step
   - Both could coexist: phase context + step context merged

2. **Loading mechanism:**
   - GSD commands already know the current phase from STATE.md
   - Add `@.planning/phases/{current}/CONTEXT.md` to execution_context in commands
   - The installer or commands could inject these paths dynamically

3. **Template support:**
   - Add a CONTEXT.md template to `get-shit-done/templates/`
   - `/gsd:plan-phase` could prompt users to create one if it doesn't exist
   - Document common patterns (TDD enforcement, dependency restrictions, style guides)
