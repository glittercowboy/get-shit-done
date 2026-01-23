# Testing Patterns

**Analysis Date:** 2026-01-23

## Overview

GSD is a prompt/workflow system without traditional unit tests. Testing occurs at multiple levels:

1. **Prompt validation** — Agents verify plans against PLAN.md structure
2. **Output verification** — Agents check generated files exist and contain required fields
3. **Integration testing** — Actual CLI installer execution with verification
4. **Manual verification** — User acceptance testing via `/gsd:verify-work`

The codebase contains **no test framework** (no Jest, Vitest, Mocha). All quality assurance is specification-driven through structured verification steps in workflows.

## Test Execution

### No Automated Test Suite

**Build command:**
```bash
npm run build:hooks
```

This copies hook files to `hooks/dist/` for installation. No tests are run.

**Install verification:**
```bash
node bin/install.js --global --claude
```

The installer itself is the primary integration test. It verifies at runtime:
- Directory creation succeeds
- File copying succeeds
- JSON parsing/writing works
- Settings.json updates correctly

## Verification Patterns (Specification-Driven Testing)

Since GSD is a meta-prompting system, testing happens through structured verification in agents and commands.

### Agent Verification Pattern

Agents include explicit `<success_criteria>` checkpoints:

**Example from `gsd-executor.md`:**

```xml
<step name="verify_and_output">

## Verify Execution Completeness

Check that all tasks completed:

```bash
# For each task in the plan:
grep -q "✓" SUMMARY.md || {
  echo "ERROR: Not all tasks marked complete in SUMMARY.md"
  exit 1
}

# Check commit count matches tasks
TASK_COUNT=$(grep -c "<task" PLAN.md)
COMMIT_COUNT=$(grep -c "^Co-Authored-By" SUMMARY.md)
if [ "$TASK_COUNT" -ne "$COMMIT_COUNT" ]; then
  echo "WARNING: Task count ($TASK_COUNT) != commit count ($COMMIT_COUNT)"
fi
```

</step>
```

### Verification Step Structure

All multi-step workflows include verification:

```xml
<step name="step_name">
[Implementation]

## Verify

Check that X was created:
```bash
ls -la [path]
```

Verify content:
```bash
grep "expected_pattern" [file]
```

</step>
```

### Checkpoint Verification (Human)

User-facing verification uses structured checkpoints:

```xml
<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Created login endpoint at POST /api/auth/login</what-built>
  <how-to-verify>
1. Start dev server: npm run dev
2. curl -X POST http://localhost:3000/api/auth/login \
   -H "Content-Type: application/json" \
   -d '{"email":"test@test.com","password":"wrong"}'
3. Should return 401 Unauthorized
4. curl same endpoint with password="correct"
5. Should return 200 with Set-Cookie header
  </how-to-verify>
  <resume-signal>Run /gsd:verify-work and select "Endpoint works" or "Endpoint failed"</resume-signal>
</task>
```

## Output Verification Checklist Pattern

**Agents verify output files match specification:**

From `gsd-codebase-mapper.md`:

```bash
# Verify document exists
if [ ! -f ".planning/codebase/CONVENTIONS.md" ]; then
  echo "ERROR: CONVENTIONS.md not written"
  exit 1
fi

# Verify document has required sections
grep -q "# Naming Patterns" .planning/codebase/CONVENTIONS.md || {
  echo "ERROR: Missing 'Naming Patterns' section"
  exit 1
}

grep -q "# Code Style" .planning/codebase/CONVENTIONS.md || {
  echo "ERROR: Missing 'Code Style' section"
  exit 1
}
```

## Testing JavaScript Utilities

**No unit test framework is used.** Utilities are tested through:

1. **Integration tests in install script** — Functions are called during install, failures surface immediately
2. **Manual testing** — Run installer commands and verify artifacts
3. **Cross-platform validation** — Test on macOS, Linux, Windows (WSL2)

### Helper Function Verification

Helper functions like `expandTilde()`, `buildHookCommand()` are verified through usage:

**In `bin/install.js`:**

```javascript
/**
 * Expand ~ to home directory (shell doesn't expand in env vars passed to node)
 */
function expandTilde(filePath) {
  if (filePath && filePath.startsWith('~/')) {
    return path.join(os.homedir(), filePath.slice(2));
  }
  return filePath;
}

// Function is verified when install runs
const explicitConfigDir = parseConfigDirArg();
const targetDir = isGlobal
  ? getGlobalDir(runtime, expandTilde(explicitConfigDir))  // Used here
  : path.join(process.cwd(), dirName);
```

### File Operation Verification

Files are verified after write operations:

