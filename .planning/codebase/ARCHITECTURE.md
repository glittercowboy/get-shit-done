# Architecture

**Analysis Date:** 2026-01-24

## Pattern Overview

**Overall:** Orchestrated Workflow Engine with Specialized Agent Dispatch

**Key Characteristics:**
- **Orchestrator-Agent Pattern**: Central orchestrators coordinate specialized agent spawning for specific tasks
- **Context Reduction**: Agents write outputs directly to disk; orchestrators don't receive full document contents
- **Stateful Execution**: PROJECT.md, ROADMAP.md, STATE.md, and PLAN.md files persist execution context between invocations
- **Atomic Commit Protocol**: Each executable task produces a commit; execution can resume from any checkpoint
- **Declarative Workflows**: YAML/markdown-based workflow definitions guide orchestrator and agent behavior
- **Template-Driven Output**: All artifacts follow standardized templates with consistent frontmatter and structure

## Layers

**Command Layer (Entry Points):**
- Purpose: User-facing commands triggered by `/gsd:*` directives
- Location: `commands/gsd/`
- Contains: `.md` files defining command semantics (name, description, allowed tools, context references)
- Depends on: Execution context, orchestrator workflows
- Used by: Claude Code interface; each file becomes a runnable command

**Orchestrator Layer:**
- Purpose: Coordinates multi-step workflows, agent spawning, context management
- Location: `get-shit-done/workflows/`
- Contains: Workflow definitions (`*.md`) that specify process steps, decision gates, agent spawning patterns
- Depends on: Command definitions, agent definitions, template structures
- Used by: Commands delegate to workflows for complex execution sequences
- Key Workflows: `map-codebase.md`, `discover-phase.md`, `execute-plan.md`, `verify-work.md`

**Agent Layer:**
- Purpose: Specialized performers executing focused tasks (planning, execution, verification, research)
- Location: `agents/`
- Contains: Agent instruction sets (`gsd-*.md`) that define role, tools, expected inputs, output format
- Depends on: Templates, project context, reference documentation
- Used by: Spawned by orchestrators via Task tool with `subagent_type` parameter
- Key Agents:
  - `gsd-codebase-mapper` — Analyzes codebase; writes STACK.md, ARCHITECTURE.md, CONVENTIONS.md, etc.
  - `gsd-planner` — Creates execution PLAN.md from phase context
  - `gsd-executor` — Executes PLAN.md tasks with commit protocol
  - `gsd-verifier` — Validates execution against requirements
  - `gsd-project-researcher` — Domain research (stack, features, architecture, pitfalls)
  - `gsd-debugger` — Diagnostic troubleshooting

**Data Layer:**
- Purpose: Project state and artifact persistence
- Location: `.planning/` directory (git-tracked or gitignored per config)
- Contains:
  - `PROJECT.md` — Project vision, constraints, scope
  - `ROADMAP.md` — Phase structure with requirements mapping
  - `REQUIREMENTS.md` — Scoped features with IDs and traceability
  - `STATE.md` — Execution checkpoint and accumulated context
  - `PLAN.md` (per-phase) — Task breakdown for execution
  - `SUMMARY.md` (per-phase) — Execution results and deviations
  - `codebase/` — Codebase analysis documents (STACK.md, CONVENTIONS.md, etc.)
  - `config.json` — Workflow preferences and optimization settings
- Depends on: Nothing (terminal state storage)
- Used by: All agents and orchestrators read from here

**Template Layer:**
- Purpose: Standardize output format and structure
- Location: `get-shit-done/templates/`
- Contains: Markdown templates for PROJECT.md, ROADMAP.md, REQUIREMENTS.md, PLAN.md, SUMMARY.md, etc.
- Depends on: Nothing (reference documentation)
- Used by: Agents filling templates when creating artifacts

**Reference Layer:**
- Purpose: Guidance, best practices, patterns
- Location: `get-shit-done/references/`
- Contains: Deep documentation on questioning, verification patterns, git integration, planning config, continuation format
- Depends on: Nothing (documentation)
- Used by: Agents and orchestrators consulting patterns before execution

