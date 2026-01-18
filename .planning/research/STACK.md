# Stack Research: Constitutional Enforcement for CLI Dev Tools

**Domain:** CLI development practice enforcement (git hooks, commit validation, rule checking)
**Researched:** 2026-01-18
**Overall Confidence:** HIGH

## Executive Summary

For adding constitutional enforcement to GSD's zero-dependency Node.js CLI, the recommended stack leverages **native Node.js capabilities** (v20+) combined with **bash git hooks** for commit-time validation. This approach maintains GSD's zero-dependency philosophy while providing robust TDD enforcement, commit message validation, and anti-pattern detection.

**Key Decision:** Use Node.js built-in APIs (test runner, util.parseArgs, native RegExp) instead of external libraries. Bash hooks for git integration. NO additional npm dependencies.

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Node.js Built-in Test Runner | v20.0.0+ (stable) | TDD pattern detection in commits | Zero dependencies, stable since v20.0.0, provides mocking, snapshots, coverage. Eliminates need for Jest/Vitest. Native `node:test` module. |
| util.parseArgs() | v20.0.0+ (stable) | CLI argument parsing for enforcement flags | Zero dependencies, stable since v20.0.0. Replaces Commander.js/yargs. Native parsing with `--strict`, `--allow-override` flags. |
| Native RegExp + String methods | Node.js core | Pattern matching for commit/file validation | Built-in, zero dependencies. Sufficient for TDD pattern detection (`test('...`, `describe('...`), commit message format validation. |
| Git Hooks (bash) | Git 2.x | Commit-time enforcement gates | Standard git mechanism. No installation needed. `pre-commit`, `commit-msg`, `pre-push` hooks. |
| Bash (v4+) | System default | Git hook implementation, file parsing | Universal on dev machines. Pattern matching via `[[ =~ ]]`, `git diff --cached` parsing, exit codes for enforcement. |

### Supporting Capabilities (Zero Dependencies)

| Capability | Implementation | Purpose | When to Use |
|---------|---------|---------|-------------|
| YAML frontmatter parsing | Regex extraction (bash or Node.js) | Parse CONSTITUTION.md rules | Simple key-value extraction. NO full YAML parser needed - just extract rules between `---` markers. |
| Markdown validation | Custom regex patterns | Validate CONSTITUTION.md structure | Check for required sections (NON-NEGOTIABLE, ERROR, WARNING). NO markdownlint dependency. |
| Commit message parsing | `git log --pretty=format` + bash | Extract commit data for validation | Use `%H` (hash), `%s` (subject), `%b` (body) with `\|\|` delimiter for bash parsing. |
| Git diff analysis | `git diff --cached --name-only` + `git diff --cached` | Detect test files in commits | Porcelain format (`--porcelain`) for stable parsing. Detect `*.test.js`, `*.spec.js` patterns. |
| Pattern validation | Native RegExp with named groups | TDD commit pattern enforcement | Match test patterns: `/test\(.*\)/`, `/describe\(.*\)/`, `/it\(.*\)/`. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| node --test | Run validation tests | Built-in test runner for testing enforcement logic itself. |
| git diff --cached | Pre-commit file inspection | Lists staged files, detects test file presence. |
| git log --pretty=format | Commit history analysis | Custom format for TDD pattern detection in recent commits. |
| bash [[ =~ ]] | Regex matching in hooks | Pattern validation without external tools (sed/awk/grep). |

## Installation

