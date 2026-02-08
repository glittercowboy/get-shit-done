# Codebase Concerns

**Analysis Date:** 2026-02-08

## Tech Debt

**Monolithic install.js file:**
- Issue: Single 1703-line file handles all installation logic for 4 runtimes (Claude, OpenCode, Gemini, Cursor)
- Files: `bin/install.js` (1703 lines)
- Why: Rapid development, single entry point for all runtime support
- Impact: Hard to maintain, test, and debug. Changes to one runtime affect others. High cognitive load for contributors
- Fix approach: Split into modules: `bin/install.js` (orchestrator), `bin/installers/claude.js`, `bin/installers/opencode.js`, `bin/installers/gemini.js`, `bin/installers/cursor.js`, `bin/shared/frontmatter.js`, `bin/shared/paths.js`

**Fragile JSON parsing in bash workflows:**
- Issue: Uses grep/sed regex patterns to extract JSON values instead of proper JSON parsing
- Files: `get-shit-done/workflows/execute-phase.md:20, 62, 76-77`, `commands/gsd/execute-phase.md:45, 100`, `agents/gsd-executor.md:47`
- Why: Avoids external dependency (jq) requirement
- Impact: Silent failures when JSON formatting varies (minified, different spacing, unquoted values). Configuration may fall back to defaults even when explicitly set
- Fix approach: Use `jq` for robust parsing: `MODEL_PROFILE=$(jq -r '.model_profile // "balanced"' .planning/config.json 2>/dev/null || echo "balanced")`. Or create Node.js helper script for JSON parsing that workflows can call

**Hand-rolled YAML frontmatter parsing:**
- Issue: Line-by-line YAML parsing instead of proper YAML parser
- Files: `bin/install.js:379-437, 620-696` (multiple frontmatter conversion functions)
- Why: Avoids external dependency (js-yaml)
- Impact: Fails silently on YAML edge cases (multiline strings, special characters, nested structures). Invalid frontmatter breaks agent/command loading without clear errors
- Fix approach: Use `js-yaml` package: `const yaml = require('js-yaml'); const frontmatter = yaml.load(content.substring(3, endIndex));`. Validate converted frontmatter before writing

**Hardcoded paths throughout codebase:**
- Issue: Paths like `~/.claude/`, `.planning/`, `~/.claude/todos` hardcoded in many files
- Files: `hooks/gsd-statusline.js:49`, `hooks/gsd-check-update.js:12`, multiple workflow files reference `.planning/`
- Why: Simplicity, no configuration system needed initially
- Impact: Changes to directory structure require updates in multiple files. Inconsistent path handling across runtimes
- Fix approach: Centralize path constants in `bin/shared/paths.js` or `lib/config.js`. Use environment variables with defaults

**Inconsistent error handling patterns:**
- Issue: Mix of try-catch blocks, optional chaining, existence checks, silent failures, and error propagation
- Files: Multiple files across codebase
- Why: Evolved organically, no established patterns
- Impact: Hard to predict behavior. Some errors crash, others fail silently. Difficult to debug issues
- Fix approach: Establish error handling guidelines in `CONVENTIONS.md`. Standardize patterns for: file system operations (wrap in try-catch), JSON parsing (try-catch with fallback), git operations (check exit codes), external commands (handle errors)

**Path replacement edge cases:**
- Issue: Only replaces `~/.claude/` pattern, misses other variants (`.claude/`, `@~/.claude/get-shit-done/`, `$CLAUDE_PROJECT_DIR/`)
- Files: `bin/install.js:669` (`copyWithPathReplacement`), `bin/install.js:783-786` (`copyFlattenedCommands`)
- Why: Incremental implementation, only common case handled
- Impact: Broken file references in converted files. Incorrect config directory paths. Commands fail to find referenced files
- Fix approach: Replace all path variants: `/~\/\.claude\//g`, `/\.claude\//g`, `/@~\/\.claude\/get-shit-done\//g`, `/\$CLAUDE_PROJECT_DIR\//g`. Handle runtime-specific differences (OpenCode uses `~/.config/opencode/`)

## Known Bugs

**Fragile JSON parsing (documented but not fixed):**
- Status: ⚠️ Documented in `BUG_REPORT.md` and `FIXES_APPLIED.md` but not fixed
- Files: `get-shit-done/workflows/execute-phase.md:20, 62, 76-77`, `commands/gsd/execute-phase.md:45, 100`, `agents/gsd-executor.md:47`
- Symptoms: Configuration values silently fall back to defaults when JSON formatting varies
- Trigger: Minified JSON, different spacing, unquoted boolean values, escaped quotes in strings
- Workaround: Ensure `.planning/config.json` is properly formatted with consistent spacing, always quote string values, avoid special characters
- Root cause: Regex-based parsing instead of proper JSON parser
- Blocked by: Decision needed on whether to require `jq` dependency or create Node.js helper

