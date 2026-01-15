<decimal_phase_numbering>
Decimal phases enable urgent work insertion without renumbering:

- Integer phases (1, 2, 3) = planned milestone work
- Decimal phases (2.1, 2.2) = urgent insertions between integers

**Rules:**
- Decimals between consecutive integers (2.1 between 2 and 3)
- Filesystem sorting works automatically (2 < 2.1 < 2.2 < 3)
- Directory format: `02.1-description/`, Plan format: `02.1-01-PLAN.md`

**Validation:** Integer X must exist and be complete, X+1 must exist, decimal X.Y must not exist, Y >= 1
</decimal_phase_numbering>

<required_reading>
**Read these files NOW:**

1. ~/.claude/get-shit-done/templates/phase-prompt.md
2. ~/.claude/get-shit-done/references/plan-format.md
3. ~/.claude/get-shit-done/references/scope-estimation.md
4. ~/.claude/get-shit-done/references/checkpoints.md
5. ~/.claude/get-shit-done/references/tdd.md
6. .planning/ROADMAP.md
7. .planning/PROJECT.md

</required_reading>

<purpose>
Create executable phase prompts (PLAN.md files) optimized for parallel execution.

PLAN.md IS the prompt that Claude executes. Plans are grouped into execution waves based on dependencies - independent plans run in parallel, dependent plans wait for predecessors.
</purpose>

<planning_principles>
**Parallel by default:** Think in dependency graphs, not sequential lists. Ask "what does this need?" not "what comes next?"

**Vertical slices over horizontal layers:** Group by feature (User: model + API + UI) not by type (all models → all APIs → all UIs).

**Explicit dependencies:** Every plan declares what it needs (`depends_on`) and what it touches (`files_modified`). Empty dependencies = parallel candidate.

**Secure by design:** Assume hostile input on every boundary. Validate, parameterize, authenticate, fail closed.

**Performance by design:** Assume production load, not demo conditions. Plan for efficient data access, appropriate caching, minimal round trips.

**Observable by design:** Plan to debug your own work. Include meaningful error messages, appropriate logging, and clear failure states.
</planning_principles>

<process>

