# Handoff Template

Template for `.planning/phases/XX-name/{phase}-HANDOFF.md` -- created at phase completion to bridge outgoing and incoming phases.

**Purpose:** Close the intent chain for a phase. Compare what was intended against what was built. Surface gaps, carrying decisions, and forward context so the next phase starts with full awareness, not assumptions.

**Consumers:**
- `discuss-phase` (next phase) -- reads "Next Phase Must Know" and "Decisions That Carry Forward" to set context for discussion
- `plan-phase` (next phase) -- reads "Delta" and "Decisions That Carry Forward" to avoid re-solving solved problems and to inherit constraints

---

## File Template

```markdown
# Phase [X]: [Name] -- Handoff

**Completed:** [date]
**Intent seed richness:** [seed | seed-urgent | context | handoff]

## Intended (from ROADMAP.md success criteria)

- [ ] [Criterion A] -- VERIFIED | GAP: [what's missing]
- [ ] [Criterion B] -- VERIFIED | GAP: [what's missing]
- [ ] [Criterion C] -- VERIFIED

## What Was Built (from SUMMARY.md + VERIFICATION.md)

- [Accomplishment 1 -- aggregated from SUMMARY accomplishments]
- [Accomplishment 2]
- [Accomplishment 3]

## Delta (intended vs actual)

- [Specific gap with impact: "Criterion B partially met -- retry logic implemented but no exponential backoff. Downstream phases that depend on CI reliability should add backoff."]
- [Or: "No delta -- all criteria verified."]

## Next Phase Must Know

- [Forward-looking context from SUMMARY "Next Phase Readiness" sections]
- [Unresolved concerns that affect next phase scope or decisions]
- [Environmental state: what's deployed, what's running, what needs setup]

## Decisions That Carry Forward

- [Decision]: [rationale] -- affects [which downstream phases/areas]
- [Decision]: [rationale] -- affects [which downstream phases/areas]

---

*Phase: XX-name*
*Handoff created: [date]*
```

<guidelines>

**Intended section:**
- Pull success criteria verbatim from ROADMAP.md phase details
- Mark each VERIFIED or GAP -- binary, no "partially verified" without specifics
- GAP entries must state what is missing, not just that something is missing

**What Was Built section:**
- Aggregate from SUMMARY.md accomplishments and VERIFICATION.md evidence
- Keep concise -- this is a summary of summaries, not a re-listing of every file
- Focus on capabilities delivered, not tasks completed

**Delta section:**
- This is the critical section -- it is what the next phase cannot infer on its own
- Every GAP from "Intended" must have a corresponding delta entry with impact analysis
- If no delta: state it explicitly. An empty delta section is ambiguous; "No delta" is clear.

**Next Phase Must Know:**
- Forward context that is not captured in any other document
- Unresolved technical debt, known risks, environmental prerequisites
- Things the next phase agent would waste time rediscovering

**Decisions That Carry Forward:**
- Only decisions that CONSTRAIN future phases, not all decisions made
- Each must name which downstream area it affects
- If a decision was made that the next phase might want to revisit, flag it: "Revisitable: [decision] -- chosen for [reason] but [alternative] may be better if [condition]"

**When NOT to write a handoff:**
- Phase had no success criteria gaps and no carrying decisions: SUMMARY.md is sufficient
- But when in doubt, write the handoff -- the cost of writing it is low, the cost of a missing handoff is high

</guidelines>

<example>

```markdown
# Phase 2: Backup Command -- Handoff

**Completed:** 2025-01-22
**Intent seed richness:** context

## Intended (from ROADMAP.md success criteria)

- [x] CLI command backs up database to local file -- VERIFIED
- [x] CLI command backs up database to S3 -- VERIFIED
- [ ] Incremental backup support -- GAP: full backups only, incremental deferred
- [x] Human-readable and JSON output modes -- VERIFIED

## What Was Built (from SUMMARY.md + VERIFICATION.md)

- `backup` command with local and S3 targets, full backup mode
- Dual output: table format (default) + --json flag for CI pipelines
- Retry logic: 3 attempts with 2s/4s/8s exponential backoff
- Partial backup cleanup on failure (no corrupt files left behind)

## Delta (intended vs actual)

- Incremental backup not implemented -- scoped out during planning due to complexity. Next phase can add it as a follow-on. Impact: backup times scale linearly with database size until incremental is added.

## Next Phase Must Know

- Backup restore command (Phase 3) should mirror the --json/--table output pattern established here
- S3 credentials are loaded from environment variables, not config file -- restore command should use same pattern
- Test database is seeded with 10k rows for backup testing -- available for restore testing

## Decisions That Carry Forward

- pg_dump-style UX as reference -- affects all future CLI commands (familiar, no-surprise interface)
- CI-first error handling (exit codes, no interactive prompts, clean stdout) -- affects Phase 3 restore and Phase 5 scheduled backups
- Revisitable: chose exponential backoff over jittered backoff -- jittered may be better if multiple backup jobs run concurrently

---

*Phase: 02-backup-command*
*Handoff created: 2025-01-22*
```

</example>
