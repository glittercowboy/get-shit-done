# Core Commands Reference

GSD's primary workflow commands that drive the plan-execute-verify cycle.

---

## /gsd:new-project

### Purpose
Initialize a new project through unified flow: questioning → research (optional) → requirements → roadmap.

### Arguments & Flags
| Arg/Flag | Required | Purpose | Default |
|----------|----------|---------|---------|
| (none) | — | Command takes no arguments | — |

### Execution Flow
1. **Setup** — Abort if project exists, init git, detect brownfield code
2. **Brownfield Offer** — If existing code detected, offer `/gsd:map-codebase` first
3. **Deep Questioning** — Open conversation: "What do you want to build?"
   - Follow threads, challenge vagueness, surface assumptions
   - Use `questioning.md` techniques
   - Loop until "Create PROJECT.md" selected
4. **Write PROJECT.md** — Synthesize context using template
   - Greenfield: requirements as hypotheses
   - Brownfield: infer Validated from existing code
5. **Workflow Preferences** — Ask mode (YOLO/Interactive), depth, parallelization
6. **Research Decision** — Research domain or skip
7. **Define Requirements** — Present features by category, scope v1/v2/out-of-scope
8. **Create Roadmap** — Spawn gsd-roadmapper with context
9. **Done** — Present completion with next steps

### Spawns
| Agent | Condition | Purpose |
|-------|-----------|---------|
| gsd-project-researcher (×4) | "Research first" selected | Stack, Features, Architecture, Pitfalls research |
| gsd-research-synthesizer | After 4 researchers | Create SUMMARY.md |
| gsd-roadmapper | Always | Create ROADMAP.md, STATE.md |

### Reads/Writes
| Reads | Writes |
|-------|--------|
| `questioning.md` | `.planning/PROJECT.md` |
| `ui-brand.md` | `.planning/config.json` |
| `templates/project.md` | `.planning/research/*` (if selected) |
| `templates/requirements.md` | `.planning/REQUIREMENTS.md` |
| `.planning/codebase/*` (brownfield) | `.planning/ROADMAP.md` |
| | `.planning/STATE.md` |

### Structured Returns
Command completes with visual completion banner showing:
- Project name
- Artifact locations
- Phase/requirement counts
- Next steps (`/gsd:discuss-phase 1`)

### Success Criteria
- `.planning/` directory created
- Git repo initialized
- Brownfield detection completed
- Deep questioning completed (threads followed)
- PROJECT.md, config.json, REQUIREMENTS.md, ROADMAP.md, STATE.md committed
- User knows next step

### Common Patterns
- Start every new project with this command
- Use `/gsd:map-codebase` first for brownfield projects
- `/clear` context after completion before planning

### Error Handling
- Aborts if `.planning/PROJECT.md` already exists
- Blocks on research blockers with user options
- Blocks on roadmap blockers with user resolution

---

## /gsd:plan-phase

### Purpose
Create detailed execution plan for a phase (PLAN.md files) with integrated research and verification.

### Arguments & Flags
| Arg/Flag | Required | Purpose | Default |
|----------|----------|---------|---------|
| `[phase]` | No | Phase number to plan | Auto-detect next unplanned |
| `--research` | No | Force re-research even if RESEARCH.md exists | — |
| `--skip-research` | No | Skip research entirely | — |
| `--gaps` | No | Gap closure mode (reads VERIFICATION.md) | — |
| `--skip-verify` | No | Skip planner → checker verification loop | — |

### Plan-Phase Flags

| Flag | Purpose | When to Use |
|------|---------|-------------|
| `--gaps` | Gap closure mode | After verification found gaps |
| `--skip-research` | Skip phase researcher | Research already done or simple phase |
| `--skip-verify` | Skip plan-checker | Re-planning after minor changes |

**--skip-verify Details:**

Skips the gsd-plan-checker verification step. Use when:
- Making minor plan adjustments that don't affect coverage
- Re-planning after external changes (not gap closure)
- Plans are known to be complete from previous verification

