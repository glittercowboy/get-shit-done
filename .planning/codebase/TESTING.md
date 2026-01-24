# Testing Patterns

**Analysis Date:** 2026-01-24

## Test Framework

**Status:** Not implemented

The codebase currently has **no automated tests**. No test framework, no test files, no coverage configuration detected.

- No Jest, Vitest, Mocha, or other test runners in `package.json`
- No test config files (jest.config.js, vitest.config.ts, etc.)
- No test files found in codebase (*.test.js, *.spec.js)
- No `npm test` script in package.json

**Implication:** Testing is manual only. New code requires manual verification of behavior.

## Test Strategy for This Project

Given the project's nature as a **meta-prompting system for Claude Code**, automated testing may be impractical for several reasons:

1. **Most code is Markdown/XML prompts:** Cannot be directly tested as code. Agent instructions and workflows are read by Claude, not executed.

2. **Limited JavaScript code:** Only 4 small JavaScript files exist:
   - `bin/install.js` — Installation utility
   - `hooks/gsd-check-update.js` — Version check hook
   - `hooks/gsd-statusline.js` — Status display hook
   - `scripts/build-hooks.js` — Build script

3. **JavaScript code is utilities:** These utilities are thin CLI/hook wrappers with heavy file I/O and system operations. Testing would require mocking Node.js fs, path, os modules extensively.

4. **Installation testing:** Most verification is manual: user runs `npx get-shit-done-cc`, verifies files exist, runs `/gsd:help` in Claude Code.

## Manual Testing Approach

The project uses **manual verification** as its primary testing method:

**For Installation (`bin/install.js`):**
- Run installer with various flags: `--global`, `--local`, `--claude`, `--opencode`, etc.
- Verify file structure created in target directory
- Verify settings.json correctly updated
- Verify path references replaced correctly

**For Hooks:**
- Run Claude Code and verify statusline displays correctly (`gsd-statusline.js`)
- Run Claude Code and verify update notifications appear (`gsd-check-update.js`)

**For Workflows/Agents:**
- Manual testing in Claude Code using actual workflow commands
- User feedback drives fixes (issues reported in Discord, GitHub)
- Spot checks of generated files for correctness

## Test File Organization

**Not applicable** — no test files in project.

**If automated testing were to be added:**

Recommendation would be:
```
test/
  unit/
    install.test.js
  integration/
    install-integration.test.js
```

Location: Co-located test files with source (`bin/install.test.js` alongside `bin/install.js`)

## Test Structure

**Not applicable** — no test framework in use.

**If tests were written, suggested pattern:**

```javascript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('install.js', () => {
  describe('expandTilde()', () => {
    it('should expand ~ to home directory', () => {
      // arrange
      const homedir = os.homedir();

      // act
      const result = expandTilde('~/documents');

      // assert
      expect(result).toBe(path.join(homedir, 'documents'));
    });

    it('should leave non-tilde paths unchanged', () => {
      expect(expandTilde('/absolute/path')).toBe('/absolute/path');
    });
  });
});
```

**Patterns to follow if tests added:**
- Vitest runner (lightweight, TypeScript-ready)
- Arrange/act/assert structure
- One assertion focus per test
- Mock file system operations: `vi.mock('fs')`, `vi.mock('path')`

## Mocking Strategy (if tests were added)

**Framework:** Vitest with built-in mocking (`vi`)

**What would need mocking:**
- File system: `fs.readFileSync()`, `fs.writeFileSync()`, `fs.existsSync()`
- Process: `process.env`, `process.argv`, `process.exit()`
- Child process: `child_process.exec()` (if used)
- Home directory: `os.homedir()`

**What would not need mocking:**
- Path utilities: `path.join()`, `path.dirname()` (pure functions)
- String operations: `String.split()`, `String.replace()` (pure)
- Object utilities: `JSON.parse()`, `JSON.stringify()` (pure)

**Example mock pattern:**
```javascript
vi.mock('fs-extra');

it('mocks file system', () => {
  vi.mocked(fs.readFile).mockResolvedValue('file content');
  const result = await readConfig('test.json');
  expect(result).toBe('file content');
});
```

## Fixtures and Factories

**Not currently used** — no test files exist.

**If added, recommended pattern for test data:**

