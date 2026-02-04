<purpose>
TDD-specific execution for GSD plans.
Loaded conditionally when plan has tdd: true in frontmatter.
</purpose>

<tdd_plan_execution>
## TDD Plan Execution

When executing a plan with `type: tdd` in frontmatter, follow the RED-GREEN-REFACTOR cycle for the single feature defined in the plan.

**1. Check test infrastructure (if first TDD plan):**
If no test framework configured:
- Detect project type from package.json/requirements.txt/etc.
- Install minimal test framework (Jest, pytest, Go testing, etc.)
- Create test config file
- Verify: run empty test suite
- This is part of the RED phase, not a separate task

**2. RED - Write failing test:**
- Read `<behavior>` element for test specification
- Create test file if doesn't exist (follow project conventions)
- Write test(s) that describe expected behavior
- Run tests - MUST fail (if passes, test is wrong or feature exists)
- Commit: `test({phase}-{plan}): add failing test for [feature]`

**3. GREEN - Implement to pass:**
- Read `<implementation>` element for guidance
- Write minimal code to make test pass
- Run tests - MUST pass
- Commit: `feat({phase}-{plan}): implement [feature]`

**4. REFACTOR (if needed):**
- Clean up code if obvious improvements
- Run tests - MUST still pass
- Commit only if changes made: `refactor({phase}-{plan}): clean up [feature]`

**Commit pattern for TDD plans:**
Each TDD plan produces 2-3 atomic commits:
1. `test({phase}-{plan}): add failing test for X`
2. `feat({phase}-{plan}): implement X`
3. `refactor({phase}-{plan}): clean up X` (optional)

**Error handling:**
- If test doesn't fail in RED phase: Test is wrong or feature already exists. Investigate before proceeding.
- If test doesn't pass in GREEN phase: Debug implementation, keep iterating until green.
- If tests fail in REFACTOR phase: Undo refactor, commit was premature.

**Verification:**
After TDD plan completion, ensure:
- All tests pass
- Test coverage for the new behavior exists
- No unrelated tests broken

**Why TDD uses dedicated plans:** TDD requires 2-3 execution cycles (RED -> GREEN -> REFACTOR), each with file reads, test runs, and potential debugging. This consumes 40-50% of context for a single feature. Dedicated plans ensure full quality throughout the cycle.

**Comparison:**
- Standard plans: Multiple tasks, 1 commit per task, 2-4 commits total
- TDD plans: Single feature, 2-3 commits for RED/GREEN/REFACTOR cycle

See `~/.claude/get-shit-done/references/tdd.md` for TDD plan structure.
</tdd_plan_execution>

<tdd_commit_types>
## TDD-Specific Commit Types

| Type | When to Use | Example |
|------|-------------|---------|
| `test` | RED phase - test-only changes | test(08-02): add failing test for password hashing |
| `feat` | GREEN phase - implementation to pass tests | feat(08-02): implement password hashing |
| `refactor` | REFACTOR phase - code cleanup, no behavior change | refactor(08-02): extract validation to helper |

**TDD vs Standard commits:**
- Standard tasks: Use commit type based on change nature (feat, fix, chore, etc.)
- TDD plans: Use test/feat/refactor sequence matching RED/GREEN/REFACTOR phases
</tdd_commit_types>

<tdd_task_detection>
## Detecting TDD Tasks

When parsing plan tasks, check for `tdd="true"` attribute:

```markdown
<task id="1" type="auto" tdd="true">
...
</task>
```

**If `tdd="true"` is present:**
- Execute using TDD flow (RED -> GREEN -> REFACTOR)
- Expect `<behavior>` and `<implementation>` elements within task
- Produce 2-3 commits instead of single commit

**If `tdd="true"` is absent:**
- Execute using standard flow
- Single commit per task completion
</tdd_task_detection>
