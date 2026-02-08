# Codebase Structure

**Analysis Date:** 2026-02-08

## Directory Layout

```
get-shit-done/
├── .github/                    # GitHub repository configuration
├── .planning/                  # Project planning and state management
│   ├── codebase/              # Codebase analysis documents
│   ├── config.json            # Planning configuration
│   ├── milestones/            # Milestone definitions
│   ├── phases/                # Implementation phase plans and summaries
│   ├── research/              # Project research documents
│   ├── MILESTONES.md          # Milestone tracking
│   ├── PROJECT.md             # Project overview
│   └── STATE.md               # Current project state
├── .work/                      # Temporary work directories
├── agents/                     # GSD subagent definitions
├── assets/                     # Static assets (logos, images)
├── bin/                        # Executable entry point
├── commands/                   # GSD command definitions
│   └── gsd/                   # Individual command markdown files
├── cursor-gsd/                 # Cursor IDE adaptation package
│   ├── .github/               # GitHub templates for cursor-gsd
│   ├── docs/                  # Cursor adaptation documentation
│   ├── scripts/               # Installation/migration scripts
│   ├── CHANGELOG.md
│   ├── CONTRIBUTING.md
│   ├── LICENSE
│   ├── MIGRATION.md
│   └── README.md
├── get-shit-done/              # Core GSD framework content
│   ├── references/            # Reference documentation
│   ├── templates/             # Template files for generated content
│   │   ├── codebase/         # Codebase analysis templates
│   │   └── research-project/ # Research project templates
│   └── workflows/             # Workflow definitions
├── hooks/                      # Runtime hooks for Claude Code/OpenCode/Gemini
│   └── dist/                  # Built hooks (generated)
├── scripts/                    # Build and utility scripts
├── .gitignore
├── BUG_REPORT.md
├── CHANGELOG.md
├── CONTRIBUTING.md
├── FIXES_APPLIED.md
├── GSD-CURSOR-ADAPTATION.md
├── GSD-STYLE.md
├── LICENSE
├── MAINTAINERS.md
├── package.json
├── package-lock.json
└── README.md
```

## Directory Purposes

### `.github/`
- **Purpose:** GitHub repository configuration and templates
- **Contains:** Pull request templates, funding configuration
- **Key files:** `pull_request_template.md`, `FUNDING.yml`

### `.planning/`
- **Purpose:** Project planning, state management, and implementation tracking
- **Contains:** Milestones, phases, research documents, codebase analysis
- **Key files:** 
  - `config.json`: Planning configuration (mode, depth, workflow settings)
  - `PROJECT.md`: Project overview and context
  - `STATE.md`: Current project state snapshot
  - `MILESTONES.md`: Milestone definitions and tracking
  - `codebase/`: Analysis documents (ARCHITECTURE.md, STACK.md, etc.)
  - `phases/`: Implementation phase plans, summaries, and verification reports
  - `milestones/`: Milestone requirement and roadmap documents
  - `research/`: Project research findings

### `.work/`
- **Purpose:** Temporary work directories for ad-hoc tasks
- **Contains:** Ephemeral work files and prompts
- **Key files:** Task-specific prompt files (e.g., `001-map-gsd-deps/001-PROMPT.md`)
- **Note:** Not committed to git, used for scratch work

### `agents/`
- **Purpose:** GSD subagent definitions - specialized AI agents for specific tasks
- **Contains:** Markdown files defining agent behavior and prompts
- **Key files:**
  - `gsd-codebase-mapper.md`: Maps codebase structure and conventions
  - `gsd-debugger.md`: Debugs issues and diagnoses problems
  - `gsd-executor.md`: Executes implementation plans
  - `gsd-integration-checker.md`: Validates external integrations
  - `gsd-phase-researcher.md`: Researches phase requirements
  - `gsd-plan-checker.md`: Reviews and validates plans
  - `gsd-planner.md`: Creates detailed implementation plans
  - `gsd-project-researcher.md`: Researches project requirements
  - `gsd-research-synthesizer.md`: Synthesizes research findings
  - `gsd-roadmapper.md`: Creates project roadmaps
  - `gsd-verifier.md`: Verifies completed work

### `assets/`
- **Purpose:** Static assets used in documentation and branding
- **Contains:** Logo files (PNG, SVG), terminal screenshots
- **Key files:** `gsd-logo-2000.png`, `gsd-logo-2000.svg`, `terminal.svg`

