<purpose>
Deviation handling rules for GSD plan execution. Always loaded by executor agents.
</purpose>

<deviation_rules>

## Automatic Deviation Handling

**While executing tasks, you WILL discover work not in the plan.** This is normal.

Apply these rules automatically. Track all deviations for Summary documentation.

---

**RULE 1: Auto-fix bugs**

**Trigger:** Code doesn't work as intended (broken behavior, incorrect output, errors)

**Action:** Fix immediately, track for Summary

**Examples:**

- Wrong SQL query returning incorrect data
- Logic errors (inverted condition, off-by-one, infinite loop)
- Type errors, null pointer exceptions, undefined references
- Broken validation (accepts invalid input, rejects valid input)
- Security vulnerabilities (SQL injection, XSS, CSRF, insecure auth)
- Race conditions, deadlocks
- Memory leaks, resource leaks

**Process:**

1. Fix the bug inline
2. Add/update tests to prevent regression
3. Verify fix works
4. Continue task
5. Track in deviations list: `[Rule 1 - Bug] [description]`

**No user permission needed.** Bugs must be fixed for correct operation.

---

**RULE 2: Auto-add missing critical functionality**

**Trigger:** Code is missing essential features for correctness, security, or basic operation

**Action:** Add immediately, track for Summary

**Examples:**

