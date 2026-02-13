# Phase 4: Plan Integration - Research

**Researched:** 2026-02-13
**Domain:** Adversary debate loop integration into /gsd:plan-phase orchestrator
**Confidence:** HIGH

## Summary

This phase integrates the adversary agent into the `/gsd:plan-phase` command at the plan checkpoint. The adversary challenges each PLAN.md after the plan checker verification loop completes (or is skipped), using the debate loop pattern established in Phase 3. The key architectural difference from Phase 3 is threefold: (1) multiple artifacts -- each PLAN.md in the phase gets its own adversary review loop, (2) the planner agent generates the defense/revision rather than the orchestrator editing inline, and (3) prior plans must be passed as context so the adversary can catch cross-plan gaps.

The implementation domain is entirely internal to this codebase. All integration points, agent interfaces, config reading patterns, and UI conventions are established by prior phases. The adversary agent definition (`agents/gsd-adversary.md`), config reading block (`get-shit-done/references/planning-config.md`), and debate loop pattern (from `commands/gsd/new-project.md` Phase 7.5/8.5) provide all the building blocks. The only file modified is `commands/gsd/plan-phase.md`.

**Primary recommendation:** Modify `commands/gsd/plan-phase.md` to add an adversary review loop between the checker verification step (step 11/12) and the final status presentation (step 13). The loop iterates over each PLAN.md, spawns the adversary with the plan content plus prior plans as context, then re-spawns the planner in revision mode if BLOCKING challenges need addressing. Use the same config reading block, CONV-01 hard cap, and summary display format from Phase 3.

## Standard Stack

This is a pure prompt engineering and command orchestration task. No external dependencies.

### Core
| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| `commands/gsd/plan-phase.md` | N/A | Orchestrator to modify | The command being extended |
| `agents/gsd-adversary.md` | N/A | Adversary agent to spawn | Created in Phase 1, ready to consume |
| `agents/gsd-planner.md` | N/A | Planner agent for defense/revision | Existing agent, re-spawned with adversary feedback |
| `get-shit-done/references/planning-config.md` | N/A | Config reading block | Created in Phase 2, provides `node -e` parsing |
| `get-shit-done/references/ui-brand.md` | N/A | UI patterns for banners | Existing GSD standard |

### Supporting
| Component | Version | Purpose | When to Use |
|-----------|---------|---------|-------------|
| Task tool | N/A | Spawning adversary and planner subagents | Each round of the debate loop |
| Write/Edit tool | N/A | Not used directly -- planner agent handles revisions | N/A |
| Bash tool | N/A | Config reading, file listing | Reading adversary config, enumerating PLAN.md files |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Planner-as-defender (re-spawn planner) | Orchestrator-as-defender (inline editing) | CONTEXT.md locks planner-as-defender. Planner has deeper plan knowledge; orchestrator editing inline would produce lower-quality revisions for complex plan changes. Tradeoff: extra Task spawn per revision round. |
| Per-plan sequential review | Batched adversary review (all plans at once) | CONTEXT.md locks per-plan review. Sequential gives focused challenges; batched would overwhelm adversary context and produce shallower analysis. |
| Prior plans as full content | Prior plans as summaries | Full content gives adversary complete cross-plan visibility but increases token usage. Summaries save tokens but may miss details. Recommend: use full content for small plan counts (1-5), truncate to frontmatter+objective+tasks for large counts (6+). |

## Architecture Patterns

### Current plan-phase Flow (Before Modification)

```
Step 1-4:  Validate environment, parse args, validate phase, ensure directory
Step 5:    Handle research (spawn gsd-phase-researcher if needed)
Step 6:    Check existing plans
Step 7:    Read context files
Step 8:    Spawn gsd-planner agent → creates PLAN.md files, commits them
Step 9:    Handle planner return (PLANNING COMPLETE / CHECKPOINT / INCONCLUSIVE)
Step 10:   Spawn gsd-plan-checker (if plan_check enabled and --skip-verify not set)
Step 11:   Handle checker return (VERIFICATION PASSED / ISSUES FOUND)
Step 12:   Revision loop (max 3 iterations: planner revises → checker re-checks)
Step 13:   Present final status (offer_next)
```

### Modified plan-phase Flow (After Modification)

