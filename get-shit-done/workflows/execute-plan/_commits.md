<purpose>
Git commit protocols for GSD plan execution. Always loaded by executor agents.
</purpose>

<task_commit>
## Task Commit Protocol

After each task completes (verification passed, done criteria met), commit immediately:

**1. Identify modified files:**

Track files changed during this specific task (not the entire plan):

```bash
git status --short
```

**2. Stage only task-related files:**

Stage each file individually (NEVER use `git add .` or `git add -A`):

```bash
# Example - adjust to actual files modified by this task
git add src/api/auth.ts
git add src/types/user.ts
```

**3. Determine commit type:**

| Type | When to Use | Example |
|------|-------------|---------|
| `feat` | New feature, endpoint, component, functionality | feat(08-02): create user registration endpoint |
| `fix` | Bug fix, error correction | fix(08-02): correct email validation regex |
| `test` | Test-only changes (TDD RED phase) | test(08-02): add failing test for password hashing |
| `refactor` | Code cleanup, no behavior change (TDD REFACTOR phase) | refactor(08-02): extract validation to helper |
| `perf` | Performance improvement | perf(08-02): add database index for user lookups |
| `docs` | Documentation changes | docs(08-02): add API endpoint documentation |
| `style` | Formatting, linting fixes | style(08-02): format auth module |
| `chore` | Config, tooling, dependencies | chore(08-02): add bcrypt dependency |

**4. Craft commit message:**

Format: `{type}({phase}-{plan}): {task-name-or-description}`

```bash
git commit -m "{type}({phase}-{plan}): {concise task description}

- {key change 1}
- {key change 2}
- {key change 3}
"
```

**Examples:**

```bash
# Standard plan task
git commit -m "feat(08-02): create user registration endpoint

- POST /auth/register validates email and password
- Checks for duplicate users
- Returns JWT token on success
"

# Another standard task
git commit -m "fix(08-02): correct email validation regex

- Fixed regex to accept plus-addressing
- Added tests for edge cases
"
```

**Note:** TDD plans have their own commit pattern (test/feat/refactor for RED/GREEN/REFACTOR phases).

**5. Record commit hash:**

After committing, capture hash for SUMMARY.md:

```bash
TASK_COMMIT=$(git rev-parse --short HEAD)
echo "Task ${TASK_NUM} committed: ${TASK_COMMIT}"
```

Store in array or list for SUMMARY generation:
```bash
TASK_COMMITS+=("Task ${TASK_NUM}: ${TASK_COMMIT}")
```

</task_commit>

<git_commit_metadata>
## Plan Metadata Commit

Commit execution metadata (SUMMARY + STATE + ROADMAP) after all tasks complete:

**Note:** All task code has already been committed during execution (one commit per task).
PLAN.md was already committed during plan-phase. This final commit captures execution results only.

**Check planning config:**

If `COMMIT_PLANNING_DOCS=false` (set in load_project_state):
- Skip all git operations for .planning/ files
- Planning docs exist locally but are gitignored
- Log: "Skipping planning docs commit (commit_docs: false)"
- Proceed to next step

If `COMMIT_PLANNING_DOCS=true` (default):
- Continue with git operations below

**1. Stage execution artifacts:**

```bash
git add .planning/phases/XX-name/{phase}-{plan}-SUMMARY.md
```

**If NOT in parallel context** (no `<parallel_context>` in prompt):
```bash
git add .planning/STATE.md
```

**If in parallel context:** Do NOT stage STATE.md or ROADMAP.md -- orchestrator handles these after wave completion.

**2. Stage roadmap (skip if in parallel context):**

```bash
git add .planning/ROADMAP.md
```

**3. Verify staging:**

```bash
git status
# Should show only execution artifacts (SUMMARY, STATE, ROADMAP), no code files
```

**4. Commit metadata:**

```bash
git commit -m "$(cat <<'EOF'
docs({phase}-{plan}): complete [plan-name] plan

Tasks completed: [N]/[N]
- [Task 1 name]
- [Task 2 name]
- [Task 3 name]

SUMMARY: .planning/phases/XX-name/{phase}-{plan}-SUMMARY.md
EOF
)"
```

**Example:**

```bash
git commit -m "$(cat <<'EOF'
docs(08-02): complete user registration plan

Tasks completed: 3/3
- User registration endpoint
- Password hashing with bcrypt
- Email confirmation flow

SUMMARY: .planning/phases/08-user-auth/08-02-registration-SUMMARY.md
EOF
)"
```

**Git log after plan execution:**

```
abc123f docs(08-02): complete user registration plan
def456g feat(08-02): add email confirmation flow
hij789k feat(08-02): implement password hashing with bcrypt
lmn012o feat(08-02): create user registration endpoint
```

Each task has its own commit, followed by one metadata commit documenting plan completion.
</git_commit_metadata>

<update_codebase_map>
## Codebase Map Updates

**If .planning/codebase/ exists:**

Check what changed across all task commits in this plan:

```bash
# Find first task commit (right after previous plan's docs commit)
FIRST_TASK=$(git log --oneline --grep="feat({phase}-{plan}):" --grep="fix({phase}-{plan}):" --grep="test({phase}-{plan}):" --reverse | head -1 | cut -d' ' -f1)

# Get all changes from first task through now
git diff --name-only ${FIRST_TASK}^..HEAD 2>/dev/null
```

**Update only if structural changes occurred:**

| Change Detected | Update Action |
|-----------------|---------------|
| New directory in src/ | STRUCTURE.md: Add to directory layout |
| package.json deps changed | STACK.md: Add/remove from dependencies list |
| New file pattern (e.g., first .test.ts) | CONVENTIONS.md: Note new pattern |
| New external API client | INTEGRATIONS.md: Add service entry with file path |
| Config file added/changed | STACK.md: Update configuration section |
| File renamed/moved | Update paths in relevant docs |

**Skip update if only:**
- Code changes within existing files
- Bug fixes
- Content changes (no structural impact)

**Update format:**
Make single targeted edits - add a bullet point, update a path, or remove a stale entry. Don't rewrite sections.

```bash
git add .planning/codebase/*.md
git commit --amend --no-edit  # Include in metadata commit
```

**If .planning/codebase/ doesn't exist:**
Skip this step.
</update_codebase_map>

<commit_rules>
## Commit Rules Summary

**Per-Task Commits:**

After each task completes:
1. Stage only files modified by that task
2. Commit with format: `{type}({phase}-{plan}): {task-name}`
3. Types: feat, fix, test, refactor, perf, chore
4. Record commit hash for SUMMARY.md

**Plan Metadata Commit:**

After all tasks in a plan complete:
1. Stage plan artifacts only: SUMMARY.md
2. Stage STATE.md, ROADMAP.md if NOT in parallel context
3. Commit with format: `docs({phase}-{plan}): complete [plan-name] plan`
4. NO code files (already committed per-task)

**NEVER use:**
- `git add .`
- `git add -A`
- `git add src/` or any broad directory

**Always stage files individually.**
</commit_rules>
