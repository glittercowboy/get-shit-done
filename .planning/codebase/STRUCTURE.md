# Codebase Structure

**Analysis Date:** 2026-01-23

## Directory Layout

```
get-shit-done/
├── bin/                          # Installation & setup
│   └── install.js                # Node.js installer (1290 lines)
│
├── commands/gsd/                 # Slash command entry points (27 files)
│   ├── new-project.md            # Initialize project: questions → research → roadmap
│   ├── plan-phase.md             # Create phase plans with verification loop
│   ├── execute-phase.md          # Orchestrate parallel plan execution
│   ├── verify-work.md            # Manual user acceptance testing
│   ├── discuss-phase.md          # Capture implementation decisions before planning
│   ├── add-phase.md              # Append phase to roadmap
│   ├── insert-phase.md           # Insert urgent work between phases
│   ├── remove-phase.md           # Remove future phase, renumber
│   ├── complete-milestone.md     # Archive milestone, tag release
│   ├── new-milestone.md          # Start next version
│   ├── audit-milestone.md        # Verify milestone achieved goals
│   ├── pause-work.md             # Create handoff when stopping mid-phase
│   ├── resume-work.md            # Restore from last session
│   ├── progress.md               # Show current position and next steps
│   ├── help.md                   # Show all commands and usage guide
│   ├── whats-new.md              # See what changed since installed version
│   ├── update.md                 # Update GSD with changelog preview
│   ├── settings.md               # Configure model profile and workflow agents
│   ├── set-profile.md            # Switch model profile (quality/balanced/budget)
│   ├── quick.md                  # Execute ad-hoc task with GSD guarantees
│   ├── debug.md                  # Systematic debugging with persistent state
│   ├── add-todo.md               # Capture idea for later
│   ├── check-todos.md            # List pending todos
│   ├── list-phase-assumptions.md # See Claude's intended approach before planning
│   ├── plan-milestone-gaps.md    # Create phases to close gaps from audit
│   ├── research-phase.md         # Standalone research for decision-making
│   └── map-codebase.md           # Analyze existing codebase before new-project
│
├── agents/                       # Specialized agent definitions (11 files)
│   ├── gsd-planner.md            # Decomposes phases into executable plans
│   ├── gsd-executor.md           # Executes plans, commits per-task, creates summaries
│   ├── gsd-verifier.md           # Validates codebase against phase goals
│   ├── gsd-debugger.md           # Diagnoses issues from verification failures
│   ├── gsd-phase-researcher.md   # Investigates implementation patterns for phase
│   ├── gsd-project-researcher.md # Broad domain research for new-project
│   ├── gsd-research-synthesizer.md  # Synthesizes research findings into context
│   ├── gsd-roadmapper.md         # Creates phase roadmap from requirements
│   ├── gsd-plan-checker.md       # Verifies plans achieve phase goals
│   ├── gsd-integration-checker.md # Validates third-party API implementations
│   └── gsd-codebase-mapper.md    # Analyzes brownfield codebases (parallel agents)
│
├── get-shit-done/                # Runtime assets (installed to ~/.claude/)
│   ├── workflows/                # Orchestration flows (12 files)
│   │   ├── execute-plan.md       # Execute single PLAN.md (task loop, commits, deviations)
│   │   ├── execute-phase.md      # Orchestrate parallel plan execution by waves
│   │   ├── verify-phase.md       # Check code against phase goals
│   │   ├── verify-work.md        # Walk user through UAT checklist
│   │   ├── plan-phase.md         # Planning orchestration (research → planner → checker loop)
│   │   ├── discovery-phase.md    # New-project flow (questions → research → requirements → roadmap)
│   │   ├── discuss-phase.md      # Capture user vision before planning
│   │   ├── diagnose-issues.md    # Debug workflow from verification failures
│   │   ├── complete-milestone.md # Archive and release workflow
│   │   ├── transition.md         # Handoff/resume state management
│   │   ├── list-phase-assumptions.md  # Show planner's intended approach
│   │   └── resume-project.md     # Restore from paused state
│   │
│   ├── templates/                # Canonical document formats (22 files)
│   │   ├── project.md            # PROJECT.md structure and guidelines
│   │   ├── requirements.md       # REQUIREMENTS.md with v1/v2/out-of-scope structure
│   │   ├── roadmap.md            # ROADMAP.md with phase templates
│   │   ├── summary.md            # {phase}-{N}-SUMMARY.md with frontmatter metadata
│   │   ├── context.md            # {phase}-CONTEXT.md user vision capture
│   │   ├── state.md              # STATE.md accumulated decisions and position
│   │   ├── phase-prompt.md       # Full phase execution prompt structure
│   │   ├── planner-subagent-prompt.md  # Planner invocation template
│   │   ├── debug-subagent-prompt.md    # Debugger invocation template
│   │   ├── config.json           # .planning/config.json default structure
│   │   ├── UAT.md                # User acceptance test format
│   │   ├── DEBUG.md              # Debug session tracking
│   │   ├── user-setup.md         # External service setup instructions
│   │   ├── verification-report.md    # Full verification result format
│   │   ├── continuation-format.md    # Resume/pause state format
│   │   ├── milestone.md          # Milestone structure
│   │   ├── milestone-archive.md  # Archived milestone format
│   │   ├── discovery.md          # Research discovery format
│   │   ├── research.md           # Research findings format
│   │   ├── continue-here.md      # Pause point template
│   │   └── codebase/             # Codebase analysis templates (brownfield)
│   │       └── [4 templates]     # ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, etc.
│   │
│   ├── references/               # Reference documentation (9 files)
│   │   ├── checkpoints.md        # When/how to use human checkpoints in plans
│   │   ├── verification-patterns.md # Patterns for verifying code works
│   │   ├── questioning.md        # New-project questioning framework
│   │   ├── git-integration.md    # Per-task commits, format, strategy
│   │   ├── tdd.md                # TDD execution patterns in GSD
│   │   ├── model-profiles.md     # Agent model assignments (quality/balanced/budget)
│   │   ├── planning-config.md    # Configuration options for workflows
│   │   ├── ui-brand.md           # Standard UI/UX for command output
│   │   └── continuation-format.md # Resume/pause state management
│
├── hooks/                        # Git/runtime hooks (2 files)
│   ├── gsd-check-update.js       # Hook to check for GSD updates
│   └── gsd-statusline.js         # Hook for status output
│
├── scripts/                      # Build scripts
│   └── build-hooks.js            # Compile hooks to hooks/dist/
│
├── assets/                       # Static assets
│   └── terminal.svg              # Install flow diagram
│
├── .github/workflows/            # CI/CD (release automation)
│
├── .planning/                    # Project state (git-tracked or ignored)
│   └── codebase/                 # Codebase analysis documents (generated)
│       ├── ARCHITECTURE.md
│       ├── STRUCTURE.md
│       ├── CONVENTIONS.md
│       └── CONCERNS.md
│
├── package.json                  # NPM package metadata (v1.9.8)
├── package-lock.json             # Dependency lock
├── CLAUDE.md                      # Developer guidance for Claude Code
├── README.md                      # User guide (20,150 bytes)
├── CONTRIBUTING.md               # Contributor guidelines
├── CHANGELOG.md                  # Release history (44,958 bytes)
├── MAINTAINERS.md                # Maintainer information
├── GSD-STYLE.md                  # Code style guide for GSD documents
├── LICENSE                        # MIT license
└── .gitignore                     # Version control exclusions
```

