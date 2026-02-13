# Phase 5: Verification Integration - Research

**Researched:** 2026-02-13
**Domain:** Adversary debate loop integration into /gsd:execute-phase verification step
**Confidence:** HIGH

## Summary

This phase integrates the adversary agent into the verification checkpoint, challenging VERIFICATION.md conclusions after gsd-verifier creates them. The critical research finding is that the adversary hooks into `/gsd:execute-phase` (where VERIFICATION.md is produced), NOT `/gsd:verify-work` (which does manual UAT). The ROADMAP description ("verify-work invokes adversary") is a misnomer -- the actual verification artifact is created by gsd-verifier, spawned at execute-phase step 7.

The adversarial verification checkpoint is NOT redundant with gsd-verifier. They serve fundamentally different roles: the verifier does structural/programmatic verification (does code match the plan?), while the adversary performs meta-review (did the verifier actually verify properly?). The adversary catches blind spots, false positives, and coverage gaps in the verifier's own analysis -- challenges like "you marked this VERIFIED but your evidence only checks existence, not functionality" or "you didn't verify the error handling path."

The implementation follows established patterns from Phase 3 and Phase 4, with one key architectural choice: "verifier-as-defender" (re-spawn gsd-verifier to address adversary challenges), analogous to Phase 4's "planner-as-defender" pattern. The verifier has domain knowledge about verification methodology and is better positioned to re-examine specific conclusions than the orchestrator editing inline.

**Primary recommendation:** Modify `commands/gsd/execute-phase.md`. Insert adversary review between step 7 (verify_phase_goal) and step 8 (update_roadmap). Use verifier-as-defender for BLOCKING challenges. Single-artifact review (one VERIFICATION.md per phase), following the Phase 3 debate loop structure rather than Phase 4's per-plan loop.

## Standard Stack

This is a pure prompt engineering and command orchestration task. No external dependencies.

### Core
| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| `commands/gsd/execute-phase.md` | N/A | Orchestrator to modify | The command containing the verification step |
| `agents/gsd-adversary.md` | N/A | Adversary agent to spawn | Created in Phase 1, verification checkpoint defined |
| `agents/gsd-verifier.md` | N/A | Verifier agent for defense/revision | Existing agent, re-spawned with adversary feedback |
| `get-shit-done/references/planning-config.md` | N/A | Config reading block | Created in Phase 2, provides `node -e` parsing |
| `get-shit-done/references/ui-brand.md` | N/A | UI patterns for banners | Existing GSD standard |

### Supporting
| Component | Version | Purpose | When to Use |
|-----------|---------|---------|-------------|
| Task tool | N/A | Spawning adversary and verifier subagents | Each round of the debate loop |
| Bash tool | N/A | Config reading, file operations | Reading adversary config before spawning |
| `get-shit-done/workflows/execute-phase.md` | N/A | Workflow with verify_phase_goal step | Reference for verification spawning context |
| `get-shit-done/workflows/verify-phase.md` | N/A | Verification workflow details | Reference for verifier behavior and output format |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Verifier-as-defender (re-spawn verifier) | Orchestrator-as-defender (inline editing of VERIFICATION.md) | Verifier has domain knowledge of verification methodology; inline editing would produce lower-quality re-analysis. Follows Phase 4 precedent of specialist-as-defender. Tradeoff: extra Task spawn per revision round. |
| Integration in execute-phase | Integration in verify-work | execute-phase is where VERIFICATION.md is created (step 7). verify-work does UAT (manual testing) and never produces VERIFICATION.md. Integrating in verify-work would mean the adversary has no artifact to challenge. |
| Single-artifact review (one VERIFICATION.md) | Per-section review (each truth separately) | VERIFICATION.md is a single cohesive analysis document. The adversary's verification checkpoint challenges are designed for whole-document review (conclusion validity, blind spots, coverage, false positives). Splitting would lose cross-cutting analysis. |
| Skip adversary during gap-closure re-verification | Run adversary on every verification pass | Gap-closure re-verification validates specific fixes. Adversarial challenge adds friction without proportional value for targeted re-checks. Follows Phase 4 precedent (skip adversary during --gaps). |

