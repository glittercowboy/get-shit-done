# Architecture

**Analysis Date:** 2026-01-23

## Pattern Overview

**Overall:** Multi-tier agent orchestration system with spec-driven phase decomposition

**Key Characteristics:**
- **Orchestrator-Agent pattern** — Thin orchestrators spawn specialized agents with fresh context windows
- **Prompt-as-code** — Plans are markdown prompts that become executor directives, not documents to be transformed
- **Wave-based parallelization** — Tasks grouped by dependencies, executed in parallel waves within phases
- **Atomic per-task commits** — Each task completion gets its own git commit, enabling bisectable history and context recovery
- **State machine progression** — Project flows through explicit phases (question → research → plan → execute → verify → next)

## Layers

**Presentation/CLI:**
- Purpose: User-facing entry points and interactive flows
- Location: `commands/gsd/*.md` (27 slash command files)
- Contains: Frontmatter-defined commands with YAML config, XML task execution prompts
- Depends on: Workflows, agents, templates, references
- Used by: Claude Code/OpenCode interface

**Orchestration:**
- Purpose: Coordinate multi-step workflows without doing heavy lifting
- Location: `get-shit-done/workflows/*.md` (12 workflow files)
- Contains: Step-by-step orchestration logic, agent spawning instructions, wave coordination
- Depends on: References, templates, subagent specifications
- Used by: Slash commands, other workflows

**Agent Execution:**
- Purpose: Specialized work (planning, verification, debugging, execution)
- Location: `agents/*.md` (11 agent definitions)
- Contains: Agent roles, execution flows, task-specific logic, decision trees
- Depends on: Project artifacts (.planning/), codebase being worked on
- Used by: Orchestrators via Task tool spawning

**Templates & References:**
- Purpose: Define canonical formats and reference materials for consistency
- Location: `get-shit-done/templates/*.md` (22 templates) and `get-shit-done/references/*.md` (9 reference docs)
- Contains: PROJECT.md, PLAN.md, SUMMARY.md templates; git conventions, checkpoints, verification patterns
- Depends on: Nothing (pure reference material)
- Used by: Agents when creating artifacts, orchestrators for context

**Installation & Runtime:**
- Purpose: Copy prompts to Claude config directories, enable slash commands
- Location: `bin/install.js` (1290 lines, Node.js)
- Contains: Interactive/non-interactive installer, runtime detection, path expansion
- Depends on: package.json metadata
- Used by: End users via `npx get-shit-done-cc`

## Data Flow

**Project Initialization → Execution:**

1. **User invokes `/gsd:new-project`**
   - `new-project.md` command loads `discovery-phase.md` workflow
   - Workflow runs questioning via AskUserQuestion, spawns researchers for domain investigation
   - Creates `PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, `STATE.md`, `.planning/config.json`

2. **User invokes `/gsd:plan-phase N`**
   - `plan-phase.md` command loads `plan-phase.md` workflow (different file, same name)
   - Workflow optionally spawns `gsd-phase-researcher` for domain research
   - Spawns `gsd-planner` agent with phase context and prior codebase patterns
   - Planner creates `{phase}-PLAN.md` with XML-structured tasks
   - Spawns `gsd-plan-checker` agent to verify plans meet phase goals
   - If check fails: loops back to planner with feedback until pass

3. **User invokes `/gsd:execute-phase N`**
   - `execute-phase.md` command loads `execute-phase.md` workflow
   - Workflow discovers all PLAN.md files in phase directory
   - Analyzes task dependencies from frontmatter (`depends_on` field)
   - Groups tasks into execution waves (independent tasks per wave)
   - Spawns `gsd-executor` agent for each wave's tasks (parallel Task calls)
   - Each executor reads PLAN.md, executes all tasks, commits per-task, creates SUMMARY.md
   - After all waves complete: spawns `gsd-verifier` to check codebase against phase goals

4. **User invokes `/gsd:verify-work N`**
   - `verify-work.md` command loads `verify-work.md` workflow
   - Workflow extracts testable deliverables from phase SUMMARY.md
   - Presents each deliverable for user confirmation
   - If failures reported: spawns `gsd-debugger` agent for diagnosis
   - Debugger creates fix plans if issues found, ready for immediate re-execution

**Context Assembly:**

```
.planning/
├── PROJECT.md          ← Loaded at every step
├── REQUIREMENTS.md     ← Phase goals come from here
├── ROADMAP.md          ← Phase structure
├── STATE.md            ← Accumulated decisions
├── config.json         ← Workflow settings & model profiles
├── research/           ← Domain research from new-project
└── phases/
    └── XX-name/
        ├── {phase}-RESEARCH.md      ← Research before planning
        ├── {phase}-{N}-PLAN.md      ← Plan with XML tasks
        ├── {phase}-{N}-SUMMARY.md   ← Execution result & metadata
        └── {phase}-CONTEXT.md       ← User's implementation decisions