```javascript
// Factory function in test file
function createTestConfig(overrides = {}) {
  return {
    targetDir: '/tmp/test',
    global: false,
    runtimes: ['claude'],
    ...overrides
  };
}

// Shared fixtures for multi-test setup
// tests/fixtures/sample-settings.js
export const sampleSettings = {
  statusLine: { command: 'node hooks/gsd-statusline.js' },
  hooks: { SessionStart: [] }
};
```

**Location pattern (if tests added):**
- Factory functions: inline in test file near usage
- Shared fixtures: `tests/fixtures/` directory
- Mock data: inline when simple, factory when complex

## Coverage

**Current:** No coverage tracking
- No code coverage tool configured
- No coverage thresholds enforced
- No coverage reports generated

**Recommendation if tests added:**
- Use Vitest built-in coverage (c8)
- No hard threshold required
- Focus on critical paths: install logic, file operations, path handling
- Exclude: bin files (only run via CLI), config/test files

**Commands if tests existed:**
```bash
npm test                   # Run all tests
npm test -- --watch        # Watch mode
npm test -- --coverage     # Coverage report
npm run test:coverage      # Generate coverage HTML
```

## Test Types (If Implemented)

### Unit Tests
- **Scope:** Test single function in isolation
- **Example:** Test `expandTilde()` function with various inputs
- **Mocking:** Mock all file system and environment operations
- **Speed:** Each test <100ms

### Integration Tests
- **Scope:** Test multiple functions together (e.g., install() + file operations)
- **Example:** Test full install flow: create directories → copy files → update settings
- **Mocking:** Mock file system boundaries, use real path/os utilities
- **Setup:** Use temporary directories for test isolation

### E2E Tests
- **Status:** Not currently used
- **If needed:** Test actual installation to temporary Claude Code directory
- **Tools:** Manual or shell script verification

## Common Testing Patterns (For Future Implementation)

### Async Testing
```javascript
it('should install files', async () => {
  const result = await install(true, 'claude');
  expect(result).toHaveProperty('settingsPath');
});
```

### Error Testing
```javascript
it('should throw on invalid config dir', () => {
  expect(() => parseConfigDirArg('--config-dir')).toThrow('requires a path');
});

// Async error
it('should reject on missing directory', async () => {
  await expect(readSettings('/nonexistent')).rejects.toThrow();
});
```

### File System Testing
```javascript
vi.mock('fs');

it('should copy files correctly', () => {
  vi.mocked(fs.copyFileSync).mockReturnValue(undefined);
  copyWithPathReplacement('/src', '/dest', '/prefix');
  expect(fs.copyFileSync).toHaveBeenCalled();
});
```

### Environment Variable Testing
```javascript
it('should use CLAUDE_CONFIG_DIR env var', () => {
  const original = process.env.CLAUDE_CONFIG_DIR;
  process.env.CLAUDE_CONFIG_DIR = '/custom';

  const dir = getGlobalDir('claude');

  expect(dir).toBe('/custom');
  process.env.CLAUDE_CONFIG_DIR = original;
});
```

## How Tests Verify Behavior

**Current approach (manual verification):**
1. Run installation: `npx get-shit-done-cc --global --claude`
2. Check directory structure created: `ls ~/.claude/get-shit-done`
3. Check file contents: `cat ~/.claude/commands/gsd/help.md`
4. Test in Claude Code: Run `/gsd:help` command
5. Verify output: Check command loads and displays correctly

**Automated testing gaps:**
- Can't test UI/visual output (statusline display)
- Can't test Claude Code runtime behavior (orchestrator execution)
- Can't test user interaction (prompts, responses)
- Would need E2E framework for full verification

## Notes on Testing This Codebase

The GSD system is **primarily Markdown/XML-based prompts** consumed by Claude, not executable code. Traditional unit/integration testing doesn't apply well:

- **Prompts aren't tested:** Can't assert on prompt behavior (depends on Claude's interpretation)
- **Workflows are executable:** Only tested by running them in Claude Code
- **Installation verified manually:** User confirms files exist and commands work

**For new features:**
- Add tests only for pure functions (path utilities, string manipulation)
- Mock file I/O extensively
- Test JavaScript logic in isolation
- Verify Markdown/XML syntax manually or with linting

---

*Testing analysis: 2026-01-24*
*Update when test infrastructure is added*
