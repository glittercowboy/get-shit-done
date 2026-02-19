---
name: gsd.cleanup
description: "Archive accumulated phase directories from completed milestones"
argument-hint: ""
agent: agent
---

<objective>
Archive phase directories from completed milestones into `.planning/milestones/v{X.Y}-phases/`.

Use when `.planning/phases/` has accumulated directories from past milestones.
</objective>

<execution_context>- Read file at: ./.claude/get-shit-done/workflows/cleanup.md
</execution_context>

<process>
Follow the cleanup workflow at workflows/cleanup.md.
Identify completed milestones, show a dry-run summary, and archive on confirmation.
</process>

