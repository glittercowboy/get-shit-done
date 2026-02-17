<purpose>
Consolidated 3-phase workflow: Consensus+Plan → Execute+Gate → Ship.
Reduces agent spawns from 8+ to 2 per phase by combining advisory, planning, execution verification, and quality gates.
Inspired by Weaveto.do's workflow consolidation which achieved 40-50% token savings.

This workflow is triggered when `workflow.consolidated` is true in config.json.
</purpose>

<process>

## Phase 1: Consensus + Plan

A single agent loads advisory skills (if available) and the planner role to produce both CONTEXT.md and PLAN.md files in one pass.

### 1.1 Initialize

```bash
INIT=$(node ~/.claude/get-shit-done/bin/gsd-tools.cjs init plan-phase "${PHASE}" --include state,roadmap,requirements,context,research)
```

Parse JSON for phase details.

### 1.2 Load Skills (if available)

```bash
SKILL_CONTENT=""
for skill_file in .planning/skills/*.md ~/.claude/get-shit-done/templates/skills/*.md; do
  if [ -f "$skill_file" ]; then
    SKILL_CONTENT="$SKILL_CONTENT\n$(cat "$skill_file")"
  fi
done
```

### 1.3 Spawn Consensus+Plan Agent

Display banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► CONSOLIDATED: CONSENSUS + PLAN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase {X}: {Name}
Mode: Consolidated (advisory + planning in one pass)

◆ Spawning consensus+plan agent...
```

```
Task(
  prompt="""
First, read ~/.claude/agents/gsd-planner.md for planning instructions.

You are performing a consolidated consensus + plan pass. You will:
1. Apply advisory perspectives to analyze the phase goal
2. Create CONTEXT.md with acceptance criteria and decisions
3. Create PLAN.md files with executable tasks

<advisory_skills>
{skill_content}
</advisory_skills>

<planning_context>
**Phase:** {phase_number}
**Phase Goal:** {phase_goal}

**Project State:** {state_content}
**Roadmap:** {roadmap_content}
**Requirements:** {requirements_content}
**Research:** {research_content}
**Existing Context:** {context_content}
</planning_context>

<instructions>
**Step 1 — Advisory Consensus:**
- Analyze the phase goal from each loaded skill perspective
- Derive acceptance criteria (Gherkin format if PM skill loaded)
- Identify UX concerns, security flags, quality requirements
- Write {phase_dir}/{padded_phase}-CONTEXT.md with decisions

**Step 2 — Create Plans:**
- Using the context you just created, decompose into executable plans
- Follow all planning rules from gsd-planner.md
- Write {phase_dir}/{phase}-{NN}-PLAN.md files
- Include must_haves, wave assignments, dependency analysis

**Step 3 — Self-Verify:**
- Check your own plans against the 7 verification dimensions
- Fix any issues before returning
- This replaces the separate plan-checker agent

Commit all files when done.
</instructions>
""",
  subagent_type="general-purpose",
  model="{planner_model}",
  description="Consensus+Plan Phase {phase}"
)
```

## Phase 2: Execute + Gate

Standard wave-based execution followed by a ship-readiness gate in the final step.

### 2.1 Execute Plans

Follow the standard execute-phase workflow for plan discovery, wave grouping, and execution.

### 2.2 Ship-Readiness Gate

After all waves complete, instead of spawning a separate verifier, spawn a single gate agent that loads both verifier logic and quality gates:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► SHIP-READINESS GATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

The gate agent:
1. Runs goal-backward verification (from gsd-verifier)
2. Runs quality gate commands (if configured in config.json)
3. Produces a combined VERIFICATION.md
4. Must pass before phase is marked complete

```
Task(
  prompt="""
First, read ~/.claude/agents/gsd-verifier.md for verification instructions.

You are performing a ship-readiness gate — combined verification + quality gates.

**Phase:** {phase_number}
**Phase Goal:** {phase_goal}
**Phase Directory:** {phase_dir}

**Step 1 — Goal-Backward Verification:**
Follow the full verification process from gsd-verifier.md.

**Step 2 — Quality Gates:**
Read config for quality gate commands:
```bash
QG_ENABLED=$(node ~/.claude/get-shit-done/bin/gsd-tools.cjs config-get quality_gates.enabled 2>/dev/null || echo "false")
```

If enabled, run each command and include results in VERIFICATION.md under a "## Quality Gates" section.

**Step 3 — Combined Report:**
Create VERIFICATION.md with both verification results and quality gate results.
Status is only "passed" if BOTH verification and quality gates pass.
""",
  subagent_type="gsd-verifier",
  model="{verifier_model}",
  description="Ship-Readiness Gate Phase {phase}"
)
```

## Phase 3: Ship

The orchestrator handles directly (no agent spawn needed):

1. Mark phase complete:
```bash
node ~/.claude/get-shit-done/bin/gsd-tools.cjs phase complete "${PHASE_NUMBER}"
```

2. Commit metadata:
```bash
node ~/.claude/get-shit-done/bin/gsd-tools.cjs commit "docs(phase-{X}): complete phase execution" --files .planning/ROADMAP.md .planning/STATE.md .planning/REQUIREMENTS.md .planning/phases/{phase_dir}/*-VERIFICATION.md
```

3. Present results and next steps.

</process>

<success_criteria>
- [ ] Advisory consensus + planning done in one agent spawn
- [ ] Plans self-verified (no separate plan-checker agent)
- [ ] Wave-based execution with parallel plans
- [ ] Ship-readiness gate combines verifier + quality gates
- [ ] Phase marked complete
- [ ] Total agent spawns: 2 (consensus+plan, ship-readiness gate) + N executors
  vs standard: 4+ (researcher, planner, checker, executors, verifier)
</success_criteria>
