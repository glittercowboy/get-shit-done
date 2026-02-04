<purpose>
Verification protocols for GSD plan execution.
Loaded conditionally when config.workflow.verifier is true.
</purpose>

<user_setup_generation>
## Generate USER-SETUP.md

**Generate USER-SETUP.md if plan has user_setup in frontmatter.**

Check PLAN.md frontmatter for `user_setup` field:

```bash
grep -A 50 "^user_setup:" .planning/phases/XX-name/{phase}-{plan}-PLAN.md | head -50
```

**If user_setup exists and is not empty:**

Create `.planning/phases/XX-name/{phase}-USER-SETUP.md` using template from `~/.claude/get-shit-done/templates/user-setup.md`.

**Content generation:**

1. Parse each service in `user_setup` array
2. For each service, generate sections:
   - Environment Variables table (from `env_vars`)
   - Account Setup checklist (from `account_setup`, if present)
   - Dashboard Configuration steps (from `dashboard_config`, if present)
   - Local Development notes (from `local_dev`, if present)
3. Add verification section with commands to confirm setup works
4. Set status to "Incomplete"

**Example output:**

```markdown
# Phase 10: User Setup Required

**Generated:** 2025-01-14
**Phase:** 10-monetization
**Status:** Incomplete

## Environment Variables

| Status | Variable | Source | Add to |
|--------|----------|--------|--------|
| [ ] | `STRIPE_SECRET_KEY` | Stripe Dashboard -> Developers -> API keys -> Secret key | `.env.local` |
| [ ] | `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard -> Developers -> Webhooks -> Signing secret | `.env.local` |

## Dashboard Configuration

- [ ] **Create webhook endpoint**
  - Location: Stripe Dashboard -> Developers -> Webhooks -> Add endpoint
  - Details: URL: https://[your-domain]/api/webhooks/stripe, Events: checkout.session.completed

## Local Development

For local testing:
\`\`\`bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
\`\`\`

## Verification

[Verification commands based on service]

---
**Once all items complete:** Mark status as "Complete"
```

**If user_setup is empty or missing:**

Skip this step - no USER-SETUP.md needed.

**Track for offer_next:**

Set `USER_SETUP_CREATED=true` if file was generated, for use in completion messaging.
</user_setup_generation>

<user_setup_notification>
## USER-SETUP.md Notification

**Check for USER-SETUP.md**

If `USER_SETUP_CREATED=true`, always include this warning block at the TOP of completion output:

```
USER SETUP REQUIRED

This phase introduced external services requiring manual configuration:

.planning/phases/{phase-dir}/{phase}-USER-SETUP.md

Quick view:
- [ ] {ENV_VAR_1}
- [ ] {ENV_VAR_2}
- [ ] {Dashboard config task}

Complete this setup for the integration to function.
Run `cat .planning/phases/{phase-dir}/{phase}-USER-SETUP.md` for full details.

---
```

This warning appears BEFORE "Plan complete" messaging. User sees setup requirements prominently.
</user_setup_notification>

<verification_checks>
## Verification Protocol

After all tasks complete but before creating SUMMARY:

**1. Run plan verification checks:**

Execute any commands in the `<verification>` section of the plan:
- Test commands (npm test, pytest, etc.)
- Build commands (npm run build, etc.)
- Lint/type checks (tsc --noEmit, eslint, etc.)

**2. Confirm success criteria:**

Check each item in `<success_criteria>` section:
- File exists checks
- API endpoint checks
- Feature behavior checks
- Integration checks

**3. Handle verification failures:**

If any verification fails:
- Log the failure clearly
- Present options to user:
  1. Retry - Attempt to fix and re-verify
  2. Skip - Mark as incomplete, continue
  3. Stop - Pause for manual investigation

**4. Document verification results:**

Include in SUMMARY.md:
```markdown
## Verification

### Tests
- npm test: PASSED (45 tests, 0 failures)
- npm run lint: PASSED (0 errors, 2 warnings)
- npm run build: PASSED

### Success Criteria
- [x] User can register with email/password
- [x] User receives confirmation email
- [x] User can login after confirmation
```
</verification_checks>

<goal_backward_verification>
## Goal-Backward Verification

Verify the plan achieved its GOAL, not just completed its TASKS.

**Check must_haves from plan frontmatter:**

```yaml
must_haves:
  truths:
    - "User can see existing messages"
    - "User can send a message"
    - "Messages persist across refresh"
  artifacts:
    - path: "src/components/Chat.tsx"
      provides: "Message list rendering"
    - path: "src/app/api/chat/route.ts"
      provides: "Message CRUD operations"
  key_links:
    - from: "src/components/Chat.tsx"
      to: "/api/chat"
      via: "fetch in useEffect"
```

**For each truth:**
- Can it be demonstrated?
- Does the code support this behavior?

**For each artifact:**
- Does the file exist?
- Does it provide what's claimed?

**For each key_link:**
- Is the connection present in code?
- Does data flow correctly?

**Report status:**
- PASSED: All must_haves verified
- GAPS_FOUND: Some must_haves not met
- HUMAN_NEEDED: Some require manual verification
</goal_backward_verification>

<phase_verification>
## Phase-Level Verification

When all plans in a phase complete, orchestrator spawns verifier agent.

**Verifier responsibilities:**
1. Read all SUMMARY.md files in phase
2. Check must_haves against actual codebase
3. Create VERIFICATION.md with detailed report

**VERIFICATION.md location:**
`.planning/phases/XX-name/{phase}-VERIFICATION.md`

**VERIFICATION.md structure:**
```markdown
# Phase {X}: {Name} - Verification Report

**Verified:** [date]
**Status:** passed | gaps_found | human_needed

## Must-Haves Checklist

### Truths
| Truth | Status | Evidence |
|-------|--------|----------|
| [truth 1] | PASSED | [file:line or test] |
| [truth 2] | FAILED | [what's missing] |

### Artifacts
| Artifact | Status | Notes |
|----------|--------|-------|
| [path] | EXISTS | [content verified] |
| [path] | MISSING | [needs creation] |

### Key Links
| Connection | Status | Verification |
|------------|--------|--------------|
| [from -> to] | WORKING | [grep pattern found] |
| [from -> to] | BROKEN | [connection missing] |

## Gaps (if any)

### Gap 1: [Truth that failed]
- **What's missing:** [specific gap]
- **Files affected:** [paths]
- **Suggested fix:** [brief guidance]

## Human Verification (if needed)

Items requiring manual testing:
- [ ] [item 1] - [how to test]
- [ ] [item 2] - [how to test]

## Summary

Score: {N}/{M} must-haves verified
Status: [passed | gaps_found | human_needed]
```

**Route by status:**
- `passed` -> Continue to next phase
- `human_needed` -> Present items, get approval
- `gaps_found` -> Offer `/gsd:plan-phase {X} --gaps`
</phase_verification>
