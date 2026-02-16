# Get Shit Done (GSD) Architecture

## Overview

GSD is a **spec-driven, agent-orchestrated development system** that uses file-based state management, CLI tool orchestration, and multi-runtime AI agent execution. The system operates through markdown files with YAML frontmatter, hierarchical project state, and a centralized CLI utility for all operations.

## Architecture Style

### Meta-Prompting & Context Engineering
The system treats AI prompts and context as first-class artifacts stored as markdown files. All system components—commands, agents, workflows, templates—are structured documents that define behavior through frontmatter and content.

### File-Based State Management
All project state is persisted in the `.planning/` directory as markdown and JSON files:
- `STATE.md`: Central project memory and context
- `RESEARCH.md`: Domain research cache
- `PHASE-PLAN.md`: Execution plans with task breakdowns
- `config.json`: Project and user settings

### Multi-Runtime Agent System
GSD supports multiple AI runtimes:
- **Claude Code**: Native markdown agent execution
- **OpenCode**: Flat command structure with permission management
- **Gemini CLI**: TOML conversion and experimental agent support

## Module Boundaries

```
/
├── bin/
│   └── install.js                    # Multi-runtime installer (1,807 lines)
├── commands/
│   └── gsd/                          # User-facing slash commands (markdown)
├── get-shit-done/
│   ├── bin/
│   │   └── gsd-tools.cjs             # Central CLI utility (18,000+ lines)
│   ├── workflows/                    # Agent orchestration scripts
│   │   ├── plan-phase.md             # Phase planning workflow
│   │   ├── execute-plan.md           # Plan execution workflow
│   │   └── update-roadmap.md         # Roadmap evolution workflow
│   ├── templates/                    # Document templates (40+ files)
│   ├── references/                   # Reference materials and patterns
│   └── config.json                   # Default configuration
├── agents/                           # Specialized agent definitions
│   ├── gsd-planner.md                # Plan generation
│   ├── gsd-phase-researcher.md       # Domain research
│   ├── gsd-plan-checker.md           # Plan validation
│   ├── gsd-verifier.md               # Work verification
│   ├── gsd-debugger.md               # Debugging
│   └── gsd-roadmapper.md             # Roadmap management
├── hooks/                            # Runtime integration hooks
│   ├── gsd-statusline.js             # Statusline integration
│   └── gsd-check-update.js           # Update checking
└── scripts/                          # Build utilities
```

### Boundary Responsibilities

| Module | Responsibility |
|--------|----------------|
| `bin/install.js` | Multi-runtime installation, file deployment, hook configuration |
| `get-shit-done/bin/gsd-tools.cjs` | State CRUD operations, template processing, command dispatch |
| `get-shit-done/workflows/` | Agent orchestration, workflow execution, coordination logic |
| `agents/` | Agent capabilities, tool definitions, behavior specifications |
| `commands/gsd/` | User-facing command entry points |
| `hooks/` | Runtime-specific integrations (statusline, lifecycle events) |
| `get-shit-done/templates/` | Document structure, scaffolding patterns |
| `.planning/` (runtime) | Project state, user artifacts, execution context |

## Command Dispatch Flow

### Command Discovery

Commands are discovered by the runtime as markdown files in `commands/gsd/` with YAML frontmatter:

```yaml
---
name: gsd:help
description: Display GSD command reference
---
```

### Execution Chain

```
User Command (/gsd:plan-phase)
    ↓
Runtime Loads Command File
    ↓
Command Executes Workflow (get-shit-done/workflows/plan-phase.md)
    ↓
Workflow Uses CLI Tools (gsd-tools.cjs)
    ↓
Workflow Spawns Agents
    ↓
Agents Read/Write State Files
```

### Command Router Architecture

The main CLI (`get-shit-done/bin/gsd-tools.cjs:4852-5143`) implements a centralized switch-based router:

```javascript
const command = args[0];
switch (command) {
  case 'state': {
    const subcommand = args[1];
    if (subcommand === 'update') {
      cmdStateUpdate(cwd, args[2], args[3]);
    } else if (subcommand === 'get') {
      cmdStateGet(cwd, args[2], raw);
    }
    break;
  }
  case 'phase': {
    const subcommand = args[1];
    if (subcommand === 'add') {
      cmdPhaseAdd(cwd, args[2], args[3]);
    } else if (subcommand === 'complete') {
      cmdPhaseComplete(cwd);
    }
    break;
  }
  case 'template': {
    const subcommand = args[1];
    if (subcommand === 'fill') {
      cmdTemplateFill(cwd, args[2], args[3]);
    }
    break;
  }
  // ... 30+ command handlers
}
```

### Command Categories

1. **State Operations**: `state load`, `state update`, `state get`, `state save`
2. **Phase Operations**: `phase add`, `phase complete`, `phase next-decimal`, `phase list`
3. **Template Operations**: `template fill`, `template select`, `template list`
4. **Scaffolding**: `scaffold context`, `scaffold phase-dir`, `scaffold project`
5. **Verification**: `verify plan-structure`, `verify references`, `verify research`
6. **Resolution**: `resolve-model`, `resolve-context`
7. **Planning**: `plan-phase` (high-level orchestration)

