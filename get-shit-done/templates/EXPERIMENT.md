# Experiment Template

Template for `.planning/experiments/[slug].md` — active experiment session tracking.

---

## File Template

```markdown
---
status: planning | researching | executing | verifying | resolved | abandoned
problem: "[brief problem statement]"
root_cause: "[from debug session if applicable]"
debug_session: "[path to debug file if applicable]"
created: [ISO timestamp]
updated: [ISO timestamp]
current_hypothesis: [number]
---

## Problem Context

**What we're trying to fix:**
[Description of the problem]

**Root cause (if known):**
[From debug session or initial analysis]

**Why experimentation needed:**
[Why a simple fix won't work - complexity, unknowns, tradeoffs]

**Success criteria:**
[How we'll know the problem is solved]

## Hypotheses

### Hypothesis 1: [Name]
<!-- Each hypothesis is a complete solution approach -->

**Status:** planning | researching | executing | verifying | passed | failed | abandoned
**Approach:** [What this solution entails]
**Why it might work:** [Reasoning]
**Risks:** [What could go wrong]

#### Research
<!-- What we learned before implementing -->
- [Finding 1]
- [Finding 2]

#### Plan
<!-- Concrete steps to implement -->
1. [Step 1]
2. [Step 2]

#### Execution
<!-- What was actually done -->
- [Action taken]
- [Files changed]

#### Result
<!-- Outcome of verification -->
**Verdict:** passed | failed | partial
**Evidence:** [What we observed]
**Learnings:** [What we learned for future hypotheses]

---

### Hypothesis 2: [Name]
<!-- Add more hypotheses as needed -->

**Status:** pending
**Approach:** [What this solution entails]
**Why it might work:** [Reasoning]
**Risks:** [What could go wrong]

## Learnings
<!-- APPEND only - accumulated knowledge across all hypotheses -->

- hypothesis: [N]
  learned: [insight that applies to future attempts]
  timestamp: [when learned]

## Resolution
<!-- OVERWRITE when experiment concludes -->

successful_hypothesis: [number and name, or null if abandoned]
final_approach: [summary of what worked]
files_changed: []
verification: [how verified]
```

---

<section_rules>

**Frontmatter:**
- `status`: OVERWRITE - reflects overall experiment status
- `problem`: IMMUTABLE - set once at creation
- `root_cause`: IMMUTABLE - from debug session or initial analysis
- `debug_session`: IMMUTABLE - link to originating debug file
- `current_hypothesis`: OVERWRITE - which hypothesis is active

**Problem Context:**
- Written during initialization
- IMMUTABLE after setup complete
- Success criteria guides verification

**Hypotheses:**
- Each hypothesis is a complete section
- APPEND new hypotheses (don't remove old ones)
- OVERWRITE individual hypothesis status and subsections as work progresses
- Never delete failed hypotheses - they contain valuable learnings

**Individual Hypothesis Subsections:**
- Status: OVERWRITE as hypothesis progresses
- Research: APPEND findings during research phase
- Plan: OVERWRITE until execution begins, then IMMUTABLE
- Execution: APPEND actions as they happen
- Result: OVERWRITE when verification completes

**Learnings:**
- APPEND only - never remove entries
- Captures insights that inform subsequent hypotheses
- Prevents repeating mistakes across attempts

**Resolution:**
- OVERWRITE when experiment concludes
- Records which hypothesis worked (or null if abandoned)
- Summary of final solution

</section_rules>

<lifecycle>

**Creation:** When /gsd:experiment is called
- Create file with problem from user input or debug session
- Set status to "planning"
- Initialize first hypothesis

**During hypothesis planning:**
- Fill in approach, reasoning, risks
- Identify research needs
- When ready: hypothesis status → "researching"

**During research:**
- Append research findings
- May spawn gsd-phase-researcher for deep dives
- When ready: hypothesis status → "executing", create plan

**During execution:**
- Follow plan steps
- Append execution actions
- Track files changed
- When complete: hypothesis status → "verifying"

**During verification:**
- Test against success criteria
- Document evidence

**After verification:**
- If passed: hypothesis status → "passed", overall status → "resolved"
- If failed: hypothesis status → "failed", append learnings, move to next hypothesis
- If partial: decide to refine or try different approach

**On abandonment:**
- If all hypotheses exhausted or problem scope changed
- status → "abandoned"
- Document why and any partial progress

</lifecycle>

<resume_behavior>

When Claude reads this file after /clear:

1. Parse frontmatter → know overall status and current hypothesis
2. Read Problem Context → understand what we're solving
3. Read current hypothesis → know exactly what was being tried
4. Read Learnings → avoid repeating failed approaches
5. Continue from current hypothesis status

The file preserves complete experiment history. No work is lost across context resets.

</resume_behavior>

<hypothesis_workflow>

Each hypothesis follows the same mini-workflow:

```
Planning → Research → Execution → Verification
    ↓          ↓           ↓            ↓
 Define    Investigate  Implement    Test
 approach   the space    changes    results
    ↓          ↓           ↓            ↓
                                    Passed? → Done
                                    Failed? → Learn → Next Hypothesis
```

**When to abandon a hypothesis:**
- Research reveals fundamental blocker
- Execution uncovers deal-breaking issues
- Verification shows worse outcome than before

**When to add a new hypothesis:**
- Previous failed but revealed new direction
- User provides additional insight
- Research uncovered alternative approach

</hypothesis_workflow>

<integration>

**From /gsd:debug:**
- Experiment can be started after ROOT CAUSE FOUND
- Inherits root_cause and problem context
- Links back to debug session file

**With /gsd:research-phase:**
- Each hypothesis research phase can spawn researcher agent
- Findings append to hypothesis Research section

**With /gsd:quick:**
- Simple hypotheses can use quick execution
- Still records result in experiment file

</integration>
