Perfect. Now I have all the information needed. Let me write a comprehensive TESTING.md file:

# Testing and Verification for GSD (Get Shit Done)

## Executive Summary

GSD is a **spec-driven, agent-orchestrated development system** built as an npm package. The project uses a unique testing approach: the core CLI utility (`gsd-tools.cjs`) has comprehensive automated tests, while the AI agent workflows rely on built-in verification mechanisms and human-in-the-loop validation.

**Key Philosophy:** "Existence ≠ Implementation" - verification is built into the workflow system through dedicated agents and structured validation commands.

## Current Testing Reality

### Automated Tests

**Test Framework:** Node.js Native Test Runner (`node:test`)

**Test File:** `get-shit-done/bin/gsd-tools.test.cjs` (2,273 lines)

**Main Code File:** `get-shit-done/bin/gsd-tools.cjs` (5,243 lines)

**Test Execution:** `npm test`

**Coverage:** ~100 test cases covering the CLI utility only (~15% of total codebase)

### What IS Tested

The test suite covers `gsd-tools.cjs` CLI utility comprehensively:

| Command Category | Test Coverage |
|-------------------|---------------|
| `history-digest` | Aggregating SUMMARY.md data, nested frontmatter, merging phases |
| `phases list` | Directory listing, numeric/decimal sorting, type filtering |
| `roadmap get-phase` | Phase extraction, missing phases, decimal support |
| `phase next-decimal` | Decimal phase calculation, gap handling |
| `phase-plan-index` | Plan indexing, wave grouping, incomplete detection |
| `state-snapshot` | STATE.md parsing, decisions/blockers extraction |
| `summary-extract` | Field extraction, selective field parsing |
| `init` commands | Context initialization for all workflows |
| `roadmap analyze` | Full roadmap parsing, completion status |
| `phase add` | Appending phases, directory creation |
| `phase insert` | Decimal phase insertion, padding handling |
| `phase remove` | Phase removal, renumbering, force flag |
| `phase complete` | Phase completion, transition, requirements update |
| `milestone complete` | Archiving milestones |
| `validate consistency` | Phase numbering, disk/roadmap sync |
| `progress` | JSON/bar/table rendering |
| `todo complete` | Todo completion, timestamp |
| `scaffold` | Context/UAT/verification/phase-dir creation |

### What is NOT Tested (Critical Gaps)

| Component | Lines | Test Coverage | Risk |
|-----------|-------|---------------|------|
| AI Agents (11 agents) | ~5,000+ | 0% | **Critical** |
| Workflow Orchestration (25+ workflows) | ~3,000+ | 0% | **Critical** |
| Installation Process (bin/install.js) | 1,807 | 0% | **Critical** |
| Command Definitions (28 commands) | ~2,000+ | 0% | High |
| Templates (40+ files) | ~1,000+ | 0% | Medium |
| Hooks (statusline, check-update) | ~500 | 0% | Medium |
| Multi-Runtime Compatibility | N/A | 0% | High |

## How to Validate Changes Before PR

### Prerequisite Checklist

Before creating a PR for any change, run through this validation checklist:

```bash
# 1. Run automated tests
npm test

# 2. Build distribution files
npm run build:hooks

# 3. Verify no lint errors (if applicable)
# (No linter configured - consider adding)

# 4. Install locally and smoke test
node bin/install.js --claude --local

# 5. Verify installation
# Check that gsd commands are available in your CLI runtime
/gsd:help

# 6. Run health check
# Use the gsd-health command to verify .planning/ integrity
```

### Type-Specific Validation

#### Changes to `gsd-tools.cjs`

1. **Write tests first** - Add new test cases to `gsd-tools.test.cjs`
2. **Run tests:** `npm test`
3. **Edge cases covered?** - Test error conditions, missing files, malformed input
4. **Backward compatibility?** - Ensure existing tests still pass
5. **Documentation update?** - Update command docs if behavior changes

#### Changes to Agents (`agents/`)

