```markdown
# GSD Codebase Map Conventions

This document outlines the practical conventions used in the GSD (Get Shit Done) codebase. Follow these patterns when contributing or extending the project.

## Command Naming Conventions

### Command Format
- **Structure**: `/gsd:<command-name>` or `/gsd:<command> <subcommand>`
- **Examples**:
  - `/gsd:new-project`
  - `/gsd:plan-phase 1`
  - `/gsd:execute-phase 1 [--gaps-only]`
  - `/gsd:help`

### Command Arguments
- **Required arguments**: Use angle brackets `<phase-number>`
- **Optional arguments**: Use square brackets `[--flag]`
- **Mixed arguments**: `<phase-number> [--auto]`

### CLI Flags
- Double dash format: `--auto`, `--global`, `--local`, `--full`
- Boolean flags: `--skip-research`, `--skip-verify`, `--gaps-only`
- Single dash (legacy): `-g`, `-l` (avoid in new code)

### Do
- Use descriptive flag names (`--gaps-only` vs `--go`)
- Group related commands with consistent prefixes (`plan-phase`, `execute-phase`, `verify-work`)
- Include argument hints in command metadata

### Don't
- Use single-letter flags unless required for backwards compatibility
- Mix naming conventions (kebab-case vs camelCase)
- Create ambiguous shortcuts that require memorization

## Documentation Style

### Writing Style
- **Concise but comprehensive** - 2-3 sentence descriptions
- **Action-oriented language** - "Execute", "Validate", "Initialize"
- **Clear benefit statements** - "with atomic commits, state tracking"
- **Avoid fluff** - Get to the point quickly

### Markdown Structure
```markdown
---
name: gsd:<command-name>
description: Brief description
argument-hint: "[--flag] <required>"
allowed-tools:
  - Read
  - Write
  - Bash
---

<objective>
Clear objective statement
</objective>

<execution_context>
@workflow-file.md
@template-file.md
</execution_context>

<context>
Phase: $ARGUMENTS
Flags:
- `--flag` — description
</context>

<process>
Execute workflow from @workflow.md
Preserve workflow gates and routing
</process>
```

### Frontmatter Requirements
- `name`: Command identifier (gsd:<command>)
- `description`: One-line summary
- `argument-hint`: Usage string with flags
- `allowed-tools`: List of permitted tools

### Do
- Use YAML frontmatter for metadata
- Reference templates with `@filename.md`
- Include explicit objective statements
- Use em dashes (—) for flag descriptions

### Don't
- Use HTML comments instead of `<objective>` tags
- Mix bullet point styles (- vs *)
- Reference files without the `@` prefix
- Write overly verbose descriptions

## Shell Scripts

### Shebang Convention
```bash
#!/usr/bin/env node
```

### Error Handling Patterns
```javascript
// Version checking with fallback
let latest = null;
try {
  latest = execSync('npm view get-shit-done-cc version', { 
    encoding: 'utf8', 
    timeout: 10000, 
    windowsHide: true 
  }).trim();
} catch (e) {}

// File existence checks with error handling
try {
  installed = fs.readFileSync(projectVersionFile, 'utf8').trim();
} catch (e) {}

// Background process spawning
const child = spawn(process.execPath, ['-e', `...`], { 
  windowsHide: true 
});
```

### Script Structure
1. **Color constants** for terminal output
2. **Argument parsing** with boolean flags
3. **Helper functions** for common operations
4. **Main execution function**
5. **Error boundaries** with try-catch blocks

### Node.js Patterns
```javascript
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Path resolution
const HOOKS_DIR = path.join(__dirname, '..', 'hooks');
const DIST_DIR = path.join(HOOKS_DIR, 'dist');

// Directory creation
if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR, { recursive: true });
}
```

### Do
- Use `process.execPath` for spawning Node processes
- Set `windowsHide: true` for cross-platform compatibility
- Add timeouts to external command execution
- Handle errors gracefully with fallback values

### Don't
- Use hardcoded absolute paths
- Spawn processes without error handling
- Use synchronous I/O in hot paths
- Ignore return codes from child processes

## Release/Changelog Process

### Version Format
- **Semantic versioning**: 1.20.0 (major.minor.patch)
- **Date format**: YYYY-MM-DD in changelog entries

### Changelog Structure
```markdown
# Changelog

All notable changes to GSD will be documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [1.20.0] - 2026-02-15

### Added
- Feature description with flag syntax
- `/gsd:health` command — validates `.planning/` directory integrity with `--repair` flag

### Changed
- Existing behavior modification
- Completed milestone phase directories are now archived

### Fixed
- Bug fix description
- Large JSON payloads write to temp files to prevent truncation
```

### Release Workflow
1. Update `package.json` version
2. Add changelog entry with date
3. Build hooks: `npm run build:hooks`
4. `prepublishOnly` script runs automatically
5. Test: `npm test` runs on CI

### Package Scripts
```json
{
  "build:hooks": "node scripts/build-hooks.js",
  "prepublishOnly": "npm run build:hooks",
  "test": "node --test get-shit-done/bin/gsd-tools.test.js"
}
```

### Do
- Use Keep a Changelog format
- Include dates for released versions
- Group changes by type (Added/Changed/Fixed)
- Use present tense for descriptions

### Don't
- Skip the "Unreleased" section
- Merge unrelated changes into one release
- Use version numbers without dates
- Omit migration notes for breaking changes

## Contributor Workflow

### Issue Templates

**Feature Request** (`.github/ISSUE_TEMPLATE/feature_request.yml`):
- Problem/motivation
- Proposed solution
- Alternatives considered
- Additional context

**Bug Report** (`.github/ISSUE_TEMPLATE/bug_report.yml`):
- Version (required)
- Runtime selection
- Description
- Expected behavior
- Steps to reproduce
- Relevant logs

### Git Workflow
- **Branch naming**: Template-based
  - `gsd/phase-{phase}-{slug}`
  - `gsd/{milestone}-{slug}`
- **Commit messages**: `type(date): message` format
  - `docs(08-02): complete user registration plan`
  - `feat(08-02): add email confirmation flow`
  - `fix(08-02): prevent memory leaks`

### Configuration Management
**Global Settings**: `~/.gsd/defaults.json`
**Project Settings**: `.planning/config.json`

```json
{
  "mode": "interactive",
  "depth": "standard",
  "workflow": {
    "research": true,
    "plan_check": true,
    "verifier": true
  },
  "gates": {
    "confirm_project": true,
    "confirm_phases": true,
    "confirm_roadmap": true
  }
}
```

### CI/CD Patterns
- **GitHub Actions**: `.github/workflows/`
- **Auto-label issues**: "needs-triage" on new issues
- **Windows compatibility**: Use `windowsHide: true`
- **Timeout handling**: 10-second timeout for npm commands
- **Error recovery**: Graceful fallbacks for external services

### File Organization
```
/
├── commands/gsd/              # Command definitions
├── get-shit-done/templates/   # Reusable templates
├── hooks/                     # Git hooks
├── .github/                   # GitHub configuration
├── .planning/codebase/        # Codebase documentation
├── scripts/                   # Build scripts
└── bin/                       # Main installer
```

### Testing Approach
- **Unit tests**: `node --test` framework
- **Integration tests**: Real command execution
- **File system tests**: Path resolution and creation
- **Error handling**: Graceful degradation on failures

### Do
- Use descriptive branch names
- Follow conventional commit format
- Include issue numbers in commit messages
- Test on multiple platforms (Linux/macOS/Windows)

### Don't
- Push directly to main branch
- Skip the issue template for bugs
- Commit unrelated changes together
- Ignore test failures
```