## Architecture Patterns

### Critical Finding: Integration Point Correction

The ROADMAP states: "Phase 5: Verification Integration -- Goal: /gsd:verify-work invokes adversary"

**This is incorrect.** The verification checkpoint must go in `/gsd:execute-phase`, not `/gsd:verify-work`. Evidence:

1. **VERIFICATION.md is created by gsd-verifier**, which is spawned at execute-phase step 7 (`verify_phase_goal`)
2. **verify-work does UAT** (manual user acceptance testing) -- it creates UAT.md, not VERIFICATION.md
3. **The adversary agent definition** states: "Verification: After VERIFICATION.md created" -- this happens in execute-phase
4. **The success criteria** state: "Adversary challenges verification conclusions after VERIFICATION.md created" -- confirms the trigger is VERIFICATION.md creation

The requirement INTG-04 ("Adversary challenges verification conclusions in /gsd:verify-work") should be interpreted as "adversary challenges verification conclusions in the verification workflow" -- which lives in execute-phase.

### Current execute-phase Flow (Before Modification)

```
Step 0:    Resolve model profile
Step 1:    Validate phase exists
Step 2:    Discover plans
Step 3:    Group by wave
Step 4:    Execute waves (parallel subagent spawning)
Step 5:    Aggregate results
Step 6:    Commit orchestrator corrections
Step 7:    Verify phase goal (spawn gsd-verifier → VERIFICATION.md)
           Route by status: passed / human_needed / gaps_found
Step 8:    Update roadmap and state
Step 9:    Update requirements
Step 10:   Commit phase completion
Step 11:   Offer next steps
```

### Modified execute-phase Flow (After Modification)

```
Step 0:    (unchanged)
Step 1-6:  (unchanged)
Step 7:    Verify phase goal (spawn gsd-verifier → VERIFICATION.md)
Step 7.5:  *** ADVERSARY REVIEW — VERIFICATION *** (NEW)
           Challenge VERIFICATION.md conclusions
           If BLOCKING: re-spawn verifier to re-examine
           Route by (potentially updated) status: passed / human_needed / gaps_found
Step 8:    Update roadmap and state
Step 9:    Update requirements
Step 10:   Commit phase completion
Step 11:   Offer next steps
```

### Pattern 1: Verification Adversary Debate Loop

**What:** Single-artifact adversary debate loop challenging VERIFICATION.md conclusions, with verifier-as-defender for revision.
**When to use:** After gsd-verifier creates VERIFICATION.md, before status routing and state updates.

```
VERIFICATION ADVERSARY LOOP:
1. Read adversary config for "verification" checkpoint
2. If disabled → skip to status routing
3. If re-verification mode (gap-closure re-run) → skip (same as Phase 4 --gaps skip)
4. Display "GSD > ADVERSARY REVIEW" banner
5. Read VERIFICATION.md content from disk
6. For round = 1 to max_rounds:
   a. Spawn gsd-adversary with VERIFICATION.md content + round + (defense if round > 1)
   b. Parse response: challenges[], convergence recommendation
   c. If convergence == CONVERGE and round > 1 → exit loop
   d. If round < max_rounds and BLOCKING challenges exist:
      - Re-spawn gsd-verifier with adversary challenges
      - Verifier re-examines specific conclusions
      - Verifier updates VERIFICATION.md on disk
      - Build defense text from verifier's re-analysis
   e. If MAJOR/MINOR only: at orchestrator's discretion
   f. Store previous challenges, increment round
7. Display adversary review summary
8. Re-read VERIFICATION.md status (may have changed after re-examination)
9. Route by updated status
```

**Key design point:** The verifier's re-examination may change the VERIFICATION.md status. If the adversary successfully argues that "passed" truths should actually be "failed," the re-verification could downgrade the overall status from `passed` to `gaps_found`. The orchestrator must re-read status after the adversary loop.