### `bin/`
- **Purpose:** Executable entry point for npm package
- **Contains:** Installation script
- **Key files:** `install.js`: Main installer script that sets up GSD for Claude Code, OpenCode, Gemini, or Cursor runtimes

### `commands/`
- **Purpose:** GSD command definitions - user-facing commands available in Claude Code/OpenCode/Gemini
- **Contains:** Markdown files defining command behavior, each file is a command
- **Key files:** All files in `commands/gsd/`:
  - `help.md`: Command reference
  - `new-project.md`: Initialize new project
  - `plan-phase.md`: Create phase plan
  - `execute-phase.md`: Execute implementation phase
  - `verify-work.md`: Verify completed work
  - `map-codebase.md`: Analyze codebase structure
  - `research-phase.md`: Research phase requirements
  - `debug.md`: Debug issues
  - `progress.md`: Show project progress
  - `settings.md`: Configure GSD settings
  - And 20+ more commands

### `cursor-gsd/`
- **Purpose:** Cursor IDE adaptation package - separate npm package for Cursor users
- **Contains:** Cursor-specific installation scripts, documentation, GitHub templates
- **Key files:**
  - `README.md`: Cursor-specific documentation
  - `MIGRATION.md`: Migration guide from standard GSD
  - `scripts/install.ps1`, `scripts/install.sh`: Installation scripts
  - `scripts/migrate.ps1`, `scripts/migrate.sh`: Migration scripts
  - `docs/GSD-CURSOR-ADAPTATION.md`: Adaptation documentation

### `get-shit-done/`
- **Purpose:** Core GSD framework content - templates, workflows, and references
- **Contains:** 
  - **`references/`**: Reference documentation for GSD concepts
  - **`templates/`**: Template files used to generate project documents
  - **`workflows/`**: Workflow definitions for GSD processes
- **Key files:**
  - `templates/config.json`: Default template configuration
  - `templates/project.md`: Project template
  - `templates/milestone.md`: Milestone template
  - `templates/phase-prompt.md`: Phase execution prompt template
  - `templates/codebase/*.md`: Codebase analysis templates
  - `workflows/execute-phase.md`: Phase execution workflow
  - `workflows/verify-phase.md`: Phase verification workflow
  - `references/planning-config.md`: Planning configuration reference

### `hooks/`
- **Purpose:** Runtime hooks for Claude Code, OpenCode, Gemini, and Cursor
- **Contains:** JavaScript hooks that integrate with AI runtimes
- **Key files:**
  - `gsd-check-update.js`: Checks for GSD updates
  - `gsd-statusline.js`: Displays GSD status in Claude Code statusline
  - `dist/`: Built hooks directory (generated by `scripts/build-hooks.js`)

### `scripts/`
- **Purpose:** Build and utility scripts
- **Contains:** Node.js scripts for building and preparing the package
- **Key files:** `build-hooks.js`: Builds hooks and copies them to `hooks/dist/` for npm package distribution

## Key File Locations

### Entry Points
- `bin/install.js`: Main entry point for npm package installation
- `package.json`: npm package definition, defines bin entry point

### Configuration
- `.planning/config.json`: Project-specific planning configuration
- `get-shit-done/templates/config.json`: Default template configuration
- `package.json`: Package metadata and build scripts

### Core Logic
- `bin/install.js`: Installation logic for multiple runtimes
- `scripts/build-hooks.js`: Build script for hooks
- `hooks/*.js`: Runtime integration hooks

### Command Definitions
- `commands/gsd/*.md`: All user-facing commands (25+ commands)
- Each `.md` file defines one command with objective, reference, and usage

### Agent Definitions
- `agents/*.md`: All subagent definitions (11 agents)
- Each `.md` file defines one specialized agent's behavior

### Templates
- `get-shit-done/templates/`: All template files for generated content
- `get-shit-done/templates/codebase/`: Codebase analysis templates
- `get-shit-done/templates/research-project/`: Research project templates

### Workflows
- `get-shit-done/workflows/`: Workflow definitions for GSD processes
- Defines how phases, milestones, and verification work

