---
name: gsd.audit-milestone
description: "Audit milestone completion against original intent before archiving"
argument-hint: "[version]"
agent: agent
---

<objective>
Verify milestone achieved its definition of done. Check requirements coverage, cross-phase integration, and end-to-end flows.

**This command IS the orchestrator.** Reads existing VERIFICATION.md files (phases already verified during execute-phase), aggregates tech debt and deferred gaps, then spawns integration checker for cross-phase wiring.
</objective>

<execution_context>- Read file at: ./.claude/get-shit-done/workflows/audit-milestone.md
</execution_context>

<context>
Version: $ARGUMENTS (optional — defaults to current milestone)

**Original Intent:**- Read file at: .planning/PROJECT.md- Read file at: .planning/REQUIREMENTS.md

**Planned Work:**- Read file at: .planning/ROADMAP.md- Read file at: .planning/config.json (if exists)

**Completed Work:**
Glob: .planning/phases/*/*-SUMMARY.md
Glob: .planning/phases/*/*-VERIFICATION.md
</context>

<process>
Execute the audit-milestone workflow from workflows/audit-milestone.md end-to-end.
Preserve all workflow gates (scope determination, verification reading, integration check, requirements coverage, routing).
</process>