**Current Reality:** No automated tests exist for agents.

**Validation Process:**

1. **Manual testing:**
   ```bash
   # Trigger the agent workflow in a test project
   /gsd:plan-phase <phase>
   /gsd:execute-phase <phase>
   ```

2. **Verify agent behavior:**
   - Agent uses correct tools in expected sequence
   - Agent handles edge cases (missing files, malformed input)
   - Agent produces valid output

3. **Check references:**
   - Review `get-shit-done/references/` for agent specifications
   - Verify agent follows documented patterns

4. **Test across runtimes:**
   - Claude Code: Test in Claude Code CLI
   - OpenCode: Test in OpenCode (if applicable)
   - Gemini: Test in Gemini CLI (if applicable)

#### Changes to Workflows (`get-shit-done/workflows/`)

**Current Reality:** No automated tests exist for workflows.

**Validation Process:**

1. **End-to-end test:**
   ```bash
   # Create a fresh test project
   mkdir test-gsd-project && cd test-gsd-project
   git init
   
   # Run full workflow
   /gsd:new-project
   /gsd:plan-phase 1
   /gsd:execute-phase 1
   /gsd:verify-work 1
   ```

2. **Verify state progression:**
   - Check `.planning/STATE.md` updates correctly
   - Check phase directories created correctly
   - Check ROADMAP.md updated correctly

3. **Agent coordination:**
   - Verify agents are invoked in correct order
   - Verify context is passed between agents
   - Verify state persists correctly

#### Changes to Installation (`bin/install.js`)

**Current Reality:** No automated tests exist for installation.

**Validation Process:**

1. **Test all runtime modes:**
   ```bash
   # Test Claude Code (global)
   node bin/install.js --claude --global
   
   # Test Claude Code (local)
   node bin/install.js --claude --local
   
   # Test OpenCode (if applicable)
   node bin/install.js --opencode --local
   
   # Test Gemini (if applicable)
   node bin/install.js --gemini --local
   
   # Test multi-runtime
   node bin/install.js --claude --opencode --gemini --local
   ```

2. **Test non-interactive mode:**
   ```bash
   # For CI/Docker
   node bin/install.js --claude --global
   ```

3. **Test uninstallation:**
   ```bash
   node bin/install.js --claude --local --uninstall
   ```

4. **Verify file deployment:**
   - Check hooks are installed to correct location
   - Check commands are available
   - Check config directory is set up

5. **Test local patch persistence:**
   - Make local modifications to installed files
   - Re-run installation
   - Verify modifications are preserved

#### Changes to Templates (`get-shit-done/templates/`)

**Validation Process:**

1. **Test template fill:**
   ```bash
   # Test summary template
   gsd-tools template fill summary --phase 1
   
   # Test plan template
   gsd-tools template fill plan --phase 1
   
   # Test verification template
   gsd-tools template fill verification
   ```

2. **Verify variable substitution:**
   - All template variables are replaced
   - Conditional blocks work correctly
   - Output is valid Markdown

3. **Verify template integrity:**
   - Required fields present
   - Frontmatter is valid
   - Template matches documentation

#### Changes to Hooks (`hooks/`)

**Validation Process:**

1. **Build hooks:**
   ```bash
   npm run build:hooks
   ```

2. **Test after installation:**
   ```bash
   node bin/install.js --claude --local
   ```

3. **Verify hook behavior:**
   - Statusline updates correctly
   - Check-update works (if applicable)
   - Hook integrates with runtime

## Smoke Checks for CLI Commands

### Core Commands Smoke Test

After any installation or significant changes, run this smoke test:

```bash
# 1. Verify installation
node bin/install.js --claude --local

# 2. Check gsd-tools availability
# Verify gsd-tools is in PATH (or accessible via full path)
get-shit-done/bin/gsd-tools.cjs --help 2>/dev/null || node get-shit-done/bin/gsd-tools.cjs --help

# 3. Test state operations
node get-shit-done/bin/gsd-tools.cjs state get

# 4. Test validation
node get-shit-done/bin/gsd-tools.cjs validate consistency

# 5. Test health check
node get-shit-done/bin/gsd-tools.cjs validate health

# 6. Test progress
node get-shit-done/bin/gsd-tools.cjs progress

# 7. Test phases operations (if in a project with .planning/)
node get-shit-done/bin/gsd-tools.cjs phases list

# 8. Test roadmap operations (if ROADMAP.md exists)
node get-shit-done/bin/gsd-tools.cjs roadmap analyze
```

### Full Workflow Smoke Test

Create a fresh test project and run through the full workflow:

```bash
# Setup
mkdir test-gsd-smoke && cd test-gsd-smoke
git init

# Step 1: Initialize new project
/gsd:new-project
# Verify: .planning/ directory created, STATE.md, ROADMAP.md, REQUIREMENTS.md exist

# Step 2: Plan first phase
/gsd:plan-phase 1
# Verify: 01/ directory created, PLAN.md files created

# Step 3: Execute first phase
/gsd:execute-phase 1
# Verify: Code changes made, commits created, SUMMARY.md files created

# Step 4: Verify work
/gsd:verify-work 1
# Verify: VERIFICATION.md created, UAT.md created

# Step 5: Complete phase
/gsd:phase complete 1
# Verify: STATE.md updated, phase marked complete

# Step 6: Check progress
/gsd:progress
# Verify: Progress bar shows completed phase
```

### Command-Specific Smoke Tests

#### State Operations
```bash
# Load state
node get-shit-done/bin/gsd-tools.cjs state load

# Update a field
node get-shit-done/bin/gsd-tools.cjs state update --field name --value "Test Project"

# Get state
node get-shit-done/bin/gsd-tools.cjs state get
```

#### Phase Operations
```bash
# List phases
node get-shit-done/bin/gsd-tools.cjs phases list

# List only plans
node get-shit-done/bin/gsd-tools.cjs phases list --type plans

# List only summaries
node get-shit-done/bin/gsd-tools.cjs phases list --type summaries

# Find a phase
node get-shit-done/bin/gsd-tools.cjs find-phase 1
```

#### Roadmap Operations
```bash
# Analyze roadmap
node get-shit-done/bin/gsd-tools.cjs roadmap analyze

# Get phase section
node get-shit-done/bin/gsd-tools.cjs roadmap get-phase 1
```

#### Validation
```bash
# Check consistency
node get-shit-done/bin/gsd-tools.cjs validate consistency

# Check health
node get-shit-done/bin/gsd-tools.cjs validate health

# Repair if needed
node get-shit-done/bin/gsd-tools.cjs validate health --repair
```

#### Verification
```bash
# Verify plan structure
node get-shit-done/bin/gsd-tools.cjs verify plan-structure 01/PLAN.md

# Verify phase completeness
node get-shit-done/bin/gsd-tools.cjs verify phase-completeness 1

# Verify references
node get-shit-done/bin/gsd-tools.cjs verify references 01/PLAN.md
```

#### Scaffolding
```bash
# Scaffold context
node get-shit-done/bin/gsd-tools.cjs scaffold context --phase 1

# Scaffold UAT
node get-shit-done/bin/gsd-tools.cjs scaffold uat --phase 1

# Scaffold verification
node get-shit-done/bin/gsd-tools.cjs scaffold verification --phase 1
```

#### Frontmatter Operations
```bash
# Get frontmatter
node get-shit-done/bin/gsd-tools.cjs frontmatter get 01/PLAN.md

# Validate frontmatter
node get-shit-done/bin/gsd-tools.cjs frontmatter validate 01/PLAN.md --schema plan
```

## Verification and Validation System

### Built-in Verification Mechanisms

GSD includes extensive verification capabilities built into the workflow system:

#### 1. Verification Patterns Reference

**File:** `get-shit-done/references/verification-patterns.md`