**Warning:** Using --skip-verify on new plans risks:
- Missing requirements (no coverage check)
- Circular dependencies (no graph validation)
- Scope creep (no scope sanity check)

**Recommended usage:**
```bash
# First time planning - always verify
/gsd:plan-phase 3

# After minor edits to existing verified plans
/gsd:plan-phase 3 --skip-verify

# After gaps found - always verify gap plans
/gsd:plan-phase 3 --gaps  # (verification included)
```

### Execution Flow
1. **Validate Environment** — Check `.planning/` exists
2. **Parse Arguments** — Extract phase number, normalize (8 → 08, 2.1 → 02.1)
3. **Validate Phase** — Check phase exists in ROADMAP.md
4. **Ensure Phase Directory** — Create if needed
5. **Handle Research** — Skip if `--gaps` or `--skip-research`, else spawn researcher
6. **Check Existing Plans** — Offer continue/view/replan if plans exist
7. **Gather Context Paths** — STATE, ROADMAP, REQUIREMENTS, CONTEXT, RESEARCH
8. **Spawn gsd-planner** — Create PLAN.md files
9. **Handle Return** — PLANNING COMPLETE, CHECKPOINT REACHED, or INCONCLUSIVE
10. **Spawn gsd-plan-checker** — Verify plans (unless `--skip-verify`)
11. **Handle Checker** — VERIFICATION PASSED or ISSUES FOUND
12. **Revision Loop** — Max 3 iterations planner ↔ checker
13. **Present Status** — Wave structure, verification status, next steps

### Spawns
| Agent | Condition | Purpose |
|-------|-----------|---------|
| gsd-phase-researcher | Research needed & not skipped | Create RESEARCH.md |
| gsd-planner | Always | Create PLAN.md files |
| gsd-plan-checker | Unless `--skip-verify` | Verify plan quality |

### Reads/Writes
| Reads | Writes |
|-------|--------|
| `.planning/STATE.md` | `.planning/phases/XX-name/XX-YY-PLAN.md` |
| `.planning/ROADMAP.md` | `.planning/phases/XX-name/XX-RESEARCH.md` |
| `.planning/REQUIREMENTS.md` | |
| `.planning/phases/XX-name/XX-CONTEXT.md` | |
| `.planning/phases/XX-name/XX-VERIFICATION.md` (gaps mode) | |

### Structured Returns
**PLANNING COMPLETE:**
```
## PLANNING COMPLETE

Plans: {N} plans in {M} waves
Files: [list of PLAN.md paths]
```

**CHECKPOINT REACHED:**
```
## CHECKPOINT REACHED

Type: {checkpoint_type}
State: {saved state}
Question: {question for user}
```

### Success Criteria
- Phase validated against roadmap
- Phase directory created if needed
- Research completed (unless skipped/gaps)
- gsd-planner spawned with context
- Plans created and verified (or user override)
- User knows next steps (execute or review)

### Common Patterns
- `--gaps` after `verify-work` finds issues
- `--skip-research` when domain is well understood
- `--research` to refresh stale research

### Error Handling
- Error if `.planning/` doesn't exist
- Error if phase not in ROADMAP.md
- Max 3 revision iterations before user decision

---

## /gsd:execute-phase

### Purpose
Execute all plans in a phase using wave-based parallel execution.

### Arguments & Flags
| Arg/Flag | Required | Purpose | Default |
|----------|----------|---------|---------|
| `<phase-number>` | Yes | Phase to execute | — |
| `--gaps-only` | No | Execute only gap closure plans | — |

### Execution Flow
1. **Validate Phase** — Find phase directory, count PLAN.md files
2. **Discover Plans** — List all *-PLAN.md, check for *-SUMMARY.md (complete)
3. **Group by Wave** — Read `wave` from frontmatter, group plans
4. **Execute Waves** — For each wave in order:
   - Spawn `gsd-executor` for each plan (parallel Task calls)
   - Wait for completion
   - Verify SUMMARYs created