**Missing CONTEXT.md reference documentation:**
- Files: `agents/gsd-executor.md:69`
- Symptoms: Executor mentions CONTEXT.md but doesn't explain how to access it
- Trigger: Plan references CONTEXT.md but executor doesn't know file path
- Workaround: Manual file reading by executor
- Root cause: Documentation gap in executor instructions
- Fix: Add clarity: "Read `.planning/phases/{phase}/CONTEXT.md` for the user's vision"

**Frontmatter conversion failures:**
- Files: `bin/install.js:430-498` (Gemini conversion), `bin/install.js:595-697` (OpenCode conversion), `bin/install.js:510-593` (Cursor conversion)
- Symptoms: Agents/commands fail to load with "Invalid frontmatter format" errors
- Trigger: YAML edge cases (multiline strings, special characters, mixed formats), missing required fields (Gemini requires `tools:` as array)
- Workaround: Manual frontmatter editing after install
- Root cause: Hand-rolled YAML parsing doesn't handle all edge cases

## Security Considerations

**Command injection in update check:**
- Risk: `execSync` call in update check hook could be exploited if npm command is hijacked
- Files: `hooks/gsd-check-update.js:45` (`execSync('npm view get-shit-done-cc version')`)
- Current mitigation: Command is hardcoded, runs in background process with timeout, `windowsHide: true` prevents console flash
- Recommendations: Validate npm output format, add max length check on version string, consider using npm API instead of CLI

**File operations without path validation:**
- Risk: Path traversal if user-controlled paths are used (though current code uses `os.homedir()` and hardcoded paths)
- Files: `bin/install.js` (multiple `readFileSync`/`writeFileSync` calls), `hooks/gsd-statusline.js:59` (reads todo files)
- Current mitigation: Uses `os.homedir()` and `path.join()` for path construction, hardcoded directory names
- Recommendations: Add path validation to ensure paths stay within expected directories, normalize paths before use

**Unvalidated JSON parsing:**
- Risk: Malformed JSON could cause crashes or unexpected behavior
- Files: `hooks/gsd-statusline.js:59, 74`, `bin/install.js:196, 1081, 1143` (multiple `JSON.parse` calls)
- Current mitigation: Most calls wrapped in try-catch, but some may propagate errors
- Recommendations: Standardize JSON parsing with helper function that always returns safe defaults

## Performance Bottlenecks

**Large install.js file:**
- Problem: 1703-line file takes time to parse and execute
- Files: `bin/install.js`
- Measurement: Not measured, but large file impacts startup time
- Cause: All installation logic in single file
- Improvement path: Split into modules, lazy-load runtime-specific installers

**No caching for repeated operations:**
- Problem: Attribution settings read from disk multiple times during install
- Files: `bin/install.js:219-265` (`getCommitAttribution` function)
- Measurement: File I/O on every attribution check
- Cause: No caching mechanism initially
- Improvement path: Attribution cache added (lines 212, 221-223, 263), but could be extended to other repeated reads

## Fragile Areas

**Frontmatter conversion logic:**
- Files: `bin/install.js:430-498` (Gemini), `bin/install.js:595-697` (OpenCode), `bin/install.js:510-593` (Cursor)
- Why fragile: Hand-rolled YAML parsing, multiple format variants (allowed-tools arrays, tools comma-separated, tools YAML arrays), runtime-specific requirements (Gemini requires array, OpenCode needs hex colors)
- Common failures: Invalid frontmatter breaks agent loading, missing tools field, wrong tool name format, color validation errors
- Safe modification: Test with all frontmatter variants before changing. Use proper YAML parser. Validate converted frontmatter
- Test coverage: No automated tests for frontmatter conversion

**Tool name mapping:**
- Files: `bin/install.js:314-410` (tool name conversion functions)
- Why fragile: Multiple runtime-specific mappings (Claude → OpenCode, Claude → Gemini, Claude → Cursor), tool names appear in frontmatter and body text, MCP tools auto-discovered (should be excluded)
- Common failures: Tools not converted in body text, wrong tool name format for runtime, MCP tools incorrectly included
- Safe modification: Search for PascalCase tool names after conversion, test all tool references, verify MCP tools excluded
- Test coverage: No automated tests for tool name conversion

