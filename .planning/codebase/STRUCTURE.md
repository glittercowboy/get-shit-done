# Codebase Structure

**Analysis Date:** 2026-01-24

## Directory Layout

```
get-shit-done/
├── bin/                           # Installation and bootstrap
│   └── install.js                 # Main installer; copies GSD to ~/.claude/get-shit-done/
├── commands/gsd/                  # User-facing commands
│   ├── new-project.md             # Project initialization (questioning → roadmap)
│   ├── map-codebase.md            # Codebase analysis
│   ├── plan-phase.md              # Create execution plan for phase
│   ├── execute-phase.md           # Execute plan with atomic commits
│   ├── verify-work.md             # Verify execution against requirements
│   ├── discuss-phase.md           # Gather context before planning
│   ├── research-phase.md          # Domain research for phase
│   ├── debug.md                   # Diagnostic troubleshooting
│   ├── pause-work.md              # Pause current work
│   ├── resume-work.md             # Resume from checkpoint
│   ├── progress.md                # Show current project status
│   ├── settings.md                # Update workflow config
│   ├── add-phase.md               # Insert new phase into roadmap
│   ├── new-milestone.md           # Start next milestone
│   └── [12+ more commands]        # Other workflow commands
├── agents/                        # Specialized agent definitions
│   ├── gsd-codebase-mapper.md     # Analyzes codebase; writes STACK.md, ARCHITECTURE.md, etc.
│   ├── gsd-planner-core.md        # Core planning logic
│   ├── gsd-planner-extended.md    # Extended planning with research integration
│   ├── gsd-planner.md             # Full planner with config-driven features
│   ├── gsd-executor-core.md       # Core execution logic
│   ├── gsd-executor-extended.md   # Extended executor with deviation handling
│   ├── gsd-executor.md            # Full executor with checkpoint protocol
│   ├── gsd-verifier-core.md       # Core verification logic
│   ├── gsd-verifier-extended.md   # Extended verification with reports
│   ├── gsd-verifier.md            # Full verifier
│   ├── gsd-project-researcher.md  # Base researcher instructions
│   ├── gsd-project-researcher-base.md       # Shared research base
│   ├── gsd-project-researcher-stack.md      # Stack research
│   ├── gsd-project-researcher-features.md   # Features research
│   ├── gsd-project-researcher-architecture.md # Architecture research
│   ├── gsd-project-researcher-pitfalls.md   # Pitfalls research
│   ├── gsd-research-synthesizer.md # Synthesize 4 research outputs
│   ├── gsd-roadmapper.md          # Create phase structure from requirements
│   ├── gsd-phase-researcher.md    # Research for specific phase
│   ├── gsd-plan-checker.md        # Verify plans achieve goals
│   ├── gsd-integration-checker.md # Check external integrations
│   ├── gsd-debugger.md            # Diagnostic and troubleshooting
│   └── [others]                   # Additional specialized agents
├── get-shit-done/                 # System configuration and templates
│   ├── workflows/                 # Orchestration workflows
│   │   ├── map-codebase.md        # Coordinate codebase mapping agents
│   │   ├── execute-plan.md        # Execute phase with checkpoints
│   │   ├── execute-plan-compact.md # Lightweight execution flow
│   │   ├── verify-work.md         # Verification orchestration
│   │   ├── discover-phase.md      # Gather phase context
│   │   ├── execute-phase.md       # Full phase execution flow
│   │   ├── transition.md          # Move to next phase
│   │   ├── complete-milestone.md  # Wrap up milestone
│   │   ├── resume-project.md      # Resume from checkpoint
│   │   ├── discuss-phase.md       # Pre-planning discussion
│   │   ├── diagnose-issues.md     # Troubleshooting workflow
│   │   └── [others]               # Additional workflows
│   ├── references/                # Guidance and documentation
│   │   ├── questioning.md         # Techniques for deep questioning
│   │   ├── verification-patterns.md # How to verify delivery
│   │   ├── git-integration.md     # Git commit patterns
│   │   ├── planning-config.md     # Configuration options
│   │   ├── continuation-format.md # Next-steps presentation
│   │   ├── model-profiles.md      # Agent model selection
│   │   ├── tdd.md                 # TDD execution pattern
│   │   ├── checkpoints.md         # Checkpoint protocol
│   │   ├── ui-brand.md            # Brand and UI guidelines
│   │   └── [others]               # Additional references
│   ├── templates/                 # Output artifact templates
│   │   ├── project.md             # PROJECT.md template
│   │   ├── requirements.md        # REQUIREMENTS.md template
│   │   ├── roadmap.md             # ROADMAP.md template
│   │   ├── state.md               # STATE.md template
│   │   ├── config.json            # config.json schema with defaults
│   │   ├── summary.md             # SUMMARY.md template
│   │   ├── context.md             # CONTEXT.md template
│   │   ├── UAT.md                 # User acceptance test template
│   │   ├── verification-report.md # Verification report template
│   │   ├── debug-subagent-prompt.md # Debug prompt template
│   │   ├── phase-prompt.md        # Phase execution guidance
│   │   ├── research.md            # General research template
│   │   ├── codebase/              # Codebase analysis templates
│   │   │   ├── STACK.md           # Technology stack template
│   │   │   ├── INTEGRATIONS.md    # External integrations template
│   │   │   ├── ARCHITECTURE.md    # Codebase architecture template
│   │   │   ├── STRUCTURE.md       # Directory structure template
│   │   │   ├── CONVENTIONS.md     # Coding conventions template
│   │   │   ├── TESTING.md         # Testing patterns template
│   │   │   └── CONCERNS.md        # Technical concerns template
│   │   └── research-project/      # Project research templates
│   │       ├── STACK.md
│   │       ├── FEATURES.md
│   │       ├── ARCHITECTURE.md
│   │       ├── PITFALLS.md
│   │       └── SUMMARY.md
│   └── references/                # (duplicate, for reference docs)
├── hooks/                         # Git hooks (pre-commit, status)
│   ├── gsd-check-update.js       # Check for package updates
│   ├── gsd-statusline.js         # Display GSD status in prompt
│   └── dist/                     # Compiled hook scripts
├── scripts/                       # Build and utility scripts
│   └── build-hooks.js            # Compile hook scripts for distribution
├── .planning/                     # Project planning directory (created per-project)
│   ├── codebase/                 # Codebase analysis (written by mapper agents)
│   │   ├── STACK.md              # Technologies, runtime, frameworks
│   │   ├── INTEGRATIONS.md       # External APIs, databases, auth
│   │   ├── ARCHITECTURE.md       # System design patterns
│   │   ├── STRUCTURE.md          # Directory layout and organization
│   │   ├── CONVENTIONS.md        # Code style and naming patterns
│   │   ├── TESTING.md            # Test structure and frameworks
│   │   └── CONCERNS.md           # Technical debt and issues
│   ├── research/                 # Domain research (if research phase enabled)
│   │   ├── STACK.md              # Standard stack for domain
│   │   ├── FEATURES.md           # Table stakes vs differentiators
│   │   ├── ARCHITECTURE.md       # Typical system architecture
│   │   ├── PITFALLS.md           # Common mistakes and prevention
│   │   └── SUMMARY.md            # Synthesis of all research
│   ├── PROJECT.md                # Project vision and scope (main artifact)
│   ├── REQUIREMENTS.md           # v1/v2 features with IDs
│   ├── ROADMAP.md                # Phase structure with requirement mapping
│   ├── STATE.md                  # Execution checkpoint and context
│   ├── config.json               # Workflow preferences
│   ├── PLAN.md                   # Current phase execution plan (ephemeral)
│   ├── SUMMARY.md                # Current phase execution results (ephemeral)
│   └── [phase-archives]/         # Archive of previous phases (optional)
├── package.json                  # NPM metadata
├── package-lock.json             # Dependency lock file
└── README.md                      # Main documentation
```