```
Step 1-4:  (unchanged)
Step 5:    (unchanged)
Step 6:    (unchanged)
Step 7:    (unchanged)
Step 8:    Spawn gsd-planner → creates PLAN.md files, commits them
Step 9:    Handle planner return
Step 10:   Spawn gsd-plan-checker (if plan_check enabled)
Step 11:   Handle checker return
Step 12:   Revision loop (planner ↔ checker, max 3 iterations)
Step 12.5: *** ADVERSARY REVIEW *** (NEW — per-plan debate loop)
Step 13:   Present final status (offer_next, updated with adversary info)
```

### Pattern 1: Per-Plan Adversary Review Loop

**What:** Iterate over each PLAN.md in the phase directory and run a separate adversary debate loop for each one.
**When to use:** After plan checker passes (or is skipped), before final status presentation.

```
ADVERSARY REVIEW LOOP:
1. Read adversary config for "plan" checkpoint
2. If disabled → skip to step 13
3. Enumerate all PLAN.md files in phase directory
4. For each PLAN.md (in plan number order):
   a. Display "GSD > ADVERSARY REVIEW" banner with plan identifier
   b. Read current plan content from disk
   c. Gather prior plan content (plans 1..N-1 for plan N)
   d. Run debate loop:
      - For round = 1 to max_rounds:
        i.   Spawn gsd-adversary with plan + prior plans + project context
        ii.  Parse response: challenges[], convergence
        iii. If CONVERGE and round > 1 → exit loop
        iv.  If round < max_rounds and BLOCKING challenges exist:
             - Re-spawn gsd-planner in adversary-revision mode with challenges
             - Build DEFENSE from planner's changes
        v.   Store previous challenges, increment round
   e. Display per-plan summary
   f. Track if any revisions occurred
5. If any plans were revised: commit revisions
6. Display consolidated adversary summary
7. Continue to step 13
```

**Key design decisions from CONTEXT.md (locked):**
- Each PLAN.md gets its own adversary review (not batched)
- BLOCKING challenges auto-revise (planner re-spawned)
- MAJOR/MINOR at Claude's discretion
- Adversary runs independently of checker config
- Clean artifacts -- no adversary metadata in PLAN.md files

### Pattern 2: Planner-as-Defender (New Pattern)

