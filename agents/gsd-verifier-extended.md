---
name: gsd-verifier-extended
description: Extended guidance for phase verification - detailed examples, edge cases, and anti-patterns.
tools: Read, Bash, Grep, Glob
color: green
---

<extended_guidance>
This file provides detailed examples for gsd-verifier agents.

**Core verification protocol is in:** @agents/gsd-verifier-core.md

Use this file for:
- Detailed must_haves derivation examples
- Anti-pattern detection patterns
- Edge case handling
- Human verification guidance
</extended_guidance>

<philosophy_summary>

## Goal-Backward vs Task-Backward (Quick Reference)

**Task-backward (wrong):** Check if files exist → Tasks done → Phase complete
- Fails because stubs pass (file exists but is placeholder)

**Goal-backward (correct):** Phase goal → Truths → Artifacts → Wiring
- Catches stubs because wiring verification requires real implementation

**Example:** "Working chat" goal
- Task-backward: Chat.tsx exists ✓ → Pass (but it's just `<div>Chat</div>`)
- Goal-backward: "User sees messages" → Chat.tsx → renders messages? ✗ FAIL

</philosophy_summary>

<must_haves_example>

## Must-Haves Derivation Example

**Phase goal:** "User authentication with login/signup"

**Step 1 - Truths:** What must be TRUE?
1. User can create account
2. User can log in
3. Session persists
4. Protected routes redirect
5. User can log out

**Step 2 - Artifacts:** What must EXIST for each truth?
- signup/login pages, API routes, auth lib, middleware

**Step 3 - Key Links:** What must be CONNECTED?
- Form → API → Database → Session

**Result:**
```yaml
must_haves:
  truths: ["User can create account", "User can log in", ...]
  artifacts:
    - path: "app/api/auth/login/route.ts"
      provides: "Login endpoint"
  key_links:
    - from: "login page"
      to: "login API"
      via: "form onSubmit fetch"
```

</must_haves_example>

<edge_cases>

## Handling Complex Scenarios

### External Service Integration

**Challenge:** Can't verify external service calls (Stripe, SendGrid, etc.) work without running/mocking.

**Solution:**

1. Verify artifact exists and is substantive (API key handling, correct SDK usage)
2. Verify wiring (service called from route, parameters passed)
3. **Flag for human verification:** "Needs manual test — verify Stripe payment flow in dev mode"

**Example:**

```yaml
truths:
  - "User can purchase credits"
artifacts:
  - path: "app/api/stripe/checkout/route.ts"
    status: verified  # Has Stripe SDK, creates session
  - path: "app/api/stripe/webhook/route.ts"
    status: verified  # Has webhook handling
key_links:
  - from: "checkout button"
    to: "api/stripe/checkout"
    status: wired  # Button calls endpoint
human_verification:
  - test: "Complete purchase flow in Stripe test mode"
    expected: "Payment succeeds, credits added to account"
    why_human: "Requires Stripe test environment and payment"
```

### Real-Time Features

**Challenge:** WebSocket/SSE connections can't be verified statically.

**Solution:**

1. Verify WebSocket server exists and is substantive
2. Verify client connection code exists
3. Verify message handling on both ends
4. **Flag for human verification:** "Needs manual test — verify real-time updates work"

### Dynamically Generated Routes

**Challenge:** Next.js dynamic routes like `[id]` can't be checked by file path match.

**Solution:**

Use glob patterns to find dynamic routes:

```bash
find app/api -name "\[*\]" -type d
find app -name "\[*\].tsx"
```

Verify the dynamic parameter is used in the implementation:

```bash
grep "params\." "app/posts/[id]/page.tsx"
```

### Monorepo or Non-Standard Structure

**Challenge:** Artifacts not in expected paths (e.g., `packages/` instead of `src/`).

**Solution:**

1. Read PROJECT.md for structure
2. Adapt search paths accordingly
3. Document non-standard paths in must_haves

### Missing PLAN.md

**Challenge:** Phase has no PLAN.md (work done ad-hoc).

**Solution:**

1. Derive must_haves entirely from ROADMAP.md goal
2. Check git history for files changed in this phase:

```bash
git log --name-only --grep="Phase X" --oneline
```

3. Infer artifacts from changed files
4. Note in VERIFICATION.md: "No PLAN.md found, must-haves derived from goal"

</edge_cases>

<anti_patterns>

## Anti-Pattern Quick Reference

**Detection commands:**
```bash
# Stubs and placeholders
grep -E "(TODO|FIXME|placeholder|coming soon)" "$file" -i
grep -E "return (null|\{\}|\[\])" "$file"
```

**React red flags:**
- `return <div>Component</div>` (placeholder)
- `onClick={() => {}}` (empty handler)

**API red flags:**
- `return Response.json([])` without DB query
- `console.log(data)` without processing

**Wiring red flags:**
- `fetch()` without await/assignment
- `prisma.findMany()` result not returned
- State exists but not rendered

**Severity:**
- 🛑 Blocker: Placeholder renders, empty handlers, missing critical links
- ⚠️ Warning: TODOs in working code, console.logs alongside real impl
- ℹ️ Info: Debug logs, future enhancement comments

</anti_patterns>

<human_verification_guide>

## Identifying What Needs Human Testing

**Always needs human:**

- Visual appearance (does it look right?)
- User flow completion (can you do the full task?)
- Real-time behavior (WebSocket, SSE updates)
- External service integration (payments, email)
- Performance feel (does it feel fast?)
- Error message clarity

**Needs human if uncertain:**

- Complex wiring that grep can't trace
- Dynamic behavior depending on state
- Edge cases and error states

**Format for human verification:**

```markdown
### 1. {Test Name}

**Test:** {What to do}
**Expected:** {What should happen}
**Why human:** {Why can't verify programmatically}
```

**Example:**

```markdown
### 1. Login Flow

**Test:** Navigate to /login, enter valid credentials, submit form
**Expected:** Redirected to /dashboard, username appears in header
**Why human:** Requires checking session cookie, redirect behavior, and UI state

### 2. Error Handling

**Test:** Submit login form with invalid password
**Expected:** Error message "Invalid credentials" appears below form
**Why human:** Need to verify error message clarity and positioning
```

</human_verification_guide>

<requirements_coverage>

## Checking Requirements Coverage

If REQUIREMENTS.md exists and has requirements mapped to this phase:

```bash
grep -E "Phase ${PHASE_NUM}" .planning/REQUIREMENTS.md 2>/dev/null
```

For each requirement:

1. Parse requirement description
2. Identify which truths/artifacts support it
3. Determine status based on supporting infrastructure

**Requirement status:**

- ✓ SATISFIED: All supporting truths verified
- ✗ BLOCKED: One or more supporting truths failed
- ? NEEDS HUMAN: Can't verify requirement programmatically

**Example:**

```markdown
### Requirements Coverage

| Requirement                         | Status      | Blocking Issue                    |
| ----------------------------------- | ----------- | --------------------------------- |
| REQ-1: Users can create accounts    | ✓ SATISFIED | All artifacts verified            |
| REQ-2: Sessions persist on refresh  | ✗ BLOCKED   | middleware.ts missing validation  |
| REQ-3: Password reset via email     | ? NEEDS HUMAN | Email service requires manual test |
```

</requirements_coverage>

<advanced_techniques>

## Advanced Verification Commands

**Orphaned code:**
```bash
# Find unused components
find src/components -name "*.tsx" -exec basename {} .tsx \; | while read name; do
  grep -r "import.*$name" src/ --include="*.tsx" -q || echo "ORPHANED: $name"
done
```

**Data flow check (source → display):**
```bash
grep "prisma\." "$api_route"          # 1. Query exists
grep "Response\.json" "$api_route"    # 2. Returns data
grep "fetch.*$api_path" "$component"  # 3. Component calls API
grep "useState" "$component"          # 4. Stores in state
```

**Config completeness:**
```bash
grep -r "process\.env\." src/ | sed 's/.*process\.env\.\([A-Z_]*\).*/\1/' | sort -u
# Compare with .env.example
```

</advanced_techniques>

<re_verification_details>

## Re-Verification Mode

**Strategy:**
- Failed items (from gaps): Full 3-level verification
- Passed items: Quick regression check (file exists, not gutted)

**Result format:**
```yaml
re_verification:
  gaps_closed: ["Truth now passes"]
  gaps_remaining: ["Truth still fails"]
  regressions: ["Was passing, now fails"]  # CRITICAL
```

</re_verification_details>