## Data Flow

**Initialization Flow (new-project):**

1. User invokes `/gsd:new-project`
2. Command loads `commands/gsd/new-project.md` (discovery → questioning → requirements → roadmap)
3. Orchestrator workflow from `get-shit-done/workflows/` coordinates:
   - Deep questioning (inline conversation) → `PROJECT.md`
   - Research decision → conditionally spawn 4 parallel researchers
   - 4 gsd-project-researcher agents run with `subagent_type="gsd-project-researcher"`
   - Results written to `research/STACK.md`, `FEATURES.md`, `ARCHITECTURE.md`, `PITFALLS.md`
   - Research synthesizer merges into `research/SUMMARY.md`
   - Requirements scoping (conversation + research) → `REQUIREMENTS.md`
   - gsd-roadmapper spawned → creates `ROADMAP.md` mapping all requirements to phases
   - All artifacts committed atomically
4. Return: `PROJECT.md`, `ROADMAP.md`, `REQUIREMENTS.md`, `STATE.md`, `config.json` created

**Codebase Mapping Flow (map-codebase):**

1. User invokes `/gsd:map-codebase` [optional focus]
2. Orchestrator checks if `.planning/codebase/` exists (offer refresh or skip)
3. Spawn 4 parallel gsd-codebase-mapper agents:
   - Agent 1 (tech focus) → writes `STACK.md`, `INTEGRATIONS.md`
   - Agent 2 (arch focus) → writes `ARCHITECTURE.md`, `STRUCTURE.md`
   - Agent 3 (quality focus) → writes `CONVENTIONS.md`, `TESTING.md`
   - Agent 4 (concerns focus) → writes `CONCERNS.md`
4. Orchestrator collects confirmations (file paths + line counts, NOT contents)
5. Verify all documents created; commit to git
6. Return: 7 codebase analysis documents written

**Planning Flow (plan-phase):**

1. User invokes `/gsd:plan-phase N`
2. Read `ROADMAP.md`, extract phase N context + requirements
3. Load `.planning/codebase/` documents (ARCHITECTURE.md, CONVENTIONS.md, TESTING.md)
4. Conditional: Spawn gsd-project-researcher for phase-specific research (if config enabled)
5. Conditional: Spawn gsd-plan-checker after plan created (if config enabled)
6. Spawn gsd-planner with rich context:
   - Phase goal, requirements, research, codebase analysis
   - Expected output: `PLAN.md` with tasks, success criteria, verification steps
7. Planner writes `PLAN.md` directly; orchestrator validates structure
8. Return: `PLAN.md` ready for execution

**Execution Flow (execute-phase):**

1. User invokes `/gsd:execute-phase N` or `/gsd:execute-plan`
2. Orchestrator loads `STATE.md` for checkpoint context
3. Read `PLAN.md` for current phase
4. Spawn gsd-executor with plan context
5. Executor reads PROJECT.md, REQUIREMENTS.md, ROADMAP.md, codebase docs
6. For each task in PLAN.md:
   - Execute task (write code, run tests, etc.)
   - Handle deviations automatically (bugs found, scope creep)
   - Commit with atomic message
   - Track completion + commit hash
7. At checkpoint: Executor stops; returns structured checkpoint message
8. Continue: Fresh gsd-executor spawned with `<completed_tasks>` context; resumes from next task
9. At completion: Executor writes `SUMMARY.md` with:
   - Tasks executed + commits
   - Deviations discovered and handled
   - Verification results
   - Success criteria status
10. Return: Phase execution complete; offer next phase

**Verification Flow (verify-work):**

1. User invokes `/gsd:verify-work` [phase N]
2. Load PLAN.md and SUMMARY.md for phase
3. Load REQUIREMENTS.md to extract success criteria
4. Spawn gsd-verifier with full context
5. Verifier reviews:
   - Did all tasks commit successfully? (check git log)
   - Were success criteria met? (test runs, manual checks)
   - Do requirements trace to completed tasks? (REQ-ID mapping)
   - Any gaps or deviations? (compare PLAN vs SUMMARY)