```javascript
/**
 * Verify a directory exists and contains files
 */
function verifyInstalled(dirPath, description) {
  if (!fs.existsSync(dirPath)) {
    console.error(`  ${yellow}✗${reset} Failed to install ${description}: directory not created`);
    return false;
  }
  try {
    const entries = fs.readdirSync(dirPath);
    if (entries.length === 0) {
      console.error(`  ${yellow}✗${reset} Failed to install ${description}: directory is empty`);
      return false;
    }
  } catch (e) {
    console.error(`  ${yellow}✗${reset} Failed to install ${description}: ${e.message}`);
    return false;
  }
  return true;
}

// Usage during install
if (verifyInstalled(gsdDest, 'commands/gsd')) {
  console.log(`  ${green}✓${reset} Installed commands/gsd`);
} else {
  failures.push('commands/gsd');
}
```

## Error Scenarios

**Testing for failures:**

Installer handles common error cases:

```javascript
// 1. Invalid config-dir
if (!nextArg || nextArg.startsWith('-')) {
  console.error(`  ${yellow}--config-dir requires a path argument${reset}`);
  process.exit(1);
}

// 2. File doesn't exist
if (!fs.existsSync(settingsPath)) {
  return {};  // Safe default
}

// 3. Invalid JSON
try {
  return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
} catch (e) {
  return {};
}

// 4. Process spawning failure
const child = spawn(process.execPath, ['-e', scriptBody], {
  stdio: 'ignore',
  windowsHide: true
});
child.unref();
```

## Testing CLI Installer

**Manual integration test procedure:**

```bash
# 1. Test global install
npx get-shit-done-cc --claude --global

# 2. Verify installation
ls ~/.claude/commands/gsd/                    # Should have files
ls ~/.claude/get-shit-done/                   # Should have files
ls ~/.claude/agents/gsd-*.md                  # Should have agents

# 3. Test config-dir override
npx get-shit-done-cc --claude --global --config-dir ~/.claude-test

# 4. Verify custom location
ls ~/.claude-test/commands/gsd/               # Should have files

# 5. Test local install
cd /tmp/test-project
npx get-shit-done-cc --claude --local
ls ./.claude/commands/gsd/                    # Should have files

# 6. Test uninstall
npx get-shit-done-cc --claude --global --uninstall
ls ~/.claude/commands/gsd/ 2>/dev/null       # Should NOT exist

# 7. Verify settings.json cleanup
grep -q "gsd-statusline" ~/.claude/settings.json && echo "ERROR: Statusline not removed" || echo "OK"
```

## Specification Testing (Agent Output)

Agents produce verification output that proves work is complete:

**Example from execution summary:**

```markdown
## Execution Summary

**Plan:** 01-initialization-00-setup
**Duration:** 18m 33s
**Tasks:** 3 completed, 0 deviations

### Task Completion

- [x] Task 1: Initialize project structure
  - Commit: feat(01-00): add project structure
  - Files created: 5

- [x] Task 2: Create configuration files
  - Commit: feat(01-00): add configuration
  - Files created: 3

- [x] Task 3: Set up build system
  - Commit: feat(01-00): configure build pipeline
  - Files created: 2

### Verification

✓ All artifacts exist in expected locations
✓ Configuration validates against schema
✓ Build system runs successfully
✓ Git history complete with 3 commits
```

## No Test Coverage Tracking

There is no coverage requirement or coverage tool configured. Quality is ensured through:

1. **Structural validation** — Plans must follow PLAN.md format
2. **Runtime verification** — Agents verify outputs exist
3. **User acceptance testing** — `/gsd:verify-work` command for human verification
4. **Specification correctness** — Plans are reviewed before execution

## Mocking & Fixtures (Not Used)

GSD does not mock external systems. Instead:

- **File systems** are real (tested against actual disk)
- **Child processes** are executed (update check actually runs `npm view`)
- **Environment** uses actual shell (bash/zsh/PowerShell)

This ensures real-world validation of install/uninstall logic.

## Test Data

No test fixtures are committed. Instead, agents create and verify real output:

```bash
# Agents create actual files in .planning/
mkdir -p .planning/phases/01-init
touch .planning/phases/01-init/plan-setup/PLAN.md
touch .planning/phases/01-init/plan-setup/SUMMARY.md

# Verify by reading back
cat .planning/phases/01-init/plan-setup/SUMMARY.md
```

## Known Test Gaps

**Not tested:**
- Windows path handling (only tested on macOS/Linux, WSL2)
- OpenCode compatibility (syntax conversion, permissions)
- Concurrent installs (race conditions on settings.json)
- Very large settings.json files (performance)
- Non-TTY stdin handling (fully interactive prompts)

## Verification Checklist Template

All agents end with a verification checklist matching their role:

**Example from `gsd-executor.md`:**

```xml
<success_criteria>
- [ ] All tasks in PLAN.md executed
- [ ] One commit per task created
- [ ] SUMMARY.md written with task completion status
- [ ] STATE.md updated with execution results
- [ ] Git log includes all new commits
- [ ] No uncommitted changes in project files
- [ ] Checkpoint outputs documented if needed
- [ ] Task deviations recorded in SUMMARY.md if any
</success_criteria>
```

---

*Testing analysis: 2026-01-23*
