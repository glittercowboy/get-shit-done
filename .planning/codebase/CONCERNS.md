# Codebase Concerns

**Analysis Date:** 2026-01-23

## Overview

GSD is a prompt-engineering and context-management system for Claude Code with minimal runtime code. The vast majority of the codebase is Markdown documentation, YAML frontmatter, and XML-structured prompts. The only Node.js executable is `bin/install.js`. This analysis focuses on the system design, workflow robustness, and documentation maintenance patterns.

## Tech Debt

### File Path Reference Complexity

**Area:** `bin/install.js` and markdown file path substitution

**Issue:** The system uses global path replacement (`~/.claude/` → `pathPrefix`) to make file references portable across global and local installs. This creates fragility:

- Files: `bin/install.js` (lines 418-461, 926-927)
- Path replacement logic: Simple regex (`claudeDirRegex` / `opencodeDirRegex`)
- Problem: If a markdown file legitimately contains `~/.claude/` in code examples or quoted strings, it will be incorrectly replaced

**Impact:**
- Documentation examples showing `~/.claude/` paths get corrupted during installation
- Multiline code blocks with path references are particularly vulnerable
- Users installing to custom directories may see broken file references in comments

**Fix approach:**
- Use fence-aware replacement (only replace paths in prose, not in code blocks)
- Add explicit markers (`<!-- PORTABLE-PATH: ~/.claude/commands -->`) for intentional path references
- Add validation test after install to verify all paths are correct

### OpenCode/Claude Code Frontmatter Conversion

**Area:** `bin/install.js` (lines 274-372) - `convertClaudeToOpencodeFrontmatter()`

**Issue:** Manual YAML parsing for converting Claude Code frontmatter to OpenCode format is primitive:

- No proper YAML parser (line-by-line string matching)
- Edge cases: Multiline YAML values, quoted strings, special characters
- Tool name mapping table (lines 248-254) is hardcoded and may diverge from OpenCode's actual tool names

**Impact:**
- Malformed frontmatter in OpenCode commands if source YAML is complex
- New tool names added to Claude Code won't auto-convert to OpenCode
- If OpenCode tool names change, installation silently produces broken commands

**Fix approach:**
- Use proper YAML parser (e.g., `js-yaml`) instead of regex
- Validate converted frontmatter after conversion
- Add integration tests for known OpenCode tool names
- Document tool mapping as external source-of-truth (link to OpenCode docs)

### Orphaned File Cleanup

**Area:** `bin/install.js` (lines 476-489, 494-534)

**Issue:** System maintains hardcoded lists of orphaned files and hooks to clean up:

- Orphaned files list: `gsd-notify.sh`, `statusline.js` (lines 477-480)
- Orphaned hook patterns: `gsd-intel-*` hooks, etc. (lines 495-501)
- When new files are deprecated, developers must manually update these lists

**Impact:**
- Risk of missing cleanup if a new deprecated file isn't added to the list
- Users with stale installations may have orphaned files accumulating
- No automated way to detect which files are actually obsolete

**Fix approach:**
- Instead of hardcoded lists, scan installed files and compare against package.json `files` array
- Mark deprecated files in package.json with metadata
- Add pre-publish step to validate all old files are cleaned

## Known Issues

### State File Format Evolution

**Area:** `.planning/STATE.md` template and orchestrator reading

**Issue:** The STATE.md format has evolved through multiple versions (visible in CHANGELOG.md 1.5.25, 1.5.24, etc.). Multiple commands parse this file but format is loosely defined.

- Files: Multiple orchestrators and workflows parse STATE.md
- Problem: No validation that STATE.md is in expected format
- Risk: If format changes, old STATE files become unreadable

**Symptoms:** Commands fail silently when STATE.md format doesn't match expected structure

**Workaround:** None currently; users must manually recreate .planning/ if format breaks

**Current mitigation:** Format changes are tested manually before release

**Recommendations:**
- Add VERSION field to STATE.md with format version number
- Add migration logic to upgrade old STATE formats
- Add validation step at start of any command that reads STATE.md

### Hardcoded Years in Examples

**Area:** Documentation and templates

**Issue:** CHANGELOG entry (1.7.0) mentions "Removed hardcoded 2025 year from search query examples" but this was a past fix. Future year-dependent examples may creep back.

- Files: `get-shit-done/templates/*.md` and search reference docs
- Risk: Examples with "2025" or current year will become stale immediately

