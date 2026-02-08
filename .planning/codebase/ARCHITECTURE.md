# Architecture

**Analysis Date:** 2026-02-08

## Pattern Overview

**Overall:** Command-driven agent orchestration framework

**Key Characteristics:**
- Markdown-based command and agent definitions (no compiled code)
- Orchestrator pattern with subagent spawning for parallel execution
- Template-driven document generation for project planning artifacts
- Multi-runtime adaptation layer (Claude Code, OpenCode, Gemini, Cursor)
- Wave-based execution model for dependency management

## Layers

**Command Layer:**
- Purpose: User-facing slash commands (`/gsd:new-project`, `/gsd:execute-phase`)
- Location: `commands/gsd/*.md`
- Contains: Command definitions with frontmatter, objective, process steps, success criteria
- Depends on: Workflows, templates, references
- Used by: Claude Code runtime (invoked via slash command)

**Agent Layer:**
- Purpose: Specialized subagents for specific tasks (planner, executor, verifier, mapper)
- Location: `agents/gsd-*.md`
- Contains: Agent role definitions, execution flows, tool permissions
- Depends on: Workflows, templates, references
- Used by: Orchestrator commands via Task tool spawning

**Workflow Layer:**
- Purpose: Reusable multi-step procedures shared across commands
- Location: `get-shit-done/workflows/*.md`
- Contains: Step-by-step workflows (execute-phase, map-codebase, verify-phase)
- Depends on: Templates, references
- Used by: Commands and agents via `@~/.claude/get-shit-done/workflows/{name}.md` references

**Template Layer:**
- Purpose: Document templates for generated planning artifacts
- Location: `get-shit-done/templates/*.md`
- Contains: Markdown templates with placeholders for PROJECT.md, ROADMAP.md, PLAN.md, etc.
- Depends on: Reference documents for guidance
- Used by: Agents writing planning documents

**Reference Layer:**
- Purpose: Core principles and guidance documents
- Location: `get-shit-done/references/*.md`
- Contains: Questioning techniques, TDD patterns, checkpoint protocols, git integration
- Depends on: None (foundational knowledge)
- Used by: Commands, agents, workflows

**Installation Layer:**
- Purpose: Runtime adaptation and file installation
- Location: `bin/install.js`
- Contains: Runtime detection, path replacement, frontmatter conversion, hook registration
- Depends on: File system operations, JSON parsing
- Used by: npx installation process

**Hook Layer:**
- Purpose: Runtime integration (statusline, update checking)
- Location: `hooks/*.js`
- Contains: Node.js scripts for statusline display and update detection
- Depends on: File system, npm registry access
- Used by: Runtime via settings.json hook configuration

## Data Flow

**Command Execution Flow:**

1. User invokes slash command (`/gsd:new-project`)
2. Runtime loads command definition from `commands/gsd/new-project.md`
3. Command orchestrator reads workflow from `get-shit-done/workflows/discovery-phase.md`
4. Orchestrator spawns subagents via Task tool (e.g., `gsd-project-researcher`, `gsd-roadmapper`)
5. Subagents read templates and references, generate documents
6. Documents written to `.planning/` directory
7. Git commits created atomically per artifact
8. Results aggregated and presented to user

**Phase Execution Flow:**

1. User invokes `/gsd:execute-phase 3`
2. Orchestrator reads `get-shit-done/workflows/execute-phase.md`
3. Discovers plans in `.planning/phases/03-*/` directory
4. Groups plans by wave number (from plan frontmatter)
5. For each wave:
   - Reads plan files and STATE.md
   - Spawns parallel `gsd-executor` agents (if `PARALLELIZATION=true`)
   - Each executor loads full workflow context independently
   - Executors commit tasks atomically
   - Orchestrator waits for all agents in wave to complete
6. After all waves: spawns `gsd-verifier` to check phase goal
7. Updates ROADMAP.md, STATE.md, REQUIREMENTS.md
8. Presents results and next steps

**Installation Flow:**

1. User runs `npx get-shit-done-cc --claude --global`
2. `bin/install.js` detects runtime (Claude Code)
3. Determines target directory (`~/.claude/` or custom)
4. Copies `commands/gsd/` → `{target}/commands/gsd/`
5. Copies `get-shit-done/` → `{target}/get-shit-done/`
6. Copies `agents/gsd-*.md` → `{target}/agents/`
7. Converts frontmatter for runtime compatibility:
   - Tool names (PascalCase → snake_case for Cursor/Gemini)
   - Path references (`~/.claude/` → `~/.cursor/` for Cursor)
   - Command format (`/gsd:` → `/gsd-` for OpenCode)