**Principle:** "Existence ≠ Implementation" - 4 levels of verification:
1. **Exists** - File is present
2. **Substantive** - Content is real, not placeholder
3. **Wired** - Connected to rest of system
4. **Functional** - Actually works when invoked

#### 2. TDD Support

**File:** `get-shit-done/references/tdd.md`

**Key Points:**
- TDD improves design quality, not coverage metrics
- RED-GREEN-REFACTOR cycle
- Test quality guidelines (behavior over implementation)
- Framework setup for Node.js, Python, Go, Rust

#### 3. Workflow-Level Verification

**Execute-Phase Verification:**
- `gsd-verifier` agent checks code against goals
- UAT.md template for manual testing
- VERIFICATION.md template with goal-backward verification

**Plan-Phase Verification:**
- `gsd-plan-checker` validates plans achieve phase goals
- Loop up to 3x for plan refinement
- XML-structured task verification

#### 4. CLI Verification Commands

Built into `gsd-tools.cjs`:

| Command | Purpose |
|---------|---------|
| `validate consistency` | Check phase numbering, disk/roadmap sync |
| `validate health [--repair]` | Check .planning/ integrity |
| `verify plan-structure <file>` | Validate PLAN.md structure |
| `verify phase-completeness <phase>` | Check all plans have summaries |
| `verify references <file>` | Check @-refs and path resolution |
| `verify commits <h1> [h2] ...` | Batch verify commit hashes |
| `verify artifacts <plan-file>` | Check must_haves.artifacts |
| `verify key-links <plan-plan>` | Check must_haves.key_links |

#### 5. Human-in-the-Loop Verification

**Verify-Work Workflow:**
- Manual user acceptance testing
- Extracts testable deliverables from ROADMAP.md
- Walks user through manual testing
- If failures: `gsd-debugger` diagnoses root cause, creates fix plans
- Creates UAT.md documenting results

**Debug Workflow:**
- Systematic debugging with state tracking
- Root cause analysis
- Fix plan generation

## Known Test Gaps

### Critical Gaps (High Priority)

1. **No Agent Tests**
   - **Issue:** 11 agents have zero automated tests
   - **Impact:** Agent behavior changes are unverified
   - **Risk:** High - agents are core functionality
   - **Recommendation:** Create mock AI runtime for agent testing

2. **No Workflow Tests**
   - **Issue:** 25+ workflows have zero automated tests
   - **Impact:** End-to-end scenarios not verified
   - **Risk:** High - workflows are primary user interface
   - **Recommendation:** Add integration tests with temp directories

3. **No Installation Tests**
   - **Issue:** 1,807-line installer has zero tests
   - **Impact:** Installation issues not caught
   - **Risk:** High - installation is user's first experience
   - **Recommendation:** Add multi-runtime installation tests

4. **No CI/CD Testing**
   - **Issue:** Tests don't run automatically on PR/push
   - **Impact:** Regressions can slip through
   - **Risk:** High - no automated quality gate
   - **Recommendation:** Add GitHub Actions workflow

### Medium Gaps

5. **No Command Tests**
   - **Issue:** 28 command definitions untested
   - **Impact:** Command behavior unverified
   - **Risk:** Medium
   - **Recommendation:** Add integration tests for commands

6. **No Template Tests**
   - **Issue:** 40+ template files untested
   - **Impact:** Template rendering unverified
   - **Risk:** Medium
   - **Recommendation:** Add template fill tests

7. **No Hook Tests**
   - **Issue:** Hooks untested
   - **Impact:** Hook integration unverified
   - **Risk:** Medium
   - **Recommendation:** Add hook behavior tests

8. **No Coverage Tracking**
   - **Issue:** No coverage metrics
   - **Impact:** Cannot measure test effectiveness
   - **Risk:** Medium
   - **Recommendation:** Use `c8` for Node.js native testing

### Low Gaps

9. **No Integration Tests**
   - **Issue:** No tests with real projects
   - **Impact:** Real-world scenarios untested
   - **Risk:** Low - manual testing catches most issues
   - **Recommendation:** Add sample project tests

