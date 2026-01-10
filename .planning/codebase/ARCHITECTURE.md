# Architecture

**Analysis Date:** 2025-01-10

## Pattern Overview

**Overall:** Monolithic plugin system for Claude Code, focused on markdown-based project management.

**Key Characteristics:**
- Single-purpose tool (not a full application stack)
- CLI installer with configuration-based deployment
- Markdown-driven workflows and templates
- File-based state management (no database)
- Plugin architecture for Claude Code integration

## Layers

**Command Layer:**
- Purpose: Define slash commands available in Claude Code
- Contains: Command metadata, descriptions, objectives
- Location: `commands/gsd/*.md`
- Depends on: Workflow layer for execution logic
- Used by: Claude Code runtime

**Workflow Layer:**
- Purpose: Orchestrate execution logic for each command
- Contains: Step-by-step processes, agent spawning, file operations
- Location: `get-shit-done/workflows/*.md`
- Depends on: Template layer for output structures, Reference layer for injected knowledge
- Used by: Command execution in Claude Code

**Template Layer:**
- Purpose: Provide structured output formats
- Contains: Markdown templates with placeholders for dynamic content
- Location: `get-shit-done/templates/*.md`, `get-shit-done/templates/codebase/*.md`
- Depends on: None (static files)
- Used by: Workflows during document generation

**Reference Layer:**
- Purpose: Store knowledge and context injected into workflows
- Contains: Best practices, patterns, pitfalls
- Location: `get-shit-done/references/*.md`
- Depends on: None (static knowledge)
- Used by: Workflows for enhanced prompting

## Data Flow

**Command Execution (e.g., /gsd:map-codebase):**

1. User types slash command in Claude Code
2. Claude loads command definition from `commands/gsd/map-codebase.md`
3. Workflow executes from `get-shit-done/workflows/map-codebase.md`
4. Parallel agents spawned to analyze codebase
5. Templates filled with findings from `get-shit-done/templates/codebase/*.md`
6. Markdown documents written to `.planning/codebase/`
7. Results committed to git

**State Management:**
- File-based: All state in `.planning/` directory created in target projects
- No persistent in-memory state between commands
- Each command execution is independent

## Key Abstractions

**Command:**
- Purpose: Define CLI interface for GSD operations
- Examples: `commands/gsd/new-project.md`, `commands/gsd/map-codebase.md`
- Pattern: Markdown file with frontmatter metadata and objective

**Workflow:**
- Purpose: Encapsulate complex multi-step processes
- Examples: `get-shit-done/workflows/map-codebase.md` (parallel agents), `get-shit-done/workflows/plan-phase.md`
- Pattern: XML-inspired step structure with bash commands and tool usage

**Template:**
- Purpose: Reusable document structures with substitution variables
- Examples: `get-shit-done/templates/project.md`, `get-shit-done/templates/codebase/architecture.md`
- Pattern: Markdown with `[Placeholder]` syntax for dynamic filling

**Reference:**
- Purpose: Contextual knowledge injected into prompts
- Examples: `get-shit-done/references/tdd.md`, `get-shit-done/references/principles.md`
- Pattern: Markdown knowledge base referenced by workflows

## Entry Points

**CLI Installer:**
- Location: `bin/install.js`
- Triggers: `npx get-shit-done-cc` or `node bin/install.js`
- Responsibilities: Install plugin to Claude config directory, copy files with path replacement

**Plugin Directories:**
- Location: `.claude-plugin/`, `.opencode/` (alternative implementations)
- Triggers: Claude Code startup (loads commands from config)
- Responsibilities: Register slash commands and provide workflow logic

## Error Handling

**Strategy:** Fail-fast with descriptive error messages in installer, workflow validation in commands

**Patterns:**
- Installer exits with error codes for invalid arguments
- Workflow steps include validation checks
- User prompted for confirmation on destructive operations

## Cross-Cutting Concerns

**Path Resolution:**
- Tilde expansion for home directory paths
- Configurable Claude config directories
- Relative path handling for local vs global installs

**File Operations:**
- Recursive directory copying with content transformation
- Path prefix replacement in markdown files
- Atomic operations where possible

**Platform Compatibility:**
- Node.js 16+ requirement
- Cross-platform path handling with `path` module
- OS-specific home directory resolution

---

*Architecture analysis: 2025-01-10*
*Update when major patterns change*