```

When planning phase N, agents load:
- PROJECT.md (core vision)
- REQUIREMENTS.md (scope)
- ROADMAP.md (where we are)
- STATE.md (prior decisions)
- Previous phase SUMMARY.md files (what's already built)
- {phase}-CONTEXT.md if exists (user's phase vision)

This creates incrementally-enriched context — new information only when relevant.

## Key Abstractions

**Task:**
- Purpose: Smallest independently executable unit of work
- Examples: Create login endpoint, implement search filter, write test suite
- Pattern: XML-structured with `<name>`, `<files>`, `<action>`, `<verify>`, `<done>` fields
- Execution: Executor reads action, implements, verifies against done criteria

**Plan:**
- Purpose: 2-3 related tasks that can execute in one context window
- Format: `{phase}-{N}-PLAN.md` with frontmatter (phase, plan, wave, depends_on) + objective + tasks
- Execution: Executor loads once, runs all tasks, commits atomically per task, creates SUMMARY.md
- Optimization: Keep under 50% context usage to avoid quality degradation

**Phase:**
- Purpose: Logical milestone with 2-3 related plans
- Format: Directory named `XX-{phase-name}/` containing multiple PLAN.md files
- Dependencies: Plans within phase can depend on each other via `depends_on` frontmatter
- Execution: Waves run sequentially, independent tasks within wave run parallel

**Wave:**
- Purpose: Parallel execution boundary — tasks in same wave are independent
- Format: Frontmatter field `wave: 1`, `wave: 2` etc
- Grouping: execute-phase analyzes `depends_on`, auto-assigns waves if not explicit
- Execution: All wave 1 tasks spawn in parallel, wait for completion, then wave 2

**Agent:**
- Purpose: Specialized Claude context for a workflow phase
- Execution: Spawned via Task tool with specific role and execution flow
- Isolation: Fresh 200k context per agent, no accumulated context pressure
- Specialization: Planner focuses on task decomposition, executor on implementation, verifier on validation

## Entry Points

**Slash Commands:**
- Location: `commands/gsd/*.md` (27 command files)
- Triggers: User types `/gsd:command-name` in Claude Code
- Responsibilities: Parse arguments, validate preconditions, load execution context, route to workflow

**Key command files:**
- `commands/gsd/new-project.md` — Project initialization
- `commands/gsd/plan-phase.md` — Phase planning orchestrator
- `commands/gsd/execute-phase.md` — Parallel execution orchestrator
- `commands/gsd/verify-work.md` — User acceptance testing

**Installer:**
- Location: `bin/install.js`
- Triggers: `npx get-shit-done-cc` or `node bin/install.js --local`
- Responsibilities: Copy all prompts to Claude config directory, create folder structure, provide verification

**Workflows:**
- Location: `get-shit-done/workflows/*.md`
- Triggers: Loaded via `@~/.claude/get-shit-done/workflows/...` references in commands
- Responsibilities: Orchestrate multi-agent flows, handle retries, collect results

## Error Handling

**Strategy:** Automatic remediation with visibility

**Patterns:**
- **Blocking errors** — Task prerequisites failed, cannot proceed (e.g., missing dependency)
  - Executor detects and halts
  - Creates error in SUMMARY.md
  - User must fix and re-execute plan

- **Auto-fixable deviations** — Plan incomplete or violates rules, fix and continue
  - Executor has deviation rules (e.g., "add security check if missing")
  - Auto-applies fix and documents in SUMMARY.md under "Deviations"
  - Task commits include the auto-fix

- **Checkpoint pauses** — Human decision required
  - Executor pauses at `type="checkpoint:human-verify"` tasks
  - Waits for user input before continuing
  - Resumes via `/gsd:resume-work`

- **Verification failures** — Code exists but doesn't work
  - Verifier checks code against goals, finds issues
  - Spawns debugger to diagnose
  - Creates fix plans ready for re-execution

- **Git conflicts** — Multiple executors touching same files (rare, wave-based)
  - execute-phase analyzer prevents by assigning non-conflicting waves
  - If conflict occurs: executor detects, halts, reports in SUMMARY.md

## Cross-Cutting Concerns

**Logging:** Structured via shell scripts and Claude's built-in output
- Orchestrators report step completions and transitions
- Agents log decision points and deviations
- Executors log per-task commits and issues
- All logged to SUMMARY.md after completion

**Validation:** Three-layer validation chain
1. **Pre-execution** — plan-phase validates against requirements via checker
2. **Execution-time** — executor validates task outputs against done criteria
3. **Post-execution** — verifier validates codebase against phase goals

**Authentication/Authorization:** Not applicable (solo developer + Claude)
- All operations scoped to current project directory
- State files in .planning/ control workflow progression

**State Management:** Project state machine via STATE.md
- Records current phase/plan/task position
- Captures accumulated decisions affecting future work
- Records blockers/concerns to watch for
- Enables `/gsd:pause-work` and `/gsd:resume-work` recovery

---

*Architecture analysis: 2026-01-23*
