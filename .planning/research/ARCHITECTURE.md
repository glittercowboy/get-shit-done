# Architecture: Adversarial Agent Integration

**Domain:** GSD meta-prompting system extension
**Researched:** 2026-01-31
**Overall Confidence:** HIGH (based on existing codebase patterns + industry best practices)

## Executive Summary

The adversarial agent integrates as a **parallel verification layer** within the existing orchestrator-agent architecture. It follows the same spawning pattern as `gsd-plan-checker` and `gsd-verifier` but with a distinct role: **oppositional review** rather than structural validation.

Key architectural insight: The adversary is NOT a replacement for existing verification agents. It complements them by challenging assumptions and feasibility, while they verify completeness and structure. Both patterns coexist.

## Where Adversary Fits in Existing Layers

### Layer Placement

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER-FACING LAYER (Commands)                  │
│   /gsd:new-project   /gsd:plan-phase   /gsd:execute-phase       │
└────────────────────────────┬────────────────────────────────────┘
                             │ spawns via Task()
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ORCHESTRATION LAYER (Workflows)               │
│   Manages debate loop, collects responses, enforces max rounds   │
│   NEW: Debate coordination logic in workflow files               │
└────────────────────────────┬────────────────────────────────────┘
                             │ spawns
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUBAGENT LAYER (Agents)                       │
│                                                                  │
│   EXISTING:              NEW:                EXISTING:           │
│   ┌──────────────┐      ┌──────────────┐    ┌──────────────┐    │
│   │ gsd-planner  │      │ gsd-adversary│    │ gsd-verifier │    │
│   │ gsd-researcher│     │              │    │ gsd-plan-    │    │
│   │ gsd-executor │      │ (oppositional│    │   checker    │    │
│   │ gsd-roadmapper│     │   review)    │    │              │    │
│   └──────────────┘      └──────────────┘    └──────────────┘    │
│                                                                  │
│   Creates artifacts      Challenges         Validates structure  │
│                          assumptions                              │
└─────────────────────────────────────────────────────────────────┘
```

### Relationship to Existing Verification Agents

| Agent | Role | When | What it Checks |
|-------|------|------|----------------|
| `gsd-plan-checker` | Structural validation | After PLAN.md created | Task completeness, dependencies, scope |
| `gsd-verifier` | Post-execution validation | After phase execution | Artifacts exist, are substantive, are wired |
| `gsd-adversary` (NEW) | Oppositional review | At 4 checkpoints | Assumptions, feasibility, completeness of THINKING |

**Critical distinction**:
- Plan-checker asks "Is this plan complete?"
- Verifier asks "Did we build what we planned?"
- Adversary asks "Should we be building this at all? Are we missing something fundamental?"

## Data Flow for Debate Loop

### Sequence Diagram

```
Command (Orchestrator)           Adversary Agent          Claude (in Command)
         │                              │                        │
         │  ──────────────────────────▶ │                        │
         │     Task(artifact, type,     │                        │
         │          round=1)            │                        │
         │                              │                        │
         │  ◀────────────────────────── │                        │
         │     Challenges[] OR          │                        │
         │     "no objections"          │                        │
         │                              │                        │
         │  ───────────────────────────────────────────────────▶ │
         │     (if challenges)                                   │
         │     Present challenges,                               │
         │     formulate defense                                 │
         │                              │                        │
         │  ◀─────────────────────────────────────────────────── │
         │     Defense + revised artifact                        │
         │                              │                        │
         │  ──────────────────────────▶ │                        │
         │     Task(revised_artifact,   │                        │
         │          defense, round=2)   │                        │
         │                              │                        │
    ┌────┴────┐                         │                        │
    │ Loop    │                         │                        │
    │ until   │ ◀──────────────────────▶│◀───────────────────────│
    │ converge│    (max 3 rounds)       │                        │
    │ or max  │                         │                        │
    └────┬────┘                         │                        │
         │                              │                        │
         │  Proceed with artifact                                │
         ▼                              ▼                        ▼