**What:** Re-spawn the planner agent in a targeted revision mode to address adversary challenges, rather than the orchestrator editing inline.
**When to use:** When adversary raises BLOCKING challenges (or MAJOR at orchestrator's discretion) against a specific PLAN.md.

Round > 1 planner revision spawn:
```markdown
First, read ~/.claude/agents/gsd-planner.md for your role and instructions.

<revision_context>

**Phase:** {phase_number}
**Mode:** adversary_revision
**Target plan:** {plan_number}

**Current plan content:**
{current plan content from disk}

**Adversary challenges:**
{adversary's structured challenge output}

**Challenge handling instructions:**
- BLOCKING challenges: Must address with specific plan changes
- MAJOR challenges: Address if valid, note with rationale if not
- MINOR challenges: Note without revision (typically)

</revision_context>

<instructions>
Make targeted updates to plan {plan_number} to address adversary challenges.
Do NOT rewrite the plan from scratch.
Do NOT modify other plans.
Write the revised plan to disk.
Return what changed and why (this becomes the defense for the next adversary round).
</instructions>
```

```
Task(
  prompt=revision_prompt,
  subagent_type="general-purpose",
  model="{planner_model}",
  description="Revise plan {plan_number} (adversary feedback)"
)
```

**The defense text** is built from the planner's return:
- What the planner changed in the plan (addressed challenges)
- What the planner chose not to change (rejected challenges with rationale)
- This defense text is passed to the adversary in the next round's `<defense>` tag

### Pattern 3: Adversary Spawn for Plans (Adapted from Phase 3)

**What:** Spawn prompt template adapted for the plan checkpoint.
**When to use:** Each round of the per-plan debate loop.

Round 1 spawn:
```markdown
First, read ~/.claude/agents/gsd-adversary.md for your role and instructions.

<artifact_type>plan</artifact_type>

<artifact_content>
{PLAN.md content read from disk}
</artifact_content>

<round>1</round>
<max_rounds>{EFFECTIVE_MAX_ROUNDS}</max_rounds>

<project_context>
{PROJECT.md summary -- first ~50 lines}
</project_context>

<prior_plans>
{Content of prior PLAN.md files in this phase, if any.
 For plan 01: empty/omitted.
 For plan 02+: include plan 01's content, etc.}
</prior_plans>
```

Round > 1 spawn (adds defense and previous challenges):
```markdown
First, read ~/.claude/agents/gsd-adversary.md for your role and instructions.

<artifact_type>plan</artifact_type>

<artifact_content>
{Updated PLAN.md content -- re-read from disk after planner revision}
</artifact_content>

<round>{ROUND}</round>
<max_rounds>{EFFECTIVE_MAX_ROUNDS}</max_rounds>

<defense>
{Defense text built from planner's revision return}
</defense>

<previous_challenges>
{Adversary's challenges from previous round}
</previous_challenges>

<project_context>
{PROJECT.md summary}
</project_context>

<prior_plans>
{Content of prior PLAN.md files}
</prior_plans>
```

**New tag: `<prior_plans>`** -- This is unique to the plan checkpoint. The adversary agent's `<input_format>` accepts optional context tags. The `<prior_plans>` tag lets the adversary detect cross-plan issues (duplicate work, missing integration points, inconsistent patterns, dependency gaps between plans).

### Pattern 4: Config Reading (Identical to Phase 3)

**What:** Standard bash snippet to read adversary settings for the "plan" checkpoint.
**When to use:** Before entering the adversary review loop.

```bash
CHECKPOINT_NAME="plan"
CHECKPOINT_CONFIG=$(node -e "
  try {
    const c = JSON.parse(require('fs').readFileSync('.planning/config.json', 'utf8'));
    const adv = c.adversary || {};
    if (adv.enabled === false) { console.log('false|3'); process.exit(0); }
    const cp = adv.checkpoints?.[process.argv[1]];
    let enabled, rounds;
    if (typeof cp === 'boolean') { enabled = cp; rounds = adv.max_rounds ?? 3; }
    else if (typeof cp === 'object' && cp !== null) { enabled = cp.enabled ?? true; rounds = cp.max_rounds ?? adv.max_rounds ?? 3; }
    else { enabled = true; rounds = adv.max_rounds ?? 3; }
    console.log(enabled + '|' + rounds);
  } catch(e) { console.log('true|3'); }
" "$CHECKPOINT_NAME" 2>/dev/null || echo "true|3")

CHECKPOINT_ENABLED=$(echo "$CHECKPOINT_CONFIG" | cut -d'|' -f1)
MAX_ROUNDS=$(echo "$CHECKPOINT_CONFIG" | cut -d'|' -f2)

# Apply CONV-01 hard cap: debate never exceeds 3 rounds
EFFECTIVE_MAX_ROUNDS=$((MAX_ROUNDS > 3 ? 3 : MAX_ROUNDS))
```

Verbatim from `planning-config.md` with `CHECKPOINT_NAME="plan"`.

### Pattern 5: Adversary Summary Display (Adapted from Phase 3)

**What:** How to present adversary review results per plan and consolidated.
**When to use:** After each plan's debate loop and after all plans reviewed.

Per-plan summary (after each plan's debate loop):
```
✓ Plan {NN}: Adversary review complete

**Challenges:**
- ✓ **[BLOCKING]** {title} — Addressed: {what changed}
- ○ **[MINOR]** {title} — Noted: {rationale}
```

Consolidated summary (after all plans reviewed, before offer_next):
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► ADVERSARY REVIEW COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{N} plan(s) reviewed | {X} challenges addressed | {Y} noted
```

### Pattern 6: Model Profile for Adversary in plan-phase

**What:** Model lookup table addition for adversary and planner-revision in plan-phase.
**When to use:** When spawning adversary and planner agents.

The plan-phase model table (step 1) already has:

| Agent | quality | balanced | budget |
|-------|---------|----------|--------|
| gsd-phase-researcher | opus | sonnet | haiku |
| gsd-planner | opus | opus | sonnet |
| gsd-plan-checker | sonnet | sonnet | haiku |

Add:

| Agent | quality | balanced | budget |
|-------|---------|----------|--------|
| gsd-adversary | sonnet | sonnet | haiku |

The planner-revision spawns use the existing `gsd-planner` model entry since they re-spawn the same agent.

### Anti-Patterns to Avoid

- **Orchestrator editing plans directly:** Phase 4 uses planner-as-defender (CONTEXT.md decision). The orchestrator parses challenges and determines what needs addressing, but the planner agent makes the actual plan revisions. Don't regress to the Phase 3 pattern of inline orchestrator editing -- plan revisions require plan-level knowledge the orchestrator lacks.

- **Batching all plans into one adversary call:** Each plan gets its own debate loop. Sending all plans at once would overwhelm the adversary's context and produce shallow analysis. The adversary agent is designed for single-artifact review per `<artifact_type>`.

- **Running adversary before checker:** The checker catches structural issues (missing fields, bad dependencies, scope violations). The adversary catches conceptual issues (missing edge cases, risk, complexity hiding). Run checker first so the adversary reviews structurally valid plans. CONTEXT.md locks this ordering.

- **Adversary modifying plans directly:** The adversary only challenges. The planner revises. The orchestrator orchestrates. Maintain separation of concerns.

- **Re-running adversary after user proceeds:** Adversary runs once per plan. If the user later wants to adjust plans, they use `/gsd:plan-phase` again. No re-run within the same session.

- **Skipping adversary when checker is disabled:** CONTEXT.md locks this: adversary runs independently of `plan_check` config. Even if `workflow.plan_check` is false (checker skipped), adversary still runs if `adversary.checkpoints.plan` is enabled.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Config reading | Custom grep/awk extraction | `node -e` reading block from planning-config.md with `CHECKPOINT_NAME="plan"` | Established pattern, handles polymorphic checkpoint values |
| Challenge parsing | Regex parsing of adversary output | Adversary's structured markdown output format | Output format designed for orchestrator consumption in Phase 1 |
| Plan revision | Orchestrator editing plans inline | Re-spawn gsd-planner in adversary_revision mode | Planner has plan-level knowledge; revision mode is an existing planner capability |
| UI banners | Custom formatting | `ui-brand.md` stage banner pattern | Established GSD visual pattern |
| Plan enumeration | Custom plan counting | `ls "${PHASE_DIR}"/*-PLAN.md` | Standard bash file enumeration, already used in plan-phase steps 6 and 10 |

**Key insight:** Every component this phase needs already exists. The new pattern is the per-plan loop with planner-as-defender, but all the individual pieces (adversary agent, config reading, debate loop structure, planner revision mode, summary display) are established. This is wiring with one new architectural pattern.

## Common Pitfalls

### Pitfall 1: Planner Revising Wrong Plan
**What goes wrong:** Planner-as-defender is spawned to revise plan 02 but modifies plan 01 or creates a new plan instead.
**Why it happens:** Revision prompt is vague about which plan to target, or planner defaults to its standard "create plans" behavior instead of revision behavior.
**How to avoid:** The revision prompt must explicitly state `**Target plan:** {plan_number}`, include `**Mode:** adversary_revision`, and instruct the planner to write the revised plan to the exact file path. Include only the target plan's content in the prompt, not all plans.
**Warning signs:** Plan numbers changing, new PLAN.md files appearing during adversary review, other plans modified unexpectedly.

### Pitfall 2: Prior Plans Overwhelming Adversary Context
**What goes wrong:** When reviewing plan 05, passing the full content of plans 01-04 fills most of the adversary's context, leaving little room for meaningful challenge generation.
**Why it happens:** Each PLAN.md can be 50-150 lines. Five prior plans could be 250-750 lines before the adversary even starts analyzing the target plan.
**How to avoid:** For phases with many plans (6+), summarize prior plans instead of including full content. Use frontmatter + objective + task names (not full task details). For typical phases (1-5 plans), full content is fine.
**Warning signs:** Adversary challenges are generic or shallow when reviewing later plans in a large phase, adversary output is truncated.

### Pitfall 3: Commit Handling Mismatch
**What goes wrong:** Adversary revisions aren't committed, or they're committed with the wrong message, or they overwrite the planner's original commit.
**Why it happens:** Confusion about when plans are committed in the flow.
**How to avoid:** Plans are already committed by the planner (step 8) and potentially by the checker revision loop (step 12). Adversary revisions happen after those commits. If any plans were revised during adversary review, create ONE separate commit: `docs({phase}): incorporate adversary review feedback (plans)`. This preserves the pre-adversary state in git history. Only commit if `ARTIFACT_REVISED=true` -- don't commit if all challenges were noted without revision.
**Warning signs:** Git history shows no adversary revision commit when plans were changed, or shows multiple small commits per plan instead of one consolidated commit.

### Pitfall 4: Adversary Reviewing Stale Plan Content
**What goes wrong:** Adversary in round 2 receives the original plan content instead of the planner-revised version.
**Why it happens:** Caching plan content at the start of the debate loop and not re-reading from disk after the planner revises.
**How to avoid:** Always re-read the PLAN.md from disk before each adversary spawn (round > 1). The planner-as-defender writes the revised plan to disk, so the disk always has the latest version.
**Warning signs:** Adversary challenges things that were already fixed, debate loops without progress.

### Pitfall 5: Adversary Running on Plans in Non-Standard Mode
**What goes wrong:** Adversary review triggers during gap closure mode (`--gaps`) or when the user chose to "Force proceed" past checker issues.
**Why it happens:** Not checking the current mode or user's override decision before entering the adversary review step.
**How to avoid:** The adversary review step should check: (1) adversary config is enabled for "plan" checkpoint, (2) the flow is in standard planning mode (not `--gaps`), (3) the user hasn't chosen to force-proceed past issues. Gap closure plans are fixes for existing problems -- adversarial review adds friction without proportional value. If the user force-proceeded past checker issues, they've already accepted known problems.
**Warning signs:** Adversary reviewing gap closure plans, adversary running after user already acknowledged issues and chose to proceed.

### Pitfall 6: Planner Re-Spawn Without Proper Context
**What goes wrong:** Planner is re-spawned for adversary revision but doesn't have enough context to make meaningful changes. It either makes minimal token-level edits or rewrites the plan from scratch.
**Why it happens:** Revision prompt doesn't include the adversary's specific challenges with their evidence and severity, or doesn't provide the project context the planner needs.
**How to avoid:** The adversary revision prompt must include: (1) the current plan content, (2) the adversary's full challenge output (not a summary), (3) explicit severity-to-action mapping (BLOCKING: must fix, MAJOR: discretion, MINOR: typically note), and (4) instruction to return what changed and why (so the orchestrator can build the defense text).
**Warning signs:** Planner returns with "no changes needed" for BLOCKING challenges, or planner rewrites the entire plan losing checker-approved structure.

### Pitfall 7: Infinite Loop Between Adversary and Planner
**What goes wrong:** Adversary keeps raising new challenges each round because the planner's revisions introduce new issues. Debate never converges within max rounds.
**Why it happens:** The adversary's `<anti_sycophancy>` rules ensure it always finds at least one challenge, and planner revisions may inadvertently create new challengeable content.
**How to avoid:** This is handled by design: CONV-01 hard cap (max 3 rounds) ensures termination. Round 3 adversary biases toward CONVERGE. After max rounds, remaining challenges are noted in the summary but don't block progress. The user's final decision (execute or not) is the ultimate gate.
**Warning signs:** All 3 rounds consumed with no convergence, escalating challenge counts. This is acceptable behavior -- the cap exists for this reason.

## Code Examples

### Adversary Review Integration Point (After Step 12)

Insert as Step 12.5 in `commands/gsd/plan-phase.md`, between the revision loop (step 12) and the final status presentation (step 13):

```markdown
## 12.5. Adversary Review — Plans

**Read adversary config:**

```bash
CHECKPOINT_NAME="plan"
CHECKPOINT_CONFIG=$(node -e "
  try {
    const c = JSON.parse(require('fs').readFileSync('.planning/config.json', 'utf8'));
    const adv = c.adversary || {};
    if (adv.enabled === false) { console.log('false|3'); process.exit(0); }
    const cp = adv.checkpoints?.[process.argv[1]];
    let enabled, rounds;
    if (typeof cp === 'boolean') { enabled = cp; rounds = adv.max_rounds ?? 3; }
    else if (typeof cp === 'object' && cp !== null) { enabled = cp.enabled ?? true; rounds = cp.max_rounds ?? adv.max_rounds ?? 3; }
    else { enabled = true; rounds = adv.max_rounds ?? 3; }
    console.log(enabled + '|' + rounds);
  } catch(e) { console.log('true|3'); }
" "$CHECKPOINT_NAME" 2>/dev/null || echo "true|3")

CHECKPOINT_ENABLED=$(echo "$CHECKPOINT_CONFIG" | cut -d'|' -f1)
MAX_ROUNDS=$(echo "$CHECKPOINT_CONFIG" | cut -d'|' -f2)

# Apply CONV-01 hard cap
EFFECTIVE_MAX_ROUNDS=$((MAX_ROUNDS > 3 ? 3 : MAX_ROUNDS))
```

**If CHECKPOINT_ENABLED = "false" or --gaps mode:** Skip to step 13.

**If CHECKPOINT_ENABLED = "true":**

Enumerate plans:

```bash
PLAN_FILES=$(ls "${PHASE_DIR}"/*-PLAN.md 2>/dev/null | sort)
PLAN_COUNT=$(echo "$PLAN_FILES" | wc -l | tr -d ' ')
```

Initialize: `PLANS_REVISED=false`, `TOTAL_CHALLENGES=0`, `TOTAL_ADDRESSED=0`

**For each PLAN_FILE in PLAN_FILES:**

Display banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► ADVERSARY REVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ Reviewing plan {NN} of {PLAN_COUNT}...
```

Read current plan and prior plans:
```bash
ARTIFACT_CONTENT=$(cat "$PLAN_FILE")
PROJECT_CONTEXT=$(head -50 .planning/PROJECT.md)

# Gather prior plans (all plans before current in sort order)
PRIOR_PLANS=""
for prior in $PLAN_FILES; do
  [ "$prior" = "$PLAN_FILE" ] && break
  PRIOR_PLANS+="$(cat "$prior")\n\n---\n\n"
done
```

Run debate loop (same structure as Phase 3, with planner-as-defender):
- Round 1: Spawn adversary with plan content + prior plans
- Parse challenges and convergence
- For BLOCKING: re-spawn planner in adversary_revision mode
- Build defense from planner return
- Round 2-3: Same with defense and previous challenges
- Display per-plan summary

**After all plans reviewed:**

If PLANS_REVISED = true:
```bash
git add "${PHASE_DIR}"/*-PLAN.md
git commit -m "$(cat <<'EOF'
docs({phase}): incorporate adversary review feedback (plans)
EOF
)"
```
```

### Model Table Addition

Add to Step 1 model lookup table in `plan-phase.md`:

```markdown
| Agent | quality | balanced | budget |
|-------|---------|----------|--------|
| gsd-phase-researcher | opus | sonnet | haiku |
| gsd-planner | opus | opus | sonnet |
| gsd-plan-checker | sonnet | sonnet | haiku |
| gsd-adversary | sonnet | sonnet | haiku |    <-- NEW
```

### Updated offer_next

Add adversary mention to the step 13 completion banner:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► PHASE {X} PLANNED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Phase {X}: {Name}** — {N} plan(s) in {M} wave(s)

| Wave | Plans | What it builds |
|------|-------|----------------|
| 1    | 01, 02 | [objectives] |
| 2    | 03     | [objective]  |

Research: {Completed | Used existing | Skipped}
Verification: {Passed | Passed with override | Skipped}
Adversary: {Reviewed N plan(s) | Skipped (disabled)}    <-- NEW
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Plans go straight to execution | Plans challenged by adversary after checker verification | Phase 4 (this work) | Plans are stress-tested for edge cases, missing wiring, and hidden complexity before execution |
| Orchestrator edits artifacts inline (Phase 3 pattern) | Planner agent generates revision (Phase 4 pattern) | Phase 4 (this work) | Higher-quality plan revisions because the planner has plan-level domain knowledge |
| Single artifact per adversary review | Multiple artifacts reviewed sequentially with cross-artifact context | Phase 4 (this work) | Adversary can detect cross-plan gaps and inconsistencies |

## Open Questions

### 1. Prior Plan Content Strategy for Large Phases
- **What we know:** Adversary needs prior plans as context to catch cross-plan gaps. Full content works for typical phases (1-5 plans).
- **What's unclear:** What's the right threshold for switching from full content to summary? At what plan count does full prior content degrade adversary quality?
- **Recommendation:** Use full prior plan content for all cases initially. Phases in this project have 1-3 plans each. If a future phase has 6+ plans, the orchestrator can truncate to frontmatter + objective + task names. Don't pre-optimize -- address this if it becomes a problem.

### 2. Planner Revision Scope Boundaries
- **What we know:** The planner is re-spawned in adversary_revision mode targeting a specific plan. The prompt instructs it to modify only that plan.
- **What's unclear:** Can the planner reliably scope its changes to one plan? Could adversary challenges about cross-plan issues (e.g., "Plan 02 duplicates work from Plan 01") require changes to multiple plans?
- **Recommendation:** Scope revision to the current plan only. If the adversary raises cross-plan issues, note them in the summary for the orchestrator's awareness but don't attempt multi-plan revision in a single planner spawn. The orchestrator can address cross-plan issues after the full adversary review loop if needed.

### 3. Defense Text Construction
- **What we know:** In Phase 3, the orchestrator built the defense text itself because it was the defender. In Phase 4, the planner generates the revision.
- **What's unclear:** Should the planner's return include explicit defense text, or should the orchestrator construct defense text from the planner's return (changes made + rationale)?
- **Recommendation:** Instruct the planner to return what changed and why in structured format. The orchestrator constructs the formal `<defense>` text from the planner's return. This keeps the planner focused on plan quality and the orchestrator focused on debate mechanics.

## Files That Need Modification

| File | Change | Priority |
|------|--------|----------|
| `commands/gsd/plan-phase.md` | Add adversary model to lookup table in step 1 | HIGH -- needed for spawning |
| `commands/gsd/plan-phase.md` | Add planning-config.md to execution_context | MEDIUM -- reference for config reading |
| `commands/gsd/plan-phase.md` | Insert step 12.5: per-plan adversary review loop | HIGH -- the core of this phase |
| `commands/gsd/plan-phase.md` | Update step 9 to check adversary config regardless of checker config | HIGH -- adversary independent of checker |
| `commands/gsd/plan-phase.md` | Update step 13 offer_next with adversary mention | LOW -- cosmetic |
| `commands/gsd/plan-phase.md` | Update success_criteria with adversary verification items | LOW -- completeness |

**Only one file is modified.** This is a wiring task within the existing orchestrator, same as Phase 3.

## Sources

### Primary (HIGH confidence)
- `commands/gsd/plan-phase.md` -- The orchestrator being modified. Full flow with step 8-12 integration points identified. Steps 9, 10, 11, 12, 13 all examined for adversary insertion.
- `agents/gsd-adversary.md` -- Adversary agent definition with exact input format and structured output format. Plan checkpoint challenge categories documented (task completeness, risk/edge cases, missing wiring, complexity hiding).
- `agents/gsd-planner.md` -- Planner agent with existing revision mode (`<revision_mode>` section). The adversary_revision prompt structure can follow the checker revision pattern.
- `agents/gsd-plan-checker.md` -- Checker agent that runs before adversary. Understanding checker's structured issue output helps position adversary as complementary (conceptual vs structural).
- `commands/gsd/new-project.md` -- Phase 3 implementation with working debate loop at lines 870-1042 (requirements) and 1136-1272 (roadmap). Both patterns verified working.
- `get-shit-done/references/planning-config.md` -- Standard adversary config reading block with `CHECKPOINT_NAME="plan"` example. Verbatim copy for Phase 4.
- `get-shit-done/references/ui-brand.md` -- Stage banner format, summary display patterns.
- `.planning/phases/04-plan-integration/04-CONTEXT.md` -- Locked decisions: planner-as-defender, per-plan review, prior plans as context, independent of checker config.
- `.planning/phases/03-new-project-integration/03-01-PLAN.md` -- Phase 3 plan showing the task structure and verification approach that Phase 4 should follow.
- `.planning/phases/03-new-project-integration/03-01-SUMMARY.md` -- Confirms Phase 3 patterns established, debate loop working, ready for reuse.
- `.planning/phases/03-new-project-integration/03-RESEARCH.md` -- Phase 3 research documenting all debate loop patterns, config reading, anti-patterns.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All components are internal to this codebase, created and verified in prior phases
- Architecture: HIGH -- Integration points clearly identified in plan-phase.md, debate loop pattern proven in Phase 3, planner revision mode documented in agent definition
- Pitfalls: HIGH -- Derived from analysis of the plan-phase flow, Phase 3 implementation experience, and the new planner-as-defender pattern

**Research date:** 2026-02-13
**Valid until:** 30 days (stable domain, internal codebase patterns)