## Agent Orchestration Approach

### Agent Definition Pattern

Agents are markdown files with structured frontmatter defining their capabilities:

```yaml
---
name: gsd-planner
description: Creates executable phase plans with dependency analysis
tools: [Edit, Write, Bash, AskUserQuestion, Read, Glob]
color: blue
---
```

### Key Agents

| Agent | Purpose | File |
|-------|---------|------|
| **gsd-planner** | Generates executable phase plans using goal-backward methodology | `agents/gsd-planner.md` |
| **gsd-phase-researcher** | Conducts domain research, spawns parallel researchers | `agents/gsd-phase-researcher.md` |
| **gsd-plan-checker** | Validates plans for completeness and correctness | `agents/gsd-plan-checker.md` |
| **gsd-verifier** | Verifies completed work against acceptance criteria | `agents/gsd-verifier.md` |
| **gsd-debugger** | Debugs execution issues and provides fixes | `agents/gsd-debugger.md` |
| **gsd-roadmapper** | Manages roadmap evolution and phase progression | `agents/gsd-roadmapper.md` |

### Workflow Orchestration Pattern

Workflows in `get-shit-done/workflows/` orchestrate agents through shell-script-like markdown:

```markdown
<process>
## 1. Initialize
INIT_RAW=$(node gsd-tools.cjs init plan-phase "$PHASE" --include context --include research)

## 2. Conditional Research
if [ "$NEEDS_RESEARCH" = "true" ]; then
  gsd:phase-researcher
fi

## 3. Plan Generation with Validation Loop
for i in {1..3}; do
  gsd:planner
  
  gsd:plan-checker
  
  if [ "$PLAN_APPROVED" = "true" ]; then
    break
  fi
done

## 4. Finalize
node gsd-tools.cjs phase add "$PHASE" --file PHASE-PLAN.md
</process>
```

### Agent Communication Mechanisms

1. **File I/O**: Agents read and write markdown files in `.planning/`
2. **CLI Tooling**: Structured operations through `gsd-tools.cjs` (e.g., state updates, template filling)
3. **Context Passing**: Large payloads passed via temporary files
4. **Shared State**: All agents share access to `STATE.md`, `RESEARCH.md`, `PHASE-PLAN.md`

### Parallel Execution

The system supports parallel agent spawning for efficiency:

```bash
# From plan-phase.md workflow
if [ "$PARALLELIZATION" = "true" ]; then
  gsd:phase-researcher &
  gsd:phase-researcher &
  gsd:phase-researcher &
  wait
fi
```

## Hooks and Lifecycle

### Hook Architecture

Hooks are Node.js scripts in `hooks/` that integrate with runtime lifecycle events.

### gsd-statusline.js

Displays contextual information in the runtime's statusline:

```javascript
// hooks/gsd-statusline.js
const data = JSON.parse(input);
const model = data.model?.display_name;
const remaining = data.context_window?.remaining_percentage;
const currentTask = data.current_phase;

// Returns formatted string: "Model | Task | Context%"
```

### gsd-check-update.js

Checks for GSD updates on session start:

```javascript
// hooks/gsd-check-update.js
const currentVersion = getCurrentVersion();
const latestVersion = fetchLatestVersion();

if (latestVersion > currentVersion) {
  displayUpdateNotification();
}
```

### Lifecycle Integration Points

| Runtime Event | Hook | Purpose |
|---------------|------|---------|
| **SessionStart** | `gsd-check-update.js` | Check for updates |
| **Pre-execution** | `gsd-statusline.js` | Display model, task, context |
| **Post-execution** | Implicit | State persistence via CLI tools |

## Configuration System

### Configuration Hierarchy

1. **User-level**: `~/.gsd/defaults.json` - User preferences across projects
2. **Project-level**: `.planning/config.json` - Project-specific settings
3. **Runtime-level**: Runtime-specific settings (Claude Code settings.json, etc.)

### Configuration Schema

```json
{
  "model_profile": "balanced",
  "commit_docs": true,
  "search_gitignored": false,
  "branching_strategy": "none",
  "workflow": {
    "research": true,
    "plan_check": true,
    "verifier": true
  },
  "parallelization": true,
  "brave_search": false
}
```

### Initialization Flow

```javascript
// bin/install.js:1320-1556
function install(isGlobal, runtime = 'claude') {
  // 1. Determine target directory
  const targetDir = isGlobal 
    ? getGlobalDir(runtime) 
    : path.join(cwd, getDirName(runtime));
  
  // 2. Save local patches (if any)
  saveLocalPatches(targetDir);
  
  // 3. Copy commands, agents, templates with path replacement
  copyWithPathReplacement(src, dest, pathPrefix, runtime);
  
  // 4. Configure hooks in settings.json
  configureHooks(settings);
  
  // 5. Write file manifest for versioning
  writeManifest(targetDir);
}
```

## How Docs, Commands, and Agents Compose

### Composition Chain