**Impact:** Examples become misleading after January 1 each year

**Fix approach:** Audit templates for year references and use placeholder `[YEAR]` instead of hardcoded values

### Path Regex Edge Cases in execute-plan.md

**Area:** `get-shit-done/workflows/execute-plan.md` (line 102)

**Issue:** Regex for extracting phase numbers: `grep -oE '[0-9]+(\.[0-9]+)?-[0-9]+'`

- Assumes strict format `XX` or `XX.Y` followed by `-NN`
- Will fail on phase names with hyphens: `01-my-phase-01-PLAN.md` matches `01-my` incorrectly
- Decimal phase directories use dot notation: `01.1-hotfix/01.1-01-PLAN.md`

**Impact:** Phase directory matching breaks for phase names containing hyphens

**Current workaround:** Users must avoid hyphens in phase names (use underscores instead)

**Recommendations:** Use more robust path parsing (split on file basename, not regex on full path)

## Performance Bottlenecks

### Installation Performance

**Area:** `bin/install.js` - recursive directory copy operations

**Issue:** Multiple recursive file operations during install:

1. `copyFlattenedCommands()` (lines 385-429) - for OpenCode
2. `copyWithPathReplacement()` (lines 439-471) - for Claude Code and get-shit-done folder
3. Manual agent file copy (lines 922-934)
4. Sequential regex replacements on every markdown file

**Impact:**
- Installation speed is O(n * m) where n = number of files, m = number of regex patterns per file
- Each file is read/written/read again for different operations
- Global install with both Claude Code and OpenCode runs all operations twice

**Improvement path:**
- Batch file operations into single pass
- Use streaming/chunking for large installs
- Cache compiled regex patterns
- Parallelize file operations where possible

### Subagent Context Reloading

**Area:** `get-shit-done/workflows/execute-plan.md` - subagent spawning

**Issue:** Each subagent spawn loads context fresh including:
- Full PROJECT.md
- Full STATE.md
- Full ROADMAP.md
- All phase directories for dependency resolution

**Impact:**
- With 3+ concurrent agents (`max_concurrent_agents: 3` in template), context loading becomes bottleneck
- On large projects (20+ phases), redundant directory scanning
- No caching of parsed data between agent executions

**Improvement path:**
- Pre-compute dependency graphs and serialize to phase metadata
- Have orchestrator pass only necessary context (current phase + dependencies)
- Cache parsed STATE.md across agent batches

## Fragile Areas

### Checkpoint Routing Logic

**Area:** `get-shit-done/workflows/execute-plan.md` (lines 154-240)

**Files:** Checkpoint type detection and routing

**Why fragile:** Segment routing depends on exact checkpoint format:

```
type="checkpoint:human-verify"
type="checkpoint:decision"
type="checkpoint:human-action"
```

- Regex parsing expects exact format in PLAN.md
- If checkpoint format changes (e.g., namespace changes to `type="gsd:checkpoint:decision"`), routing breaks silently
- No validation that parsed checkpoints actually exist in segment

**Safe modification:**
- Before changing checkpoint format, add compatibility shim to parse both old and new formats
- Add test checkpoint plans that verify routing works
- Add validation after parsing: count parsed checkpoints vs expected count

**Test coverage gaps:**
- No tests for segment parsing with various checkpoint combinations
- No tests for decimal phase numbers in path extraction

### File Reference Path Injection

**Area:** `bin/install.js` path replacement + all markdown files using `@~/.claude/`

**Files:**
- `bin/install.js` (lines 418-427)
- All `.md` files with `@` file references (workflows, commands, agents)

**Why fragile:** The installer does string replacement on all markdown files:

```javascript
content = content.replace(claudeDirRegex, pathPrefix);
```

Then those files are loaded by Claude Code and used with `@` references. If:

1. Local install with relative paths (`./.claude/`)
2. File reference uses `@~/.claude/get-shit-done/...`

The `~/` won't be replaced by the installer (relative path installs), and Claude Code won't expand `~/` in the current project directory.

**Common failures:**
- Local installs with `@~/.claude/` references don't work
- Mixing absolute and relative paths causes some imports to fail
- Custom config directory with absolute paths breaks relative import expectations

**Safe modification:**
- Test local installs with relative paths thoroughly
- Add validation that all `@` references resolve correctly
- Document which path format to use for each install type

### Model Profile Fallback

**Area:** Multiple commands and workflows reading model profile

