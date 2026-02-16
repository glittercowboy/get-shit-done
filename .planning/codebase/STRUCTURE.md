I see that I'm running into permission issues when trying to create files directly. Let me output the STRUCTURE.md content directly to you so you can see it:

```markdown
# GSD Codebase Map

This document provides a practical walkthrough of the GSD (Get Shit Done) codebase architecture, entry points, and command flow paths.

## Overview

GSD is a meta-prompting and context engineering system for AI coding assistants (Claude Code, OpenCode, Gemini CLI). It orchestrates specialized agents through workflows to handle spec-driven development with atomic git commits and fresh context windows.

**Core Philosophy:** The complexity is in the system, not in your workflow. Orchestrators stay lean; subagents do heavy lifting.

---

## Repository Structure

```
get-shit-done/
├── bin/                      # Entry point - installer
│   └── install.js            # Multi-runtime installer (Claude/OpenCode/Gemini)
├── commands/gsd/             # Slash command definitions (entry points)
│   ├── new-project.md
│   ├── plan-phase.md
│   ├── execute-phase.md
│   ├── verify-work.md
│   └── [28 more commands]
├── agents/                   # Subagent definitions
│   ├── gsd-executor.md       # Executes plans with atomic commits
│   ├── gsd-planner.md        # Creates XML-structured plans
│   ├── gsd-roadmapper.md     # Derives phases from requirements
│   ├── gsd-verifier.md       # Checks code against goals
│   └── [7 more agents]
├── get-shit-done/            # Core distribution package
│   ├── bin/
│   │   ├── gsd-tools.cjs     # Central CLI utility (110+ commands)
│   │   └── gsd-tools.test.cjs
│   ├── workflows/             # Implementation details for commands
│   │   ├── new-project.md
│   │   ├── plan-phase.md
│   │   ├── execute-phase.md
│   │   └── [25 more workflows]
│   ├── templates/             # File templates for artifacts
│   │   ├── project.md
│   │   ├── requirements.md
│   │   ├── roadmap.md
│   │   └── [20 more templates]
│   ├── references/           # Shared patterns & conventions
│   │   ├── questioning.md
│   │   ├── tdd.md
│   │   ├── verification-patterns.md
│   │   └── [10 more refs]
│   └── templates/research-project/  # Research output templates
│       ├── STACK.md
│       ├── FEATURES.md
│       ├── ARCHITECTURE.md
│       └── PITFALLS.md
├── hooks/                    # Runtime integration hooks
│   ├── gsd-statusline.js      # Show progress in status line
│   └── gsd-check-update.js   # Check for new releases
├── scripts/
│   └── build-hooks.js        # Build hook bundles for distribution
├── docs/
│   └── USER-GUIDE.md         # Comprehensive user documentation
└── package.json              # NPM package definition
```

---

## Entry Points

### 1. User Entry: Slash Commands

All user interactions begin with slash commands in the AI assistant interface.

**Location:** `commands/gsd/*.md`

**Examples:**
- `/gsd:new-project` — initializes project
- `/gsd:plan-phase 1` — creates plans for phase 1
- `/gsd:execute-phase 1` — executes phase 1 plans
- `/gsd:verify-work 1` — user acceptance testing

Each command file contains:
- Frontmatter (name, description, allowed tools)
- `<objective>` section
- `<execution_context>` references to workflows
- `<process>` delegation to workflow

---

### 2. Installation Entry

**Location:** `bin/install.js`

**Flow:**
1. Detects runtime flags (`--claude`, `--opencode`, `--gemini`, `--all`)
2. Prompts for selection if not specified
3. Prompts for global (`~/.claude/`) or local (`./.claude/`) installation
4. Copies files to target directory structure

**Non-interactive usage:**
```bash
npx get-shit-done-cc --claude --global
npx get-shit-done-cc --all --local --uninstall
```

---

### 3. Developer Entry: gsd-tools.cjs

**Location:** `get-shit-done/bin/gsd-tools.cjs`

**Purpose:** Central CLI utility replacing repetitive bash patterns across ~50 GSD files. All workflows and agents invoke this for context loading, model resolution, git operations, and validation.

**Key Commands (110+):**

**Context Loading:**
```bash
node ~/.claude/get-shit-done/bin/gsd-tools.cjs init execute-phase <phase>
# Returns JSON: executor_model, phase_dir, plans, incomplete_plans, etc.
```

**Model Resolution:**
```bash
node ~/.claude/get-shit-done/bin/gsd-tools.cjs resolve-model gsd-executor
# Returns model based on config.json model_profile (quality/balanced/budget)
```

**Git Operations:**
```bash
node ~/.claude/get-shit-done/bin/gsd-tools.cjs commit "message" --files file1 file2
# Creates formatted commits: type(scope): message
```

**Phase Operations:**
```bash
node ~/.claude/get-shit-done/bin/gsd-tools.cjs phase add "Add user authentication"
# Appends phase to ROADMAP.md, creates phase directory
```

**Verification:**
```bash
node ~/.claude/get-shit-done/bin/gsd-tools.cjs verify plan-structure .planning/phase-01/01-PLAN.md
# Validates PLAN.md has required fields, tasks, verification steps
```

---

## Command Flow Paths

### Primary Workflow: Initialize → Execute → Verify

```
User runs: /gsd:new-project
         ↓
commands/gsd/new-project.md (entry point)
         ↓
get-shit-done/workflows/new-project.md (orchestrator)
         ↓
  ├─→ Deep questioning
  ├─→ Research (optional): Spawns 4 gsd-project-researcher agents in parallel
  │      → Stack, Features, Architecture, Pitfalls
  │      → gsd-research-synthesizer creates SUMMARY.md
  ├─→ Requirements scoping
  └─→ gsd-roadmapper creates ROADMAP.md

User runs: /gsd:plan-phase 1
         ↓
commands/gsd/plan-phase.md → workflows/plan-phase.md
         ↓
  ├─→ gsd-phase-researcher (if workflow.research=true)
  ├─→ gsd-planner creates 2-5 PLAN.md files with XML task structure
  └─→ gsd-plan-checker verifies plans achieve goals (if workflow.plan_check=true)

User runs: /gsd:execute-phase 1
         ↓
commands/gsd/execute-phase.md → workflows/execute-phase.md (orchestrator)
         ↓
  1. Load context via gsd-tools.cjs init execute-phase
  2. Discover plans, group by waves based on dependencies
  3. For each wave:
     a. Spawn gsd-executor subagents in parallel
     b. Each executor loads fresh context, executes tasks atomically
     c. Each task gets its own commit
     d. Creates SUMMARY.md
  4. gsd-verifier checks phase achieved goals (if workflow.verifier=true)

User runs: /gsd:verify-work 1
         ↓
commands/gsd/verify-work.md → workflows/verify-work.md
         ↓
  ├─→ Extract testable deliverables from ROADMAP.md
  ├─→ Walk user through manual testing
  ├─→ If failures: gsd-debugger diagnoses root cause, creates fix plans
  └─→ Create UAT.md documenting results
```

---

### Core Component Interactions

#### Orchestrator Pattern

**Rule:** Orchestrators stay lean (~15% context). They delegate to subagents.

**Example:** `execute-phase` orchestrator

1. INIT=$(node gsd-tools.cjs init execute-phase "${PHASE}")
2. Parse JSON for executor_model, plans, incomplete_plans
3. Discover plan dependencies, group into waves
4. For each wave: Spawn gsd-executor subagent for each plan
5. Collect results, update STATE.md

#### Agent Spawning

All agents are in `agents/` directory, invoked via `Task` tool with `subagent_type` parameter.

**Agent Types:**
- gsd-executor: Executes PLAN.md files, atomic commits, deviation handling
- gsd-planner: Creates XML-structured task plans
- gsd-roadmapper: Derives phases from requirements
- gsd-verifier: Confirms code meets goals
- gsd-debugger: Systematic debugging with state tracking
- gsd-codebase-mapper: Analyzes existing code structure
- gsd-phase-researcher: Investigates domain before planning
- gsd-project-researcher: Parallel research (stack/features/architecture/pitfalls)
- gsd-research-synthesizer: Combines research into SUMMARY.md
- gsd-plan-checker: Validates plans achieve phase goals
- gsd-integration-checker: Verifies component connections

#### Model Profile Resolution

**Location:** `get-shit-done/bin/gsd-tools.cjs` (lines 128-140)

Profiles defined per agent type, resolved from `.planning/config.json` model_profile setting.

---

## File Templates

### Location: `get-shit-done/templates/`

**Core Templates:**
- project.md — PROJECT.md structure (vision, context, requirements)
- requirements.md — REQUIREMENTS.md with REQ-ID format
- roadmap.md — ROADMAP.md with phase tables and progress tracking
- state.md — STATE.md for project memory across sessions
- summary.md / summary-minimal.md / summary-standard.md — SUMMARY.md variants
- config.json — Initial config.json template
- context.md — CONTEXT.md for discuss-phase
- verification-report.md — VERIFICATION.md structure
- UAT.md — User Acceptance Testing template
- milestone.md / milestone-archive.md — Milestone management

### Research Templates

**Location:** `get-shit-done/templates/research-project/`

Researcher agents output structured domain knowledge:
- STACK.md — Recommended tech stack with versions and rationale
- FEATURES.md — Table stakes vs differentiating features
- ARCHITECTURE.md — Component boundaries and data flow
- PITFALLS.md — Common mistakes and prevention strategies
- SUMMARY.md — Synthesized research findings

### Codebase Mapping Templates

**Location:** `get-shit-done/templates/codebase/`

Used by `map-codebase` for brownfield analysis:
- stack.md — Detected technologies and patterns
- structure.md — Directory structure and file organization
- architecture.md — System architecture and component relationships
- conventions.md — Coding conventions and patterns
- testing.md — Testing approach and coverage
- integrations.md — External services and dependencies
- concerns.md — Cross-cutting concerns (auth, logging, etc.)

---

## Key Data Structures

### PLAN.md Structure

Every plan follows XML-based task structure with frontmatter for wave orchestration.

### STATE.md Structure

Cross-session memory: Position, Decisions table, Blockers, Session Continuity.

### config.json Structure

Project workflow preferences: mode, depth, parallelization, model_profile, git branching, workflow toggles.

---

## Where to Start Contributing

### For New Commands
1. Create `commands/gsd/your-command.md` following existing pattern
2. Create `get-shit-done/workflows/your-command.md` with detailed implementation
3. If command needs new capabilities, extend `gsd-tools.cjs`
4. Test with local install: `node bin/install.js --claude --local`

### For New Agents
1. Create `agents/your-agent.md` with role, instructions, execution flow
2. Add model profile to `gsd-tools.cjs` MODEL_PROFILES table
3. Add to relevant workflow using Task tool with `subagent_type="your-agent"`

### For Workflow Modifications
1. Edit `get-shit-done/workflows/<workflow-name>.md`
2. Ensure all gsd-tools.cjs calls are correct
3. Test workflow end-to-end with fresh project

### For Core Tooling
1. Edit `get-shit-done/bin/gsd-tools.cjs`
2. Add command documentation to comment header (lines 10-120)
3. Implement command handler
4. Add test case to `gsd-tools.test.cjs`
5. Run `npm test` to verify

---

## Architecture Principles

1. **Context Freshness:** Every subagent gets fresh 200k token window
2. **Atomic Commits:** Each task gets its own commit immediately after completion
3. **Orchestrator Leanness:** Orchestrators coordinate (~15% context), subagents execute (100% context)
4. **State Persistence:** All artifacts committed to disk immediately
5. **Modular by Design:** Phases can be added/inserted/removed without rebuilding
6. **Wave Parallelization:** Independent plans run simultaneously; dependent plans wait
7. **Deviation Handling:** Executors auto-fix bugs and add missing critical functionality
```

Due to the current session restrictions, I cannot write the file directly. To create STRUCTURE.md, you can:

1. Copy the markdown content above and save it manually to `STRUCTURE.md` in the repository root
2. Or run this command in your terminal to create the file automatically

The document provides:
- **Repository structure** tree with all major folders
- **Three entry points**: slash commands, installer, and gsd-tools.cjs
- **Command flow paths** showing how commands → workflows → agents interact
- **Core component interactions**: orchestrator pattern, agent spawning, model resolution
- **File templates** locations and purposes
- **Key data structures** for PLAN.md, STATE.md, config.json
- **Where to start contributing** for commands, agents, workflows, and core tooling
- **Architecture principles** that guide the system design
