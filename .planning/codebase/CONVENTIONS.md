# Coding Conventions

**Analysis Date:** 2025-01-10

## Naming Patterns

**Files:**
- kebab-case for Markdown files (command definitions, templates, workflows)
- camelCase for JavaScript files (install.js, functions)
- UPPERCASE for important docs (README.md)

**Functions:**
- camelCase for all functions (e.g., expandTilde, copyWithPathReplacement)
- Descriptive names (e.g., parseConfigDirArg, buildCommandMap)

**Variables:**
- camelCase for variables (e.g., args, hasGlobal, claudeDir)
- No special prefix for private (Node.js modules)

**Types:**
- Not applicable (JavaScript without TypeScript)

## Code Style

**Formatting:**
- 2 space indentation consistently
- Inconsistent quotes (single in install.js, double in others)
- Semicolons required
- Manual formatting (no auto-formatter)

**Linting:**
- None configured (no .eslintrc, no linting tools)

## Import Organization

**Order:**
1. Node.js built-ins (fs, path, os, readline)
2. Local requires (relative paths)

**Grouping:**
- Built-ins first, then locals
- No blank lines between groups

**Path Aliases:**
- No path aliases (relative imports only)

## Error Handling

**Patterns:**
- Fail-fast approach in CLI scripts
- console.error for user-visible errors
- process.exit with error codes

**Error Types:**
- Basic error messages to stderr
- No custom error classes

**Logging:**
- console.log for normal output
- console.error for errors
- ANSI color codes for styling

## Logging

**Framework:**
- Console-based logging only
- No structured logging library

**Patterns:**
- console.log for informational output
- console.error for errors
- Colored output using ANSI escape codes

## Comments

**When to Comment:**
- Complex logic gets brief comments
- Function purpose explained in multi-line comments
- Inline comments for non-obvious code

**JSDoc/TSDoc:**
- Basic JSDoc for functions (e.g., /** * Expand ~ to home directory */)
- Not extensive

**TODO Comments:**
- Not detected in codebase

## Function Design

**Size:**
- Functions vary in size (copyWithPathReplacement is ~20 lines)
- No strict limits observed

**Parameters:**
- Few parameters per function (1-3 typical)
- Destructuring not used (simple parameter lists)

**Return Values:**
- Explicit returns
- process.exit for CLI termination

## Module Design

**Exports:**
- CommonJS module.exports for functions
- No named exports

**Barrel Files:**
- Not used (each file is standalone)

---

*Convention analysis: 2025-01-10*
*Update when patterns change*