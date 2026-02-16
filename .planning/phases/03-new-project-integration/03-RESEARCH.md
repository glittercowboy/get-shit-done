# Phase 3: New-Project Integration - Research

**Researched:** 2026-02-13
**Domain:** Adversary debate loop integration into /gsd:new-project orchestrator
**Confidence:** HIGH

## Summary

This phase integrates the adversary agent (Phase 1) and its configuration (Phase 2) into the `/gsd:new-project` command at two checkpoints: after REQUIREMENTS.md creation and after ROADMAP.md creation. The core implementation challenge is the debate loop pattern -- an orchestrator-driven multi-round exchange where the adversary challenges, the orchestrator defends/revises, and the loop terminates on convergence or max rounds.

The research domain is entirely internal to this codebase. All integration points, agent interfaces, config reading patterns, and UI conventions are established by prior phases and existing GSD patterns. No external libraries or frameworks are involved. The adversary agent definition (`agents/gsd-adversary.md`) specifies its exact input format and output structure. The config reading block (`get-shit-done/references/planning-config.md`) provides the standard bash snippet for reading checkpoint-level adversary settings.

**Primary recommendation:** Modify only `commands/gsd/new-project.md`. Insert the debate loop after REQUIREMENTS.md commit (Phase 7) and after roadmapper return (Phase 8), both before existing user approval steps. The debate loop is a new reusable pattern that Phase 4 and Phase 5 will copy, so design it for portability.

## Standard Stack

This is a pure prompt engineering and command orchestration task. No external dependencies.

### Core
| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| `commands/gsd/new-project.md` | N/A | Orchestrator to modify | The command being extended |
| `agents/gsd-adversary.md` | N/A | Adversary agent to spawn | Created in Phase 1, ready to consume |
| `get-shit-done/references/planning-config.md` | N/A | Config reading block | Created in Phase 2, provides `node -e` parsing |
| `get-shit-done/references/ui-brand.md` | N/A | UI patterns for banners | Existing GSD standard |

### Supporting
| Component | Version | Purpose | When to Use |
|-----------|---------|---------|-------------|
| Task tool | N/A | Spawning adversary subagent | Each round of the debate loop |
| Write/Edit tool | N/A | Revising artifacts on disk | When defense includes artifact changes |
| Bash tool | N/A | Config reading, file operations | Reading adversary config before spawning |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Orchestrator-as-defender (inline defense) | Separate defender agent | Inline is simpler, no extra agent spawn. Defender is just the orchestrator reasoning about challenges. A separate agent would add tokens and complexity for marginal benefit. |
| Debate loop in new-project.md | Shared workflow file | Inline is clearer for a first implementation. Phase 4 and 5 can extract a shared pattern if needed, but premature extraction risks getting the abstraction wrong. |
| Sequential adversary per artifact | Parallel adversary for requirements + roadmap | Requirements must be reviewed before roadmap creation (roadmap depends on requirements). Sequential is the only correct ordering. |

## Architecture Patterns

### Recommended Integration Points

The adversary hooks into `new-project.md` at exactly two locations:

```
Phase 7: Define Requirements
  └─ Create REQUIREMENTS.md → commit
  └─ *** ADVERSARY CHECKPOINT: requirements ***  ← NEW
  └─ Present full list → user approve/adjust

Phase 8: Create Roadmap
  └─ Spawn roadmapper → writes ROADMAP.md, STATE.md
  └─ *** ADVERSARY CHECKPOINT: roadmap ***  ← NEW
  └─ Present roadmap → user approve/adjust/review
```

### Pattern 1: Debate Loop (Core New Pattern)

**What:** Multi-round adversary challenge loop with orchestrator defense
**When to use:** Every adversary checkpoint in new-project (and later in plan-phase, verify-work)

```
DEBATE LOOP:
1. Read adversary config for checkpoint
2. If disabled → skip
3. Display "GSD > ADVERSARY REVIEW" banner
4. Read artifact content from disk
5. For round = 1 to max_rounds:
   a. Spawn gsd-adversary with artifact + round + (defense if round > 1)
   b. Parse response: challenges[], convergence recommendation
   c. If convergence == CONVERGE and round > 1 → exit loop
   d. If round < max_rounds:
      - For BLOCKING challenges: revise artifact on disk
      - For MAJOR/MINOR: at orchestrator's discretion
      - Build defense text describing what changed and why
   e. If round == max_rounds: note unresolved challenges
6. Build summary (bullet list with addressed/noted markers)
7. Display summary
8. Continue to existing approval step
```