6. Return: VERIFICATION.md with sign-off or identified issues

**State Management:**

- **PROJECT.md**: Persists during entire milestone; updated only when scope changes
- **ROADMAP.md**: Created once per milestone; revised only if requirements change
- **STATE.md**: Updated at every checkpoint; tracks current phase, completed plans, accumulated decisions
- **PLAN.md**: Generated before each plan execution; discarded after SUMMARY written
- **SUMMARY.md**: Persists per-plan; records what actually happened (deviations, decisions, results)
- **config.json**: Set during initialization; can be updated via `/gsd:settings`

## Key Abstractions

**Command:**
- Purpose: User-facing action trigger
- Examples: `commands/gsd/new-project.md`, `commands/gsd/execute-phase.md`
- Pattern: Frontmatter (name, description, allowed-tools) + `<execution_context>` reference pointing to workflow file

**Workflow:**
- Purpose: Multi-step orchestrated process with agent spawning
- Examples: `get-shit-done/workflows/map-codebase.md`, `get-shit-done/workflows/execute-plan.md`
- Pattern: `<process>` section with sequential `<step>` blocks; each step either executes inline or spawns agents via Task tool

**Agent:**
- Purpose: Specialized executor for focused domain
- Examples: `agents/gsd-executor.md`, `agents/gsd-planner.md`
- Pattern: `<role>` defining purpose + `<execution_flow>` or `<process>` with detailed steps; agents read input from prompt context and write outputs directly to disk

**Project State Artifact:**
- Purpose: Persisted context between invocations
- Examples: PROJECT.md, ROADMAP.md, STATE.md, PLAN.md
- Pattern: Frontmatter metadata + content sections; designed for both machine parsing and human reading

## Entry Points

**Command Entry:**
- Location: `commands/gsd/*.md`
- Triggers: User types `/gsd:command-name [args]` in Claude Code
- Responsibilities: Load execution context, delegate to workflow, present results

**Workflow Entry:**
- Location: `get-shit-done/workflows/*.md` (referenced via `<execution_context>` in command)
- Triggers: Command execution or orchestrator invocation
- Responsibilities: Coordinate steps, spawn agents, collect outputs, commit artifacts

**Agent Entry:**
- Location: `agents/gsd-*.md` (spawned via Task tool with `subagent_type`)
- Triggers: Orchestrator Task call with prompt context
- Responsibilities: Read input context, execute focused work, write output artifacts

**Install Entry:**
- Location: `bin/install.js`
- Triggers: `npm install` or package manager
- Responsibilities: Copy GSD system into Claude Code global config (~/.claude/get-shit-done/)

## Error Handling

**Strategy:** Explicit checkpoints with manual gates; automatic deviation handling during execution

**Patterns:**

- **Checkpoint Gates**: Workflows use AskUserQuestion for major decisions (approve roadmap, scope features, confirm plans)
- **Execution Deviation Rules**: Executor automatically handles discovered bugs, adds omitted tasks, adjusts scope per DEVIATION_RULES
- **Verification Failures**: Verifier identifies gaps; returns issues for manual resolution or re-execution
- **Agent Failures**: If agent doesn't complete, workflow catches missing output files and prompts user
- **State Recovery**: STATE.md persists checkpoint; fresh executor can resume from last completed task

## Cross-Cutting Concerns

**Logging:** Console output with section banners (e.g., `━━━━━━━━━━━━ GSD ► PLANNING ━━━━━━━━━━━━`) and progress indicators; stored in SUMMARY.md per-phase

**Validation:** Templates enforce structure; agents validate against templates before writing; STATE.md tracks cumulative validation decisions

**Authentication:** Custom implementation; agents handle auth gates when discovered during execution (e.g., API credentials, environment variables)

**Git Integration:** Atomic commits per task (executor) or per workflow step (orchestrator); commit messages include phase context and reason; respects `commit_docs` config for planning artifacts

**Configuration:** `config.json` drives workflow depth (quick/standard/comprehensive), agent selection (research, plan_check, verifier), and parallelization strategy

---

*Architecture analysis: 2026-01-24*
