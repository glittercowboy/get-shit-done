---
name: gsd.plan-milestone-gaps
description: "Create phases to close all gaps identified by milestone audit"
argument-hint: ""
agent: agent
---

<objective>
Create all phases necessary to close gaps identified by `/gsd:audit-milestone`.

Reads MILESTONE-AUDIT.md, groups gaps into logical phases, creates phase entries in ROADMAP.md, and offers to plan each phase.

One command creates all fix phases — no manual `/gsd:add-phase` per gap.
</objective>

<execution_context>- Read file at: ./.claude/get-shit-done/workflows/plan-milestone-gaps.md
</execution_context>

<context>
**Audit results:**
Glob: .planning/v*-MILESTONE-AUDIT.md (use most recent)

**Original intent (for prioritization):**- Read file at: .planning/PROJECT.md- Read file at: .planning/REQUIREMENTS.md

**Current state:**- Read file at: .planning/ROADMAP.md- Read file at: .planning/STATE.md
</context>

<process>
Execute the plan-milestone-gaps workflow from workflows/plan-milestone-gaps.md end-to-end.
Preserve all workflow gates (audit loading, prioritization, phase grouping, user confirmation, roadmap updates).
</process>