### Pattern 2: Verifier-as-Defender (Adapted from Phase 4 Planner-as-Defender)

**What:** Re-spawn gsd-verifier to address adversary challenges by re-examining specific verification conclusions.
**When to use:** When adversary raises BLOCKING challenges against VERIFICATION.md.

Verifier revision spawn:
```markdown
First, read ~/.claude/agents/gsd-verifier.md for your role and instructions.

<revision_context>

**Phase:** {phase_number}
**Phase directory:** {phase_dir}
**Mode:** adversary_revision

**Current VERIFICATION.md:**
{current VERIFICATION.md content from disk}

**Adversary challenges:**
{adversary's full challenge output}

**Challenge handling instructions:**
- BLOCKING: Re-examine the specific truths/artifacts/links challenged. Update conclusions if evidence supports the challenge.
- MAJOR: Re-examine if warranted, note rationale if not.
- MINOR: Note without re-examination (typically).

</revision_context>

<instructions>
Re-examine specific verification conclusions challenged by the adversary.
Focus on the truths/artifacts/links cited in BLOCKING challenges.
Update VERIFICATION.md with revised conclusions where evidence supports the challenge.
Return what changed: which conclusions were revised and why, which challenges were rejected with evidence.
Do NOT re-run full verification. Target only challenged conclusions.
</instructions>
```

```
Task(
  prompt=revision_prompt,
  subagent_type="gsd-verifier",
  model="{verifier_model}",
  description="Re-examine verification conclusions (adversary feedback)"
)
```

**The defense text** is built from the verifier's return:
- Which conclusions were revised (addressed challenges)
- Which conclusions were maintained (rejected challenges with evidence)
- Any status changes (e.g., truth downgraded from VERIFIED to FAILED)

### Pattern 3: Config Reading (Identical to Phase 3/4)

**What:** Standard bash snippet to read adversary settings for the "verification" checkpoint.
**When to use:** Before entering the adversary review loop in execute-phase.

```bash
CHECKPOINT_NAME="verification"
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

Verbatim from `planning-config.md` with `CHECKPOINT_NAME="verification"`.

### Pattern 4: Adversary Spawn for Verification (Adapted from Phase 3)

**What:** Spawn prompt template for the verification checkpoint.
**When to use:** Each round of the debate loop.

Round 1:
```markdown
First, read ~/.claude/agents/gsd-adversary.md for your role and instructions.

<artifact_type>verification</artifact_type>

<artifact_content>
{VERIFICATION.md content read from disk}
</artifact_content>

<round>1</round>
<max_rounds>{EFFECTIVE_MAX_ROUNDS}</max_rounds>

<project_context>
{PROJECT.md summary -- first ~50 lines}
</project_context>
```

Round > 1:
```markdown
First, read ~/.claude/agents/gsd-adversary.md for your role and instructions.

<artifact_type>verification</artifact_type>

<artifact_content>
{Updated VERIFICATION.md content -- re-read from disk after verifier revision}
</artifact_content>

<round>{ROUND}</round>
<max_rounds>{EFFECTIVE_MAX_ROUNDS}</max_rounds>

