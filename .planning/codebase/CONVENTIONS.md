# Coding Conventions

**Analysis Date:** 2026-01-23

## Overview

GSD is a meta-prompting and context engineering system consisting primarily of:
- **Markdown workflow/command files** (prompts and specifications)
- **JavaScript utilities** (`bin/install.js`, `hooks/`, `scripts/`)
- No traditional frontend or backend code

Conventions differ between these layers.

## Markdown Conventions (Workflows, Commands, References)

### File Organization

**Slash Commands (`commands/gsd/*.md`):**
- Located in `commands/gsd/` directory
- Kebab-case filenames (e.g., `plan-phase.md`)
- Invoked as `/gsd:command-name` in Claude Code

**Workflows (`get-shit-done/workflows/*.md`):**
- Located in `get-shit-done/workflows/` directory
- No YAML frontmatter
- Implement detailed orchestration logic

**Agents (`agents/gsd-*.md`):**
- Located in `agents/` directory
- Spawn as subagents with dedicated 200k context windows
- Names follow pattern: `gsd-{agent-role}.md`

**References (`get-shit-done/references/*.md`):**
- Located in `get-shit-done/references/` directory
- Deep-dive documentation on concepts
- Loaded via @-references

### YAML Frontmatter (Commands Only)

Commands use YAML frontmatter at the top:

```yaml
---
name: gsd:command-name
description: One-line description of what this command does
argument-hint: "[optional-args]"
allowed-tools:
  - Read
  - Write
  - Bash
agent: gsd-agent-name
color: cyan
---
```

**Conventions:**
- `name`: Format as `gsd:kebab-case`
- `description`: Ends with period, clear action verb
- `allowed-tools`: List only tools this command uses (blocks others)
- `agent`: Specified when delegating to subagent
- `color`: Named color (cyan, green, yellow, red) for UI

### XML Structure

Commands and workflows use semantic XML tags, NOT generic wrappers:

**DO:**
```xml
<objective>
Create authentication system...
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<process>
## Step 1: Validate Environment
[instructions]
</process>
```

**DON'T:**
```xml
<section name="objective">Content</section>
<div>Generic wrapper</div>
```

**Semantic tags used:**
- `<objective>` — What/why/when
- `<execution_context>` — File references that provide context
- `<context>` — Dynamic runtime content, `$ARGUMENTS` variables
- `<process>` — Container for numbered steps
- `<step name="step_slug">` — Individual execution step
- `<success_criteria>` — Checklist of completion
- `<role>` — Role definition for agents
- `<task type="auto|checkpoint:human-verify|checkpoint:decision">` — Work unit with name, files, action, verify, done

### Task Structure

All executable work uses typed tasks:

```xml
<task type="auto">
  <name>Create login endpoint with JWT</name>
  <files>src/app/api/auth/login/route.ts</files>
  <action>POST endpoint accepting {email, password}. Query User by email, compare password with bcrypt. On match, create JWT with jose library, set as httpOnly cookie. Return 200. On mismatch, return 401.</action>
  <verify>curl -X POST localhost:3000/api/auth/login returns 200 with Set-Cookie header</verify>
  <done>Valid credentials → 200 + cookie. Invalid → 401.</done>
</task>
```

**Task types:**
- `type="auto"` — Claude executes autonomously
- `type="checkpoint:human-verify"` — User must verify before continuing
- `type="checkpoint:decision"` — User must choose between options

### Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Files | kebab-case | `execute-phase.md`, `plan-format.md` |
| Commands | gsd:kebab-case | `gsd:plan-phase`, `gsd:execute-plan` |
| XML tags | kebab-case | `<execution_context>`, `<step_name>` |
| Step names (name attribute) | snake_case | `name="load_project_state"` |
| Bash variables | CAPS_UNDERSCORES | `PHASE_ARG`, `COMMIT_PLANNING_DOCS` |
| Variables in markdown | $UPPERCASE | `$ARGUMENTS`, `$WORKSPACE` |

### Language & Tone

**Imperative voice only:**
- DO: "Execute tasks", "Create file", "Read STATE.md"
- DON'T: "Execution is performed", "The file should be created"

**No filler language:**
- Avoid: "Let me", "Just", "Simply", "Basically", "I'd be happy to"
- Use: Direct instructions, technical precision, imperative commands

**No sycophancy:**
- Absent: "Great!", "Awesome!", "Excellent!", "Looks good"
- Present: Factual statements, verification results, structured output

**Brevity with substance:**
- Good: "JWT auth with refresh rotation using jose library"
- Bad: "Phase complete" or "Authentication implemented"

### @-Reference Patterns

Files use @-references to inject content:

```markdown
@~/.claude/get-shit-done/workflows/execute-phase.md    # Static reference
@.planning/PROJECT.md                                   # Project-relative
@.planning/DISCOVERY.md (if exists)                     # Conditional
```

References are lazy-loading signals. Files are read by Claude when context requires them.

## JavaScript Conventions

JavaScript is used only for utilities: CLI installer, update checker, statusline.

### Naming

**Files:**
- Kebab-case: `gsd-check-update.js`, `gsd-statusline.js`
- Prefix `gsd-` for all CLI-facing files

**Functions:**
- camelCase: `buildHookCommand()`, `convertToolName()`
- Purpose-driven names: `getGlobalDir()`, `readSettings()`, `writeSettings()`

