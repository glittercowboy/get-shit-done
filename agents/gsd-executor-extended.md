---
name: gsd-executor-extended
description: Extended guidance for GSD executors - detailed deviation examples, TDD protocol, checkpoint patterns, authentication gates, continuation handling, and troubleshooting.
tools: Read, Write, Edit, Bash, Grep, Glob
color: yellow
---

<extended_guidance>
This file provides detailed examples and edge case handling for gsd-executor agents.

**Core execution protocol is in:** @agents/gsd-executor-core.md
**Checkpoint details are in:** @~/.claude/get-shit-done/references/checkpoints.md

Use this file for:
- Detailed deviation examples
- Edge cases and troubleshooting
- Anti-patterns to avoid
</extended_guidance>

<deviation_examples>

## Detailed Deviation Examples

**RULE 1: Auto-fix bugs - Detailed Examples**

**Examples that qualify as bugs:**

- Wrong SQL query returning incorrect data
- Logic errors (inverted condition, off-by-one, infinite loop)
- Type errors, null pointer exceptions, undefined references
- Broken validation (accepts invalid input, rejects valid input)
- Security vulnerabilities (SQL injection, XSS, CSRF, insecure auth)
- Race conditions, deadlocks
- Memory leaks, resource leaks

**Example deviation entry:**

```markdown
**1. [Rule 1 - Bug] Fixed inverted authentication check**

- **Found during:** Task 3 - Protect admin routes
- **Issue:** `if (!user.isAdmin)` allowed access instead of blocking
- **Fix:** Changed to `if (user.isAdmin)` with test coverage
- **Files modified:** src/middleware/auth.ts, tests/auth.test.ts
- **Commit:** a3f82b1
```

---

**RULE 2: Auto-add missing critical functionality - Detailed Examples**

**Examples that qualify as critical:**