**Path replacement logic:**
- Files: `bin/install.js:669` (`copyWithPathReplacement`), `bin/install.js:783-786` (`copyFlattenedCommands`)
- Why fragile: Multiple path formats, Windows vs Unix separators, environment variable overrides, local vs global install differences
- Common failures: Broken file references, incorrect config directory paths, Windows path handling issues
- Safe modification: Test with all path variants, local/global installs, custom config directories, Windows paths
- Test coverage: No automated tests for path replacement

**Windows path handling:**
- Files: `bin/install.js:184-188` (`buildHookCommand`), multiple path operations
- Why fragile: Backslash vs forward slash differences, `expandTilde` may not work correctly on Windows, path normalization inconsistent
- Common failures: Hook commands fail on Windows, path comparisons fail, file operations fail
- Safe modification: Use `path.join()` consistently, normalize paths before comparison, test on Windows
- Test coverage: No automated tests for Windows compatibility

## Scaling Limits

**Single-file installation script:**
- Current capacity: Works for all current runtimes
- Limit: Adding new runtime requires modifying 1703-line file, increases complexity exponentially
- Symptoms at limit: Harder to maintain, more bugs, longer install times
- Scaling path: Modularize into runtime-specific installers, shared utilities

**No test infrastructure:**
- Current capacity: Manual testing only
- Limit: Can't catch regressions, hard to verify fixes, slow development cycle
- Symptoms at limit: Bugs slip through, fear of refactoring, technical debt accumulates
- Scaling path: Add test framework (Jest/Vitest), unit tests for critical paths (frontmatter conversion, path replacement, tool mapping), integration tests for install/uninstall

## Dependencies at Risk

**No external dependencies (by design):**
- Risk: Relies on Node.js built-ins only, but hand-rolled solutions (YAML parsing, JSON parsing in bash) are fragile
- Impact: Bugs in hand-rolled code, maintenance burden, compatibility issues
- Migration plan: Consider adding `js-yaml` for frontmatter parsing, `jq` for bash JSON parsing (or Node.js helper)

## Missing Critical Features

**Automated testing:**
- Problem: No test suite, all testing is manual
- Current workaround: Manual verification after changes, bug reports from users
- Blocks: Confident refactoring, regression detection, CI/CD integration
- Implementation complexity: Medium - need to set up test framework, write tests for critical paths

**Error logging/monitoring:**
- Problem: Errors fail silently or only log to console
- Current workaround: User reports issues, manual debugging
- Blocks: Proactive issue detection, understanding failure patterns
- Implementation complexity: Low - add error logging to file, optional telemetry

**Configuration validation:**
- Problem: Invalid `.planning/config.json` causes silent failures
- Current workaround: Users discover issues through broken workflows
- Blocks: Early error detection, better user experience
- Implementation complexity: Low - add JSON schema validation, clear error messages

## Test Coverage Gaps

**Installation logic:**
- What's not tested: Frontmatter conversion, path replacement, tool name mapping, runtime-specific installers, uninstall logic
- Files: `bin/install.js` (entire file)
- Risk: Regressions break installation for users, hard to verify fixes work
- Priority: High
- Difficulty to test: Medium - need to mock file system, test multiple runtimes, verify output files

**Hook scripts:**
- What's not tested: Statusline error handling, update check hook, file system operations
- Files: `hooks/gsd-statusline.js`, `hooks/gsd-check-update.js`
- Risk: Hooks crash and break user experience, update check fails silently
- Priority: Medium
- Difficulty to test: Low - can test with mock file system and stdin

**Workflow bash scripts:**
- What's not tested: JSON parsing, git operations, file operations, error handling
- Files: `get-shit-done/workflows/execute-phase.md`, `commands/gsd/execute-phase.md`
- Risk: Silent failures in workflows, incorrect configuration parsing, broken git operations
- Priority: High
- Difficulty to test: Medium - need bash test framework, mock git, test JSON parsing edge cases

**Frontmatter conversion:**
- What's not tested: YAML parsing edge cases, tool name conversion, color validation, runtime-specific requirements
- Files: `bin/install.js:430-697` (all frontmatter conversion functions)
- Risk: Invalid frontmatter breaks agent/command loading, tools not converted correctly
- Priority: High
- Difficulty to test: Medium - need test fixtures with various frontmatter formats

---

*Concerns audit: 2026-02-08*
*Update as issues are fixed or new ones discovered*
