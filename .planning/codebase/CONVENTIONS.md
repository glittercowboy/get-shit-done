# Coding Conventions

**Analysis Date:** 2026-02-08

## Naming Patterns

**Files:**
- kebab-case for all files (`gsd-statusline.js`, `gsd-check-update.js`, `build-hooks.js`)
- Executable scripts use shebang: `#!/usr/bin/env node`
- No test files detected in codebase

**Functions:**
- camelCase for all functions (`getGlobalDir`, `readSettings`, `writeSettings`, `expandTilde`)
- No special prefix for async functions
- Descriptive names indicating purpose (`processAttribution`, `convertClaudeToOpencodeFrontmatter`)

**Variables:**
- camelCase for variables (`hasGlobal`, `selectedRuntimes`, `explicitConfigDir`)
- UPPER_SNAKE_CASE for constants (`HOOKS_DIR`, `DIST_DIR`, `HOOKS_TO_COPY`)
- Single-letter variables for common values (`e` for error in catch blocks)

**Types:**
- Not applicable (JavaScript codebase, no TypeScript)

## Code Style

**Formatting:**
- No Prettier or formatting config detected
- 2 space indentation observed
- Semicolons used consistently
- No enforced line length limit (some lines exceed 100 characters)

**Linting:**
- No ESLint configuration detected
- No linting scripts in `package.json`

## Import Organization

**Order:**
1. Node.js built-in modules (`fs`, `path`, `os`, `readline`, `child_process`)
2. Local requires (relative paths) - not observed in this codebase

**Pattern:**
- CommonJS `require()` syntax throughout
- Imports at top of file
- No path aliases used

**Example from `bin/install.js`:**
```javascript
const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');
```

## Error Handling

**Patterns:**
- Try-catch blocks for error handling
- Silent failures in non-critical paths (statusline, update checks)
- Error messages logged to console.error with colored output
- Process exits with status codes (process.exit(1) on errors)

**Error Types:**
- File system operations wrapped in try-catch (`hooks/gsd-statusline.js:51-66`)
- JSON parsing wrapped in try-catch (`hooks/gsd-statusline.js:58-62`)
- Background processes use silent error handling (`hooks/gsd-check-update.js:41-46`)

**Example from `hooks/gsd-statusline.js`:**
```javascript
try {
  const files = fs.readdirSync(todosDir)
    .filter(f => f.startsWith(session) && f.includes('-agent-') && f.endsWith('.json'))
    .map(f => ({ name: f, mtime: fs.statSync(path.join(todosDir, f)).mtime }))
    .sort((a, b) => b.mtime - a.mtime);
  // ... rest of logic
} catch (e) {
  // Silently fail on file system errors - don't break statusline
}
```

**Example from `bin/install.js`:**
```javascript
try {
  return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
} catch (e) {
  return {};
}
```

## Logging

**Framework:**
- `console.log` for normal output
- `console.error` for errors
- `console.warn` for warnings (used in `scripts/build-hooks.js`)

**Patterns:**
- Colored output using ANSI escape codes (`\x1b[36m` for cyan, `\x1b[32m` for green, etc.)
- Structured messages with emoji indicators (`✓` for success, `⚠` for warnings, `✗` for failures)
- No structured logging framework
- Logging used extensively in CLI output (`bin/install.js`)

**Example from `bin/install.js`:**
```javascript
const cyan = '\x1b[36m';
const green = '\x1b[32m';
const yellow = '\x1b[33m';
const reset = '\x1b[0m';

console.log(`  ${green}✓${reset} Installed commands/gsd`);
console.error(`  ${yellow}✗${reset} Failed to install ${description}: ${e.message}`);
```

## Comments

**When to Comment:**
- JSDoc-style comments for function documentation (`bin/install.js`)
- Inline comments explain complex logic or non-obvious behavior
- Comments explain "why" not "what" in some cases

**JSDoc/TSDoc:**
- Used for function documentation with `@param` and `@returns` tags
- Example from `bin/install.js`:
```javascript
/**
 * Get the global config directory for a runtime
 * @param {string} runtime - 'claude', 'opencode', or 'gemini'
 * @param {string|null} explicitDir - Explicit directory from --config-dir flag
 */
function getGlobalDir(runtime, explicitDir = null) {
  // ...
}
```

**TODO Comments:**
- Not observed in source code (only in markdown documentation files)

## Function Design

**Size:**
- Functions vary in length (some exceed 100 lines, e.g., `install()` in `bin/install.js`)
- Complex functions broken into helper functions (`convertClaudeToOpencodeFrontmatter`, `convertClaudeToGeminiToml`)

**Parameters:**
- Functions accept multiple parameters (up to 3-4 observed)
- Optional parameters use default values (`explicitDir = null`)
- Some functions use object destructuring in body, not parameters

**Return Values:**
- Explicit return statements
- Early returns for guard clauses
- Some functions return objects with multiple properties (`install()` returns `{ settingsPath, settings, statuslineCommand, runtime }`)

## Module Design

**Exports:**
- CommonJS module.exports pattern (not observed - files are scripts, not modules)
- No default exports observed
- Functions are defined and called within same file

**Barrel Files:**
- Not applicable (no module system, files are standalone scripts)

## Special Patterns

**Shebang:**
- Executable Node.js scripts start with `#!/usr/bin/env node`
- Examples: `bin/install.js`, `hooks/gsd-statusline.js`, `hooks/gsd-check-update.js`, `scripts/build-hooks.js`

**Color Output:**
- ANSI escape codes for terminal colors
- Constants defined at top of file for reuse
- Reset code (`\x1b[0m`) used to restore default styling

**Path Handling:**
- Use `path.join()` for cross-platform compatibility
- Tilde expansion handled manually (`expandTilde()` function)
- Forward slashes used in hook commands for cross-platform compatibility (`buildHookCommand()`)

**Background Processes:**
- Use `spawn()` with `stdio: 'ignore'` and `windowsHide: true` for background tasks
- `child.unref()` used to allow parent process to exit independently

---

*Convention analysis: 2026-02-08*