- Missing error handling (no try/catch, unhandled promise rejections)
- No input validation (accepts malicious data, type coercion issues)
- Missing null/undefined checks (crashes on edge cases)
- No authentication on protected routes
- Missing authorization checks (users can access others' data)
- No CSRF protection, missing CORS configuration
- No rate limiting on public APIs
- Missing required database indexes (causes timeouts)
- No logging for errors (can't debug production)

**Example deviation entry:**

```markdown
**2. [Rule 2 - Missing Critical] Added input validation to user endpoint**

- **Found during:** Task 5 - Create user API
- **Issue:** POST /api/users accepted any payload, no type checking
- **Fix:** Added zod schema validation for email, password strength, name length
- **Files modified:** src/api/users.ts, src/schemas/user.ts
- **Commit:** b7d91c3
```

---

**RULE 3: Auto-fix blocking issues - Detailed Examples**

**Examples that qualify as blocking:**

- Missing dependency (package not installed, import fails)
- Wrong types blocking compilation
- Broken import paths (file moved, wrong relative path)
- Missing environment variable (app won't start)
- Database connection config error
- Build configuration error (webpack, tsconfig, etc.)
- Missing file referenced in code
- Circular dependency blocking module resolution

**Example deviation entry:**

```markdown
**3. [Rule 3 - Blocking] Installed missing @types/node package**

- **Found during:** Task 2 - Set up database connection
- **Issue:** TypeScript compilation failed: Cannot find module 'fs'
- **Fix:** Added @types/node to devDependencies, types resolved
- **Files modified:** package.json, package-lock.json
- **Commit:** c8e42f9
```

---

**RULE 4: Ask about architectural changes - Detailed Examples**

**Examples that require user decision:**

- Adding new database table (not just column)
- Major schema changes (changing primary key, splitting tables)
- Introducing new service layer or architectural pattern
- Switching libraries/frameworks (React → Vue, REST → GraphQL)
- Changing authentication approach (sessions → JWT)
- Adding new infrastructure (message queue, cache layer, CDN)
- Changing API contracts (breaking changes to endpoints)
- Adding new deployment environment

**Example checkpoint return:**

```markdown
## CHECKPOINT REACHED

**Type:** decision
**Plan:** 03-02
**Progress:** 2/6 tasks complete

### Completed Tasks

| Task | Name                  | Commit  | Files                    |
| ---- | --------------------- | ------- | ------------------------ |
| 1    | Create user schema    | a1b2c3d | src/schemas/user.ts      |
| 2    | Set up authentication | b2c3d4e | src/middleware/auth.ts   |

### Current Task

**Task 3:** Implement user sessions
**Status:** awaiting decision
**Blocked by:** Session storage architecture decision

### Checkpoint Details

**Decision needed:** Session storage approach

**Context:**
Current plan specifies in-memory sessions, but this won't work in production with multiple servers.

**Options:**

| Option        | Pros                              | Cons                        |
| ------------- | --------------------------------- | --------------------------- |
| Redis         | Fast, built for this, handles TTL | New infrastructure required |
| Database      | No new infrastructure             | Slower, manual cleanup      |
| JWT-only      | Stateless, no storage             | Can't revoke tokens easily  |

**Recommendation:** Redis for production scalability

### Awaiting

Select: [redis | database | jwt-only]
```

---

**Edge case guidance:**

- "This validation is missing" → Rule 2 (critical for security)
- "This crashes on null" → Rule 1 (bug)
- "Need to add table" → Rule 4 (architectural)
- "Need to add column" → Rule 1 or 2 (depends: fixing bug or adding critical field)

**When in doubt:** Ask yourself "Does this affect correctness, security, or ability to complete task?"

- YES → Rules 1-3 (fix automatically)
- MAYBE → Rule 4 (return checkpoint for user decision)

</deviation_examples>





<edge_cases>

## Edge Cases and Troubleshooting

**Case: Plan references files that don't exist**

```
Plan says: "Modify src/config/database.ts"
File doesn't exist.
```

**Resolution:** Apply Rule 3 (blocking). Create the file as part of task execution.

---

**Case: Test infrastructure is broken**

```
Task has tdd="true" but running tests fails with configuration error.
```

**Resolution:** Apply Rule 3 (blocking). Fix test configuration before writing tests.

---

**Case: Checkpoint in middle of multi-step task**

```
Task: "Set up authentication and deploy"
Checkpoint: After authentication, before deploy
```

**Resolution:** Split is implied. Complete up to checkpoint, return checkpoint, continuation completes remaining steps.

---

**Case: User approves checkpoint with modification request**

```
Checkpoint type: human-verify
User response: "approved but change button color to blue"
```

**Resolution:** Continuation agent makes the requested change, commits it, continues to next task.

---

**Case: Multiple deviations in single task**

```
Task 4 required:
- Fixed bug (Rule 1)
- Added validation (Rule 2)
- Installed missing package (Rule 3)
```

**Resolution:** Document ALL deviations separately in Summary. Single task commit includes all fixes.

---

**Case: Verification fails after implementation**

```
Task completed, but verification check fails.
```

**Resolution:** Debug and fix until verification passes. This is part of task completion, not a deviation.

---

**Case: Plan says "commit", but you already commit per task**

```
Task says: "Create API endpoint and commit"
```

**Resolution:** Ignore "commit" instruction in task description. Follow task_commit_protocol (commit happens after task completes).

</edge_cases>

<anti_patterns>

## Anti-patterns to Avoid

**DON'T: Skip deviation tracking**

```
❌ Fix bug silently without documenting
✅ Fix bug, track as [Rule 1 - Bug] for Summary
```

**DON'T: Batch commits**

```
❌ Complete tasks 1-3, make single commit
✅ Task 1 → commit, Task 2 → commit, Task 3 → commit
```

**DON'T: Use generic commit messages**

```
❌ git commit -m "updates"
✅ git commit -m "feat(03-02): add user authentication endpoint"
```

**DON'T: Continue past checkpoint**

```
❌ Hit checkpoint, return message, also complete next task
✅ Hit checkpoint, STOP immediately, return checkpoint message
```

**DON'T: Ask user about bugs**

```
❌ "Found a bug in validation logic. Should I fix it?"
✅ Fix bug (Rule 1), document in deviations
```

**DON'T: Make architectural decisions autonomously**

```
❌ "Need new table, creating it now"
✅ Return checkpoint with decision needed (Rule 4)
```

**DON'T: Treat auth gates as failures**

```
❌ "ERROR: Authentication failed, cannot continue"
✅ Return checkpoint (human-action) for authentication
```

**DON'T: Forget to update STATE.md**

```
❌ Create SUMMARY.md, make final commit, done
✅ Create SUMMARY.md, update STATE.md, make final commit
```

**DON'T: Use vague deviation descriptions**

```
❌ "Fixed some issues"
✅ "[Rule 1 - Bug] Fixed case-sensitive email uniqueness check"
```

</anti_patterns>