**Files:**
- `get-shit-done/workflows/execute-plan.md` (lines 14-29)
- `get-shit-done/templates/config.json`

**Why fragile:** Model profile resolution is repeated in multiple places:

```bash
MODEL_PROFILE=$(cat .planning/config.json 2>/dev/null | grep -o '"model_profile"[[:space:]]*:[[:space:]]*"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"' || echo "balanced")
```

- Bash string parsing of JSON (instead of proper JSON parser)
- Fallback is "balanced" but may not exist in reference table
- If config.json is malformed JSON, grep silently returns empty, fallback applies
- No validation that resolved profile is valid

**Safe modification:**
- Use actual JSON parser (e.g., `jq`) instead of grep
- Add validation that model_profile exists in reference table before using
- Log when fallback is triggered (helps debug config issues)

## Scaling Limits

### Parallel Agent Coordination

**Area:** `max_concurrent_agents` setting in config template

**Current capacity:** 3 concurrent agents (hardcoded in template)

**Limit:** Beyond 3 concurrent agents, context contention becomes severe

**Scaling path:**
1. Increase `max_concurrent_agents` setting
2. Implement agent queue/scheduling in orchestrator
3. Add rate limiting to git operations (multiple agents committing simultaneously)
4. Add locking mechanism for shared file access (STATE.md, ROADMAP.md)

### Large Project State Files

**Area:** `.planning/STATE.md` accumulated data

**Current capacity:** ~1000 lines before noteworthy slowdown

**Limit:** As STATE.md grows with project history, parsing and updating becomes slow

**Scaling path:**
- Archive old state history to `.planning/archive/STATE-YYYY-MM-DD.md`
- Keep only active session state in main STATE.md
- Add rotation policy (e.g., archive monthly)

### Phase Directory Scanning

**Area:** execute-phase finding next plan to execute

**Current capacity:** ~50 phases before noticeable scanning delay

**Limit:** `ls .planning/phases/XX-name/*-PLAN.md | sort` becomes slow with many phases

**Scaling path:**
- Build phase index file (`.planning/.phase-index.json`)
- Cache and invalidate only when new phases created
- Use structured file lookup instead of globbing

## Dependencies at Risk

### No npm Dependencies

**Risk:** This is actually a strength — GSD has zero npm dependencies (only devDependency: esbuild)

**Concern:** If bugs are found in install.js, no external package can be blamed. All risk is in custom code.

**Current state:** install.js is 1,290 lines of Node.js without error handling for edge cases:

- No error recovery if mkdir fails
- No rollback if partial install succeeds then fails
- No permission error handling on Unix systems
- Silent failures if files can't be read/written

**Mitigation:** Add try/catch blocks around file operations with user-friendly error messages

## Test Coverage Gaps

### Installation Flow Not Tested

**Files:** `bin/install.js` - entire 1,290-line installation script

**What's not tested:**
- Global install to custom config directories
- Local install with relative path handling
- OpenCode path conversion and validation
- Orphaned file cleanup
- Settings.json JSON merge logic
- Hook command construction on different platforms

**Risk:** Installation bugs go undetected until user reports issues

**Priority:** High — installation is critical first-touch experience

**How to test:**
- Create integration tests that simulate installs to temp directories
- Validate all files present and contents correct
- Verify path references resolve correctly
- Test on Windows, Mac, Linux

### Checkpoint Format Validation

**Files:** `get-shit-done/workflows/execute-plan.md`

**What's not tested:**
- Segment parsing with various checkpoint combinations
- Checkpoint routing decisions (human-verify vs decision)
- Malformed checkpoints (missing type, invalid format)

**Risk:** Checkpoint parsing silently fails, leading to wrong execution path

**Priority:** Medium — affects complex plans with multiple checkpoints

### Path Reference Resolution

**Files:** All `.md` files with `@` references

**What's not tested:**
- Local vs global install path resolution
- Custom config directory paths
- Relative path handling in different shell contexts
- Windows backslash vs forward slash handling

**Risk:** File references break in certain install configurations

**Priority:** Medium — affects brownfield/integration scenarios

## Security Considerations

### Git Commit Automation

**Area:** Orchestrators automatically commit planning files

**Files:** Multiple commands use `git add` and `git commit` without validation

**Risk:**
- Commits are made on behalf of user (uses user's git config, not GSD's identity)
- No verification that commits succeeded
- If `git commit` fails (hooks, permissions), execution continues silently
- Large planning files could be committed even if user intended `.planning/` in `.gitignore`