### Documentation
- `README.md`: Main project documentation
- `CHANGELOG.md`: Version history
- `CONTRIBUTING.md`: Contribution guidelines
- `GSD-STYLE.md`: GSD style guide
- `cursor-gsd/README.md`: Cursor-specific documentation

### Testing
- No dedicated test directory detected
- Testing appears to be manual/verification-based rather than automated unit tests

## Naming Conventions

### Files
- **Commands:** `kebab-case.md` (e.g., `execute-phase.md`, `map-codebase.md`)
- **Agents:** `gsd-{purpose}.md` (e.g., `gsd-planner.md`, `gsd-executor.md`)
- **Hooks:** `gsd-{purpose}.js` (e.g., `gsd-statusline.js`, `gsd-check-update.js`)
- **Templates:** `kebab-case.md` or `UPPERCASE.md` for codebase templates
- **Config:** `config.json` (lowercase)
- **Documentation:** `UPPERCASE.md` for major docs (README.md, CHANGELOG.md)

### Directories
- **Root level:** Lowercase with hyphens (e.g., `get-shit-done/`, `cursor-gsd/`)
- **Nested:** Lowercase with hyphens (e.g., `commands/gsd/`, `get-shit-done/templates/`)
- **Hidden:** Dot-prefixed (e.g., `.planning/`, `.github/`, `.work/`)
- **Generated:** `dist/` for built artifacts

### Phase/Milestone Files
- **Phases:** `{phase-number}-{sub-phase}-{type}.md` (e.g., `01-01-PLAN.md`, `02-VERIFICATION.md`)
- **Milestones:** `{version}-{type}.md` (e.g., `v1.0-REQUIREMENTS.md`, `v1.0-ROADMAP.md`)
- **Verification:** `{phase-number}-VERIFICATION.md`

## Where to Add New Code

### New Command
- **Primary code:** `commands/gsd/{command-name}.md`
- **Follow pattern:** See existing commands like `commands/gsd/execute-phase.md`
- **Structure:** Use `<objective>`, `<reference>`, and command metadata header

### New Agent/Subagent
- **Primary code:** `agents/gsd-{purpose}.md`
- **Follow pattern:** See existing agents like `agents/gsd-planner.md`
- **Naming:** Must start with `gsd-` prefix

### New Hook
- **Primary code:** `hooks/{hook-name}.js`
- **Build script:** Add to `HOOKS_TO_COPY` array in `scripts/build-hooks.js`
- **Generated:** Will be copied to `hooks/dist/` during build

### New Template
- **Primary code:** `get-shit-done/templates/{template-name}.md`
- **Codebase templates:** `get-shit-done/templates/codebase/{template-name}.md`
- **Research templates:** `get-shit-done/templates/research-project/{template-name}.md`

### New Workflow
- **Primary code:** `get-shit-done/workflows/{workflow-name}.md`
- **Follow pattern:** See existing workflows like `get-shit-done/workflows/execute-phase.md`

### New Reference Document
- **Primary code:** `get-shit-done/references/{reference-name}.md`
- **Purpose:** Document GSD concepts, patterns, or configurations

### Planning Documents
- **Phase plans:** `.planning/phases/{phase-number}/{phase-number}-{sub-phase}-PLAN.md`
- **Phase summaries:** `.planning/phases/{phase-number}/{phase-number}-{sub-phase}-SUMMARY.md`
- **Verification:** `.planning/phases/{phase-number}/{phase-number}-VERIFICATION.md`
- **Research:** `.planning/phases/{phase-number}/research/{topic}.md`
- **Codebase analysis:** `.planning/codebase/{DOCUMENT}.md` (UPPERCASE)

## Special Directories

### `.planning/`
- **Purpose:** Project planning and state management
- **Generated:** No - manually created and maintained
- **Committed:** Yes - core to GSD workflow

### `.work/`
- **Purpose:** Temporary work directories
- **Generated:** Yes - created as needed for ad-hoc tasks
- **Committed:** No - typically gitignored

### `hooks/dist/`
- **Purpose:** Built hooks ready for distribution
- **Generated:** Yes - created by `scripts/build-hooks.js`
- **Committed:** Yes - included in npm package via `package.json` files array

### `cursor-gsd/`
- **Purpose:** Separate Cursor IDE adaptation package
- **Generated:** No - manually maintained
- **Committed:** Yes - separate package with its own structure

---

*Structure analysis: 2026-02-08*