<step name="load_project_state" priority="first">
Read `.planning/STATE.md` and parse:
- Current position (which phase we're planning)
- Accumulated decisions (constraints on this phase)
- Pending todos (candidates for inclusion)
- Blockers/concerns (things this phase may address)
- Brief alignment status

If STATE.md missing but .planning/ exists, offer to reconstruct or continue without.
</step>

<step name="load_codebase_context">
Check for codebase map:

```bash
ls .planning/codebase/*.md 2>/dev/null
```

**If .planning/codebase/ exists:** Load relevant documents based on phase type:

| Phase Keywords | Load These |
|----------------|------------|
| UI, frontend, components | CONVENTIONS.md, STRUCTURE.md |
| API, backend, endpoints | ARCHITECTURE.md, CONVENTIONS.md |
| database, schema, models | ARCHITECTURE.md, STACK.md |
| testing, tests | TESTING.md, CONVENTIONS.md |
| integration, external API | INTEGRATIONS.md, STACK.md |
| refactor, cleanup | CONCERNS.md, ARCHITECTURE.md |
| setup, config | STACK.md, STRUCTURE.md |
| (default) | STACK.md, ARCHITECTURE.md |

Track extracted constraints for PLAN.md context section.
</step>

<step name="identify_phase">
Check roadmap and existing phases:

```bash
cat .planning/ROADMAP.md
ls .planning/phases/
```

If multiple phases available, ask which one to plan. If obvious (first incomplete phase), proceed.

**Phase number parsing:** Regex `^(\d+)(?:\.(\d+))?$` - Group 1: integer, Group 2: decimal (optional)

**If decimal phase:** Validate integer X exists and is complete, X+1 exists in roadmap, decimal X.Y doesn't exist, Y >= 1.

Read any existing PLAN.md or DISCOVERY.md in the phase directory.

**Check for --gaps flag:**
If `--gaps` present in arguments, switch to gap_closure_mode (see `<step name="gap_closure_mode">`).
</step>

<step name="gap_closure_mode">
**Triggered by `--gaps` flag.** Plans address verification gaps.

**1. Load VERIFICATION.md:**

```bash
PHASE_DIR=$(ls -d .planning/phases/${PHASE_ARG}* 2>/dev/null | head -1)
cat "$PHASE_DIR"/*-VERIFICATION.md
```

**2. Parse gaps from YAML frontmatter:**

Extract `gaps:` array. Each gap has:
- `truth`: The observable behavior that failed
- `reason`: Why it failed
- `artifacts`: Files with issues
- `missing`: Specific things to add/fix

**3. Load existing SUMMARYs:**

```bash
ls "$PHASE_DIR"/*-SUMMARY.md
```

Understand what's already built. Gap closure plans reference existing work.

**4. Find next plan number:**

```bash
# Get highest existing plan number
ls "$PHASE_DIR"/*-PLAN.md | sort -V | tail -1
```

If plans 01, 02, 03 exist, next is 04.

**5. Group gaps into plans:**

Cluster related gaps by:
- Same artifact (multiple issues in Chat.tsx → one plan)
- Same concern (fetch + render → one "wire frontend" plan)
- Dependency order (can't wire if artifact is stub → fix stub first)

**6. Create gap closure tasks:**

For each gap:
```xml
<task name="{fix_description}" type="auto">
  <files>{artifact.path}</files>
  <action>
    {For each item in gap.missing:}
    - {missing item}

    Reference existing code: {from SUMMARYs}
    Gap reason: {gap.reason}
  </action>
  <verify>{How to confirm gap is closed}</verify>
  <done>{Observable truth now achievable}</done>
</task>
```

**7. Write PLAN.md files:**

Use standard template but note gap closure context:

```yaml
---
phase: XX-name
plan: NN              # Sequential after existing
type: execute
wave: 1               # Gap closures typically single wave
depends_on: []        # Usually independent of each other
files_modified: [...]
autonomous: true
gap_closure: true     # Flag for tracking
---
```

**9. Present gap closure summary:**

```markdown
## Gap Closure Plans Created

**Phase {X}: {Name}** — closing {N} gaps

| Plan | Gaps Addressed | Files |
|------|----------------|-------|
| {phase}-04 | {gap truths} | {files} |
| {phase}-05 | {gap truths} | {files} |

---

## ▶ Next Up

**Execute gap closure plans**

`/gsd:execute-phase {X}`

<sub>`/clear` first → fresh context window</sub>

---
```

**Skip directly to git_commit step after creating plans.**
</step>

<step name="mandatory_discovery">
**Discovery is MANDATORY unless you can prove current context exists.**

<discovery_decision>
**Level 0 - Skip** (pure internal work, existing patterns only)
- ALL work follows established codebase patterns (grep confirms)
- No new external dependencies
- Pure internal refactoring or feature extension
- Examples: Add delete button, add field to model, create CRUD endpoint

**Level 1 - Quick Verification** (2-5 min)
- Single known library, confirming syntax/version
- Low-risk decision (easily changed later)
- Action: Context7 resolve-library-id + query-docs, no DISCOVERY.md needed

**Level 2 - Standard Research** (15-30 min)
- Choosing between 2-3 options
- New external integration (API, service)
- Medium-risk decision
- Action: Route to workflows/discovery-phase.md depth=standard, produces DISCOVERY.md

**Level 3 - Deep Dive** (1+ hour)
- Architectural decision with long-term impact
- Novel problem without clear patterns
- High-risk, hard to change later
- Action: Route to workflows/discovery-phase.md depth=deep, full DISCOVERY.md

**Depth indicators:**
- Level 2+: New library not in package.json, external API, "choose/select/evaluate" in description, roadmap marked Research: Yes
- Level 3: "architecture/design/system", multiple external services, data modeling, auth design, real-time/distributed
</discovery_decision>

If roadmap flagged `Research: Likely`, Level 0 (skip) is not available.

For niche domains (3D, games, audio, shaders, ML), suggest `/gsd:research-phase` before plan-phase.
</step>

<step name="read_project_history">
**Intelligent context assembly from frontmatter dependency graph:**

**1. Scan all summary frontmatter (cheap - first ~25 lines):**

```bash
for f in .planning/phases/*/*-SUMMARY.md; do
  # Extract frontmatter only (between first two --- markers)
  sed -n '1,/^---$/p; /^---$/q' "$f" | head -30
done
```

Parse YAML to extract: phase, subsystem, requires, provides, affects, tags, key-decisions, key-files

**2. Build dependency graph for current phase:**

- **Check affects field:** Which prior phases have current phase in their `affects` list? → Direct dependencies
- **Check subsystem:** Which prior phases share same subsystem? → Related work
- **Check requires chains:** If phase X requires phase Y, and we need X, we also need Y → Transitive dependencies
- **Check roadmap:** Any phases marked as dependencies in ROADMAP.md phase description?

**3. Select relevant summaries:**

Auto-select phases that match ANY of:
- Current phase name/number appears in prior phase's `affects` field
- Same `subsystem` value
- In `requires` chain (transitive closure)
- Explicitly mentioned in STATE.md decisions as affecting current phase

Typical selection: 2-4 prior phases (immediately prior + related subsystem work)

**4. Extract context from frontmatter (WITHOUT opening full summaries yet):**

From selected phases' frontmatter, extract:
- **Tech available:** Union of all tech-stack.added lists
- **Patterns established:** Union of all tech-stack.patterns and patterns-established
- **Key files:** Union of all key-files (for @context references)
- **Decisions:** Extract key-decisions from frontmatter

**5. Now read FULL summaries for selected phases:**

Only now open and read complete SUMMARY.md files for the selected relevant phases. Extract:
- Detailed "Accomplishments" section
- "Next Phase Readiness" warnings/blockers
- "Issues Encountered" that might affect current phase
- "Deviations from Plan" for patterns

**From STATE.md:** Decisions → constrain approach. Pending todos → candidates. Blockers → may need to address.

**From pending todos:**

```bash
ls .planning/todos/pending/*.md 2>/dev/null
```

Assess each pending todo - relevant to this phase? Natural to address now?

**Answer before proceeding:**
- Q1: What decisions from previous phases constrain this phase?
- Q2: Are there pending todos that should become tasks?
- Q3: Are there concerns from "Next Phase Readiness" that apply?
- Q4: Given all context, does the roadmap's description still make sense?

**Track for PLAN.md context section:**
- Which summaries were selected (for @context references)
- Tech stack available (from frontmatter)
- Established patterns (from frontmatter)
- Key files to reference (from frontmatter)
- Applicable decisions (from frontmatter + full summary)
- Todos being addressed (from pending todos)
- Concerns being verified (from "Next Phase Readiness")
</step>

<step name="load_algorithm_context">
**Load algorithm docs whose `owns:` intersects phase files.**

Check if algorithm documentation exists:

```bash
ls .planning/algorithms/*.md 2>/dev/null
```

**If algorithm docs exist:**

For each algorithm doc, check if it owns files relevant to this phase:

```bash
# For each algorithm file, extract owns: list and check intersection
for f in .planning/algorithms/*.md; do
  # Extract owned files from frontmatter
  OWNS=$(sed -n '/^owns:/,/^[^- ]/p' "$f" | grep "^  - " | sed 's/^  - //')
  echo "Algorithm: $f"
  echo "Owns: $OWNS"
done
```

**Intersection check:**

Compare algorithm `owns:` paths against:
1. Files mentioned in phase description (from ROADMAP.md)
2. Files in prior phase summaries' `key-files` sections
3. Source files you plan to touch based on phase goal

**If intersection found:**

Include algorithm doc in PLAN.md `<context>` section:

```markdown
<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/algorithms/[matching-algorithm].md  <!-- Algorithm spec for owned files -->
@path/to/source.ts
</context>
```

**Track for write_phase_prompt step:**
- Which algorithm docs were loaded (for @context references)
- What invariants to maintain (from algorithm's Invariants section)
- What validation to include (from algorithm's Validation section)

**If no intersection or no algorithm docs:** Continue to gather_phase_context.

</step>

<step name="gather_phase_context">
Understand:
- Phase goal (from roadmap)
- What exists already (scan codebase if mid-project)
- Dependencies met (previous phases complete?)
- Any {phase}-RESEARCH.md (from /gsd:research-phase)
- Any DISCOVERY.md (from mandatory discovery)
- Any {phase}-CONTEXT.md (from /gsd:discuss-phase)
- Any algorithm docs loaded (from load_algorithm_context)

```bash
# If mid-project, understand current state
ls -la src/ 2>/dev/null
cat package.json 2>/dev/null | head -20

# Check for ecosystem research (from /gsd:research-phase)
cat .planning/phases/XX-name/${PHASE}-RESEARCH.md 2>/dev/null

# Check for phase context (from /gsd:discuss-phase)
cat .planning/phases/XX-name/${PHASE}-CONTEXT.md 2>/dev/null
```

**If RESEARCH.md exists:** Use standard_stack (these libraries), architecture_patterns (follow in task structure), dont_hand_roll (NEVER custom solutions for listed problems), common_pitfalls (inform verification), code_examples (reference in actions).

**If CONTEXT.md exists:** Honor vision, prioritize essential, respect boundaries, incorporate specifics.

**If neither exist:** Suggest /gsd:research-phase for niche domains, /gsd:discuss-phase for simpler domains, or proceed with roadmap only.
</step>

<step name="break_into_tasks">
Decompose phase into tasks. **Think dependencies first, not sequence.**

For each potential task, ask:
1. **What does this task NEED?** (files, types, APIs that must exist)
2. **What does this task CREATE?** (files, types, APIs others might need)
3. **Can this run independently?** (no dependencies = Wave 1 candidate)

**Standard tasks need:**
- **Type**: auto, checkpoint:human-verify, checkpoint:decision (human-action rarely needed)
- **Task name**: Clear, action-oriented
- **Files**: Which files created/modified (for auto tasks)
- **Action**: Specific implementation (including what to avoid and WHY)
- **Verify**: How to prove it worked
- **Done**: Acceptance criteria

**TDD detection:** For each potential task, evaluate TDD fit:

TDD candidates (create dedicated TDD plans):
- Business logic with defined inputs/outputs
- API endpoints with request/response contracts
- Data transformations, parsing, formatting
- Validation rules and constraints
- Algorithms with testable behavior
- State machines and workflows

Standard tasks (remain in standard plans):
- UI layout, styling, visual components
- Configuration changes
- Glue code connecting existing components
- One-off scripts and migrations
- Simple CRUD with no business logic

**Heuristic:** Can you write `expect(fn(input)).toBe(output)` before writing `fn`?
→ Yes: Create a dedicated TDD plan for this feature (one feature per TDD plan)
→ No: Standard task in standard plan

**Why TDD gets its own plan:** TDD requires 2-3 execution cycles (RED → GREEN → REFACTOR), each with file reads, test runs, and potential debugging. Embedded in a multi-task plan, TDD work consumes 50-60% of context alone, degrading quality for remaining tasks.

**Test framework:** If project has no test setup and TDD plans are needed, the first TDD plan's RED phase handles framework setup as part of writing the first test.

See `~/.claude/get-shit-done/references/tdd.md` for TDD plan structure.

**Checkpoints:** Visual/functional verification → checkpoint:human-verify. Implementation choices → checkpoint:decision. Manual action (email, 2FA) → checkpoint:human-action (rare).

**Critical:** If external resource has CLI/API (Vercel, Stripe, etc.), use type="auto" to automate. Only checkpoint for verification AFTER automation.

See ~/.claude/get-shit-done/references/checkpoints.md for checkpoint structure.

**User setup detection:** For tasks involving external services, identify human-required configuration:

External service indicators:
- New SDK: `stripe`, `@sendgrid/mail`, `twilio`, `openai`, `@supabase/supabase-js`
- Webhook handlers: Files in `**/webhooks/**` or `**/webhook*`
- OAuth integration: Social login, third-party auth
- API keys: Code referencing `process.env.SERVICE_*` patterns

For each external service, determine:
1. **Env vars needed** - What secrets must be retrieved from dashboards?
2. **Account setup** - Does user need to create an account?
3. **Dashboard config** - What must be configured in external UI?
4. **Local dev** - Any CLI tools for local testing?

Record in `user_setup` frontmatter (see write_phase_prompt step).
</step>

<step name="build_dependency_graph">
**Map task dependencies explicitly before grouping into plans.**

**1. For each task identified, record:**
- `needs`: What must exist before this task runs (files, types, prior task outputs)
- `creates`: What this task produces (files, types, exports)
- `has_checkpoint`: Does this task require user interaction?

**2. Build the dependency graph:**

```
Example phase with 6 tasks:

Task A (User model): needs nothing, creates src/models/user.ts
Task B (Product model): needs nothing, creates src/models/product.ts
Task C (User API): needs Task A, creates src/api/users.ts
Task D (Product API): needs Task B, creates src/api/products.ts
Task E (Dashboard): needs Task C + D, creates src/components/Dashboard.tsx
Task F (Verify UI): checkpoint:human-verify, needs Task E

Dependency graph:
  A ──→ C ──┐
            ├──→ E ──→ F
  B ──→ D ──┘

Wave analysis:
  Wave 1: A, B (independent roots)
  Wave 2: C, D (depend only on Wave 1)
  Wave 3: E (depends on Wave 2)
  Wave 4: F (checkpoint, depends on Wave 3)
```

**3. Identify parallelization opportunities:**

| Pattern | Result |
|---------|--------|
| No dependencies | Wave 1 (parallel) |
| Depends only on Wave 1 | Wave 2 (parallel) |
| Has checkpoint | Runs in wave, but can pause/resume |
| Shared file conflict | Must be sequential |

**4. Detect and prefer vertical slices:**

**Sequential (horizontal layers) - AVOID:**
```
Plan 01: Create User model, Product model, Order model
Plan 02: Create User API, Product API, Order API
Plan 03: Create User UI, Product UI, Order UI
```
Result: Fully sequential (02 needs 01, 03 needs 02)

**Parallel (vertical slices) - PREFER:**
```
Plan 01: User feature (model + API + UI)
Plan 02: Product feature (model + API + UI)
Plan 03: Order feature (model + API + UI)
```
Result: All three can run in parallel (Wave 1)

**When vertical slices work:**
- Features are independent (no shared types/data)
- Each slice is self-contained
- No cross-feature dependencies

**When horizontal layers are necessary:**
- Shared foundation required (auth before protected features)
- Genuine type dependencies (Order needs User type)
- Infrastructure setup (database before all features)

**5. Output: Dependency map for each plan**

For each plan, determine:
- `depends_on: []` - plan IDs this plan requires (empty = parallel candidate)
- `files_modified: []` - files this plan touches (for conflict detection)
- `autonomous: true|false` - has checkpoints requiring user interaction?
</step>

<step name="assign_waves">
**Compute wave numbers before writing plans.**

Wave assignment algorithm (run in memory before writing any files):

```
waves = {}  # plan_id -> wave_number

for each plan in plan_order:
  if plan.depends_on is empty:
    plan.wave = 1
  else:
    # Wave = max wave of dependencies + 1
    plan.wave = max(waves[dep] for dep in plan.depends_on) + 1

  waves[plan.id] = plan.wave
```

**Example:**

```
Plan 01: depends_on: []           → wave: 1
Plan 02: depends_on: []           → wave: 1
Plan 03: depends_on: ["01"]       → wave: 2
Plan 04: depends_on: ["02"]       → wave: 2
Plan 05: depends_on: ["03", "04"] → wave: 3
```

Store wave number with each plan in memory. Write to frontmatter in next step.
</step>

<step name="group_into_plans">
**Group tasks into plans based on dependency waves and autonomy.**

**Grouping rules:**

1. **Same-wave tasks with no file conflicts → can be in parallel plans**
2. **Tasks with shared files → must be in same plan or sequential plans**
3. **Checkpoint tasks → mark plan as `autonomous: false`**
4. **Each plan: 2-3 tasks max, single concern, ~50% context target**

**Plan assignment algorithm:**

```
1. Start with Wave 1 tasks (no dependencies)
2. Group into plans by:
   - Feature affinity (vertical slice)
   - File ownership (no conflicts)
   - Checkpoint presence (group checkpoints with related auto tasks)
3. Move to Wave 2 tasks, repeat
4. Continue until all tasks assigned
```

**Example grouping:**

```
Tasks identified:
- A: User model (Wave 1, auto)
- B: Product model (Wave 1, auto)
- C: User API (Wave 2, auto)
- D: Product API (Wave 2, auto)
- E: Dashboard (Wave 3, auto)
- F: Verify Dashboard (Wave 3, checkpoint)

Grouping into plans:
Plan 01: [A, C] - User feature (model + API)
         depends_on: [], autonomous: true

Plan 02: [B, D] - Product feature (model + API)
         depends_on: [], autonomous: true

Plan 03: [E, F] - Dashboard (build + verify)
         depends_on: ["01", "02"], autonomous: false

Wave structure:
  Wave 1 (parallel): Plan 01, Plan 02
  Wave 2: Plan 03 (has checkpoint, runs after Wave 1)
```
</step>

<step name="estimate_scope">
After grouping, verify each plan fits context budget.

**Check depth setting:**
```bash
cat .planning/config.json 2>/dev/null | grep depth
```

<depth_aware_splitting>
**Depth controls compression tolerance, not artificial inflation.**

| Depth | Typical Plans/Phase | Tasks/Plan |
|-------|---------------------|------------|
| Quick | 1-3 | 2-3 |
| Standard | 3-5 | 2-3 |
| Comprehensive | 5-10 | 2-3 |

**Key principle:** Derive plans from actual work. Depth determines how aggressively you combine things, not a target to hit.

- Comprehensive auth phase = 8 plans (because auth genuinely has 8 concerns)
- Comprehensive "add config file" phase = 1 plan (because that's all it is)

For comprehensive depth:
- Create MORE plans when the work warrants it, not bigger ones
- If a phase has 15 tasks, that's 5-8 plans (not 3 plans with 5 tasks each)
- Each plan stays focused: 2-3 tasks, single concern

For quick depth:
- Combine aggressively into fewer plans
- 1-3 plans per phase is fine
- Focus on critical path
</depth_aware_splitting>

**ALWAYS split if:** >3 tasks, multiple subsystems, >5 files in any task, complex domains (auth, payments).

**Each plan must be:** 2-3 tasks max, ~50% context target, independently committable.

See ~/.claude/get-shit-done/references/scope-estimation.md for complete guidance.
</step>

<step name="confirm_breakdown">
<if mode="yolo">
Auto-approve and proceed to write_phase_prompt.
</if>

<if mode="interactive">
Present breakdown with wave structure:

```
Phase [X] breakdown:

## Execution Waves

**Wave 1 (parallel):**
  {phase}-01: [Plan Name] [autonomous]
    - Task: [brief]
    - Task: [brief]

  {phase}-02: [Plan Name] [autonomous]
    - Task: [brief]
    - Task: [brief]

**Wave 2 (parallel):**
  {phase}-03: [Plan Name] (depends: 01, 02) [autonomous]
    - Task: [brief]

**Wave 3:**
  {phase}-04: [Plan Name] (depends: 03) [has checkpoint]
    - Task: [brief]
    - Checkpoint: [type]

---
Total: [N] plans in [M] waves
Parallel plans: [X]
Sequential plans: [Y]

Does this look right? (yes / adjust / start over)
```

Wait for confirmation. If "adjust": revise. If "start over": return to gather_phase_context.
</if>
</step>

<step name="write_phase_prompt">
Use template from `~/.claude/get-shit-done/templates/phase-prompt.md`.

**Single plan:** Write to `.planning/phases/XX-name/{phase}-01-PLAN.md`

**Multiple plans:** Write separate files ({phase}-01-PLAN.md, {phase}-02-PLAN.md, etc.)

Each plan follows template structure with:
- Frontmatter (phase, plan, type, depends_on, files_modified, autonomous, domain)
- Objective (plan-specific goal, purpose, output)
- Execution context (execute-plan.md, summary template, checkpoints.md if needed)
- Context (@references to PROJECT, ROADMAP, STATE, codebase docs, RESEARCH/DISCOVERY/CONTEXT if exist, prior summaries, source files)
- Tasks (XML format with types)
- Verification, Success criteria, Output specification

**Plan frontmatter:**

```yaml
---
phase: XX-name
plan: NN
type: execute
wave: N                     # Execution wave (1, 2, 3...). Computed at plan time.
depends_on: []              # Plan IDs this plan requires.
files_modified: []          # Files this plan touches.
autonomous: true            # false if plan has checkpoints requiring user interaction
domain: [optional]
user_setup: []              # Human-required setup (omit if empty)
---
```

**User setup frontmatter (when external services involved):**

```yaml
user_setup:
  - service: stripe
    why: "Payment processing"
    env_vars:
      - name: STRIPE_SECRET_KEY
        source: "Stripe Dashboard → Developers → API keys → Secret key"
      - name: STRIPE_WEBHOOK_SECRET
        source: "Stripe Dashboard → Developers → Webhooks → Signing secret"
    account_setup:
      - url: "https://dashboard.stripe.com/register"
        skip_if: "Already have Stripe account"
    dashboard_config:
      - task: "Create webhook endpoint"
        location: "Stripe Dashboard → Developers → Webhooks → Add endpoint"
        details: "URL: https://[your-domain]/api/webhooks/stripe, Events: checkout.session.completed"
    local_dev:
      - "stripe listen --forward-to localhost:3000/api/webhooks/stripe"
```

**Automation-first rule:** Only include setup Claude literally cannot do:
- Account creation (requires human signup)
- Secret retrieval (requires dashboard access)
- Dashboard configuration (requires human in browser)

Do NOT include: npm install, code changes, file creation, CLI commands Claude can run.

**Wave is pre-computed:** Wave numbers are assigned during planning (see `assign_waves` step). `/gsd:execute-phase` reads `wave` directly from frontmatter and groups plans by wave number. No runtime dependency analysis needed.

**Context section - parallel-aware:**

Only include prior plan SUMMARY references if this plan genuinely needs decisions/outputs:

```markdown
<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md

# Only reference prior plans if genuinely needed:
# - This plan uses types/exports from prior plan
# - This plan continues work from prior plan
# - Prior plan made decision that affects this plan
#
# Do NOT reflexively chain: Plan 02 refs 01, Plan 03 refs 02...
# Independent plans need no prior SUMMARY references.

@path/to/relevant/source.ts
</context>
```

**For plans with checkpoints:**

Include checkpoint reference in execution_context:
```markdown
<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
@~/.claude/get-shit-done/references/checkpoints.md
</execution_context>
```

Checkpoint plans can still run in parallel waves. When they hit a checkpoint, they pause and return to the orchestrator. User responds, orchestrator resumes the agent.
</step>

<step name="git_commit">
Commit phase plan(s):

```bash
# Stage all PLAN.md files for this phase
git add .planning/phases/${PHASE}-*/${PHASE}-*-PLAN.md

# Also stage DISCOVERY.md if it was created during mandatory_discovery
git add .planning/phases/${PHASE}-*/DISCOVERY.md 2>/dev/null

git commit -m "$(cat <<'EOF'
docs(${PHASE}): create phase plan

Phase ${PHASE}: ${PHASE_NAME}
- [N] plan(s) in [M] wave(s)
- [X] parallel, [Y] sequential
- Ready for execution
EOF
)"
```

Confirm: "Committed: docs(${PHASE}): create phase plan"
</step>

<step name="offer_next">
```
Phase {X} planned: {N} plan(s) in {M} wave(s)

## Wave Structure
Wave 1 (parallel): {plan-01}, {plan-02}
Wave 2: {plan-03}
...

---

## Next Up

[If 1 plan created:]
**{phase}-01: [Plan Name]** - [objective summary]

`/gsd:execute-plan .planning/phases/XX-name/{phase}-01-PLAN.md`

[If 2+ plans created:]
**Phase {X}: [Phase Name]** - {N} plans in {M} waves

`/gsd:execute-phase {X}`

<sub>`/clear` first - fresh context window</sub>

---

**Also available:**
- Review/adjust plans before executing
[If 2+ plans: - `/gsd:execute-plan {phase}-01-PLAN.md` - run plans one at a time]
[If 2+ plans: - View all plans: `ls .planning/phases/XX-name/*-PLAN.md`]

---
```
</step>

</process>

<task_quality>
**Good tasks:** Specific files, actions, verification
- "Add User model to Prisma schema with email, passwordHash, createdAt"
- "Create POST /api/auth/login endpoint with bcrypt validation"

**Bad tasks:** Vague, not actionable
- "Set up authentication" / "Make it secure" / "Handle edge cases"

If you can't specify Files + Action + Verify + Done, the task is too vague.

**TDD candidates get dedicated plans.** If "Create price calculator with discount rules" warrants TDD, create a TDD plan for it. See `~/.claude/get-shit-done/references/tdd.md` for TDD plan structure.
</task_quality>

<anti_patterns>
- No story points or hour estimates
- No team assignments
- No acceptance criteria committees
- No sub-sub-sub tasks
- **No reflexive sequential chaining** (Plan 02 depends on 01 "just because")
Tasks are instructions for Claude, not Jira tickets.
</anti_patterns>

<success_criteria>
**Standard mode** — Phase planning complete when:
- [ ] STATE.md read, project history absorbed
- [ ] Mandatory discovery completed (Level 0-3)
- [ ] Prior decisions, issues, concerns synthesized
- [ ] Dependency graph built (needs/creates for each task)
- [ ] Tasks grouped into plans by wave, not by sequence
- [ ] PLAN file(s) exist with XML structure
- [ ] Each plan: depends_on, files_modified, autonomous in frontmatter
- [ ] Each plan: user_setup declared if external services involved
- [ ] Each plan: Objective, context, tasks, verification, success criteria, output
- [ ] Each plan: 2-3 tasks (~50% context)
- [ ] Each task: Type, Files (if auto), Action, Verify, Done
- [ ] Checkpoints properly structured
- [ ] Wave structure maximizes parallelism
- [ ] PLAN file(s) committed to git
- [ ] User knows next steps and wave structure

**Gap closure mode (`--gaps`)** — Planning complete when:
- [ ] VERIFICATION.md loaded and gaps parsed
- [ ] Existing SUMMARYs read for context
- [ ] Gaps clustered into focused plans
- [ ] Plan numbers sequential after existing (04, 05...)
- [ ] PLAN file(s) exist with gap_closure: true
- [ ] Each plan: tasks derived from gap.missing items
- [ ] PLAN file(s) committed to git
- [ ] User knows to run `/gsd:execute-phase {X}` next
</success_criteria>
