# Codebase Structure

**Analysis Date:** 2025-01-10

## Directory Layout

```
get-shit-done/
├── bin/                # Executable entry points
├── commands/           # Slash command definitions
│   └── gsd/           # GSD-specific commands
├── get-shit-done/     # Skill resources
│   ├── references/    # Principle documents
│   ├── templates/     # File templates
│   └── workflows/     # Multi-step procedures
├── assets/            # Marketing and documentation assets
├── .claude-plugin/    # Plugin configuration
└── .opencode/         # Alternative plugin setup
```

## Directory Purposes

**bin/**
- Purpose: CLI entry points
- Contains: install.js (installer script), install-opencode.js, uninstall-opencode.js
- Key files: install.js - handles npx installation
- Subdirectories: None

**commands/gsd/**
- Purpose: Slash command definitions for Claude Code
- Contains: *.md files (one per command)
- Key files: new-project.md, map-codebase.md, plan-phase.md, execute-plan.md
- Subdirectories: None (flat structure)

**get-shit-done/references/**
- Purpose: Core philosophy and guidance documents
- Contains: *.md files with principles and best practices
- Key files: principles.md, questioning.md, plan-format.md
- Subdirectories: None

**get-shit-done/templates/**
- Purpose: Document templates for .planning/ files
- Contains: Template definitions with frontmatter
- Key files: project.md, roadmap.md, plan.md, summary.md
- Subdirectories: codebase/ (for stack/architecture/structure templates)

**get-shit-done/workflows/**
- Purpose: Reusable multi-step procedures
- Contains: Workflow definitions called by commands
- Key files: execute-phase.md, research-phase.md, map-codebase.md
- Subdirectories: None

**assets/**
- Purpose: Marketing and documentation assets
- Contains: Images, logos, documentation files
- Key files: README assets, screenshots
- Subdirectories: None

## Key File Locations

**Entry Points:**
- `bin/install.js` - CLI entry point for npx installation

**Configuration:**
- `package.json` - Project manifest, dependencies, scripts
- `.gitignore` - Excluded files

**Core Logic:**
- `bin/install.js` - All installation logic (file copying, path replacement)
- `commands/gsd/*.md` - Command definitions
- `get-shit-done/workflows/*.md` - Execution logic

**Testing:**
- Not applicable (manual verification only)

**Documentation:**
- `README.md` - User-facing installation and usage guide
- `AGENTS.md` - Instructions for Claude Code when working in this repo

## Naming Conventions

**Files:**
- kebab-case.md: Markdown documents
- camelCase.js: JavaScript source files
- UPPERCASE.md: Important project files (README, CLAUDE, CHANGELOG)

**Directories:**
- kebab-case: All directories
- Plural for collections: commands/, templates/, workflows/, references/

**Special Patterns:**
- {command-name}.md: Slash command definition
- *-template.md: Could be used but templates/ directory preferred

## Where to Add New Code

**New Slash Command:**
- Primary code: `commands/gsd/{command-name}.md`
- Tests: Manual verification (run command and validate output)
- Documentation: Update `README.md` with new command

**New Template:**
- Implementation: `get-shit-done/templates/{name}.md`
- Documentation: Template is self-documenting (includes guidelines)

**New Workflow:**
- Implementation: `get-shit-done/workflows/{name}.md`
- Usage: Reference from command with `@~/.claude/get-shit-done/workflows/{name}.md`

**New Reference Document:**
- Implementation: `get-shit-done/references/{name}.md`
- Usage: Reference from commands/workflows as needed

**Utilities:**
- No utilities yet (`install.js` is monolithic)
- If extracted: `bin/utils/` or separate module

## Special Directories

**get-shit-done/**
- Purpose: Resources installed to ~/.claude/
- Source: Copied by bin/install.js during installation
- Committed: Yes (source of truth)

**commands/**
- Purpose: Slash commands installed to ~/.claude/commands/
- Source: Copied by bin/install.js during installation
- Committed: Yes (source of truth)

**assets/**
- Purpose: External marketing and documentation materials
- Source: Static assets for README and docs
- Committed: Yes

---

*Structure analysis: 2025-01-10*
*Update when directory structure changes*