5. **Aggregate Results** — Collect summaries from all plans
6. **Commit Corrections** — If orchestrator made fixes between executors
7. **Verify Phase Goal** — Spawn `gsd-verifier` to check must_haves
8. **Update Roadmap/State** — Mark phase complete
9. **Update Requirements** — Mark phase requirements as Complete
10. **Commit Completion** — Bundle phase metadata updates
11. **Offer Next Steps** — Route based on verification status

### Spawns
| Agent | Condition | Purpose |
|-------|-----------|---------|
| gsd-executor | For each plan in wave | Execute plan tasks |
| gsd-verifier | After all plans complete | Verify phase goal |

### Reads/Writes
| Reads | Writes |
|-------|--------|
| `.planning/ROADMAP.md` | `.planning/phases/XX-name/XX-YY-SUMMARY.md` |
| `.planning/STATE.md` | `.planning/phases/XX-name/XX-VERIFICATION.md` |
| `.planning/phases/XX-name/XX-YY-PLAN.md` | `.planning/ROADMAP.md` (updated) |
| | `.planning/STATE.md` (updated) |
| | `.planning/REQUIREMENTS.md` (updated) |
| | Source code files |

### Structured Returns
Route based on verification status:
- **Route A:** Phase complete, more phases remain → `/gsd:discuss-phase {Z+1}`
- **Route B:** Milestone complete → `/gsd:audit-milestone`
- **Route C:** Gaps found → `/gsd:plan-phase {Z} --gaps`

### Success Criteria
- All incomplete plans executed
- Each plan has SUMMARY.md
- Phase goal verified (must_haves checked)
- VERIFICATION.md created
- STATE.md, ROADMAP.md, REQUIREMENTS.md updated
- User informed of next steps

### Common Patterns
- Wave execution: plans with same wave run in parallel
- `--gaps-only` after creating fix plans
- Per-task atomic commits

### Error Handling
- Deviation rules: auto-fix bugs, ask about architectural changes
- Checkpoint handling for `autonomous: false` plans
- Route to gap closure if verification fails

### Commit Rules
- **Per-Task:** `{type}({phase}-{plan}): {task-name}`
- **Plan Complete:** `docs({phase}-{plan}): complete [plan-name] plan`
- **Phase Complete:** `docs({phase}): complete {phase-name} phase`
- **NEVER:** `git add .` or `git add -A`

### Checkpoint Types

Three checkpoint types can pause execution for user input (set `autonomous: false` in PLAN.md):

| Type | Tag | When Used | User Action |
|------|-----|-----------|-------------|
| `human-verify` | `<checkpoint:human-verify>` | After visible change | Confirm it looks/works right |
| `human-action` | `<checkpoint:human-action>` | External action needed | Complete action, report result |
| `decision` | `<checkpoint:decision>` | Implementation choice needed | Choose from options |

**human-verify Example:**
```xml
<checkpoint:human-verify>
Check that the login form renders correctly:
- Email and password fields visible
- Submit button enabled
- Error states display properly
</checkpoint:human-verify>
```

**human-action Example:**
```xml
<checkpoint:human-action>
Run the database migration:
1. Execute: `npx prisma migrate deploy`
2. Verify migration completed without errors
3. Report: success or error message
</checkpoint:human-action>
```

**decision Example:**
```xml
<checkpoint:decision>
Choose authentication strategy:
A) JWT tokens (stateless, better for API)
B) Session cookies (stateful, better for web app)
C) Both (flexibility, more complexity)
</checkpoint:decision>
```

**Checkpoint Behavior:**
- Execution pauses, context preserved
- User response recorded in SUMMARY.md
- If user reports failure, task marked incomplete
- Decisions become part of project context

---

## /gsd:verify-work

### Purpose
Validate built features through conversational UAT (User Acceptance Testing) with persistent state.