## Directory Purposes

**`bin/`:**
- Purpose: Installation and bootstrap
- Contains: JavaScript entry point for npm package
- Key files: `install.js` — copies GSD system into Claude Code config directory

**`commands/gsd/`:**
- Purpose: User-facing command definitions
- Contains: `.md` files defining available `/gsd:*` commands
- Key files: `new-project.md`, `map-codebase.md`, `plan-phase.md`, `execute-phase.md`, `verify-work.md`
- Pattern: Each file has frontmatter (name, description, allowed-tools) + `<execution_context>` pointing to workflow

**`agents/`:**
- Purpose: Specialized agent instruction sets
- Contains: Agent role definitions and execution logic
- Key files: `gsd-executor.md`, `gsd-planner.md`, `gsd-codebase-mapper.md`, `gsd-verifier.md`
- Pattern: Each agent has `<role>`, `<execution_flow>` or `<process>`, and specific output expectations

**`get-shit-done/workflows/`:**
- Purpose: Multi-step orchestration workflows
- Contains: Workflow definitions referenced by commands
- Key files: `map-codebase.md`, `execute-plan.md`, `execute-phase.md`
- Pattern: Sequential `<step>` blocks; spawns agents via Task tool with `subagent_type`

**`get-shit-done/references/`:**
- Purpose: Guidance and best practices
- Contains: Deep documentation on patterns, techniques, configuration
- Key files: `questioning.md`, `verification-patterns.md`, `git-integration.md`
- Pattern: Consultative; read by agents before execution to understand pattern requirements