**Key design decisions from CONTEXT.md (locked):**
- BLOCKING challenges always auto-revise the artifact
- MAJOR/MINOR are at Claude's discretion (may revise or just note)
- If max rounds reached with unresolved challenges, proceed with them noted in summary
- Adversary runs once per artifact -- no re-run after user "Adjust"

### Pattern 2: Adversary Spawn Prompt

**What:** The prompt template for spawning gsd-adversary via Task tool
**When to use:** Each round of the debate loop

Round 1 spawn:
```markdown
First, read ~/.claude/agents/gsd-adversary.md for your role and instructions.

<artifact_type>{checkpoint_name}</artifact_type>

<artifact_content>
{full artifact content read from disk}
</artifact_content>

<round>1</round>
<max_rounds>{configured max rounds}</max_rounds>

<project_context>
{PROJECT.md summary -- core value, constraints, scope}
</project_context>
```

Round > 1 spawn (adds defense and previous challenges):
```markdown
First, read ~/.claude/agents/gsd-adversary.md for your role and instructions.

<artifact_type>{checkpoint_name}</artifact_type>

<artifact_content>
{updated artifact content - may have changed since round 1}
</artifact_content>

<round>{N}</round>
<max_rounds>{configured max rounds}</max_rounds>

<defense>
{orchestrator's defense from previous round:
- Which challenges were addressed and how
- Which challenges were rejected and why
- What changed in the artifact}
</defense>

<previous_challenges>
{adversary's challenges from previous round - for reference}
</previous_challenges>

<project_context>
{PROJECT.md summary}
</project_context>
```

### Pattern 3: Config Reading Before Spawn

**What:** Standard bash snippet to read adversary settings for a specific checkpoint
**When to use:** Before entering the debate loop at each checkpoint

```bash
# Read adversary config for requirements checkpoint
CHECKPOINT_NAME="requirements"
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
```

This is verbatim from `planning-config.md` -- the established pattern from Phase 2.

### Pattern 4: Adversary Summary Display

**What:** How to present adversary review results to the user
**When to use:** After debate loop completes, before existing approval step

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► ADVERSARY REVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ Reviewing {requirements|roadmap}...

[After debate completes:]

✓ Adversary review complete

**Challenges:**
- ✓ **[BLOCKING]** {challenge title} — Addressed: {what changed}
- ✓ **[MAJOR]** {challenge title} — Addressed: {what changed}
- ○ **[MINOR]** {challenge title} — Noted: {rationale for not addressing}

{Optional: "Resolved in N rounds."}
```

**When no challenges remain (all addressed):**
```
✓ Adversary review complete — all challenges addressed
```

**When unresolved challenges remain at max rounds:**
```
⚠ Adversary review complete — {N} unresolved challenges noted