**Current mitigation:** `commit_docs: false` config option lets users opt out

**Recommendations:**
- Always verify `git add` and `git commit` succeed
- Add dry-run mode to show what would be committed
- Warn if `.planning/` is NOT in `.gitignore` but `commit_docs: false`
- Log all git operations for audit trail

### Claude Code Permissions

**Area:** GSD reads/writes to user's Claude Code config directory

**Files:** `bin/install.js` modifies `settings.json`, `hooks/`, `agents/`

**Risk:**
- Installation modifies user's settings.json directly
- Hooks run arbitrary shell commands
- Agents are Markdown files that get interpreted as Claude prompts
- No sandboxing or validation

**Current mitigation:** User must grant explicit permissions during installation

**Recommendations:**
- Add validation that all installed agents are valid Markdown
- Document what permissions GSD needs and why
- Add `--no-hooks` option to install without statusline/check-update hooks

### OpenCode Configuration

**Area:** `configureOpencodePermissions()` in install.js (lines 737-795)

**Risk:** Installation auto-configures permissions in `opencode.json`:

```json
"permission": {
  "read": { "~/.config/opencode/get-shit-done/*": "allow" },
  "external_directory": { "~/.config/opencode/get-shit-done/*": "allow" }
}
```

- User has no choice about these permissions
- Glob pattern `/*` gives access to anything in that directory
- No audit of what files are actually accessed

**Current mitigation:** Only applies to OpenCode (opt-in at install time)

**Recommendations:**
- Ask user before configuring permissions
- Use more restrictive globs (e.g., `get-shit-done/workflows/*`)
- Log permission requests for transparency

## Documentation Maintenance Gaps

### Breaking Changes Not Well-Documented

**Area:** CHANGELOG.md shows breaking changes but impact on existing projects unclear

**Example (v1.6.0):**
- `/gsd:discuss-milestone` removed
- `/gsd:create-roadmap` removed
- Users on v1.5 won't know they need to migrate workflows

**Impact:** Users upgrading hit unexpected workflow breaks

**Fix approach:**
- Add `MIGRATION.md` guide for each major version
- Add deprecation warnings to commands 2 versions before removal
- Link to migration guide in `/gsd:whats-new` output

### Template Maintenance Burden

**Area:** 20+ Markdown template files in `get-shit-done/templates/`

**Issue:** Templates are scattered across subdirectories:
- `get-shit-done/templates/*.md` (generic)
- `get-shit-done/templates/codebase/*.md` (codebase analysis)
- `get-shit-done/templates/research-project/*.md` (research)

No clear mapping of which templates are actually used vs kept for reference.

**Impact:**
- Duplicate template definitions (e.g., STATE.md defined in multiple places)
- Updates to templates may not propagate to all uses
- New contributors don't know which templates are canonical

**Fix approach:**
- Create `TEMPLATE-MANIFEST.md` listing all templates and their usage
- Consolidate duplicates to single source
- Add version field to each template for tracking

### Agent File Format Inconsistency

**Area:** `agents/gsd-*.md` files

**Issue:** Agent files use mixed frontmatter styles:
- Some have `allowed-tools:` as array
- Some have inline tool references
- Some missing frontmatter entirely

Files: All agent files (`agents/gsd-executor.md`, `agents/gsd-verifier.md`, etc.)

**Impact:**
- Difficult for contributors to write new agents (which format to follow?)
- Install.js assumes all agents have consistent frontmatter (may fail)
- OpenCode conversion unreliable if agents use non-standard format

**Fix approach:**
- Define canonical agent frontmatter format in CONTRIBUTING.md
- Add validation script to check all agents match format
- Standardize before next release

---

## Priority Summary

| Area | Priority | Effort | Impact |
|------|----------|--------|--------|
| Installation path replacement logic | Medium | Medium | Affects 10%+ of users (custom configs) |
| OpenCode frontmatter conversion | Medium | Low | Breaks OpenCode install silently |
| Checkpoint routing with edge cases | High | Medium | Breaks complex plans at runtime |
| State file format evolution | High | Medium | Can make projects unreadable |
| Orphaned file cleanup automation | Low | Low | Accumulates legacy files |
| File reference resolution testing | Medium | Medium | Affects local + brownfield installs |
| Installation error handling | Medium | Medium | Poor UX on failures |
| Git operation validation | Medium | Low | Silent failures in commits |

---

*Concerns audit: 2026-01-23*
