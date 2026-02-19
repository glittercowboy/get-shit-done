---
name: gsd.new-milestone
description: "Start a new milestone cycle — update PROJECT.md and route to requirements"
argument-hint: "[milestone name, e.g., 'v1.1 Notifications']"
agent: agent
---

<objective>
Start a new milestone: questioning → research (optional) → requirements → roadmap.

Brownfield equivalent of new-project. Project exists, PROJECT.md has history. Gathers "what's next", updates PROJECT.md, then runs requirements → roadmap cycle.

**Creates/Updates:**
- `.planning/PROJECT.md` — updated with new milestone goals
- `.planning/research/` — domain research (optional, NEW features only)
- `.planning/REQUIREMENTS.md` — scoped requirements for this milestone
- `.planning/ROADMAP.md` — phase structure (continues numbering)
- `.planning/STATE.md` — reset for new milestone

**After:** `/gsd:plan-phase [N]` to start execution.
</objective>

<execution_context>- Read file at: ./.claude/get-shit-done/workflows/new-milestone.md- Read file at: ./.claude/get-shit-done/references/questioning.md- Read file at: ./.claude/get-shit-done/references/ui-brand.md- Read file at: ./.claude/get-shit-done/templates/project.md- Read file at: ./.claude/get-shit-done/templates/requirements.md
</execution_context>

<context>
Milestone name: $ARGUMENTS (optional - will prompt if not provided)

**Load project context:**- Read file at: .planning/PROJECT.md- Read file at: .planning/STATE.md- Read file at: .planning/MILESTONES.md- Read file at: .planning/config.json

**Load milestone context (if exists, from /gsd:discuss-milestone):**- Read file at: .planning/MILESTONE-CONTEXT.md
</context>

<process>
Execute the new-milestone workflow from workflows/new-milestone.md end-to-end.
Preserve all workflow gates (validation, questioning, research, requirements, roadmap approval, commits).
</process>

