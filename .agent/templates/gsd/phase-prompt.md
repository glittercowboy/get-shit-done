# Phase Prompt Template

Template for `.planning/phases/XX-name/{phase}-{plan}-PLAN.md` - executable phase plans.

**Naming:** Use `{phase}-{plan}-PLAN.md` format (e.g., `01-02-PLAN.md` for Phase 1, Plan 2)

---

## File Template

```markdown
---
phase: XX-name
type: execute
domain: [optional - if domain skill loaded]
---

<objective>
[What this phase accomplishes - from roadmap phase goal]

Purpose: [Why this matters for the project]
Output: [What artifacts will be created]
</objective>

<execution_context>
~/.claude/get-shit-done/workflows/execute-phase.md
./summary.md
[If plan contains checkpoint tasks (type="checkpoint:*"), add:]
~/.claude/get-shit-done/references/checkpoints.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
[If discovery exists:]
@.planning/phases/XX-name/DISCOVERY.md
[Relevant source files:]
@src/path/to/relevant.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: [Action-oriented name]</name>
  <files>path/to/file.ext, another/file.ext</files>
  <action>[Specific implementation - what to do, how to do it, what to avoid and WHY]</action>
  <verify>[Command or check to prove it worked]</verify>
  <done>[Measurable acceptance criteria]</done>
</task>

<task type="auto">
  <name>Task 2: [Action-oriented name]</name>
  <files>path/to/file.ext</files>
  <action>[Specific implementation]</action>
  <verify>[Command or check]</verify>
  <done>[Acceptance criteria]</done>
</task>

<task type="checkpoint:decision" gate="blocking">
  <decision>[What needs deciding]</decision>
  <context>[Why this decision matters]</context>
  <options>
    <option id="option-a">
      <name>[Option name]</name>
      <pros>[Benefits and advantages]</pros>
      <cons>[Tradeoffs and limitations]</cons>
    </option>
    <option id="option-b">
      <name>[Option name]</name>
      <pros>[Benefits and advantages]</pros>
      <cons>[Tradeoffs and limitations]</cons>
    </option>
  </options>
  <resume-signal>[How to indicate choice - "Select: option-a or option-b"]</resume-signal>
</task>

<task type="auto">
  <name>Task 3: [Action-oriented name]</name>
  <files>path/to/file.ext</files>
  <action>[Specific implementation]</action>
  <verify>[Command or check]</verify>
  <done>[Acceptance criteria]</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>[What Claude just built that needs verification]</what-built>
  <how-to-verify>
    1. Run: [command to start dev server/app]
    2. Visit: [URL to check]
    3. Test: [Specific interactions]
    4. Confirm: [Expected behaviors]
  </how-to-verify>
  <resume-signal>Type "approved" to continue, or describe issues to fix</resume-signal>
</task>

[Continue for all tasks - mix of auto and checkpoints as needed...]

</tasks>

<verification>
Before declaring phase complete:
- [ ] [Specific test command]
- [ ] [Build/type check passes]
- [ ] [Behavior verification]
</verification>

<success_criteria>

- All tasks completed
- All verification checks pass
- No errors or warnings introduced
- [Phase-specific criteria]
  </success_criteria>

<output>
After completion, create `.planning/phases/XX-name/{phase}-{plan}-SUMMARY.md`:

# Phase [X] Plan [Y]: [Name] Summary

**[Substantive one-liner - what shipped, not "phase complete"]**

## Accomplishments

- [Key outcome 1]
- [Key outcome 2]

## Files Created/Modified

- `path/to/file.ts` - Description
- `path/to/another.ts` - Description

## Decisions Made

[Key decisions and rationale, or "None"]

## Issues Encountered

[Problems and resolutions, or "None"]

## Next Step

[If more plans in this phase: "Ready for {phase}-{next-plan}-PLAN.md"]
[If phase complete: "Phase complete, ready for next phase"]
</output>
```

<key_elements>
From create-meta-prompts patterns:

- XML structure for Claude parsing
- @context references for file loading
- Task types: auto, checkpoint:human-action, checkpoint:human-verify, checkpoint:decision
- Action includes "what to avoid and WHY" (from intelligence-rules)
- Verification is specific and executable
- Success criteria is measurable
- Output specification includes SUMMARY.md structure
  </key_elements>