8. Registers hooks in `settings.json` (statusline, update check)
9. Writes VERSION file for update detection

**State Management:**
- Project state: `.planning/STATE.md` (current position, decisions, blockers)
- Configuration: `.planning/config.json` (workflow mode, model profile, agent toggles)
- Planning artifacts: `.planning/phases/*/` (PLAN.md, SUMMARY.md, VERIFICATION.md)
- Roadmap: `.planning/ROADMAP.md` (phase structure, requirement mappings)
- Requirements: `.planning/REQUIREMENTS.md` (scoped requirements with traceability)

## Key Abstractions

**Command Definition:**
- Purpose: Declarative command specification
- Examples: `commands/gsd/new-project.md`, `commands/gsd/execute-phase.md`
- Pattern: YAML frontmatter (name, description, allowed-tools) + markdown process steps

**Agent Definition:**
- Purpose: Subagent role and behavior specification
- Examples: `agents/gsd-planner.md`, `agents/gsd-executor.md`
- Pattern: YAML frontmatter (name, description, tools) + role definition + execution flow

**Workflow:**
- Purpose: Reusable procedure steps
- Examples: `get-shit-done/workflows/execute-phase.md`, `get-shit-done/workflows/map-codebase.md`
- Pattern: Step-by-step process with bash commands, file operations, agent spawning

**Template:**
- Purpose: Document structure for generated artifacts
- Examples: `get-shit-done/templates/project.md`, `get-shit-done/templates/plan.md`
- Pattern: Markdown with placeholder sections and guidance comments

**Wave:**
- Purpose: Dependency grouping for parallel execution
- Examples: Plans with `wave: 1` execute before `wave: 2`
- Pattern: Pre-computed during planning, stored in plan frontmatter

**Checkpoint:**
- Purpose: Human interaction point in autonomous execution
- Examples: Plans with `autonomous: false` pause for user approval
- Pattern: Executor returns structured checkpoint state, orchestrator presents to user, spawns continuation agent

## Entry Points

**CLI Installation:**
- Location: `bin/install.js`
- Triggers: `npx get-shit-done-cc` or direct execution
- Responsibilities: Runtime detection, file copying, path replacement, hook registration, settings configuration

**Slash Commands:**
- Location: `commands/gsd/*.md`
- Triggers: User invokes `/gsd:{command-name}` in Claude Code
- Responsibilities: Orchestrate workflow, spawn agents, present results

**Hooks:**
- Location: `hooks/gsd-statusline.js`, `hooks/gsd-check-update.js`
- Triggers: Runtime events (SessionStart, statusline refresh)
- Responsibilities: Display statusline, check for updates, write cache files

## Error Handling

**Strategy:** Fail gracefully with user guidance

**Patterns:**
- File operations: Check existence before read, handle missing gracefully
- JSON parsing: Try-catch with fallback to defaults
- Agent failures: Report which plan failed, offer continue/stop options
- Checkpoint failures: Ask user to skip plan or abort phase
- Installation failures: Verify each step, report specific failures

**Error Recovery:**
- Resumable execution: Re-run command to skip completed plans
- State persistence: STATE.md tracks position for resumption
- Atomic commits: Each task commits independently, partial progress preserved

## Cross-Cutting Concerns

**Logging:** No formal logging framework. Commands output progress inline. Hooks write to stdout/stderr.

**Validation:** Bash-based validation in workflows (file existence, JSON parsing, git status). No schema validation for config.json.

**Authentication:** Not applicable (local CLI tool, no auth required)

**Configuration Management:**
- Runtime config: `settings.json` in runtime config directory (managed by installer)
- Project config: `.planning/config.json` (user-editable, committed to git)
- Model profile: Resolved from config.json, determines which AI model each agent uses

**Path Management:**
- Source paths: Hardcoded as `~/.claude/` in repository files
- Runtime adaptation: Installer replaces paths based on target runtime
- Cross-platform: Uses forward slashes in hook commands for Windows compatibility

**Multi-Runtime Support:**
- Tool name mapping: PascalCase (Claude) → snake_case (Cursor/Gemini) → lowercase (OpenCode)
- Frontmatter conversion: Strips unsupported fields, converts formats
- Command structure: Nested (`commands/gsd/help.md`) vs flat (`command/gsd-help.md` for OpenCode)
- Hook support: Cursor has no statusline, OpenCode uses themes instead

---

*Architecture analysis: 2026-02-08*