### Arguments & Flags
| Arg/Flag | Required | Purpose | Default |
|----------|----------|---------|---------|
| `[phase]` | No | Phase number to test | Check for active sessions or prompt |

### Execution Flow
1. **Check Active Sessions** — Resume or start new
2. **Find SUMMARYs** — Locate SUMMARY.md files for phase
3. **Extract Testables** — User-observable outcomes from summaries
4. **Create UAT.md** — Test list with expected behaviors
5. **Present Tests One-by-One:**
   - Show expected behavior
   - Wait for plain text response
   - "yes/y/next" = pass, else = issue
   - Update UAT.md after each
6. **On Completion:**
   - Commit UAT.md
   - Present summary
7. **If Issues Found:**
   - Spawn parallel debug agents → diagnose root causes
   - Spawn gsd-planner in `--gaps` mode → create fix plans
   - Spawn gsd-plan-checker → verify fix plans (max 3 iterations)
   - Present ready status

### Spawns
| Agent | Condition | Purpose |
|-------|-----------|---------|
| gsd-debugger (parallel) | Issues found | Diagnose root causes |
| gsd-planner | Issues diagnosed | Create fix plans |
| gsd-plan-checker | Fix plans created | Verify fix plans |

### Reads/Writes
| Reads | Writes |
|-------|--------|
| `.planning/STATE.md` | `.planning/phases/XX-name/XX-UAT.md` |
| `.planning/ROADMAP.md` | `.planning/phases/XX-name/XX-YY-PLAN.md` (gap plans) |
| `.planning/phases/XX-name/XX-YY-SUMMARY.md` | |

### Structured Returns
Route based on UAT results:
- **Route A:** All pass, more phases → `/gsd:discuss-phase {Z+1}`
- **Route B:** All pass, last phase → `/gsd:audit-milestone`
- **Route C:** Issues found, plans ready → `/gsd:execute-phase {Z} --gaps-only`
- **Route D:** Planning blocked → Manual intervention required

### Success Criteria
- UAT.md created with tests from SUMMARY.md
- Tests presented one at a time
- Plain text responses (no structured forms)
- Severity inferred, never asked
- If issues: debug agents diagnose, planner creates fixes, checker verifies
- Ready for `/gsd:execute-phase` when complete

### Common Patterns
- One test at a time, not a checklist
- Plain text responses: "yes" = pass, anything else = issue
- Issues logged as gaps, not fixed during testing

### Anti-Patterns
- Don't use AskUserQuestion for test responses
- Don't ask severity — infer from description
- Don't present full checklist upfront
- Don't run automated tests — this is manual validation
- Don't fix issues during testing — log as gaps

---

## Command Dependency Graph

```
/gsd:new-project
    ├── gsd-project-researcher (×4, parallel)
    ├── gsd-research-synthesizer
    └── gsd-roadmapper
            ↓
/gsd:plan-phase [N]
    ├── gsd-phase-researcher (optional)
    ├── gsd-planner
    └── gsd-plan-checker (verification loop)
            ↓
/gsd:execute-phase [N]
    ├── gsd-executor (×plans, wave-parallel)
    └── gsd-verifier
            ↓
/gsd:verify-work [N]  (optional UAT)
    ├── gsd-debugger (×issues, parallel)
    ├── gsd-planner (--gaps)
    └── gsd-plan-checker
            ↓
    [repeat from plan-phase for next phase]
```

---

## Quick Reference

| Command | Purpose | Key Spawns | Primary Output |
|---------|---------|------------|----------------|
| `new-project` | Initialize project | 4 researchers, roadmapper | PROJECT.md, ROADMAP.md |
| `plan-phase [N]` | Create plans | researcher, planner, checker | XX-YY-PLAN.md |
| `execute-phase [N]` | Run plans | executor, verifier | SUMMARY.md, code |
| `verify-work [N]` | UAT testing | debugger, planner, checker | UAT.md, gap plans |