**Challenges:**
- ✓ **[BLOCKING]** {title} — Addressed: {what changed}
- ⚠ **[MAJOR]** {title} — Unresolved: {why}
- ○ **[MINOR]** {title} — Noted
```

### Pattern 5: Model Profile for Adversary

**What:** Model selection for adversary agent based on config profile
**When to use:** When spawning adversary via Task tool

Add to the model lookup table in `new-project.md` Phase 5.5:

| Agent | quality | balanced | budget |
|-------|---------|----------|--------|
| gsd-adversary | sonnet | sonnet | haiku |

**Rationale:** The adversary reviews artifacts and generates challenges -- it does not create complex artifacts. Sonnet is sufficient for challenge generation. Budget uses haiku. Opus is unnecessary for this role.

### Anti-Patterns to Avoid

- **Defense as separate agent:** Don't spawn a second agent to generate the defense. The orchestrator (new-project command) is the defender. It reads challenges, applies judgment, revises artifacts, and builds a defense string inline. A separate agent would add cost and latency for no benefit.

- **Adversary modifying artifacts directly:** The adversary only challenges. The orchestrator decides what to change and makes the actual edits. This preserves the advisory-only design.

- **Re-running adversary after user "Adjust":** CONTEXT.md locks this: adversary runs once per artifact. If the user adjusts after seeing the adversary summary, the adjusted version is final.

- **Blocking the workflow on unresolved challenges:** After max rounds, unresolved challenges are noted in the summary but don't prevent proceeding. The user's approval step is the final gate.

- **Adversary reviewing the whole project:** Each checkpoint reviews one artifact. Requirements checkpoint reviews REQUIREMENTS.md only. Roadmap checkpoint reviews ROADMAP.md only. Don't pass both artifacts to one adversary call.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Config reading | Custom grep/awk extraction | `node -e` reading block from planning-config.md | Established pattern, handles polymorphic checkpoint values |
| Challenge parsing | Regex parsing of adversary output | Adversary's structured markdown output format | Output format designed for orchestrator consumption in Phase 1 |
| Artifact revision | Custom diff/patch system | Write/Edit tool to update artifact on disk | Standard GSD file modification pattern |
| UI banners | Custom formatting | `ui-brand.md` stage banner pattern | Established GSD visual pattern |

**Key insight:** Every component this phase needs already exists. The adversary agent is defined, the config reading block is documented, the UI patterns are established. This phase is pure wiring -- connecting existing components with the new debate loop pattern.

## Common Pitfalls

### Pitfall 1: Adversary Context Starvation
**What goes wrong:** Adversary receives only the artifact without enough context to generate meaningful challenges. Challenges become generic ("this could be more detailed") instead of specific.
**Why it happens:** Passing artifact content but not PROJECT.md context (constraints, core value, scope).
**How to avoid:** Always include `<project_context>` in adversary prompts with the relevant PROJECT.md excerpt. The adversary needs to understand the project's constraints to challenge feasibility, completeness, and scope.
**Warning signs:** Challenges are generic, don't reference project-specific constraints, could apply to any project.

### Pitfall 2: Defense That Doesn't Actually Defend
**What goes wrong:** Orchestrator generates a defense that just acknowledges challenges without explaining what changed or why rejections are valid. Adversary then repeats the same challenges.
**Why it happens:** Treating defense as a formality rather than a substantive response.
**How to avoid:** Defense must be specific: "Addressed challenge X by adding requirement Y to section Z" or "Rejected challenge X because PROJECT.md constraint A makes this out of scope." The defense must reference concrete artifact changes or concrete evidence for rejections.
**Warning signs:** Adversary repeats same challenges across rounds, defense is a paragraph of vague agreement.

### Pitfall 3: Artifact Revision Without Re-Reading
**What goes wrong:** Orchestrator revises the artifact in round 1 but passes the old (pre-revision) content to the adversary in round 2. Adversary challenges already-fixed issues.
**Why it happens:** Caching artifact content at the start and not re-reading after revision.
**How to avoid:** Re-read the artifact from disk before each adversary spawn (round > 1). The debate loop should always pass the current-on-disk version of the artifact.
**Warning signs:** Adversary challenges things that were already fixed, debate loops without progress.

### Pitfall 4: Placing Adversary Review After User Approval
**What goes wrong:** Adversary reviews the artifact after the user already approved it, making adversary-driven changes feel like undoing user approval.
**Why it happens:** Inserting the adversary checkpoint at the wrong location in the flow.
**How to avoid:** Adversary review ALWAYS goes before the existing user approval step. User sees: artifact → adversary summary → approve/adjust. Never: artifact → approve → adversary → changes.
**Warning signs:** User approves, then sees changes they didn't approve.

### Pitfall 5: Debate Loop Blocking on Parse Errors
**What goes wrong:** Adversary returns output that doesn't match the expected format, and the orchestrator can't determine convergence recommendation or challenge count. Loop hangs or errors.
**Why it happens:** LLM output is non-deterministic. The adversary might not produce perfectly structured output every time.
**How to avoid:** Parse adversary output gracefully. If convergence recommendation is unclear, default to CONTINUE (safer). If challenge count is unclear, treat the entire response as containing challenges. If output is completely unparseable, treat as 1 round and show raw challenges to user.
**Warning signs:** Debate loop runs all max rounds even when adversary clearly converged, or errors out on unusual output.

### Pitfall 6: Adversary Running on Artifacts It Shouldn't
**What goes wrong:** Adversary challenges REQUIREMENTS.md during the roadmap checkpoint, or vice versa. Challenges are about the wrong artifact.
**Why it happens:** Passing wrong content or wrong checkpoint name in the spawn prompt.
**How to avoid:** Each checkpoint has one artifact. Requirements checkpoint passes REQUIREMENTS.md content with `<artifact_type>requirements</artifact_type>`. Roadmap checkpoint passes ROADMAP.md content with `<artifact_type>roadmap</artifact_type>`. Verify the mapping is correct in the prompt template.
**Warning signs:** Roadmap checkpoint challenges mention requirement scoping or completeness issues that belong in the requirements review.

### Pitfall 7: CONV-01 Hard Cap Not Enforced
**What goes wrong:** User configures max_rounds=5 but CONV-01 requires termination after max 3 rounds. Debate runs 5 rounds.
**Why it happens:** Using configured max_rounds directly without applying the hard cap.
**How to avoid:** Apply `Math.min(configuredMaxRounds, 3)` when computing effective max rounds. The config allows values up to 5 for future phases that may want longer debates, but CONV-01 mandates a system-level cap of 3 for the current implementation.
**Warning signs:** Debates running more than 3 rounds.

## Code Examples

### Debate Loop Integration Point (Requirements)

Insert after the REQUIREMENTS.md commit in Phase 7, before presenting the full list to the user:

```markdown
## Phase 7.5: Adversary Review — Requirements