```

### Message Structure

**Command to Adversary (Initial):**
```markdown
<artifact_type>requirements | roadmap | plan | verification</artifact_type>

<artifact>
{Full content of REQUIREMENTS.md, ROADMAP.md, PLAN.md, or VERIFICATION.md}
</artifact>

<project_context>
{PROJECT.md summary - what we're building, constraints, core value}
</project_context>

<round>1</round>
<max_rounds>3</max_rounds>
```

**Command to Adversary (Subsequent rounds):**
```markdown
<artifact_type>requirements</artifact_type>

<artifact>
{Updated artifact content}
</artifact>

<previous_challenges>
{Adversary's challenges from last round}
</previous_challenges>

<defense>
{Claude's defense explaining why challenges were addressed or rejected}
</defense>

<round>2</round>
<max_rounds>3</max_rounds>
```

**Adversary Response (Challenges found):**
```markdown
## CHALLENGES

**Round:** 2/3

### Challenge 1: [Category]
**Concern:** [What's problematic]
**Evidence:** [Why this is a real issue]
**Severity:** critical | significant | minor
**Recommendation:** [What to do about it]

### Challenge 2: [Category]
...

### Defense Assessment

| Previous Challenge | Status | Notes |
|-------------------|--------|-------|
| [Challenge 1] | addressed | [how] |
| [Challenge 2] | rejected | [why rejection is valid/invalid] |
| [Challenge 3] | unaddressed | [still a concern] |

### Convergence Assessment

**Status:** continue | converging | deadlock
**Remaining concerns:** [count]
**Recommendation:** [continue debate | accept with noted risks | escalate to user]
```

**Adversary Response (No objections):**
```markdown
## NO OBJECTIONS

**Round:** 2/3

All challenges from previous round have been adequately addressed.

### Summary
- [Challenge 1]: Addressed by [how]
- [Challenge 2]: Rejected with valid rationale [why]

### Confidence
The artifact is sound. Proceeding is appropriate.
```

## Integration with Existing Commands

### Checkpoint Locations

| Command | Checkpoint | After | Before |
|---------|------------|-------|--------|
| `/gsd:new-project` | Requirements | REQUIREMENTS.md written | Roadmap spawned |
| `/gsd:new-project` | Roadmap | ROADMAP.md written | User approval prompt |
| `/gsd:plan-phase` | Plans | PLAN.md written | Plan-checker spawned |
| `/gsd:execute-phase` or `/gsd:verify-work` | Verification | VERIFICATION.md written | Presenting results |

### Integration Pattern (per command)

**Pattern 1: Sequential (Adversary before existing verification)**
```
Artifact created → Adversary debate → Existing verification → Commit
```
Use for: Requirements, Roadmap (no existing verification agent)

**Pattern 2: Parallel then Sequential (Adversary alongside existing verification)**
```
Artifact created → [Adversary debate] + [Plan-checker] → Merge results → Commit
                         │                    │
                         │ (in parallel)      │
                         ▼                    ▼
```
Use for: Plans (could run adversary and plan-checker in parallel for speed)

**Recommended: Sequential for simplicity**
```
Artifact created → Plan-checker → Adversary debate → Commit
```
This ensures:
1. Structural issues caught first (plan-checker)
2. Then assumptions challenged (adversary)
3. Simpler orchestration logic

### Workflow Additions

Each command's workflow file needs:

```markdown
## N. Adversary Review (Optional)

**Check config:**
```bash
ADVERSARY_ENABLED=$(cat .planning/config.json 2>/dev/null | grep -o '"adversary"[[:space:]]*:[[:space:]]*[^,}]*' | grep -o 'true\|false' || echo "false")
```

**If adversary enabled:**

Initialize debate state:
```
round = 1
max_rounds = 3
challenges = []
```

Display banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► ADVERSARIAL REVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ Challenging [artifact type]...
```

### Debate Loop

```
while round <= max_rounds:
    # Read current artifact
    artifact_content = read(artifact_path)

    # Spawn adversary
    response = Task(
        prompt = adversary_prompt(artifact_content, challenges, defense, round),
        subagent_type = "gsd-adversary",
        model = "{adversary_model}",
        description = "Challenge {artifact_type} (round {round})"
    )

    # Parse response
    if response contains "## NO OBJECTIONS":
        break  # Converged

    # Extract challenges
    new_challenges = parse_challenges(response)

    if round < max_rounds:
        # Claude formulates defense
        defense = formulate_defense(new_challenges, artifact_content)

        # Update artifact if needed
        if defense requires artifact changes:
            update_artifact(artifact_path, changes)

    round += 1

# After loop
if round > max_rounds and challenges remain:
    # Claude makes final decision
    present_unresolved_challenges()
    final_decision = claude_decides(challenges)
    log_decision_to_state()
```
```

## Component Boundaries

### gsd-adversary Agent

**Responsibilities:**
- Receive artifact + type + optional previous defense
- Generate challenges based on artifact type
- Assess previous defense (if provided)
- Return structured challenges or "no objections"

**NOT responsible for:**
- Updating artifacts (command does this)
- Making final decisions (Claude in command does this)
- Blocking workflow (advisory only)

**Boundaries:**
```
IN:  artifact content, type, round number, previous challenges, defense
OUT: new challenges OR "no objections" + assessment
```

### Command (Orchestrator) Responsibilities

**Responsibilities:**
- Check if adversary is enabled in config
- Manage debate loop state (round counter, challenges list)
- Spawn adversary agent with appropriate context
- Present challenges to Claude for defense formulation
- Update artifacts based on defense
- Make final decisions on unresolved challenges
- Log decisions to STATE.md

### Workflow File Responsibilities

**Responsibilities:**
- Define checkpoint location in process flow
- Specify adversary prompt template for artifact type
- Define convergence criteria
- Handle timeout/max rounds

## Challenge Categories by Artifact Type

### Requirements Challenges
- **Completeness**: Are there obvious requirements missing for this type of product?
- **Feasibility**: Can this actually be built with stated constraints?
- **Conflicts**: Do requirements contradict each other?
- **Scope creep**: Are "requirements" actually implementation details?
- **User focus**: Are these framed from user perspective or system perspective?

### Roadmap Challenges
- **Phase ordering**: Does this sequence make sense? Dependencies respected?
- **Scope per phase**: Is any phase too large or too small?
- **Coverage**: Do all requirements map to phases?
- **Risk distribution**: Are risky items front-loaded or buried?
- **Milestone clarity**: Are phase goals testable?

### Plan Challenges
- **Task decomposition**: Are tasks atomic enough? Too granular?
- **Verification gaps**: Can completion be verified objectively?
- **Missing wiring**: Are integrations explicitly planned?
- **Assumption exposure**: What's being assumed about dependencies?
- **Complexity hiding**: Are there "implement X" tasks that hide complexity?

### Verification Challenges
- **Coverage**: Were all must-haves actually checked?
- **False positives**: Could passing checks hide real issues?
- **Human verification**: Are the right things flagged for human review?
- **Regression risk**: Could this pass while breaking something else?

## Build Order Considerations

### Implementation Phases

**Phase 1: Core Agent**
Create `agents/gsd-adversary.md` with:
- Role definition
- Challenge generation logic per artifact type
- Structured return format
- NO integration yet (can test standalone)

**Phase 2: Config Extension**
Update config.json schema to include:
```json
{
  "workflow": {
    "adversary": true|false
  }
}
```
Update `/gsd:new-project` to ask about adversary preference.
Update `/gsd:settings` to toggle adversary.

**Phase 3: new-project Integration**
Add adversary checkpoints to `/gsd:new-project`:
1. After REQUIREMENTS.md (before roadmap)
2. After ROADMAP.md (before user approval)

**Phase 4: plan-phase Integration**
Add adversary checkpoint to `/gsd:plan-phase`:
- After plans created, before/after plan-checker

**Phase 5: verify-work Integration**
Add adversary checkpoint to `/gsd:verify-work`:
- After verification conclusions

**Phase 6: Documentation**
- Update docs/reference/agents.md
- Update docs/reference/commands.md
- Add workflow toggle documentation

### Dependency Graph

```
Phase 1: gsd-adversary.md (standalone)
    │
    ├──▶ Phase 2: config.json schema + settings
    │        │
    │        └──▶ Phase 3: new-project integration
    │                  │
    │                  └──▶ Phase 4: plan-phase integration
    │                            │
    │                            └──▶ Phase 5: verify-work integration
    │
    └──────────────────────────────▶ Phase 6: documentation (can parallel after Phase 1)
```

### Testing Strategy

**Phase 1 Testing (Agent in isolation):**
- Manually spawn agent with test artifacts
- Verify challenge generation for each artifact type
- Verify "no objections" path
- Verify structured return parsing

**Phase 2-5 Testing (Integration):**
- Run full workflow with adversary enabled
- Verify debate loop terminates (convergence or max rounds)
- Verify STATE.md captures decisions
- Verify artifacts updated correctly

## Anti-Patterns to Avoid

### Anti-Pattern 1: Adversary as Blocker
**What:** Requiring adversary approval to proceed
**Why bad:** Creates workflow deadlock, defeats "advisory only" design
**Instead:** Claude always has final say; adversary informs but doesn't block

### Anti-Pattern 2: Infinite Debate
**What:** No convergence criteria or max rounds
**Why bad:** Context exhaustion, user frustration
**Instead:** Max 3 rounds, then Claude decides with logged rationale

### Anti-Pattern 3: Generic Challenges
**What:** Same challenge patterns regardless of artifact type
**Why bad:** Reduces signal quality, wastes rounds
**Instead:** Artifact-specific challenge templates in agent

### Anti-Pattern 4: Challenge Without Evidence
**What:** "This seems wrong" without specifics
**Why bad:** Claude can't formulate defense
**Instead:** Every challenge must include evidence and recommendation

### Anti-Pattern 5: Adversary During Execution
**What:** Spawning adversary while executor is running
**Why bad:** Disrupts atomic commit flow, creates inconsistent state
**Instead:** Adversary only at pre-defined checkpoints between workflow stages

## Model Profile for Adversary

| Profile | Model | Rationale |
|---------|-------|-----------|
| quality | opus | Deep reasoning for complex challenges |
| balanced | sonnet | Good challenge quality, reasonable cost |
| budget | haiku | Quick challenges, lower depth |

**Recommendation:** Start with sonnet (balanced). Adversary needs good reasoning but doesn't need Opus-level depth for most challenges.

## Configuration Schema Extension

```json
{
  "workflow": {
    "research": true,
    "plan_check": true,
    "verifier": true,
    "adversary": false  // NEW - default off for backward compatibility
  },
  "adversary": {        // NEW - adversary-specific settings
    "max_rounds": 3,
    "checkpoints": ["requirements", "roadmap", "plans", "verification"]
  }
}
```

## Sources

- **HIGH confidence**: Existing GSD architecture analysis (`.planning/codebase/ARCHITECTURE.md`)
- **HIGH confidence**: Existing agent patterns (`gsd-plan-checker.md`, `gsd-verifier.md`)
- **HIGH confidence**: Existing command workflows (`plan-phase.md`, `new-project.md`)
- **MEDIUM confidence**: Industry patterns for adversarial review (multi-agent debate, reflection patterns)
- **HIGH confidence**: PROJECT.md requirements for adversary integration

---

*Architecture research: 2026-01-31*
*Researcher: gsd-project-researcher (Architecture dimension)*