10. **No Regression Tests**
    - **Issue:** No regression test suite
    - **Impact:** Known bugs can reoccur
    - **Risk:** Low
    - **Recommendation:** Document known issues as tests

## CI/CD Reality

### Current State

**Existing Workflow:** `.github/workflows/auto-label-issues.yml`
- Labels new issues with "needs-triage"
- Runs on `issues: types: [opened]`
- Simple GitHub script action

### Missing CI/CD

**Critical Gaps:**
- No automated testing on PR/push
- No build verification
- No cross-runtime testing
- No release automation
- No code quality checks

### Recommended GitHub Actions Workflow

```yaml
name: Test

on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Run tests
        run: npm test
        
      - name: Build hooks
        run: npm run build:hooks
        
      - name: Test installation (Claude Code)
        run: node bin/install.js --claude --global
```

## Testing Philosophy

### Why Limited Automated Testing?

GSD's testing approach is **intentionally unconventional**:

1. **AI Agents are Hard to Test**
   - Agent behavior is non-deterministic
   - LLM responses vary between runs
   - Testing requires expensive mock infrastructure

2. **Human Verification is Primary**
   - AI agents require human oversight
   - Verification is built into workflows
   - UAT (User Acceptance Testing) is expected

3. **CLI Utility is Testable**
   - Deterministic, pure functions
   - Easy to mock file system
   - Comprehensive test coverage achievable

4. **Verification Over Coverage**
   - Focus on verifying results, not test percentages
   - Built-in verification commands validate state
   - Human-in-the-loop catches real-world issues

### When This Approach Works

This approach is effective because:

- **CLI utility is the foundation** - it handles all file operations and state management
- **Agents orchestrate, don't decide** - verification commands validate agent decisions
- **Users are developers** - expected to test and verify their own code
- **Production validation** - successfully used at major companies

### When This Approach Breaks Down

This approach has risks:

- **Regression risk** - no automated tests catch agent changes
- **Installation issues** - untested installer can fail
- **Cross-runtime bugs** - compatibility issues not caught
- **Complex workflows** - edge cases in agent coordination untested

## Recommended Improvements

### Immediate Priorities (High Impact, Low Effort)

1. **Add CI/CD Pipeline**
   - Add `npm test` to PR checks
   - Prevent broken PRs from merging
   - Effort: 1-2 hours

2. **Add Installation Smoke Test**
   - Test fresh installation in CI
   - Test all runtime modes
   - Effort: 2-3 hours

3. **Add Coverage Tracking**
   - Use `c8` for Node.js native testing
   - Generate coverage reports
   - Effort: 1 hour

4. **Document This File**
   - Update this TESTING.md as changes are made
   - Add test contribution guidelines
   - Effort: 1 hour

### Medium-Term Improvements (High Impact, Medium Effort)

5. **Add Agent Tests (Mock-Based)**
   - Create mock AI runtime
   - Test agent tool invocation
   - Test agent error handling
   - Effort: 1-2 weeks

6. **Add Workflow Integration Tests**
   - Test end-to-end workflows with temp directories
   - Verify state progression
   - Test agent coordination
   - Effort: 1-2 weeks

7. **Add Installation Tests**
   - Test multi-runtime installation
   - Test file deployment
   - Test local patch persistence
   - Effort: 1 week

### Long-Term Improvements (Lower Priority)

8. **Add Command Tests**
   - Integration tests for all 28 commands
   - Test command behavior
   - Test error handling
   - Effort: 2-3 weeks

9. **Add Template Tests**
   - Test all 40+ templates
   - Test variable substitution
   - Test conditional blocks
   - Effort: 1-2 weeks

10. **Add Regression Test Suite**
    - Document known issues as tests
    - Add smoke tests for sample projects
    - Effort: 1 week

## Test Contribution Guidelines

### Writing Tests for `gsd-tools.cjs`