**`get-shit-done/templates/`:**
- Purpose: Standardize output format
- Contains: Markdown and JSON templates for all artifacts
- Key files: `project.md`, `roadmap.md`, `state.md`, `config.json`
- Pattern: Filled by agents/orchestrators; structure is fixed but content varies by project

**`.planning/`:**
- Purpose: Project-specific planning directory
- Contains: Project state, roadmap, execution plans, results
- Generated by: `/gsd:new-project`, `/gsd:map-codebase`, planning/execution agents
- Key files:
  - `PROJECT.md` — immutable project vision
  - `ROADMAP.md` — phase structure (modified only if scope changes)
  - `STATE.md` — current execution checkpoint (updated per-task)
  - `PLAN.md` — current phase tasks (ephemeral)
  - `SUMMARY.md` — current phase results (ephemeral)
  - `codebase/` — codebase analysis documents (7 files)
  - `research/` — domain research (5 files, optional)
  - `config.json` — workflow preferences

## Key File Locations

**Entry Points:**
- `bin/install.js` — Installation script; called by `npm install`
- `commands/gsd/*.md` — Command entry points; user types `/gsd:command-name`

**Configuration:**
- `.planning/config.json` — Workflow preferences (mode, depth, parallelization, agents)
- `.planning/PROJECT.md` — Project context (vision, scope, constraints)

**Core Logic:**
- `agents/gsd-executor.md` — Plan execution with commit protocol
- `agents/gsd-planner.md` — Create PLAN.md from phase context
- `agents/gsd-verifier.md` — Validation against requirements
- `agents/gsd-codebase-mapper.md` — Codebase analysis
- `get-shit-done/workflows/execute-plan.md` — Execution orchestration

**Testing:**
- No unit test files in codebase (markdown-based; no tests needed for documentation)
- Verification through `/gsd:verify-work` and execution SUMMARY.md

## Naming Conventions

**Files:**

- **Commands**: `kebab-case.md` in `commands/gsd/` (e.g., `new-project.md`, `map-codebase.md`)
- **Agents**: `gsd-kebab-case.md` in `agents/` (e.g., `gsd-executor.md`, `gsd-planner.md`)
- **Workflows**: `kebab-case.md` in `get-shit-done/workflows/` (e.g., `map-codebase.md`, `execute-plan.md`)
- **Templates**: Descriptive name matching artifact (e.g., `project.md`, `roadmap.md`, `state.md`)
- **Project artifacts**: UPPERCASE.md (e.g., `PROJECT.md`, `ROADMAP.md`, `REQUIREMENTS.md`)
- **Codebase analysis**: UPPERCASE.md (e.g., `STACK.md`, `ARCHITECTURE.md`, `CONVENTIONS.md`)

**Directories:**

- **Feature-based**: `get-shit-done/workflows/`, `get-shit-done/references/`, `get-shit-done/templates/`
- **Domain-based**: `agents/`, `commands/gsd/`
- **Project-based**: `.planning/`, `.planning/codebase/`, `.planning/research/`