```
User Artifact (.planning/SOME.md)
    ↓
Template (get-shit-done/templates/*.md)
    ↓
CLI Tool (gsd-tools.cjs template fill)
    ↓
Command (commands/gsd/some-command.md)
    ↓
Workflow (get-shit-done/workflows/some-workflow.md)
    ↓
Agent (agents/some-agent.md)
    ↓
Tool Execution (Edit, Write, Bash, etc.)
```

### 1. Template System

Templates in `get-shit-done/templates/` provide structure for user artifacts:

- `project-init.md`: Initial project scaffolding
- `phase-plan.md`: Phase planning structure
- `research.md`: Research documentation format
- `context.md`: Context gathering template

Templates use frontmatter for metadata and content for structure. CLI tools fill template data via string replacement.

### 2. Command Layer

Commands in `commands/gsd/` are user-facing entry points:

- `gsd:help`: Display command reference
- `gsd:plan-phase`: Plan a new project phase
- `gsd:execute-plan`: Execute the current phase plan
- `gsd:update-roadmap`: Update project roadmap

Commands load and execute workflows from `get-shit-done/workflows/`.

### 3. Workflow Layer

Workflows orchestrate multiple agents and CLI operations:

```markdown
<!-- get-shit-done/workflows/plan-phase.md -->
<process>
# Load context
CONTEXT=$(node gsd-tools.cjs state load --format json)

# Spawn agents sequentially
gsd:phase-researcher
gsd:planner
gsd:plan-checker

# Save results
node gsd-tools.cjs state save PHASE-PLAN.md
</process>
```

### 4. Agent Layer

Agents encapsulate specific capabilities and behaviors:

```yaml
---
name: gsd-planner
description: Creates executable phase plans
tools: [Edit, Write, Bash, AskUserQuestion]
color: blue
---

You are the GSD Planner agent. Your task is to:
1. Read the project context from STATE.md
2. Analyze the phase requirements
3. Create a PHASE-PLAN.md with:
   - Clear objectives
   - Task breakdown
   - Dependency graph
   - Acceptance criteria
```

### 5. State Management

All components interact through the `.planning/` directory:

| File | Purpose | Written By | Read By |
|------|---------|------------|---------|
| `STATE.md` | Project context, goals, decisions | gsd-roadmapper, gsd-planner | All agents |
| `RESEARCH.md` | Domain research cache | gsd-phase-researcher | gsd-planner, gsd-roadmapper |
| `PHASE-PLAN.md` | Execution plan for current phase | gsd-planner | gsd-verifier, gsd-debugger |
| `config.json` | Project configuration | installer, CLI tools | All workflows |

## Key Implementation Details

### gsd-tools.cjs CLI Utility

The 18,000+ line utility (`get-shit-done/bin/gsd-tools.cjs`) provides:

- **State Management**: `cmdStateLoad()`, `cmdStateUpdate()`, `cmdStateSave()`
- **Template Processing**: `cmdTemplateFill()`, `cmdTemplateSelect()`
- **Phase Operations**: `cmdPhaseAdd()`, `cmdPhaseComplete()`, `cmdPhaseList()`
- **Scaffolding**: `cmdScaffoldContext()`, `cmdScaffoldPhaseDir()`
- **Verification**: `cmdVerifyPlanStructure()`, `cmdVerifyReferences()`
- **Resolution**: `cmdResolveModel()`, `cmdResolveContext()`

### Template Processing

Templates support variable substitution and conditional sections:

```javascript
// From gsd-tools.cjs
function fillTemplate(templatePath, variables) {
  let content = fs.readFileSync(templatePath, 'utf-8');
  
  // Replace {{VARIABLE}} patterns
  for (const [key, value] of Object.entries(variables)) {
    content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  
  // Handle conditional blocks
  content = content.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, 
    (_, condition, block) => variables[condition] ? block : '');
  
  return content;
}
```

### Runtime-Specific Adaptations

The installer (`bin/install.js`) handles runtime differences:

- **Claude Code**: Copies to `.claude/agents/`, configures hooks in settings.json
- **OpenCode**: Flattens agent structure, configures permissions
- **Gemini**: Converts agents to TOML format, enables experimental mode

## System Invariants

1. **All state is files**: No external databases; everything in `.planning/`
2. **Idempotent operations**: CLI tools can be run multiple times safely
3. **Explicit versioning**: File manifest tracks installed versions
4. **Runtime isolation**: Each runtime gets its own copy of agents/commands
5. **User control**: Hooks and configuration allow customization without forking

## Extension Points

1. **New Agents**: Add markdown files to `agents/` with proper frontmatter
2. **New Workflows**: Add markdown files to `get-shit-done/workflows/`
3. **New Commands**: Add markdown files to `commands/gsd/`
4. **New Templates**: Add markdown files to `get-shit-done/templates/`
5. **New Hooks**: Add JavaScript files to `hooks/`
6. **New CLI Commands**: Add handlers to `gsd-tools.cjs` router

## Security Considerations

- Hooks execute in the runtime's process, not as separate processes
- CLI tools validate file paths to prevent directory traversal
- Template processing limits variable scope to prevent injection
- Agent tools are whitelisted by the runtime (not GSD)