**Constants:**
- CAPS_UNDERSCORES: `HOOKS_DIR`, `DIST_DIR`, `HOOKS_TO_COPY`
- Color constants: `cyan`, `green`, `yellow`, `dim`, `reset`

**Variables:**
- camelCase: `hasGlobal`, `selectedRuntimes`, `explicitConfigDir`

### Code Style

**Format:**
- 2-space indentation (Node.js standard)
- No Prettier/ESLint configured (simple scripts)
- Semicolons used throughout

**Imports & Structure:**
```javascript
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

// Constants at top
const DIST_DIR = path.join(__dirname, '..', 'hooks', 'dist');

// Helper functions
function getGlobalDir(runtime, explicitDir = null) {
  // implementation
}

// Main execution at bottom
```

**Comments:**
```javascript
// Single-line for clarification
// Separate logic blocks

/**
 * JSDoc for exported functions
 * @param {string} filePath - Description
 * @returns {string} - Description
 */
function expandTilde(filePath) {
```

### Error Handling

**Pattern:** Defensive checks with early returns:

```javascript
// Check existence first
if (!fs.existsSync(settingsPath)) {
  return {};
}

// Try-catch for JSON parsing
try {
  return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
} catch (e) {
  return {};  // Safe fallback
}
```

**No throwing errors in utilities** — return safe defaults or log warnings.

**Silent failures accepted for non-critical paths:**
```javascript
try {
  latest = execSync('npm view get-shit-done-cc version', {
    encoding: 'utf8',
    timeout: 10000
  }).trim();
} catch (e) {
  // Silent fail - if npm is unavailable, continue
}
```

### Logging

Pattern: Color-coded console output for user feedback:

```javascript
const cyan = '\x1b[36m';
const green = '\x1b[32m';
const yellow = '\x1b[33m';
const reset = '\x1b[0m';

console.log(`  ${green}✓${reset} Installed commands/gsd`);
console.log(`  ${yellow}⚠${reset} Skipping statusline (already configured)`);
console.error(`  ${yellow}✗${reset} Failed to install`);
```

Format: Always prefix with visual indicator + color, use indentation (`  `) for readability.

### Path Handling

**Cross-platform compatibility:**
```javascript
// Use path module, not string concatenation
const targetDir = path.join(targetDir, 'commands', 'gsd');

// For shell commands, use forward slashes
const hooksPath = claudeDir.replace(/\\/g, '/') + '/hooks/' + hookName;

// Expand ~ to home directory
function expandTilde(filePath) {
  if (filePath && filePath.startsWith('~/')) {
    return path.join(os.homedir(), filePath.slice(2));
  }
  return filePath;
}
```

### Command-Line Argument Parsing

**Pattern:** Parse before main logic, validate, set defaults:

```javascript
const args = process.argv.slice(2);
const hasGlobal = args.includes('--global') || args.includes('-g');
const hasLocal = args.includes('--local') || args.includes('-l');

// Parse config-dir with value
function parseConfigDirArg() {
  const configDirIndex = args.findIndex(arg => arg === '--config-dir' || arg === '-c');
  if (configDirIndex !== -1) {
    const nextArg = args[configDirIndex + 1];
    if (!nextArg || nextArg.startsWith('-')) {
      console.error(`  ${yellow}--config-dir requires a path argument${reset}`);
      process.exit(1);
    }
    return nextArg;
  }
  // Also handle --config-dir=value format
  const configDirArg = args.find(arg => arg.startsWith('--config-dir='));
  if (configDirArg) {
    const value = configDirArg.split('=')[1];
    if (!value) {
      console.error(`  ${yellow}--config-dir requires a non-empty path${reset}`);
      process.exit(1);
    }
    return value;
  }
  return null;
}
```

## JSON File Conventions

Configuration files like `package.json`, `settings.json`:

```json
{
  "name": "get-shit-done-cc",
  "version": "1.9.8",
  "scripts": {
    "build:hooks": "node scripts/build-hooks.js"
  }
}
```

**Format:**
- 2-space indentation
- Trailing newline after final brace
- Quote all keys and string values

## Environment Configuration

**Env var naming:** CAPS_UNDERSCORES

Common vars:
- `CLAUDE_CONFIG_DIR` — Custom Claude Code config location
- `OPENCODE_CONFIG_DIR` — Custom OpenCode config location
- `XDG_CONFIG_HOME` — XDG Base Directory for OpenCode

**Priority order (example):**
1. Explicit `--config-dir` flag
2. `CLAUDE_CONFIG_DIR` env var
3. `~/.claude` default

## Anti-Patterns (Banned)

**Temporal language in implementation docs:**
- DON'T: "We changed X to Y", "Previously", "No longer"
- DO: Describe current state only
- EXCEPTION: CHANGELOG.md, git commits

**Generic XML tags:**
- DON'T: `<section>`, `<item>`, `<content>`
- DO: Semantic tags with clear purpose

**Vague tasks:**
- DON'T: `<name>Add authentication</name>` with `<action>Implement auth</action>`
- DO: Specific action and verification steps

**Enterprise patterns:**
- Banned: Story points, sprint planning, RACI matrices
- Banned: Team coordination, knowledge transfer

---

*Convention analysis: 2026-01-23*