<scope_guidance>
**Plan sizing:**

- Aim for 2-3 tasks per plan
- If planning >3 tasks, split into multiple plans (01-01, 01-02, etc.)
- Target ~50% context usage maximum
- Complex phases: Create 01-01, 01-02, 01-03 plans instead of one large plan

**When to split:**

- Different subsystems (auth vs API vs UI)
- Clear dependency boundaries (setup → implement → test)
- Risk of context overflow (>50% estimated usage)
- **TDD candidates** - Features that warrant TDD become their own TDD plans
</scope_guidance>

<tdd_plan_note>
**TDD features get dedicated plans.**

TDD requires 2-3 execution cycles (RED → GREEN → REFACTOR) that consume 40-50% context for a single feature. Features warranting TDD (business logic, validation, algorithms, API contracts) each get their own TDD plan.

**Heuristic:** Can you write `expect(fn(input)).toBe(output)` before writing `fn`?
→ Yes: Create a TDD plan (one feature per plan)
→ No: Standard task in standard plan

See `~/.claude/get-shit-done/references/tdd.md` for TDD plan structure.
</tdd_plan_note>

<good_examples>

```markdown
---
phase: 01-foundation
type: execute
domain: next-js
---

<objective>
Set up Next.js project with authentication foundation.

Purpose: Establish the core structure and auth patterns all features depend on.
Output: Working Next.js app with JWT auth, protected routes, and user model.
</objective>

<execution_context>
~/.claude/get-shit-done/workflows/execute-phase.md
./summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@src/lib/db.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add User model to database schema</name>
  <files>prisma/schema.prisma</files>
  <action>Add User model with fields: id (cuid), email (unique), passwordHash, createdAt, updatedAt. Add Session relation. Use @db.VarChar(255) for email to prevent index issues.</action>
  <verify>npx prisma validate passes, npx prisma generate succeeds</verify>
  <done>Schema valid, types generated, no errors</done>
</task>

<task type="auto">
  <name>Task 2: Create login API endpoint</name>
  <files>src/app/api/auth/login/route.ts</files>
  <action>POST endpoint that accepts {email, password}, validates against User table using bcrypt, returns JWT in httpOnly cookie with 15-min expiry. Use jose library for JWT (not jsonwebtoken - it has CommonJS issues with Next.js).</action>
  <verify>curl -X POST /api/auth/login -d '{"email":"test@test.com","password":"test"}' -H "Content-Type: application/json" returns 200 with Set-Cookie header</verify>
  <done>Valid credentials return 200 + cookie, invalid return 401, missing fields return 400</done>
</task>

</tasks>

<verification>
Before declaring phase complete:
- [ ] `npm run build` succeeds without errors
- [ ] `npx prisma validate` passes
- [ ] Login endpoint responds correctly to valid/invalid credentials
- [ ] Protected route redirects unauthenticated users
</verification>

<success_criteria>

- All tasks completed
- All verification checks pass
- No TypeScript errors
- JWT auth flow works end-to-end
  </success_criteria>

<output>
After completion, create `.planning/phases/01-foundation/01-01-SUMMARY.md`
</output>
```

</good_examples>

<bad_examples>

```markdown
# Phase 1: Foundation

## Tasks

### Task 1: Set up authentication

**Action**: Add auth to the app
**Done when**: Users can log in
```

This is useless. No XML structure, no @context, no verification, no specificity.
</bad_examples>

<guidelines>
**When to use:**
- Creating execution plans for each phase
- One plan per 2-3 tasks, multiple plans per phase if needed
- Always use XML structure for Claude parsing

**Task types:**

- `type="auto"`: Execute without stopping
- `type="checkpoint:human-action"`: User must do something (manual step)
- `type="checkpoint:human-verify"`: User must verify output (testing, visual check)
- `type="checkpoint:decision"`: User must choose between options

**Gate values:**

- `gate="blocking"`: Must resolve before continuing
- `gate="optional"`: Can skip or defer

**Context references:**

- Use @path/to/file.md to load files
- Always include @.planning/PROJECT.md and @.planning/ROADMAP.md
- Include relevant source files for context
- Include workflow/template references

**After completion:**

- Create SUMMARY.md in same directory
- Follow summary.md template structure
- Document deviations, decisions, issues
  </guidelines>