1. **Follow existing patterns:**
   - Use `describe` blocks for grouping
   - Use `beforeEach` for setup
   - Use `afterEach` for cleanup
   - Use `assert` for assertions

2. **Test both success and failure cases:**
   ```javascript
   test('handles missing file gracefully', async (t) => {
     const result = await commandThatReadsFile('nonexistent.md');
     assert.strictEqual(result.error, 'File not found');
   });
   ```

3. **Test edge cases:**
   - Empty input
   - Missing fields
   - Malformed input
   - Unexpected values

4. **Use descriptive test names:**
   ```javascript
   // Good
   test('calculates next decimal when no decimals exist', async (t) => { ... });
   
   // Bad
   test('test1', async (t) => { ... });
   ```

### Testing Agents (Future)

1. **Create mock AI runtime:**
   - Mock tool invocations
   - Record agent responses
   - Verify tool usage sequence

2. **Test agent decision-making:**
   - Verify correct tools are called
   - Verify error handling
   - Verify output format

3. **Test agent error cases:**
   - Missing context
   - Malformed input
   - Tool failures

### Testing Workflows (Future)

1. **Use temp directories:**
   - Create temporary test project
   - Run full workflow
   - Verify state changes

2. **Test state progression:**
   - Verify STATE.md updates
   - Verify phase directories created
   - Verify ROADMAP.md updated

3. **Test agent coordination:**
   - Verify agents invoked in order
   - Verify context passing
   - Verify state persistence

## Troubleshooting Testing Issues

### Test Failures

1. **Tests timeout:**
   - Check for infinite loops
   - Add explicit cleanup in `afterEach`
   - Increase timeout if needed

2. **Tests pass locally but fail in CI:**
   - Check platform-specific issues (Windows vs Linux vs macOS)
   - Check file path handling
   - Check environment variables

3. **Flaky tests:**
   - Check for race conditions
   - Check for file system timing issues
   - Add proper cleanup

### Installation Issues

1. **Commands not available:**
   - Verify installation completed
   - Check runtime hooks installed
   - Verify PATH includes installation location

2. **Hooks not working:**
   - Verify hooks built with `npm run build:hooks`
   - Check hook file locations
   - Check hook file permissions

3. **Multi-runtime issues:**
   - Verify all runtimes installed correctly
   - Check runtime-specific configurations
   - Test each runtime separately

## References

### Testing Documentation

- **Test File:** `get-shit-done/bin/gsd-tools.test.cjs`
- **Main Utility:** `get-shit-done/bin/gsd-tools.cjs`
- **Installer:** `bin/install.js`

### Verification Documentation

- **Verification Patterns:** `get-shit-done/references/verification-patterns.md`
- **TDD Guide:** `get-shit-done/references/tdd.md`

### Command Documentation

- **User Guide:** `USER-GUIDE.md`
- **README:** `README.md`

## Quick Reference: Command Checklist

### Pre-PR Validation

```bash
# Run tests
npm test

# Build distribution
npm run build:hooks

# Local installation
node bin/install.js --claude --local

# Verify installation
/gsd:help

# Health check
/gsd-health  # or: node get-shit-done/bin/gsd-tools.cjs validate health
```

### Smoke Tests

```bash
# Core gsd-tools commands
node get-shit-done/bin/gsd-tools.cjs --help
node get-shit-done/bin/gsd-tools.cjs state get
node get-shit-done/bin/gsd-tools.cjs validate consistency
node get-shit-done/bin/gsd-tools.cjs validate health
node get-shit-done/bin/gsd-tools.cjs progress
```

### Full Workflow Test

```bash
# In a fresh test project
mkdir test-project && cd test-project && git init

/gsd:new-project
/gsd:plan-phase 1
/gsd:execute-phase 1
/gsd:verify-work 1
/gsd:progress
```

---

**Last Updated:** 2026-02-16  
**Version:** 1.20.0  
**Test Framework:** Node.js Native Test Runner (`node:test`)
