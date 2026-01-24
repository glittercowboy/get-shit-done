# Coding Conventions

**Analysis Date:** 2026-01-24

## Naming Patterns

**Files:**
- kebab-case for all files (e.g., `gsd-planner.md`, `execute-phase.md`, `install.js`)
- Command files: `{command-name}.md` in `commands/gsd/` directory
- Agent files: `gsd-{agent-name}.md` in `agents/` directory
- JavaScript: `kebab-case.js` (e.g., `build-hooks.js`, `gsd-statusline.js`)
- Markdown: kebab-case with full words (e.g., `GSD-STYLE.md`, `CONTRIBUTING.md`)

**Functions:**
- camelCase for JavaScript functions (e.g., `convertToolName()`, `installAllRuntimes()`, `handleStatusline()`)
- Async functions: no special prefix, use async/await pattern
- Event handlers: `handle{EventName}` pattern (e.g., `handleStatusline()`)
- Private/internal helpers: underscore prefix or closure scope (e.g., `_simulatedSedEdit`, internal function scope)

**Variables:**
- camelCase for variables (e.g., `selectedRuntimes`, `targetDir`, `isGlobal`)
- UPPER_SNAKE_CASE for constants (e.g., `OPENCODE_CONFIG_DIR`, `CLAUDE_CONFIG_DIR`, `API_BASE_URL`)
- Boolean variables: prefix with `has`, `is`, `should` (e.g., `hasGlobal`, `isOpencode`, `shouldInstallStatusline`)
- Collection variables: plural form (e.g., `runtimes`, `failures`, `allowedTools`)

**Types (Markdown/XML):**
- XML tag names: kebab-case (e.g., `<execution_context>`, `<task>`, `<completed_tasks>`)
- Attributes: kebab-case (e.g., `type="checkpoint:human-verify"`, `gate="blocking"`, `priority="first"`)
- Placeholder text: Square brackets for configuration values (e.g., `[YYYY-MM-DD]`, `[phase-number]`)
- Variable references: Curly braces for computed values (e.g., `{phase}-{plan}`, `[Placeholder text]`)

## Code Style

**Formatting (JavaScript):**
- 2-space indentation (observed in install.js)
- No special formatter enforced (no .eslintrc, .prettierrc found)
- Line length: typically <100 characters, longer wrapped at logical points
- Semicolons: required at end of statements
- Single vs double quotes: single quotes for strings (e.g., `'utf8'`, `'claudeDir'`)

**Linting:**
- No ESLint or Prettier found in project
- No linting enforcement: code follows conventions by observation/pattern matching
- Focus on readability: clear variable names, single responsibility functions

**Markdown/XML Style:**
- XML semantic containers only: no generic `<section>` or `<item>` tags
- Markdown headers for hierarchy within XML sections
- Blank lines between XML sections for readability
- Code blocks use triple backticks with language identifier (````typescript`, ````bash`, ````markdown`)
- YAML frontmatter for file metadata (in commands, agents, references)

## Import Organization

**JavaScript:**
- Node.js built-in modules first (e.g., `fs`, `path`, `os`, `readline`)
- Third-party packages second (e.g., imported from package.json)
- Local imports last (relative paths)
- No path aliases observed in JavaScript files

**Markdown/XML:**
- @-references for file inclusion (e.g., `@~/.claude/get-shit-done/workflows/execute-phase.md`)
- Absolute paths in @-references (use `~/.claude/` or full path)
- Conditional references noted with comment: `@.planning/DISCOVERY.md (if exists)`

**Module Organization:**
- No barrel files (index.ts) observed
- Single-export pattern: each file focuses on one thing
- Agent files export role, responsibilities, and workflow sections

## Error Handling

**Patterns:**
- Throw errors for validation failures and missing dependencies
- Use `process.exit(1)` for fatal errors in CLI scripts
- Console error output for user-visible error messages
- Try/catch blocks for file operations and JSON parsing (with fallback defaults)
- Example: `readSettings()` returns empty object on missing/invalid JSON instead of throwing

**Error Types:**
- Exit with code 1 for CLI errors (invalid args, file not found, installation failed)
- Exit with code 0 for normal exit (--help displayed, installation cancelled)
- Console output: use colored text via ANSI codes for visual hierarchy
- Validation: check conditions upfront, return early on invalid state

**Error Messages:**
- Format: Use colored output for emphasis: `${yellow}⚠${reset} Message text`
- Include actionable information: show what the user should do
- Example: `Cannot specify both --global and --local` with context

## Logging

**Framework:**
- No structured logging library (no pino, winston, etc.)
- Console output only: `console.log()`, `console.error()`
- ANSI color codes for visual distinction (cyan, green, yellow, dim)

**Patterns:**
- Log installation progress with checkmark symbols: `${green}✓${reset} Message`
- Log warnings with warning symbol: `${yellow}⚠${reset} Message`
- Log informational messages with color: `${cyan}Text${reset}`
- Indent output by 2 spaces for nested information
- Blank lines between sections for visual separation

**When to Log:**
- Installation steps and completion status
- Configuration changes
- Warning states (existing config, non-interactive terminal)
- User decisions and flow transitions

## Comments

**When to Comment:**
- Explain why, not what (e.g., "// Retry 3 times because API has transient failures")
- Document business logic specific to runtime/configuration (OpenCode vs Claude Code differences)
- Clarify non-obvious implementation details (e.g., why using specific approach)
- Document complex algorithms or workarounds
- Avoid obvious comments (e.g., "// increment counter")

**JSDoc/Comments:**
- Use JSDoc for public functions with parameters and return values
- Format: `/** description @param {type} name - description @returns {type} description */`
- Example in install.js: Detailed comments for `getGlobalDir()`, `getOpencodeGlobalDir()`, `expandTilde()`
- Internal/helper functions: inline comments where needed

**TODO Comments:**
- Format: `// TODO: description` (no username, use git blame for attribution)
- Link to issue if available: `// TODO: Fix race condition (issue #123)`
- Not observed in codebase but follows convention from GSD-STYLE.md

## Function Design

**Size:**
- Keep functions under 80-100 lines
- Extract helpers for complex logic (e.g., `convertClaudeToOpencodeFrontmatter()` is ~100 lines but focused)
- Break large functions into smaller pieces (e.g., `install()` delegates to helpers like `copyFlattenedCommands()`)

**Parameters:**
- Max 3-4 parameters, use object parameter for 4+
- Example: `copyWithPathReplacement(srcDir, destDir, pathPrefix, runtime)` — 4 params acceptable for focused function
- Destructure objects in parameter list when possible
- Boolean flags with clear names: `isGlobal`, `isOpencode`, `shouldInstall`

**Return Values:**
- Explicit return statements preferred
- Return early for guard clauses (check conditions upfront, return false/null early)
- Return objects with multiple values (e.g., `install()` returns `{ settingsPath, settings, statuslineCommand, runtime }`)
- Functions return status/result, not side effects only

## Module Design

**Exports:**
- Single export per file in JavaScript modules
- Each markdown file (commands, agents, workflows) is standalone
- No circular dependencies observed

**Organization:**
- Agent files: YAML frontmatter → `<role>` → `<philosophy>` → specific sections
- Command files: YAML frontmatter → `<objective>` → `<execution_context>` → `<context>` → `<process>`
- Workflow files: varies by type, semantic XML containers + markdown headers

**File Structure (JavaScript):**
- Top: imports and constants
- Middle: helper functions and implementations
- Bottom: main execution logic or export
- Example (install.js): imports → color codes → parse args → helper functions → main conditional logic

---

*Convention analysis: 2026-01-24*
*Update when patterns change*