## Directory Purposes

**bin/**
- Purpose: Installation entry point
- Contains: `install.js` — Node.js script that copies all runtime files to Claude config directories
- Key responsibility: Interactive/non-interactive prompts for runtime selection, global/local choice, path expansion

**commands/gsd/**
- Purpose: Slash command definitions — user-facing entry points
- Contains: 27 markdown files with YAML frontmatter and XML-structured prompts
- File pattern: `{command-name}.md` with frontmatter (`name:`, `description:`, `allowed-tools:`, `argument-hint:`)
- Key responsibility: Parse arguments, validate preconditions, load workflow context, route to orchestration workflows

**agents/**
- Purpose: Specialized Claude agents spawned during workflows
- Contains: 11 markdown files with agent role definition and execution flows
- File pattern: `gsd-{agent-name}.md` with frontmatter (`name:`, `description:`, `tools:`, `color:`)
- Key responsibility: Execute focused work (planning, execution, verification) with specialized logic and decision trees

**get-shit-done/workflows/**
- Purpose: Orchestration logic — coordinate multi-step workflows
- Contains: 12 markdown files with detailed step-by-step execution instructions
- Key responsibility: Coordinate agent spawning, handle decision points, collect results, manage state transitions
- Used by: Commands via `@~/.claude/get-shit-done/workflows/...` references

**get-shit-done/templates/**
- Purpose: Canonical document formats for consistency
- Contains: 22 markdown files defining structure for PROJECT.md, PLAN.md, SUMMARY.md, etc.
- Key responsibility: Provide template structure, field explanations, example data, frontmatter specs
- Used by: Agents when creating new artifacts to ensure consistent format

**get-shit-done/references/**
- Purpose: Reference documentation and best practices
- Contains: 9 markdown files on checkpoints, verification, questioning, git strategy, TDD, etc.
- Key responsibility: Document patterns and conventions that agents follow
- Used by: Agents when implementing workflows, developers when extending system

**hooks/**
- Purpose: Git and runtime hooks
- Contains: `gsd-check-update.js`, `gsd-statusline.js` (2 files)
- Key responsibility: Check for updates, provide status output in user interface

**.planning/**
- Purpose: Project state and artifacts (generated during execution)
- Contains: PROJECT.md, ROADMAP.md, STATE.md, phase directories with PLAN/SUMMARY/RESEARCH files
- Committed: Yes (unless .planning/ is gitignored by user)
- Lifecycle: Created by `/gsd:new-project`, enriched by subsequent commands

## Key File Locations

**Entry Points:**
- `commands/gsd/new-project.md` — Project initialization (28,986 bytes)
- `commands/gsd/execute-phase.md` — Plan execution orchestrator (12,454 bytes)
- `commands/gsd/plan-phase.md` — Planning orchestrator (14,839 bytes)
- `bin/install.js` — Installation (1,290 lines)

**Configuration:**
- `package.json` — NPM package metadata, version, entry point
- `.planning/config.json` — Project workflow settings (model profile, depth, modes)
- `CLAUDE.md` — Developer guidance for Claude Code working in this repo

**Core Logic:**
- `agents/gsd-planner.md` — Task decomposition engine
- `agents/gsd-executor.md` — Plan execution engine
- `agents/gsd-verifier.md` — Goal verification engine
- `get-shit-done/workflows/execute-plan.md` — Task-by-task execution (55,908 bytes, largest workflow)

**Testing/Verification:**
- `get-shit-done/references/verification-patterns.md` — Verification approach guide
- `get-shit-done/templates/UAT.md` — User acceptance test format

**Documentation:**
- `README.md` — User guide (20 KB)
- `CHANGELOG.md` — Release history (44 KB)
- `GSD-STYLE.md` — Document style guidelines (13 KB)
- `CONTRIBUTING.md` — Contributor guidelines (7 KB)

## Naming Conventions

**Files:**
- Slash commands: `{command-name}.md` (lowercase, hyphens) → invoked as `/gsd:command-name`
- Agents: `gsd-{agent-name}.md` (lowercase, hyphens)
- Workflows: `{workflow-name}.md` (lowercase, hyphens)
- Templates: `{artifact-type}.md` or in `codebase/` subdirectory
- References: `{topic}.md` (lowercase, hyphens)

**Directories:**
- Commands: `commands/gsd/` (lowercase)
- Agents: `agents/` (lowercase)
- Runtime assets: `get-shit-done/` (hyphens, matches NPM install path)
- Subdirectories: `workflows/`, `templates/`, `references/` (lowercase)
- Phase directories: `phases/{NN}-{phase-name}/` (zero-padded number, hyphens)

**Project Artifacts:**
- Project description: `.planning/PROJECT.md`
- Requirements: `.planning/REQUIREMENTS.md`
- Roadmap: `.planning/ROADMAP.md`
- State: `.planning/STATE.md`
- Phase plans: `.planning/phases/{NN}-{name}/{phase}-{N}-PLAN.md`
- Phase summaries: `.planning/phases/{NN}-{name}/{phase}-{N}-SUMMARY.md`
- Phase research: `.planning/phases/{NN}-{name}/{phase}-RESEARCH.md`
- Phase context: `.planning/phases/{NN}-{name}/{phase}-CONTEXT.md`

## Where to Add New Code

**New Slash Command:**
- Primary code: `commands/gsd/{command-name}.md`
- Create frontmatter with `name:`, `description:`, `allowed-tools:`, `argument-hint:`
- Reference execution workflow via `@~/.claude/get-shit-done/workflows/{workflow-name}`
- Example: `commands/gsd/help.md` (2,956 bytes)

**New Workflow:**
- Implementation: `get-shit-done/workflows/{workflow-name}.md`
- Structure: XML `<step>` elements with bash and tool invocation instructions
- Can reference agents via Task calls: spawn `gsd-{agent-name}` with model profile
- Example: `get-shit-done/workflows/execute-plan.md` (55,908 bytes)

**New Agent:**
- Implementation: `agents/gsd-{agent-name}.md`
- Structure: `<role>` section, execution flow with `<step>` elements
- Expect to be spawned via Task tool from orchestrators
- Example: `agents/gsd-planner.md` (41,791 bytes)

**New Template:**
- Template format: `get-shit-done/templates/{artifact-type}.md`
- Structure: `<template>` block with markdown example, `<guidelines>` section, optional `<example>`
- Used by agents when creating new artifacts
- Example: `get-shit-done/templates/summary.md` (1 KB frontmatter, 240 lines)

**New Reference:**
- Documentation: `get-shit-done/references/{topic}.md`
- Structure: XML sections (`<overview>`, `<core_principle>`, `<patterns>`, etc.)
- Loaded via `@~/.claude/get-shit-done/references/{topic}` in commands/workflows
- Example: `get-shit-done/references/checkpoints.md` (39,172 bytes)

## Special Directories

**agents/**
- Purpose: Specialization — each agent is a complete self-contained Claude instance
- Generated: No
- Committed: Yes

**get-shit-done/workflows/**
- Purpose: Orchestration templates installed to user's Claude config
- Generated: No
- Committed: Yes

**get-shit-done/templates/**
- Purpose: Format specifications for generated artifacts
- Generated: No
- Committed: Yes

**.planning/**
- Purpose: Project state and execution artifacts
- Generated: Yes (created during `/gsd:new-project` and subsequent commands)
- Committed: Configurable via `config.json` `commit_docs` setting, but usually yes

**.planning/phases/XX-{name}/**
- Purpose: Per-phase artifacts (plans, summaries, research)
- Structure: Named directories with two-digit-prefixed phase number
- Generated: Yes
- Contents:
  - `{phase}-RESEARCH.md` — Domain research before planning
  - `{phase}-{N}-PLAN.md` — Executable plan (1 per concurrent work stream)
  - `{phase}-{N}-SUMMARY.md` — Execution results and metadata
  - `{phase}-CONTEXT.md` — User's implementation decisions (optional)
  - `{phase}-VERIFICATION.md` — Verification results (created if needed)

**hooks/**
- Purpose: Build hooks and runtime integrations
- Generated: No (source in hooks/, built to hooks/dist/)
- Committed: hooks/dist/ committed, source hooks/ version-controlled

**scripts/**
- Purpose: Build automation
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-01-23*