<defense>
{Defense text built from verifier's re-analysis return}
</defense>

<previous_challenges>
{Adversary's challenges from previous round}
</previous_challenges>

<project_context>
{PROJECT.md summary}
</project_context>
```

### Pattern 5: Adversary Summary Display (Identical to Phase 3)

**What:** How to present adversary review results to the user.
**When to use:** After the verification debate loop completes.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD > ADVERSARY REVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Reviewing verification conclusions...

[After debate completes:]

Adversary review complete

**Challenges:**
- [addressed marker] **[SEVERITY]** {title} -- Addressed: {what changed}
- [noted marker] **[SEVERITY]** {title} -- Noted: {rationale}
- [unresolved marker] **[SEVERITY]** {title} -- Unresolved: {why}
```

### Pattern 6: Status Re-Read After Adversary

**What:** After adversary review may revise VERIFICATION.md, re-read the status for routing.
**When to use:** After the debate loop completes, before status-based routing.

```bash
# Re-read verification status (may have changed after adversary review)
VERIFICATION_STATUS=$(grep "^status:" "$PHASE_DIR"/*-VERIFICATION.md | cut -d: -f2 | tr -d ' ')
```

This is critical: if the adversary successfully challenged VERIFIED truths and the verifier downgraded them, the overall status may change from `passed` to `gaps_found`. The orchestrator must route based on the updated status.

### Anti-Patterns to Avoid

- **Integrating into verify-work.md:** verify-work does UAT (manual user testing with UAT.md). It never creates VERIFICATION.md. The adversary's verification checkpoint challenges VERIFICATION.md conclusions, which are produced by gsd-verifier inside execute-phase. Putting the adversary in verify-work would leave it with nothing to challenge.

- **Orchestrator editing VERIFICATION.md directly:** VERIFICATION.md is a complex analytical document with structured evidence chains (truths, artifacts, links, anti-patterns). The orchestrator lacks verification domain knowledge. Re-spawning gsd-verifier produces higher-quality re-analysis, consistent with Phase 4's planner-as-defender approach.

- **Running adversary on re-verification (gap-closure):** When execute-phase runs verifier again after gap-closure plans, the re-verification targets specific previously-failed items. Adversarial challenge adds friction without proportional value for targeted re-checks. Follow Phase 4 precedent: skip adversary during gap-closure flows.

- **Adversary changing verification status directly:** The adversary challenges conclusions. The verifier decides whether to revise. The orchestrator reads the result. Maintain separation: adversary informs, verifier decides on evidence, orchestrator routes.

- **Placing adversary review after status routing:** The adversary review must happen BETWEEN VERIFICATION.md creation and status-based routing. If placed after routing, adversary-driven changes would be invisible to the routing decision.

- **Blocking on unresolved challenges:** After max rounds, unresolved challenges are noted in the summary but don't prevent proceeding. The status-based routing (to gap closure or continuation) is the natural resolution path.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Config reading | Custom grep/awk extraction | `node -e` reading block from planning-config.md with `CHECKPOINT_NAME="verification"` | Established pattern, handles polymorphic checkpoint values |
| Challenge parsing | Regex parsing of adversary output | Adversary's structured markdown output format | Output format designed for orchestrator consumption in Phase 1 |
| Verification revision | Orchestrator editing VERIFICATION.md inline | Re-spawn gsd-verifier in adversary_revision mode | Verifier has verification domain knowledge; produces evidence-based re-analysis |
| UI banners | Custom formatting | `ui-brand.md` stage banner pattern | Established GSD visual pattern |
| Status re-reading | Cache verification status | Re-read from disk after adversary loop | Verifier re-examination may change status; cached status would be stale |

**Key insight:** Every component this phase needs already exists. The adversary agent, config reading block, debate loop structure, verifier agent, and summary display are all established. The new element is the verifier-as-defender pattern (adapted from Phase 4's planner-as-defender) and the post-loop status re-read.

## Common Pitfalls

### Pitfall 1: Wrong Integration Point (verify-work vs execute-phase)
**What goes wrong:** Adversary is added to verify-work.md, which does UAT, not verification. The adversary has no VERIFICATION.md to challenge.
**Why it happens:** ROADMAP says "verify-work" but the actual verification happens in execute-phase step 7.
**How to avoid:** Verify the artifact creation point. VERIFICATION.md is created by gsd-verifier, spawned at execute-phase step 7. The adversary checkpoint goes in execute-phase, not verify-work.
**Warning signs:** Adversary spawn prompt references UAT.md instead of VERIFICATION.md, or has no artifact to review.

### Pitfall 2: Stale Status After Adversary Review
**What goes wrong:** Orchestrator routes based on the pre-adversary verification status (e.g., "passed"), but the adversary challenged truths and the verifier downgraded them to "failed", making the actual status "gaps_found."
**Why it happens:** Caching the verification status before the adversary loop and not re-reading after.
**How to avoid:** After the adversary debate loop completes, re-read VERIFICATION.md status from disk. Use the updated status for routing decisions (step 7's routing logic).
**Warning signs:** Phase marked as "passed" in ROADMAP.md but VERIFICATION.md shows gaps_found. User sees "Phase complete" but gaps exist.

### Pitfall 3: Verifier Re-Spawn Without Proper Scope
**What goes wrong:** Verifier is re-spawned to address adversary challenges but runs full verification from scratch, consuming excessive time and potentially changing conclusions on items the adversary didn't challenge.
**Why it happens:** Re-spawn prompt doesn't specify targeted re-examination, or verifier's re-verification mode (Step 0) triggers a broader re-check than needed.
**How to avoid:** The adversary_revision prompt must explicitly instruct the verifier to target only the challenged conclusions. Include the specific truths/artifacts/links cited in BLOCKING challenges. Instruct "Do NOT re-run full verification. Target only challenged conclusions."
**Warning signs:** Verifier re-spawn takes as long as initial verification, or previously-passing truths flip to failing without adversary challenge.

### Pitfall 4: Adversary Running During Gap-Closure Re-Verification
**What goes wrong:** After gap-closure plans execute, the verifier re-runs (checking if fixes worked). If the adversary also runs, it adds a full debate loop on what should be a quick targeted re-check.
**Why it happens:** No check for re-verification mode before entering the adversary loop.
**How to avoid:** Detect re-verification context. If this is a gap-closure re-verification (VERIFICATION.md already existed with gaps, now checking if they're closed), skip the adversary review. Check for re_verification metadata in VERIFICATION.md or track gap-closure state in the orchestrator.
**Warning signs:** Multi-round adversary debate after a simple gap-closure fix, adding latency and tokens for minimal value.

### Pitfall 5: Adversary Context Starvation
**What goes wrong:** Adversary receives VERIFICATION.md content but not enough project context to generate meaningful challenges. Challenges become generic ("more testing needed") instead of specific.
**Why it happens:** Passing VERIFICATION.md without PROJECT.md context or phase goal information.
**How to avoid:** Include `<project_context>` with PROJECT.md excerpt in every adversary spawn. The adversary needs to understand the project's goals and constraints to challenge whether verification was thorough enough.
**Warning signs:** Challenges are generic and could apply to any verification report, no project-specific concerns raised.

### Pitfall 6: Defense That Doesn't Provide Evidence
**What goes wrong:** Verifier's re-analysis returns "I re-examined and conclusions stand" without providing new evidence. Adversary repeats same challenges.
**Why it happens:** Treating defense as a formality rather than a substantive re-examination with evidence.
**How to avoid:** Verifier's revision return must include specific evidence: "Re-examined truth X: found 15 call sites to function Y (previously counted 3), confirming WIRED status" or "Downgraded truth Z to FAILED: error path at line 42 returns hardcoded response, not dynamic data." The defense must reference concrete code evidence.
**Warning signs:** Adversary repeats same challenges across rounds, defense paragraphs are vague.

### Pitfall 7: CONV-01 Hard Cap Not Enforced
**What goes wrong:** User configures max_rounds=5 but CONV-01 requires termination after max 3 rounds.
**Why it happens:** Using configured max_rounds directly without applying the hard cap.
**How to avoid:** Apply `Math.min(configuredMaxRounds, 3)` when computing effective max rounds. Same pattern as Phase 3 and Phase 4.
**Warning signs:** Debates running more than 3 rounds.

## Code Examples

### Adversary Review Integration Point (After Step 7)

Insert as Step 7.5 in `commands/gsd/execute-phase.md`, between the verification step (step 7) and the roadmap/state update (step 8). The adversary review must run BEFORE status routing, because the adversary may cause re-examination that changes the verification status.

```markdown
## 7.5. Adversary Review -- Verification

**Read adversary config:**

```bash
CHECKPOINT_NAME="verification"
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

**Skip logic:**

- If `CHECKPOINT_ENABLED = "false"`: Skip to status routing.
- If re-verification mode (verifier's VERIFICATION.md has `re_verification:` metadata): Skip. Adversary review adds friction without proportional value for gap-closure re-checks.
- If verification status is already `gaps_found`: Skip. Adversary challenges conclusions -- if the verifier already found gaps, the adversary's job is done. The gaps speak for themselves.

**If CHECKPOINT_ENABLED = "true" AND initial verification AND status is "passed" or "human_needed":**

Display banner:
```
GSD > ADVERSARY REVIEW

Reviewing verification conclusions...
```

**Debate loop:**

Initialize: `ROUND=1`, `CONVERGED=false`, `VERIFICATION_REVISED=false`

While ROUND <= EFFECTIVE_MAX_ROUNDS AND not CONVERGED:

1. Read artifact from disk:
   ```bash
   ARTIFACT_CONTENT=$(cat "$PHASE_DIR"/*-VERIFICATION.md)
   PROJECT_CONTEXT=$(head -50 .planning/PROJECT.md)
   ```

2. Spawn adversary (round 1 or round > 1 as per Pattern 4)

3. Parse adversary response: challenges[], convergence

4. If CONVERGE and ROUND > 1: set CONVERGED=true, break

5. If ROUND < EFFECTIVE_MAX_ROUNDS and BLOCKING challenges:
   - Re-spawn gsd-verifier in adversary_revision mode (Pattern 2)
   - Build DEFENSE from verifier's return
   - Set VERIFICATION_REVISED=true

6. If MAJOR/MINOR only: at orchestrator's discretion

7. Store PREV_CHALLENGES, increment ROUND

**After loop:**

Display adversary review summary.

**Re-read status (critical):**

```bash
VERIFICATION_STATUS=$(grep "^status:" "$PHASE_DIR"/*-VERIFICATION.md | cut -d: -f2 | tr -d ' ')
```

Route by VERIFICATION_STATUS (may have changed from "passed" to "gaps_found" during adversary review).
```

### Model Table Addition

Add to Step 0 model lookup table in `execute-phase.md`:

```markdown
| Agent | quality | balanced | budget |
|-------|---------|----------|--------|
| gsd-executor | opus | sonnet | sonnet |
| gsd-verifier | sonnet | sonnet | haiku |
| gsd-adversary | sonnet | sonnet | haiku |    <-- NEW
```

### Updated Completion Banner

Add adversary mention to the step 11 offer_next:

```
GSD > PHASE {Z} COMPLETE

**Phase {Z}: {Name}**

{Y} plans executed
Goal verified [checkmark]
Adversary reviewed: verification    <-- NEW (only if adversary ran)
```

## Redundancy Analysis: Adversary vs Verifier

The ROADMAP research note asks: "Evaluate during implementation whether adversarial verification adds unique value or is redundant."

**Conclusion: NOT redundant. Adds unique value.**

| Dimension | gsd-verifier | gsd-adversary (verification checkpoint) |
|-----------|-------------|------------------------------------------|
| **What it checks** | Does code match the plan? (structural) | Did the verifier check properly? (meta-review) |
| **Perspective** | Bottom-up: code -> truths | Top-down: conclusions -> evidence quality |
| **Method** | grep, file checks, line counts, wiring analysis | Challenge conclusion validity, find blind spots |
| **Output** | VERIFICATION.md with truth/artifact/link status | Challenges to verification conclusions |
| **Analogy** | QA engineer running test cases | Security auditor reviewing QA's test plan |
| **Catches** | Stubs, missing files, unwired components | False positives, insufficient evidence, coverage gaps |
| **Misses** | Edge cases, error paths, dynamic behavior | Structural issues (handled by verifier) |

**Examples of unique adversary value at verification checkpoint:**

1. **False positive detection:** Verifier marks truth VERIFIED because file exists and has exports. Adversary challenges: "Evidence shows existence and exports but doesn't verify the function is actually called with correct arguments. File could be an orphaned stub."

2. **Blind spot identification:** Verifier checks happy-path truths. Adversary challenges: "No error handling verification. What happens when the API returns 500? The phase goal implies reliability, but verification didn't check error paths."

3. **Coverage gap detection:** Phase has 5 success criteria. Verifier derives 3 truths. Adversary challenges: "Success criterion 4 ('User can undo changes') has no corresponding truth in verification. Was this deliberately omitted or overlooked?"

4. **Evidence quality challenge:** Verifier marks wiring as VERIFIED because import statement found. Adversary challenges: "Import exists but the imported function is called in a try-catch that swallows errors. The wiring technically exists but doesn't propagate failures."

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Verification conclusions accepted at face value | Adversary challenges verification before status routing | Phase 5 (this work) | False positives and blind spots caught before phase marked complete |
| Fixed verification status after verifier returns | Status may change during adversary review (re-read required) | Phase 5 (this work) | More accurate phase completion decisions |

## Open Questions

### 1. Skip Adversary When Verification Already Found Gaps?
- **What we know:** When verification status is `gaps_found`, the verifier already identified problems. The adversary's role is to catch when the verifier misses problems. If the verifier found problems, the adversary's "nothing is perfect" minimum challenge could be satisfied by the existing gaps.
- **What's unclear:** Should the adversary still run when verification already found gaps? It could find additional gaps the verifier missed, or challenge the verifier's gap analysis itself.
- **Recommendation:** Skip adversary when status is `gaps_found`. The gap closure workflow will run full verification again later, providing another opportunity for adversary review on the re-verification (which would be an initial verification on the updated code). This avoids adding latency to an already-failing phase. If the verifier found gaps, the user needs to fix them regardless of what the adversary might add.

### 2. How to Detect Gap-Closure Re-Verification
- **What we know:** When execute-phase runs after gap-closure plans, the verifier runs again. The adversary should skip this re-verification. VERIFICATION.md has a `re_verification:` metadata block when it's a re-check.
- **What's unclear:** Is checking `re_verification:` in VERIFICATION.md sufficient, or should the orchestrator track this separately (e.g., via a flag)?
- **Recommendation:** Check for `re_verification:` metadata in VERIFICATION.md frontmatter. The verifier already sets this when a previous VERIFICATION.md existed with gaps. This is reliable and requires no additional orchestrator state.

### 3. Commit Handling for Adversary-Revised VERIFICATION.md
- **What we know:** VERIFICATION.md is not committed by the verifier (it returns to orchestrator, which bundles in the phase completion commit at step 10). If the adversary causes re-examination, VERIFICATION.md is updated on disk but not yet committed.
- **What's unclear:** Should adversary-revised VERIFICATION.md get its own commit, or be bundled in the existing phase completion commit?
- **Recommendation:** Bundle in the existing phase completion commit (step 10). The execute-phase commit at step 10 already stages VERIFICATION.md. No separate commit needed because there's no pre-adversary commit to preserve (unlike Phase 3 where REQUIREMENTS.md was committed before adversary review). The adversary review happens between verification and commit, so the committed version naturally includes adversary-influenced revisions.

### 4. Interaction with human_needed Status
- **What we know:** Verification status `human_needed` means automated checks passed but human testing is required. The adversary could challenge whether the automated checks were thorough enough.
- **What's unclear:** Should the adversary review happen before or after human verification? If after, the adversary has both automated and human results. If before, only automated.
- **Recommendation:** Run adversary before human verification (immediately after verifier returns). The adversary reviews the verifier's analysis quality, not human test results. The adversary might identify blind spots that should be ADDED to the human verification checklist. This way, the user's manual testing is informed by both the verifier and the adversary.

## Files That Need Modification

| File | Change | Priority |
|------|--------|----------|
| `commands/gsd/execute-phase.md` | Add adversary model to lookup table in step 0 | HIGH -- needed for spawning |
| `commands/gsd/execute-phase.md` | Add `planning-config.md` to execution_context | MEDIUM -- reference for config reading |
| `commands/gsd/execute-phase.md` | Insert step 7.5: verification adversary review with debate loop | HIGH -- the core of this phase |
| `commands/gsd/execute-phase.md` | Update step 7 to NOT route immediately; route after step 7.5 | HIGH -- status may change during adversary review |
| `commands/gsd/execute-phase.md` | Update step 11 offer_next with adversary mention | LOW -- cosmetic |
| `commands/gsd/execute-phase.md` | Update success_criteria with adversary verification items | LOW -- completeness |
| `get-shit-done/workflows/execute-phase.md` | Update verify_phase_goal step to note adversary review follows | LOW -- documentation |

**Only one command file is modified: `commands/gsd/execute-phase.md`.** The workflow file update is documentation-only.

## Sources

### Primary (HIGH confidence)
- `commands/gsd/execute-phase.md` -- The orchestrator being modified. Full flow with step 7 (verify_phase_goal) integration point identified. Steps 7-11 examined for adversary insertion. gsd-verifier spawned at step 7, VERIFICATION.md committed at step 10.
- `agents/gsd-verifier.md` -- Verifier agent definition with goal-backward verification process, three-level artifact checking, re-verification mode (Step 0), structured output format (VERIFICATION.md with frontmatter status/gaps), and "DO NOT COMMIT" instruction confirming orchestrator handles commits.
- `agents/gsd-adversary.md` -- Adversary agent definition with verification checkpoint challenge categories (conclusion validity, blind spots, coverage, false positives). Input format and structured output format confirmed.
- `get-shit-done/references/planning-config.md` -- Standard adversary config reading block with checkpoint names including "verification." Verified working in Phase 3 and Phase 4.
- `get-shit-done/workflows/verify-phase.md` -- Verification workflow details confirming verifier is spawned from execute-phase, not verify-work.
- `get-shit-done/workflows/execute-phase.md` -- Execute-phase workflow with verify_phase_goal step showing verifier spawn and status routing.
- `commands/gsd/verify-work.md` -- UAT command. Confirmed: creates UAT.md, does manual testing, spawns debug agents for issues. Does NOT create VERIFICATION.md. Does NOT spawn gsd-verifier.

### Secondary (HIGH confidence)
- `commands/gsd/new-project.md` -- Phase 3 implementation with working debate loop. Debate loop structure at Phase 7.5/8.5 confirmed as reusable pattern. Orchestrator-as-defender pattern documented.
- `commands/gsd/plan-phase.md` -- Phase 4 implementation with per-plan adversary review and planner-as-defender pattern. Step 12.5 confirmed working. Planner-as-defender pattern documented as precedent for verifier-as-defender.
- `.planning/phases/03-new-project-integration/03-RESEARCH.md` -- Phase 3 research documenting debate loop patterns, config reading, summary display, anti-patterns.
- `.planning/phases/04-plan-integration/04-RESEARCH.md` -- Phase 4 research documenting planner-as-defender pattern, per-plan loop, skip logic for --gaps mode.
- `.planning/phases/04-plan-integration/04-VERIFICATION.md` -- Example of VERIFICATION.md format: frontmatter with status/score, observable truths table, artifact verification, key links, requirements coverage, anti-patterns, human verification, gaps summary.
- `.planning/ROADMAP.md` -- Phase 5 definition, success criteria, research note about redundancy.
- `.planning/REQUIREMENTS.md` -- INTG-04 requirement confirmed pending.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All components are internal to this codebase, created and verified in prior phases
- Architecture: HIGH -- Integration point clearly identified in execute-phase.md, debate loop and defender patterns proven in Phases 3-4, verifier agent interface fully specified
- Pitfalls: HIGH -- Derived from analysis of the execute-phase flow, verification lifecycle, and prior phase implementation experience
- Redundancy analysis: HIGH -- Based on direct comparison of verifier and adversary agent definitions, their respective challenge categories, and their position in the workflow

**Research date:** 2026-02-13
**Valid until:** 30 days (stable domain, internal codebase patterns)
