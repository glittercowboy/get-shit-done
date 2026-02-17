---
created: 2026-02-17T13:54:07.348Z
title: Update CLAUDE.md / memory after key steps in the pipeline
area: workflows
files:
  - commands/gsd/discuss-phase.md
  - commands/gsd/plan-phase.md
  - commands/gsd/execute-phase.md
  - commands/gsd/new-project.md
  - commands/gsd/new-milestone.md
  - agents/gsd-planner.md
  - agents/gsd-executor.md
  - agents/gsd-verifier.md
---

## Problem

GSD pipeline steps (discussion, planning, execution, verification) generate important architectural decisions, patterns, and conventions — but none of these steps automatically update CLAUDE.md or the user's memory files. This means:

- Key decisions made during `/gsd:discuss-phase` are only captured in DISCUSSION.md, not surfaced to future Claude sessions
- Architectural patterns chosen during planning don't propagate to project-level CLAUDE.md
- Coding conventions established during execution (e.g., "we use X pattern for Y") are lost between sessions
- The user must manually remember to update CLAUDE.md after each significant step

This creates a gap where project knowledge accumulates in phase artifacts but doesn't flow back into the persistent instructions that guide future work.

## Solution

Add optional CLAUDE.md / memory update steps to key workflow stages:

1. **After discussion** (`/gsd:discuss-phase`): Surface any decisions or preferences that should persist as CLAUDE.md entries
2. **After planning** (`/gsd:plan-phase`): Capture architectural decisions and constraints as project instructions
3. **After execution** (`/gsd:execute-phase`): Update CLAUDE.md with new patterns, conventions, or file structure changes introduced
4. **After milestone completion** (`/gsd:complete-milestone`): Comprehensive review — prune outdated entries, add new conventions

Implementation options:
- A post-step hook that prompts "Any learnings to capture in CLAUDE.md?"
- Automatic suggestions based on decisions logged in phase artifacts
- A dedicated `/gsd:sync-learnings` command that reviews recent artifacts and proposes CLAUDE.md updates