## Where to Add New Code

**New Command:**
- Location: `commands/gsd/new-command.md`
- Structure: Frontmatter (name, description) + `<execution_context>` reference to new workflow + process description
- Related workflow: Create corresponding `get-shit-done/workflows/new-command.md`

**New Agent:**
- Location: `agents/gsd-new-agent.md`
- Structure: `<role>`, `<execution_flow>` or `<process>`, clear input/output expectations
- Use patterns: Spawned via Task tool with `subagent_type="gsd-new-agent"`

**New Workflow:**
- Location: `get-shit-done/workflows/new-workflow.md`
- Structure: Sequential `<step>` blocks; use clear step names and descriptions
- Referenced by: One or more commands via `<execution_context>`

**New Reference/Guidance:**
- Location: `get-shit-done/references/topic.md`
- Structure: Consultative; read by agents via prompt context or explicit reference
- Use: Agents consult when pattern guidance needed

**New Template:**
- Location: `get-shit-done/templates/artifact-name.md` or `get-shit-done/templates/[subdir]/ARTIFACT.md`
- Structure: Markdown with clear sections; agents fill by replacing `[placeholder]` text
- Register: Document in `gsd-*` agent that uses this template

## Special Directories

**`.planning/` — Project Planning Directory:**
- Purpose: Persistent project context between invocations
- Generated: Automatically by `/gsd:new-project` and planning agents
- Committed: Yes (default) or No (if `commit_docs: false` in config.json)
- Files:
  - `PROJECT.md`, `ROADMAP.md`, `REQUIREMENTS.md` — immutable project definition
  - `STATE.md` — mutable checkpoint tracker
  - `config.json` — workflow preferences
  - `PLAN.md`, `SUMMARY.md` — ephemeral per-execution artifacts
  - `codebase/` — written by `/gsd:map-codebase`
  - `research/` — written by `/gsd:new-project` research phase (optional)

**`agents/` — Agent Definitions:**
- Purpose: Reusable instruction sets for specialized work
- Structure: Each agent is self-contained `.md` file with complete execution logic
- Spawning: Orchestrators spawn via Task tool with `subagent_type="gsd-agent-name"`
- Tiering: `core` variants have minimal logic; `extended` adds features; base agent is full-featured

**`get-shit-done/templates/codebase/` — Codebase Analysis Templates:**
- Purpose: Standardize codebase mapping output
- Written by: `gsd-codebase-mapper` agent spawned by `/gsd:map-codebase`
- Files:
  - `STACK.md` — Technologies and dependencies
  - `INTEGRATIONS.md` — External services
  - `ARCHITECTURE.md` — System design
  - `STRUCTURE.md` — Directory layout
  - `CONVENTIONS.md` — Code patterns
  - `TESTING.md` — Test structure
  - `CONCERNS.md` — Technical debt

**`get-shit-done/templates/research-project/` — Domain Research Templates:**
- Purpose: Standardize project research output
- Written by: 4 parallel `gsd-project-researcher-*` agents during `/gsd:new-project` research phase
- Files:
  - `STACK.md` — Standard technology stack for domain
  - `FEATURES.md` — Table stakes vs differentiators
  - `ARCHITECTURE.md` — Typical system design
  - `PITFALLS.md` — Common mistakes
  - `SUMMARY.md` — Synthesis created by research-synthesizer

## Tiered Agent Structure

Agents use a three-tier approach to reduce context bloat:

**Tier 1 — Core (`gsd-executor-core.md`):**
- Minimal instruction set; essential logic only
- ~200-300 lines
- Used for simple, well-scoped work

**Tier 2 — Extended (`gsd-executor-extended.md`):**
- Core + additional features (deviation handling, detailed checkpoints)
- ~400-600 lines
- Used when more control needed

**Tier 3 — Full (`gsd-executor.md`):**
- All features; full deviation rules, checkpoint protocol, state management
- ~800-1000 lines
- Used for complex execution; config-driven to select agent tier

Pattern: Workflows select which tier based on `config.json` complexity settings.

---

*Structure analysis: 2026-01-24*