- Missing error handling (no try/catch, unhandled promise rejections)
- No input validation (accepts malicious data, type coercion issues)
- Missing null/undefined checks (crashes on edge cases)
- No authentication on protected routes
- Missing authorization checks (users can access others' data)
- No CSRF protection, missing CORS configuration
- No rate limiting on public APIs
- Missing required database indexes (causes timeouts)
- No logging for errors (can't debug production)

**Process:**

1. Add the missing functionality inline
2. Add tests for the new functionality
3. Verify it works
4. Continue task
5. Track in deviations list: `[Rule 2 - Missing Critical] [description]`

**Critical = required for correct/secure/performant operation**
**No user permission needed.** These are not "features" - they're requirements for basic correctness.

---

**RULE 3: Auto-fix blocking issues**

**Trigger:** Something prevents you from completing current task

**Action:** Fix immediately to unblock, track for Summary

**Examples:**

- Missing dependency (package not installed, import fails)
- Wrong types blocking compilation
- Broken import paths (file moved, wrong relative path)
- Missing environment variable (app won't start)
- Database connection config error
- Build configuration error (webpack, tsconfig, etc.)
- Missing file referenced in code
- Circular dependency blocking module resolution

**Process:**

1. Fix the blocking issue
2. Verify task can now proceed
3. Continue task
4. Track in deviations list: `[Rule 3 - Blocking] [description]`

**No user permission needed.** Can't complete task without fixing blocker.

---

**RULE 4: Ask about architectural changes**

**Trigger:** Fix/addition requires significant structural modification

**Action:** STOP, present to user, wait for decision

**Examples:**

- Adding new database table (not just column)
- Major schema changes (changing primary key, splitting tables)
- Introducing new service layer or architectural pattern
- Switching libraries/frameworks (React -> Vue, REST -> GraphQL)
- Changing authentication approach (sessions -> JWT)
- Adding new infrastructure (message queue, cache layer, CDN)
- Changing API contracts (breaking changes to endpoints)
- Adding new deployment environment

**Process:**

1. STOP current task
2. Present clearly:

```
Architectural Decision Needed

Current task: [task name]
Discovery: [what you found that prompted this]
Proposed change: [architectural modification]
Why needed: [rationale]
Impact: [what this affects - APIs, deployment, dependencies, etc.]
Alternatives: [other approaches, or "none apparent"]

Proceed with proposed change? (yes / different approach / defer)
```

3. WAIT for user response
4. If approved: implement, track as `[Rule 4 - Architectural] [description]`
5. If different approach: discuss and implement
6. If deferred: note in Summary and continue without change

**User decision required.** These changes affect system design.

---

**RULE PRIORITY (when multiple could apply):**

1. **If Rule 4 applies** -> STOP and ask (architectural decision)
2. **If Rules 1-3 apply** -> Fix automatically, track for Summary
3. **If genuinely unsure which rule** -> Apply Rule 4 (ask user)

**Edge case guidance:**

- "This validation is missing" -> Rule 2 (critical for security)
- "This crashes on null" -> Rule 1 (bug)
- "Need to add table" -> Rule 4 (architectural)
- "Need to add column" -> Rule 1 or 2 (depends: fixing bug or adding critical field)

**When in doubt:** Ask yourself "Does this affect correctness, security, or ability to complete task?"

- YES -> Rules 1-3 (fix automatically)
- MAYBE -> Rule 4 (ask user)

</deviation_rules>

<deviation_documentation>

## Documenting Deviations in Summary

After all tasks complete, Summary MUST include deviations section.

**If no deviations:**

```markdown
## Deviations from Plan

None - plan executed exactly as written.
```

**If deviations occurred:**

```markdown
## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed case-sensitive email uniqueness constraint**

- **Found during:** Task 4 (Follow/unfollow API implementation)
- **Issue:** User.email unique constraint was case-sensitive - Test@example.com and test@example.com were both allowed, causing duplicate accounts
- **Fix:** Changed to `CREATE UNIQUE INDEX users_email_unique ON users (LOWER(email))`
- **Files modified:** src/models/User.ts, migrations/003_fix_email_unique.sql
- **Verification:** Unique constraint test passes - duplicate emails properly rejected
- **Commit:** abc123f

**2. [Rule 2 - Missing Critical] Added JWT expiry validation to auth middleware**

- **Found during:** Task 3 (Protected route implementation)
- **Issue:** Auth middleware wasn't checking token expiry - expired tokens were being accepted
- **Fix:** Added exp claim validation in middleware, reject with 401 if expired
- **Files modified:** src/middleware/auth.ts, src/middleware/auth.test.ts
- **Verification:** Expired token test passes - properly rejects with 401
- **Commit:** def456g

---

**Total deviations:** 4 auto-fixed (1 bug, 1 missing critical, 1 blocking, 1 architectural with approval)
**Impact on plan:** All auto-fixes necessary for correctness/security/performance. No scope creep.
```

**This provides complete transparency:**

- Every deviation documented
- Why it was needed
- What rule applied
- What was done
- User can see exactly what happened beyond the plan

</deviation_documentation>

<authentication_gates>

## Handling Authentication Errors During Execution

**When you encounter authentication errors during `type="auto"` task execution:**

This is NOT a failure. Authentication gates are expected and normal. Handle them dynamically:

**Authentication error indicators:**

- CLI returns: "Error: Not authenticated", "Not logged in", "Unauthorized", "401", "403"
- API returns: "Authentication required", "Invalid API key", "Missing credentials"
- Command fails with: "Please run {tool} login" or "Set {ENV_VAR} environment variable"

**Authentication gate protocol:**

1. **Recognize it's an auth gate** - Not a bug, just needs credentials
2. **STOP current task execution** - Don't retry repeatedly
3. **Create dynamic checkpoint:human-action** - Present it to user immediately
4. **Provide exact authentication steps** - CLI commands, where to get keys
5. **Wait for user to authenticate** - Let them complete auth flow
6. **Verify authentication works** - Test that credentials are valid
7. **Retry the original task** - Resume automation where you left off
8. **Continue normally** - Don't treat this as an error in Summary

**Example: Vercel deployment hits auth error**

```
Task 3: Deploy to Vercel
Running: vercel --yes

Error: Not authenticated. Please run 'vercel login'

[Create checkpoint dynamically]

CHECKPOINT: Action Required

Progress: 2/8 tasks complete
Task: Authenticate Vercel CLI

Attempted: vercel --yes
Error: Not authenticated

What you need to do:
  1. Run: vercel login
  2. Complete browser authentication

I'll verify after: vercel whoami returns your account

YOUR ACTION: Type "done" when authenticated

[Wait for user response]

[User types "done"]

Verifying authentication...
Running: vercel whoami
Authenticated as: user@example.com

Retrying deployment...
Running: vercel --yes
Deployed to: https://myapp-abc123.vercel.app

Task 3 complete. Continuing to task 4...
```

**In Summary documentation:**

Document authentication gates as normal flow, not deviations:

```markdown
## Authentication Gates

During execution, I encountered authentication requirements:

1. Task 3: Vercel CLI required authentication
   - Paused for `vercel login`
   - Resumed after authentication
   - Deployed successfully

These are normal gates, not errors.
```

**Key principles:**

- Authentication gates are NOT failures or bugs
- They're expected interaction points during first-time setup
- Handle them gracefully and continue automation after unblocked
- Don't mark tasks as "failed" or "incomplete" due to auth gates
- Document them as normal flow, separate from deviations
</authentication_gates>
