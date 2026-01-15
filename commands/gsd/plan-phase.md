---
name: gsd:plan-phase
description: Create detailed execution plan for a phase (PLAN.md)
argument-hint: "[phase] [--gaps] [--think <framework>]"
allowed-tools:
  - Read
  - Bash
  - Write
  - Glob
  - Grep
  - AskUserQuestion
  - WebFetch
  - mcp__context7__*
---

<objective>
Create executable phase prompt with discovery, context injection, and task breakdown.

Purpose: Break down roadmap phases into concrete, executable PLAN.md files that Claude can execute.
Output: One or more PLAN.md files in the phase directory (.planning/phases/XX-name/{phase}-{plan}-PLAN.md)

**Gap closure mode (`--gaps` flag):**
When invoked with `--gaps`, plans address gaps identified by the verifier. Load VERIFICATION.md, create plans to close specific gaps.
</objective>

<execution_context>
@~/.claude/get-shit-done/references/think-mode.md
@~/.claude/get-shit-done/references/principles.md
@~/.claude/get-shit-done/workflows/plan-phase.md
@~/.claude/get-shit-done/templates/phase-prompt.md
@~/.claude/get-shit-done/references/plan-format.md
@~/.claude/get-shit-done/references/scope-estimation.md
@~/.claude/get-shit-done/references/checkpoints.md
@~/.claude/get-shit-done/references/tdd.md
@~/.claude/get-shit-done/references/goal-backward.md
</execution_context>

<context>
**Parse --think first:** Strip trailing `--think <framework>` from $ARGUMENTS. CLEAN_ARGS contains `[phase] [--gaps]`. If THINK_MODE set, load `@~/.claude/get-shit-done/frameworks/${THINK_MODE}.md` as planning lens.

Phase number: CLEAN_ARGS (optional - auto-detects next unplanned phase if not provided)
Gap closure mode: `--gaps` flag in CLEAN_ARGS triggers gap closure workflow

**Load project state first:**
@.planning/STATE.md

**Load roadmap:**
@.planning/ROADMAP.md

**Load requirements:**
@.planning/REQUIREMENTS.md

After loading, extract the requirements for the current phase:
1. Find the phase in ROADMAP.md, get its `Requirements:` list (e.g., "PROF-01, PROF-02, PROF-03")
2. Look up each REQ-ID in REQUIREMENTS.md to get the full description
3. Present the requirements this phase must satisfy:
   ```
   Phase [N] Requirements:
   - PROF-01: User can create profile with display name
   - PROF-02: User can upload avatar image
   - PROF-03: User can write bio (max 500 chars)
   ```

**Load phase context if exists (created by /gsd:discuss-phase):**
Check for and read `.planning/phases/XX-name/{phase}-CONTEXT.md` - contains research findings, clarifications, and decisions from phase discussion.

**Load codebase context if exists:**
Check for `.planning/codebase/` and load relevant documents based on phase type.

**If --gaps flag present, also load:**
@.planning/phases/XX-name/{phase}-VERIFICATION.md — contains structured gaps in YAML frontmatter
</context>

<process>
1. Check .planning/ directory exists (error if not - user should run /gsd:new-project)
2. Parse arguments: extract phase number and check for `--gaps` flag
3. If phase number provided, validate it exists in roadmap
4. If no phase number, detect next unplanned phase from roadmap

**Standard mode (no --gaps flag):**
5. Follow plan-phase.md workflow:
   - Load project state and accumulated decisions
   - Perform mandatory discovery (Level 0-3 as appropriate)
   - Read project history (prior decisions, issues, concerns)
   - Break phase into tasks
   - Estimate scope and split into multiple plans if needed
   - Create PLAN.md file(s) with executable structure

**Gap closure mode (--gaps flag):**
5. Follow plan-phase.md workflow with gap_closure_mode:
   - Load VERIFICATION.md and parse `gaps:` YAML from frontmatter
   - Read existing SUMMARYs to understand what's already built
   - Create tasks from gaps (each gap.missing item → task candidates)
   - Number plans sequentially after existing (if 01-03 exist, create 04, 05...)
   - Create PLAN.md file(s) focused on closing specific gaps
</process>

<success_criteria>

- One or more PLAN.md files created in .planning/phases/XX-name/
- Each plan has: objective, execution_context, context, tasks, verification, success_criteria, output
- must_haves derived from phase goal and documented in frontmatter (truths, artifacts, key_links)
- Tasks are specific enough for Claude to execute
- User knows next steps (execute plan or review/adjust)
  </success_criteria>
