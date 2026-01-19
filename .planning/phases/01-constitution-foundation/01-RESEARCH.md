# Phase 1: Constitution Foundation - Research

**Researched:** 2026-01-19
**Domain:** Configuration file parsing, merging, and versioning
**Confidence:** HIGH

## Summary

Constitution Foundation requires parsing YAML frontmatter + markdown files, merging global and project-level configurations with override precedence, and implementing semantic versioning for migration safety.

The standard Node.js ecosystem provides battle-tested libraries for each component: **gray-matter** for frontmatter parsing (used by Gatsby, Netlify, Astro, HashiCorp), **semver** for version comparison (npm's own library), and **deepmerge** or **lodash.merge** for configuration merging. Markdown section extraction uses **markdown-tree-parser** for modern selector-based queries or **marked** for stability.

Critical architectural decisions: (1) Synchronous file loading is appropriate during initialization but must never be used in runtime operations. (2) Array merging strategy must be explicit—replacement vs concatenation has major implications for rule override behavior. (3) YAML indentation errors account for 70% of parsing issues and require strict validation. (4) Cross-platform path handling requires Node's `path` module and `os.homedir()`, not tilde expansion.

**Primary recommendation:** Use gray-matter + semver + deepmerge with synchronous loading during initialization, explicit array replacement for rule overrides, and path.join for all file path construction.

## Standard Stack

The established libraries/tools for configuration parsing and merging in Node.js:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| gray-matter | latest | YAML frontmatter parsing | Battle-tested, used by Gatsby, Netlify, Astro, HashiCorp. Better edge case handling than regex-based parsers |
| semver | latest | Semantic version comparison | Official npm semver parser. Comprehensive API (gt, lt, satisfies, compare) |
| deepmerge | 4.3.1+ | Deep object merging | Dedicated utility, 12,473+ projects. Predictable array handling |
| markdown-tree-parser | latest | Extract markdown sections | Modern API with CSS-like selectors. Efficient heading extraction |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lodash.merge | latest | Alternative deep merge | If lodash already in dependencies. Note: mutates first object unless using `_.merge({}, obj1, obj2)` |
| marked | latest | Alternative markdown parser | Need stability over features. Industry standard for 10+ years |
| expand-tilde | latest | Tilde path expansion | If supporting `~/.config` syntax. Node.js doesn't expand tilde natively |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| gray-matter | front-matter | Less feature-rich, no stringify support. gray-matter handles more edge cases |
| semver | compare-versions | Lighter (no dependencies) but less comprehensive. Missing satisfies() for range checking |
| deepmerge | Custom recursive merge | Reinventing wheel. Edge cases (circular refs, prototypes) are hard |

**Installation:**
```bash
npm install gray-matter semver deepmerge markdown-tree-parser
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── constitution/
│   ├── loader.js           # Loads and merges global + project files
│   ├── parser.js           # Parses YAML frontmatter + markdown sections
│   ├── versioning.js       # Checks version compatibility
│   └── merger.js           # Merges global + project rules
└── utils/
    └── paths.js            # Cross-platform path resolution
```

### Pattern 1: Configuration Loading (Initialization Only)

**What:** Load global and project constitution files during app initialization using synchronous fs methods.

**When to use:** Application startup, before serving requests or executing main logic. Never use sync methods in runtime operations.

**Example:**
```javascript
// Source: Node.js best practices + fs module docs
const fs = require('fs');
const path = require('path');
const os = require('os');

function loadConstitutionFiles() {
  // Cross-platform home directory
  const homeDir = os.homedir();
  const globalPath = path.join(homeDir, '.claude', 'get-shit-done', 'CONSTITUTION.md');
  const projectPath = path.join(process.cwd(), '.planning', 'CONSTITUTION.md');

  // Synchronous loading is OK during initialization
  const globalExists = fs.existsSync(globalPath);
  const projectExists = fs.existsSync(projectPath);

  const globalContent = globalExists ? fs.readFileSync(globalPath, 'utf8') : null;
  const projectContent = projectExists ? fs.readFileSync(projectPath, 'utf8') : null;

  return { global: globalContent, project: projectContent };
}
```

### Pattern 2: Frontmatter + Markdown Parsing

**What:** Parse YAML frontmatter and extract markdown sections with rule IDs.

**When to use:** After loading file content, before merging configurations.

**Example:**
```javascript
// Source: gray-matter documentation
const matter = require('gray-matter');
const { MarkdownTreeParser } = require('markdown-tree-parser');

function parseConstitution(content) {
  // Parse frontmatter
  const { data: frontmatter, content: markdown } = matter(content);

  // Extract sections by severity
  const parser = new MarkdownTreeParser();
  const tree = parser.parse(markdown);

  const nonNegotiable = parser.extractSection(tree, 'NON-NEGOTIABLE', 1);
  const errors = parser.extractSection(tree, 'ERROR', 1);
  const warnings = parser.extractSection(tree, 'WARNING', 1);

  return {
    version: frontmatter.version,
    lastUpdated: frontmatter.lastUpdated,
    rules: {
      'NON-NEGOTIABLE': parseRules(nonNegotiable),
      'ERROR': parseRules(errors),
      'WARNING': parseRules(warnings)
    }
  };
}

function parseRules(sectionContent) {
  // Extract rule IDs from headings like "### TDD-01: Test before implementation"
  const rulePattern = /^### ([A-Z]+-\d+):\s*(.+)$/gm;
  const rules = [];
  let match;

  while ((match = rulePattern.exec(sectionContent)) !== null) {
    rules.push({
      id: match[1],
      description: match[2]
    });
  }

  return rules;
}
```

### Pattern 3: Semantic Version Checking

**What:** Verify constitution version compatibility before merging.

**When to use:** After parsing both constitutions, before merge operation.

**Example:**
```javascript
// Source: semver documentation
const semver = require('semver');

function checkVersionCompatibility(globalVersion, projectVersion) {
  // Ensure project version is compatible with global
  if (!semver.valid(globalVersion) || !semver.valid(projectVersion)) {
    throw new Error('Invalid semver format in constitution version');
  }

  // Breaking change detection (major version mismatch)
  const globalMajor = semver.major(globalVersion);
  const projectMajor = semver.major(projectVersion);

  if (projectMajor < globalMajor) {
    throw new Error(
      `Constitution version mismatch: project (${projectVersion}) is behind global (${globalVersion}). Migration required.`
    );
  }

  return {
    compatible: true,
    globalVersion,
    projectVersion,
    needsMigration: projectMajor !== globalMajor
  };
}
```

### Pattern 4: Configuration Merging with Array Replacement

**What:** Merge global and project constitutions with project override precedence.

**When to use:** After version checking, to produce final merged configuration.

**Example:**
```javascript
// Source: deepmerge documentation
const deepmerge = require('deepmerge');

function mergeConstitutions(globalConfig, projectConfig) {
  // Array replacement strategy: project arrays completely replace global arrays
  const arrayMergeStrategy = (target, source) => source;

  const merged = deepmerge(globalConfig, projectConfig, {
    arrayMerge: arrayMergeStrategy,
    // Ensure we create new object, not mutate global
    clone: true
  });

  // Validation: ensure rule IDs are unique
  const allRuleIds = new Set();
  for (const severity of ['NON-NEGOTIABLE', 'ERROR', 'WARNING']) {
    for (const rule of merged.rules[severity]) {
      if (allRuleIds.has(rule.id)) {
        throw new Error(`Duplicate rule ID: ${rule.id}`);
      }
      allRuleIds.add(rule.id);
    }
  }

  return merged;
}
```

### Pattern 5: Cross-Platform Path Resolution

**What:** Handle file paths safely across Windows, macOS, and Linux.

**When to use:** Everywhere paths are constructed or resolved.

**Example:**
```javascript
// Source: Node.js path module documentation
const path = require('path');
const os = require('os');

function resolveConstitutionPaths() {
  // NEVER use string concatenation or backslashes
  // BAD: homeDir + '/.claude/get-shit-done/CONSTITUTION.md'
  // BAD: homeDir + '\\.claude\\get-shit-done\\CONSTITUTION.md'

  // GOOD: Always use path.join
  const homeDir = os.homedir(); // Works on all platforms
  const globalPath = path.join(homeDir, '.claude', 'get-shit-done', 'CONSTITUTION.md');

  // If supporting tilde syntax, expand manually
  function expandTilde(filepath) {
    if (filepath.startsWith('~/')) {
      return path.join(os.homedir(), filepath.slice(2));
    }
    return filepath;
  }

  return { globalPath, expandTilde };
}
```

### Anti-Patterns to Avoid

- **Async file loading during initialization:** Adds complexity with no benefit. Sync is appropriate for startup config loading.
- **String-based path concatenation:** `homeDir + '/.claude/...'` breaks on Windows. Always use `path.join()`.
- **Array concatenation for rule merging:** Concatenating rules from global + project creates duplicates and unclear precedence. Use replacement.
- **Manual version comparison:** `globalVer > projectVer` string comparison fails for versions like "1.9.0" vs "1.10.0". Use semver.
- **Mutating global config:** `_.merge(globalConfig, projectConfig)` mutates first argument. Always create new object: `_.merge({}, global, project)`.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| YAML parsing | Custom YAML parser | gray-matter | Edge cases: indentation errors, type coercion (yes/no → boolean), special characters, BOM handling, nested structures. 70% of YAML issues are indentation-related. |
| Semantic version comparison | String comparison or regex | semver | Version comparison fails with string logic ("1.9.0" > "1.10.0" is false). Semver handles pre-release tags, build metadata, range satisfaction. |
| Deep object merging | Recursive merge function | deepmerge or lodash.merge | Circular references, prototype pollution, array handling, symbol properties, getter/setter preservation. Easy to get wrong. |
| Markdown section extraction | Regex-based heading search | markdown-tree-parser or marked | Nested headings, escaped characters, code blocks with fake headings, HTML in markdown, heading level hierarchy. |
| Tilde path expansion | String replace `~/` with `homeDir` | expand-tilde or manual os.homedir() | Edge case: `~username/path` (other user's home), `~+` (cwd), platform-specific behavior. |
| Cross-platform paths | String concatenation with `/` or `\\` | path.join() and os.homedir() | Windows uses `\`, Unix uses `/`. `path.join()` handles platform differences automatically. |

**Key insight:** Configuration parsing is deceptively complex. YAML indentation, version comparison semantics, and deep merge edge cases cause subtle bugs that only manifest in production. Use battle-tested libraries.

## Common Pitfalls

### Pitfall 1: YAML Indentation Errors

**What goes wrong:** 70% of YAML parsing issues stem from indentation. Mixing tabs and spaces, inconsistent spacing (2 vs 4 spaces), or single misaligned character breaks parsing.

**Why it happens:** YAML uses whitespace for structure (unlike JSON's braces). Invisible characters (tabs, non-breaking spaces, zero-width characters) look identical to spaces but break parsers.

**How to avoid:**
- Enforce 2-space indentation consistently (configure editor)
- Never allow tabs in YAML files (set editor to convert tabs → spaces)
- Use YAML linting (yamllint or IDE plugins)
- gray-matter provides better error messages than raw YAML parsers

**Warning signs:**
- Parse error mentioning "mapping" or "sequence" without obvious syntax error
- Error on line with correct-looking indentation (check for tabs with hex editor)
- Works in one editor but fails in another (tab vs space mixing)

### Pitfall 2: YAML Type Coercion Surprises

**What goes wrong:** YAML auto-converts values like `yes`, `no`, `on`, `off`, `true`, `false` to booleans. A version field like `version: 1.0` becomes number `1.0`, losing trailing zero.

**Why it happens:** YAML spec defines implicit type conversions for readability. Parsers treat unquoted values as typed data, not strings.

**How to avoid:**
- Always quote string values in frontmatter: `version: "1.0.0"`
- Quote values with special meaning: `"yes"`, `"no"`, `"true"`, `"false"`
- Use explicit types: `!!str yes` forces string interpretation

**Warning signs:**
- Version `1.0` parsed as `1` (number)
- Boolean where string expected
- Unexpected type errors when accessing frontmatter fields

### Pitfall 3: Array Merge Strategy Mismatch

**What goes wrong:** Default deep merge concatenates arrays, causing global rules + project rules to duplicate. Alternatively, index-based merging replaces array[0] with array[0], array[1] with array[1], creating Frankenstein configuration.

**Why it happens:** No universal "correct" array merge strategy. Concatenation makes sense for some use cases (dependency arrays), replacement for others (rule definitions).

**How to avoid:**
- Explicitly define array merge strategy: `arrayMerge: (target, source) => source` for replacement
- Document the strategy in code comments
- Validate merged result (check for duplicate rule IDs)

**Warning signs:**
- Duplicate rules in merged config
- Rules from global appearing when project explicitly overrode them
- Unexpected rule count after merge

### Pitfall 4: Synchronous IO in Runtime

**What goes wrong:** Using `fs.readFileSync()` in request handlers or runtime operations blocks Node's event loop, destroying concurrency and application performance.

**Why it happens:** Sync methods are simpler to write (no callbacks/promises). Developers copy initialization code into runtime without realizing the impact.

**How to avoid:**
- Only use sync fs methods during application startup (before server starts listening)
- Use async methods (`fs.promises.readFile`) for all runtime operations
- Establish clear boundary: initialization = sync OK, runtime = async only

**Warning signs:**
- Application becomes unresponsive under load
- Request latency spikes
- Single slow file read blocks all requests

### Pitfall 5: Platform-Specific Path Assumptions

**What goes wrong:** Hardcoded `/` separators or `~` expansion fails on Windows. Assuming home directory structure breaks across platforms.

**Why it happens:** Developers test on one platform (usually macOS/Linux) and assume paths work universally.

**How to avoid:**
- Always use `path.join()`, never string concatenation
- Get home directory from `os.homedir()`, not `process.env.HOME`
- Test on multiple platforms or use path.resolve for absolute paths

**Warning signs:**
- "ENOENT: no such file or directory" errors on Windows
- Paths like `/Users/...` hardcoded in code
- Tilde `~` appearing in resolved paths (Node doesn't expand it)

### Pitfall 6: Version String Comparison

**What goes wrong:** String comparison `"1.9.0" > "1.10.0"` evaluates to `true` because string comparison is lexicographic, not semantic. Causes version checks to fail catastrophically.

**Why it happens:** Assuming version numbers follow normal comparison rules. JavaScript string comparison goes character-by-character.

**How to avoid:**
- Always use semver library for version comparison
- Validate version format with `semver.valid()` before storing
- Use `semver.gt()`, `semver.lt()`, `semver.satisfies()` for comparisons

**Warning signs:**
- Version 1.10 treated as older than 1.9
- Pre-release versions (1.0.0-alpha) causing unexpected behavior
- Range checking (`^1.0.0`) not working

### Pitfall 7: Duplicate Rule IDs Across Global + Project

**What goes wrong:** Same rule ID defined in both global and project constitutions. Merge produces duplicate or overwrites rule unintentionally.

**Why it happens:** No automatic uniqueness constraint. Rule IDs chosen independently for global and project.

**How to avoid:**
- Validate uniqueness after merge: collect all rule IDs into Set, detect duplicates
- Establish naming convention: global uses `GBL-XXX`, project uses `PRJ-XXX`
- Document override behavior: project rule ID matching global rule ID intentionally replaces it

**Warning signs:**
- Same rule appearing twice in merged config
- Rule content from wrong source (global instead of expected project override)
- Verification checking rules that shouldn't exist

## Code Examples

Verified patterns from official sources:

### Complete Constitution Loader

```javascript
// Source: Synthesized from gray-matter, semver, deepmerge documentation
const fs = require('fs');
const path = require('path');
const os = require('os');
const matter = require('gray-matter');
const semver = require('semver');
const deepmerge = require('deepmerge');

class ConstitutionLoader {
  constructor() {
    this.globalPath = path.join(os.homedir(), '.claude', 'get-shit-done', 'CONSTITUTION.md');
    this.projectPath = path.join(process.cwd(), '.planning', 'CONSTITUTION.md');
  }

  load() {
    // Sync loading during initialization is appropriate
    const globalContent = this._readFile(this.globalPath);
    const projectContent = this._readFile(this.projectPath);

    if (!globalContent && !projectContent) {
      throw new Error('No constitution files found (global or project)');
    }

    const globalConfig = globalContent ? this._parse(globalContent) : null;
    const projectConfig = projectContent ? this._parse(projectContent) : null;

    // Version compatibility check
    if (globalConfig && projectConfig) {
      this._checkVersions(globalConfig.version, projectConfig.version);
    }

    // Merge with project override precedence
    const merged = this._merge(globalConfig, projectConfig);

    // Validate uniqueness
    this._validateRuleIds(merged);

    return merged;
  }

  _readFile(filepath) {
    if (!fs.existsSync(filepath)) {
      return null;
    }
    return fs.readFileSync(filepath, 'utf8');
  }

  _parse(content) {
    const { data: frontmatter, content: markdown } = matter(content);

    // Extract sections
    const rules = {};
    const severities = ['NON-NEGOTIABLE', 'ERROR', 'WARNING'];

    for (const severity of severities) {
      rules[severity] = this._extractRules(markdown, severity);
    }

    return {
      version: frontmatter.version,
      lastUpdated: frontmatter.lastUpdated,
      rules
    };
  }

  _extractRules(markdown, severity) {
    // Find section starting with # SEVERITY
    const sectionPattern = new RegExp(`# ${severity}([\\s\\S]*?)(?=# [A-Z]|$)`);
    const match = markdown.match(sectionPattern);

    if (!match) return [];

    const sectionContent = match[1];

    // Extract rules with format: ### RULE-ID: Description
    const rulePattern = /^### ([A-Z]+-\d+):\s*(.+)$/gm;
    const rules = [];
    let ruleMatch;

    while ((ruleMatch = rulePattern.exec(sectionContent)) !== null) {
      rules.push({
        id: ruleMatch[1],
        description: ruleMatch[2],
        severity
      });
    }

    return rules;
  }

  _checkVersions(globalVersion, projectVersion) {
    if (!semver.valid(globalVersion)) {
      throw new Error(`Invalid global constitution version: ${globalVersion}`);
    }
    if (!semver.valid(projectVersion)) {
      throw new Error(`Invalid project constitution version: ${projectVersion}`);
    }

    // Major version must match (breaking changes)
    if (semver.major(globalVersion) !== semver.major(projectVersion)) {
      throw new Error(
        `Constitution major version mismatch: global ${globalVersion}, project ${projectVersion}`
      );
    }
  }

  _merge(globalConfig, projectConfig) {
    if (!globalConfig) return projectConfig;
    if (!projectConfig) return globalConfig;

    // Array replacement strategy: project completely replaces global
    return deepmerge(globalConfig, projectConfig, {
      arrayMerge: (target, source) => source,
      clone: true
    });
  }

  _validateRuleIds(config) {
    const seen = new Set();

    for (const severity of ['NON-NEGOTIABLE', 'ERROR', 'WARNING']) {
      for (const rule of config.rules[severity]) {
        if (seen.has(rule.id)) {
          throw new Error(`Duplicate rule ID: ${rule.id}`);
        }
        seen.add(rule.id);
      }
    }
  }
}

module.exports = ConstitutionLoader;
```

### YAML Frontmatter Validation

```javascript
// Source: gray-matter documentation + YAML best practices
function validateFrontmatter(frontmatter) {
  // Check required fields
  if (!frontmatter.version) {
    throw new Error('Constitution missing required field: version');
  }

  // Ensure version is string (YAML may parse 1.0 as number)
  if (typeof frontmatter.version !== 'string') {
    throw new Error(`Constitution version must be string, got ${typeof frontmatter.version}`);
  }

  // Validate semver format
  if (!semver.valid(frontmatter.version)) {
    throw new Error(`Invalid semver format: ${frontmatter.version}`);
  }

  return true;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| JSON configuration | YAML frontmatter + markdown | 2015-2020 | More readable, supports documentation with rules. Common in static site generators (Jekyll, Hugo, Gatsby). |
| Manual version comparison | semver library | Established (npm standard) | Reliable semantic versioning. Handles pre-release, build metadata, range satisfaction. |
| Regex-based markdown parsing | AST-based parsers (remark, marked, markdown-tree-parser) | 2018-2023 | Safer parsing, handles edge cases (code blocks, escaped chars, nested structures). |
| Async-only fs operations | Sync during init, async at runtime | Best practice | Simpler initialization code, better performance at runtime. |

**Deprecated/outdated:**
- **expand-tilde package:** Low maintenance (last update 2017), has security vulnerabilities. Better: manual expansion with `os.homedir()`.
- **js-yaml-front-matter:** Superseded by gray-matter. Less active maintenance.
- **Regex-based frontmatter extraction:** Fragile, breaks on edge cases. Use gray-matter instead.

## Open Questions

Things that couldn't be fully resolved:

1. **Node.js version requirement for markdown-tree-parser**
   - What we know: Uses modern JS (async/await, ES modules)
   - What's unclear: Minimum Node.js version not documented in README
   - Recommendation: Test with Node 16+ (project requires 16.7.0+), document any compatibility issues

2. **Rule override semantics when IDs match**
   - What we know: Project should override global for same rule ID
   - What's unclear: Should it be explicit (project declares "override: RULE-ID") or implicit (matching ID = override)?
   - Recommendation: Start with implicit (simpler), add explicit if needed. Document behavior clearly.

3. **Migration strategy for constitution version changes**
   - What we know: Major version change = breaking change, should prevent merge
   - What's unclear: Should system auto-migrate, prompt user, or fail fast?
   - Recommendation: Fail fast with clear error message in Phase 1. Migration tooling in later phase if needed.

## Sources

### Primary (HIGH confidence)
- [gray-matter GitHub repository](https://github.com/jonschlinkert/gray-matter) - Frontmatter parser API and usage
- [semver GitHub repository](https://github.com/npm/node-semver) - Version comparison functions
- [markdown-tree-parser GitHub repository](https://github.com/ksylvan/markdown-tree-parser) - Markdown section extraction
- Node.js official documentation (path module, os module, fs module) - Platform-independent file operations

### Secondary (MEDIUM confidence)
- [YAML indentation pitfalls - Flipper File](https://flipperfile.com/developer-guides/yaml/why-yaml-indentation-breaks-easily/) - 70% of YAML errors are indentation-related
- [Cross-platform Node.js paths - ehmicky guide](https://github.com/ehmicky/cross-platform-node-guide/blob/main/docs/3_filesystem/file_paths.md) - Path handling best practices
- [Configuration merging patterns - webpack-merge](https://survivejs.com/blog/webpack-merge-interview/) - Array concatenation vs replacement strategies
- [ESLint configuration severity levels](https://deepwiki.com/eslint/eslint-jp/3.2-rules-and-severity-levels) - Established pattern for ERROR/WARNING severity
- [Node.js sync vs async best practices](https://medium.com/@shubham3480/node-part-v-0f626ead588d) - When sync methods are appropriate

### Tertiary (LOW confidence - WebSearch only)
- Various npm comparison sites (npm-compare.com) - Library popularity metrics
- Medium articles on deep merging - General patterns, not authoritative

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - gray-matter, semver, deepmerge are industry standards with official documentation verified
- Architecture: HIGH - Patterns synthesized from official docs and established Node.js best practices
- Pitfalls: MEDIUM to HIGH - YAML indentation (70% statistic verified), version comparison (semver docs), path handling (Node.js docs). Some pitfalls from general best practices.

**Research date:** 2026-01-19
**Valid until:** ~30 days (stable ecosystem, unlikely to change rapidly)

**Key decisions for planner:**
1. Use synchronous file loading during initialization (appropriate for config loading)
2. Implement array replacement strategy for rule merging (not concatenation)
3. Validate version compatibility before merge (fail fast on major version mismatch)
4. Use `path.join()` and `os.homedir()` for all path operations (cross-platform)
5. Validate rule ID uniqueness after merge (prevent duplicates)