**Read adversary config:**

```bash
CHECKPOINT_NAME="requirements"
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

**If CHECKPOINT_ENABLED = "true":**

Display banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► ADVERSARY REVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ Reviewing requirements...
```

**Debate loop:**

Initialize: `ROUND=1`, `CONVERGED=false`

While ROUND <= EFFECTIVE_MAX_ROUNDS AND not CONVERGED:

  Read artifact:
  ```bash
  ARTIFACT_CONTENT=$(cat .planning/REQUIREMENTS.md)
  PROJECT_CONTEXT=$(cat .planning/PROJECT.md | head -50)
  ```

  Spawn adversary:
  ```
  Task(prompt="First, read ~/.claude/agents/gsd-adversary.md ...
    <artifact_type>requirements</artifact_type>
    <artifact_content>{ARTIFACT_CONTENT}</artifact_content>
    <round>{ROUND}</round>
    <max_rounds>{EFFECTIVE_MAX_ROUNDS}</max_rounds>
    {if ROUND > 1: <defense>{DEFENSE}</defense>}
    {if ROUND > 1: <previous_challenges>{PREV_CHALLENGES}</previous_challenges>}
    <project_context>{PROJECT_CONTEXT}</project_context>
  ", subagent_type="gsd-adversary", model="{adversary_model}", description="Adversary review: requirements (round {ROUND})")
  ```

  Parse adversary response:
  - Extract challenges (title, severity, concern, evidence, affected)
  - Extract convergence recommendation (CONTINUE/CONVERGE)

  If adversary recommends CONVERGE and ROUND > 1:
    Set CONVERGED=true
    Break

  If ROUND < EFFECTIVE_MAX_ROUNDS:
    Generate defense:
    - For BLOCKING challenges: revise REQUIREMENTS.md on disk
    - For MAJOR: decide case-by-case whether to revise or note
    - For MINOR: note without revision (typically)
    - Build DEFENSE text describing changes and rejections
    Store: PREV_CHALLENGES = adversary's challenges this round

  ROUND += 1

Display summary (using Pattern 4 format)

