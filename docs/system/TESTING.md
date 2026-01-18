# Testing Patterns

**Analysis Date:** 2026-01-16

## Test Framework

**Runner:**
- No traditional testing framework (vitest, Jest, Mocha)
- This is a meta-prompting system - verification happens during plan execution

**Assertion Library:**
- Not applicable - verification is embedded in task structure

**Run Commands:**
```bash
# No npm test command - verification happens during execution
node bin/install.js --help    # Verify installation script works
```

## Test File Organization

**Location:**
- No separate test files
- Verification embedded in PLAN.md task structure

**Naming:**
- Not applicable

**Structure:**
- Tests are `<verify>` blocks within tasks
- Acceptance criteria are `<done>` blocks within tasks
- Human verification via checkpoint tasks

## Test Structure

**Task Verification Pattern:**
```xml
<task type="auto">
  <name>Build authentication system</name>
  <files>src/auth/*.ts</files>
  <action>Implement JWT authentication</action>
  <verify>npm run build succeeds, npm test passes</verify>
  <done>Users can log in, tokens are validated</done>
</task>
```

**Patterns:**
- Each task has own verification (`<verify>` block)
- Each task has acceptance criteria (`<done>` block)
- Complex/visual tasks use checkpoint for human verification

## Mocking

**Framework:**
- Not applicable - no unit testing framework

**What to Mock:**
- Not applicable

## Fixtures and Factories

**Test Data:**
- Not applicable - no unit tests

**Location:**
- Templates provide structure for generated files
- Examples in reference documents

## Coverage

**Requirements:**
- No enforced coverage target
- Verification coverage via must_haves in PLAN frontmatter

**Configuration:**
- Not applicable

## Test Types

**Task Verification:**
- Scope: Single task completion
- Method: Shell command in `<verify>` block
- Example: `npm run build succeeds`

**Checkpoint Verification:**
- Scope: Complex/visual/interactive behavior
- Method: Human verification via browser, CLI, or tool
- Example: "Visit http://localhost:3000 and verify layout"

**Phase Verification:**
- Scope: All must_haves for a phase
- Method: gsd-verifier subagent checks truths, artifacts, key_links
- Example: "Users can log in" (truth), "src/auth/jwt.ts exists" (artifact)

**Milestone Verification:**
- Scope: All phases in milestone
- Method: gsd-milestone-auditor aggregates phase verifications
- Example: "v1.0 requirements met"

## Common Patterns

**Build Verification:**
```xml
<verify>npm run build succeeds, no TypeScript errors</verify>
```

**CLI Verification:**
```xml
<verify>vercel ls shows deployment, curl {url} returns 200</verify>
```

**Visual Verification (Checkpoint):**
```xml
<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Responsive dashboard layout at /dashboard</what-built>
  <how-to-verify>
    1. Run: npm run dev
    2. Visit: http://localhost:3000/dashboard
    3. Desktop: Verify sidebar left, content right
    4. Mobile: Verify single column layout
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>
```

**Error Testing:**
- Not applicable - errors documented in SUMMARY.md

**Snapshot Testing:**
- Not used

## TDD Support

**Detection Heuristic (`GSD-STYLE.md`):**
- "Can you write `expect(fn(input)).toBe(output)` before writing `fn`?"
- Yes â TDD plan (one feature per plan)
- No â Standard plan

**TDD Plan Structure:**
```yaml
---
type: tdd
---
```

**TDD Commits:**
- RED: `test({phase}-{plan}): add failing test for [feature]`
- GREEN: `feat({phase}-{plan}): implement [feature]`
- REFACTOR: `refactor({phase}-{plan}): clean up [feature]`

---

*Testing analysis: 2026-01-16*
*Update when test patterns change*