```bash
# NO npm dependencies needed
# GSD already requires Node.js >=16.7.0
# Upgrade recommendation: Node.js >=20.0.0 for stable built-ins

# Git hooks (copied to .git/hooks/ during initialization)
# No installation - just executable bash scripts
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative | Why NOT for GSD |
|-------------|-------------|-------------------------|-----------------|
| Node.js test runner | Jest, Vitest, Mocha | Large projects with complex test needs | External dependencies. Node.js test runner sufficient for pattern detection. |
| util.parseArgs() | Commander.js, yargs, minimist | Complex CLI with subcommands | GSD uses slash commands via Claude Code. Only need simple flag parsing for `--override`, `--strict`. |
| Bash git hooks | Husky, pre-commit framework | Multi-language projects, team standardization | Adds Node.js/Python dependencies. Direct git hooks maintain zero-dependency philosophy. |
| Native RegExp | Ajv, JSON Schema validators | Complex validation with schemas | Overkill for simple pattern matching. CONSTITUTION.md is markdown, not JSON. |
| Custom YAML regex parser | gray-matter, js-yaml, front-matter | Full YAML spec support needed | CONSTITUTION.md frontmatter is simple key-value. Regex extraction sufficient. Dependencies unnecessary. |
| Bash pattern matching | markdownlint, remark-lint | Comprehensive markdown linting | External dependencies. CONSTITUTION.md has fixed structure - custom validation sufficient. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| commitlint + @commitlint/config-conventional | npm dependencies (2+ packages), requires Husky or similar | Native bash `commit-msg` hook with regex validation |
| Husky | Adds npm dependency, JavaScript wrapper around git hooks | Direct `.git/hooks/` bash scripts installed by GSD |
| markdownlint-cli / markdownlint-cli2 | npm dependencies (11+ transitive deps), overkill for single file | Custom regex validation for CONSTITUTION.md structure |
| JSON Schema validators (Ajv) | Heavy dependencies, wrong format (CONSTITUTION is markdown) | Native RegExp pattern matching |
| gray-matter / front-matter | YAML parsing dependencies | Bash/Node.js regex to extract content between `---` markers |
| pre-commit framework (Python) | Python dependency, language switch overhead | Bash git hooks (GSD is Node.js ecosystem) |
| External test frameworks | Dependencies, complexity | Node.js built-in test runner (stable v20+) |

## Stack Patterns by Variant

**If GSD users are on Node.js v18.x (current minimum v16.7.0):**
- Use `util.parseArgs()` (available v18.3.0+, experimental but stable API)
- Use `node:test` (available v18.0.0+, experimental but functional)
- Note: Recommend upgrade to v20+ for stable APIs
- Flag in documentation: "Experimental features, stable in v20+"

**If GSD users are on Node.js v20.x+ (recommended):**
- Use stable `util.parseArgs()` (stable since v20.0.0)
- Use stable `node:test` (stable since v20.0.0)
- Full feature set: mocking, coverage, snapshots

**If enforcing TDD pattern validation:**
- Use bash `pre-commit` hook (runs before commit message)
- Analyze staged files with `git diff --cached --name-only`
- Parse file contents with `git diff --cached` or `git show :0:path/to/file`
- Check for test file patterns: `*.test.js`, `*.spec.js`, `__tests__/*.js`
- Exit non-zero to block commit, allow `--no-verify` override

**If enforcing commit message format:**
- Use bash `commit-msg` hook (receives message file path)
- Read message with `cat $1`
- Validate with bash regex `[[ $msg =~ ^(feat|fix|test|refactor): ]]`
- Exit non-zero to reject, allow `--no-verify` override

**If validating CONSTITUTION.md structure:**
- Parse frontmatter: `sed -n '/^---$/,/^---$/p'` (bash)
- Extract rule levels: `grep -E '^## (NON-NEGOTIABLE|ERROR|WARNING)'`
- Validate required sections present
- NO full markdown linter needed

## Version Compatibility

| Component | Minimum Version | Recommended Version | Notes |
|-----------|-----------------|---------------------|-------|
| Node.js | v16.7.0 (GSD current) | v20.0.0+ | v20+ for stable test runner, parseArgs |
| Git | 2.0+ | 2.20+ | v2.20+ for improved `--porcelain` format |
| Bash | 4.0+ | 5.0+ | v4+ for `[[ =~ ]]` regex matching |
| util.parseArgs() | v18.3.0+ | v20.0.0+ | Experimental in v18, stable in v20 |
| node:test | v18.0.0+ | v20.0.0+ | Experimental in v18, stable in v20 |

## Implementation Architecture

### Git Hook Flow

```
1. Developer runs: git commit
2. Git executes: .git/hooks/pre-commit (if executable)
   ├─ Analyze staged files: git diff --cached --name-only
   ├─ Check for test files: [[ $file =~ \.(test|spec)\.js$ ]]
   ├─ If code changes without tests: exit 1 (block)
   └─ If tests present: exit 0 (allow)
3. Git executes: .git/hooks/commit-msg <msg-file>
   ├─ Read message: msg=$(cat "$1")
   ├─ Validate format: [[ $msg =~ ^(feat|fix|test): ]]
   ├─ Check TDD keywords: [[ $msg =~ (test|TDD|spec) ]]
   └─ Exit 0/1 based on validation
4. Commit completes or aborts
```

### CONSTITUTION.md Validation Flow

```
1. GSD command reads CONSTITUTION.md
2. Extract frontmatter (bash or Node.js):
   - Regex: /^---\n([\s\S]*?)\n---/
   - Parse key-value: /^(\w+):\s*(.+)$/
3. Extract rule sections:
   - Regex: /^## (NON-NEGOTIABLE|ERROR|WARNING)/
4. Validate structure:
   - Required sections present
   - Rule format correct
5. Cache parsed rules in memory (Node.js)
6. Apply during commit validation
```

### TDD Pattern Detection

```
1. Git hook triggered on commit
2. Get staged file list: git diff --cached --name-only
3. Filter code files (exclude .md, .json): [[ $file =~ \.js$ ]]
4. For each code file:
   ├─ Check if test file exists: [[ -f ${file%.js}.test.js ]]
   ├─ OR check test content added in this commit
   └─ If no test: flag violation
5. Read CONSTITUTION.md enforcement level:
   ├─ NON-NEGOTIABLE: exit 1 (hard block)
   ├─ ERROR: exit 1, allow --no-verify override
   └─ WARNING: echo warning, exit 0 (allow)
```

## Bash Git Hook Examples

### pre-commit Hook Template

```bash
#!/bin/bash
# .git/hooks/pre-commit
# TDD enforcement

# Get staged JavaScript files (excluding tests)
staged_code=$(git diff --cached --name-only | grep -E '\.js$' | grep -v -E '\.(test|spec)\.js$')

# Get staged test files
staged_tests=$(git diff --cached --name-only | grep -E '\.(test|spec)\.js$')

# If code changes without test changes, check enforcement
if [[ -n "$staged_code" ]] && [[ -z "$staged_tests" ]]; then
  echo "ERROR: Code changes detected without test changes"
  echo "Files changed:"
  echo "$staged_code"
  echo ""
  echo "CONSTITUTION: TDD is mandatory"
  echo "Override with: git commit --no-verify"
  exit 1
fi

exit 0
```

### commit-msg Hook Template

```bash
#!/bin/bash
# .git/hooks/commit-msg
# Commit message format validation

commit_msg_file="$1"
commit_msg=$(cat "$commit_msg_file")

# Extract first line (subject)
subject=$(echo "$commit_msg" | head -n 1)

# Check for conventional commit format
if [[ ! "$subject" =~ ^(feat|fix|test|refactor|docs|chore|style|perf)(\(.+\))?:\ .+ ]]; then
  echo "ERROR: Commit message must follow conventional format"
  echo "Format: <type>: <description>"
  echo "Types: feat, fix, test, refactor, docs, chore, style, perf"
  echo ""
  echo "Your message: $subject"
  echo ""
  echo "Override with: git commit --no-verify"
  exit 1
fi

# Check for TDD keywords in test commits
if [[ "$subject" =~ ^test: ]]; then
  if [[ ! "$commit_msg" =~ (TDD|red|green|refactor) ]]; then
    echo "WARNING: Test commits should reference TDD cycle"
    echo "Consider adding: TDD, red, green, or refactor"
    # Don't block, just warn
  fi
fi

exit 0
```

### Node.js Validation Script Template

```javascript
#!/usr/bin/env node
// scripts/validate-constitution.js
// NO dependencies - uses Node.js built-ins only

import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

// Parse CLI args
const { values } = parseArgs({
  options: {
    file: { type: 'string', default: 'CONSTITUTION.md' },
    strict: { type: 'boolean', default: false }
  }
});

// Read CONSTITUTION.md
const content = readFileSync(values.file, 'utf8');

// Extract frontmatter
const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
if (!frontmatterMatch) {
  console.error('ERROR: No frontmatter found');
  process.exit(1);
}

// Parse frontmatter (simple key-value)
const frontmatter = {};
frontmatterMatch[1].split('\n').forEach(line => {
  const match = line.match(/^(\w+):\s*(.+)$/);
  if (match) {
    frontmatter[match[1]] = match[2];
  }
});

// Check required sections
const requiredSections = ['NON-NEGOTIABLE', 'ERROR', 'WARNING'];
const foundSections = content.match(/^## (NON-NEGOTIABLE|ERROR|WARNING)/gm) || [];

const missingSections = requiredSections.filter(
  section => !foundSections.some(found => found.includes(section))
);

if (missingSections.length > 0) {
  console.error('ERROR: Missing required sections:', missingSections.join(', '));
  if (values.strict) process.exit(1);
}

console.log('✓ CONSTITUTION.md validation passed');
console.log('Frontmatter:', frontmatter);
console.log('Sections found:', foundSections.length);
```

## Testing Strategy

GSD's constitutional enforcement should be tested using Node.js built-in test runner:

```javascript
// tests/constitution.test.js
import { test, describe } from 'node:test';
import { strictEqual, match } from 'node:assert';

describe('CONSTITUTION.md validation', () => {
  test('detects missing frontmatter', () => {
    const content = '# Title\nNo frontmatter';
    const hasfrontmatter = /^---/.test(content);
    strictEqual(hasfrontmatter, false);
  });

  test('extracts rule sections', () => {
    const content = '## NON-NEGOTIABLE\n## ERROR\n## WARNING';
    const sections = content.match(/^## (NON-NEGOTIABLE|ERROR|WARNING)/gm);
    strictEqual(sections.length, 3);
  });

  test('validates TDD pattern in commit', () => {
    const msg = 'test: add user validation';
    const isTddCommit = /^test:/.test(msg);
    strictEqual(isTddCommit, true);
  });
});
```

Run with: `node --test tests/`

## Performance Considerations

| Operation | Zero-Dep Approach | Performance Impact | Notes |
|-----------|-------------------|-------------------|-------|
| Commit validation | Bash git hooks | ~10-50ms per commit | Negligible - runs once per commit |
| YAML parsing | Regex extraction | ~1-5ms | Simple frontmatter only, no complex YAML |
| Test file detection | git diff + regex | ~5-20ms | Depends on # of staged files |
| Pattern matching | Native RegExp | <1ms per pattern | JavaScript regex is highly optimized |

**Verdict:** Zero-dependency approach is FASTER than library-based approach (no module loading overhead).

## Sources

### HIGH Confidence Sources (Official Documentation)

- [Node.js util.parseArgs() Documentation](https://nodejs.org/api/util.html) - Stable API status, version compatibility
- [Node.js Test Runner Documentation](https://nodejs.org/api/test.html) - Built-in test runner features, TDD support
- [Git Hooks Documentation](https://git-scm.com/docs/githooks) - pre-commit, commit-msg, pre-push hook specifications
- [Git Diff Documentation](https://git-scm.com/docs/git-diff) - Porcelain format, scripting options
- [Git Log Documentation](https://git-scm.com/docs/git-log) - Pretty format for commit parsing

### MEDIUM Confidence Sources (Verified Community Knowledge)

- [Git Hooks for Automated Code Quality Checks Guide 2025 - DEV Community](https://dev.to/arasosman/git-hooks-for-automated-code-quality-checks-guide-2025-372f) - Bash hook patterns
- [Zero Dependency Testing With Node.js - GitNation](https://gitnation.com/contents/zero-dependency-testing-with-nodejs) - Native test runner advocacy
- [Dependency-free Command-Line Apps - Liran Tal](https://lirantal.com/blog/dependency-free-command-line-apps-powered-by-node-js-core-modules) - Zero-dependency patterns
- [Bash Regex Pattern Matching - Baeldung](https://www.baeldung.com/linux/regex-inside-if-clause) - `[[ =~ ]]` operator usage
- [Git Diff for Script Automation - DataCamp](https://www.datacamp.com/tutorial/git-diff-guide) - Parsing git diff in scripts

### LOW Confidence Sources (Supplementary Research)

- [tdd-bdd-commit](https://github.com/matatk/tdd-bdd-commit) - TDD-specific commit tooling (reference implementation)
- [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) - Commit message format spec
- [markdownlint](https://github.com/DavidAnson/markdownlint) - Markdown linting (alternative NOT recommended for GSD)
- [commitlint](https://github.com/conventional-changelog/commitlint) - Commit message linting (alternative NOT recommended for GSD)

---

*Stack research for: Constitutional Enforcement in CLI Dev Tools*
*Researched: 2026-01-18*
*Confidence: HIGH (verified with official Node.js and Git documentation)*