**If CHECKPOINT_ENABLED = "false":** Skip entirely.
```

### Adversary Model Lookup Addition

```markdown
| Agent | quality | balanced | budget |
|-------|---------|----------|--------|
| gsd-project-researcher | opus | sonnet | haiku |
| gsd-research-synthesizer | sonnet | sonnet | haiku |
| gsd-roadmapper | opus | sonnet | sonnet |
| gsd-adversary | sonnet | sonnet | haiku |    ← NEW
```

### Completion Banner Update

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► PROJECT INITIALIZED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**[Project Name]**

| Artifact       | Location                    |
|----------------|-----------------------------|
| Project        | `.planning/PROJECT.md`      |
| Config         | `.planning/config.json`     |
| Research       | `.planning/research/`       |
| Requirements   | `.planning/REQUIREMENTS.md` |
| Roadmap        | `.planning/ROADMAP.md`      |

**[N] phases** | **[X] requirements** | Ready to build ✓
Adversary reviewed: {list of checkpoints that ran, e.g., "requirements, roadmap"}    ← NEW (only if adversary ran)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No adversary review | Debate loop at two checkpoints | Phase 3 (this work) | Requirements and roadmaps get challenged before user approval |
| Orchestrator passes artifacts directly to user | Orchestrator defends artifacts, user sees improved version | Phase 3 (this work) | User sees artifacts that have already been stress-tested |

## Open Questions

### 1. Defense Granularity for MAJOR Challenges
- **What we know:** BLOCKING always revises. MINOR typically notes without revision. MAJOR is case-by-case per CONTEXT.md (Claude's discretion).
- **What's unclear:** Should the orchestrator have heuristics for when to revise vs note MAJOR challenges? Or truly leave it to Claude's judgment each time?
- **Recommendation:** Leave it to Claude's judgment per CONTEXT.md. The orchestrator should evaluate each MAJOR challenge against the project context and decide. Heuristics would add complexity without clear benefit. Trust the orchestrator's reasoning.

### 2. What Gets Re-Committed After Revision
- **What we know:** REQUIREMENTS.md and ROADMAP.md are committed before the adversary runs. The adversary may cause revisions.
- **What's unclear:** Should revised artifacts get a separate commit, or should the revision amend the original commit?
- **Recommendation:** Create a separate commit after revision with a message like `docs: incorporate adversary review feedback`. Don't amend -- the original commit preserves the pre-adversary state for comparison. This also avoids git complexity.

### 3. Roadmapper Agent Interaction
- **What we know:** The roadmapper agent writes ROADMAP.md, STATE.md, and updates REQUIREMENTS.md traceability. The adversary reviews ROADMAP.md only.
- **What's unclear:** If adversary challenges cause roadmap revisions (e.g., reorder phases), should we re-run the roadmapper or edit ROADMAP.md directly?
- **Recommendation:** Edit ROADMAP.md directly (orchestrator makes targeted changes). Re-running the roadmapper would be expensive and would require the full spawn cycle. If revisions are substantial enough to warrant re-creation, the user's "Adjust phases" option handles that. The adversary's role is to catch issues, not trigger full re-planning.

### 4. Adversary Reviewing Requirements vs Roadmap Interaction
- **What we know:** Requirements are reviewed first, then roadmap. Roadmap depends on requirements.
- **What's unclear:** If the adversary causes requirement changes, should the roadmapper receive the updated requirements? (It should, since it runs after.)
- **Recommendation:** Yes, this happens naturally. The flow is: create requirements → adversary reviews requirements → revise requirements → user approves → spawn roadmapper (with revised requirements) → adversary reviews roadmap. The roadmapper already receives the latest requirements from disk.

## Files That Need Modification

| File | Change | Priority |
|------|--------|----------|
| `commands/gsd/new-project.md` | Add debate loop after Phase 7 (requirements) and Phase 8 (roadmap) | HIGH -- the entire phase |
| `commands/gsd/new-project.md` | Add gsd-adversary to model lookup table in Phase 5.5 | HIGH -- needed for spawning |
| `commands/gsd/new-project.md` | Update Phase 10 completion banner to mention adversary | LOW -- cosmetic |
| `commands/gsd/new-project.md` | Add `@~/.claude/get-shit-done/references/planning-config.md` to execution_context | MEDIUM -- reference for config reading |

**Only one file is modified.** This is entirely a wiring task within the existing orchestrator.

## Sources

### Primary (HIGH confidence)
- `commands/gsd/new-project.md` -- The orchestrator being modified. Full flow with Phase 7 (requirements) and Phase 8 (roadmap) integration points identified.
- `agents/gsd-adversary.md` -- Adversary agent definition with exact input format (`<artifact_type>`, `<artifact_content>`, `<round>`, `<max_rounds>`, `<defense>`, `<previous_challenges>`, `<project_context>`) and structured output format (`## ADVERSARY CHALLENGES`).
- `get-shit-done/references/planning-config.md` -- Standard adversary config reading block (`node -e` pattern), verified working.
- `get-shit-done/references/ui-brand.md` -- Stage banner format (`GSD > {STAGE NAME}`).
- `.planning/phases/03-new-project-integration/03-CONTEXT.md` -- Locked decisions: BLOCKING auto-revise, MAJOR at discretion, once per artifact, no skip option, clean artifacts, summary before approval.

### Secondary (HIGH confidence)
- `.planning/phases/01-core-agent/01-RESEARCH.md` -- Phase 1 research establishing adversary patterns.
- `.planning/phases/02-configuration/02-RESEARCH.md` -- Phase 2 research establishing config patterns.
- `.planning/phases/01-core-agent/01-01-SUMMARY.md` -- Confirms agent definition is complete.
- `.planning/phases/02-configuration/02-02-SUMMARY.md` -- Confirms config wiring is complete.
- `commands/gsd/plan-phase.md` -- Existing orchestrator pattern: agent spawn, handle return, revision loop (step 12). Reference for debate loop design.
- `commands/gsd/settings.md` -- Confirms adversary settings UI is in place.
- `.planning/REQUIREMENTS.md` -- Phase 3 covers INTG-01, INTG-02, CONV-01.
- `.planning/ROADMAP.md` -- Phase 3 success criteria confirmed.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All components are internal to this codebase, created in prior phases
- Architecture: HIGH -- Integration points clearly identified in new-project.md, adversary agent interface fully specified
- Pitfalls: HIGH -- Derived from analysis of the actual orchestrator flow, config patterns, and adversary agent behavior

**Research date:** 2026-02-13
**Valid until:** 30 days (stable domain, internal codebase patterns)
