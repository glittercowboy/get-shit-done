---
name: gsd:experiment
description: Hypothesis-driven experimentation when fix needs exploration
argument-hint: "[problem description]"
allowed-tools:
  - Read
  - Bash
  - Task
  - AskUserQuestion
  - Write
---

<objective>
Run structured experiments to find solutions when the fix is not obvious.

**Orchestrator role:** Gather problem context, manage hypothesis lifecycle, handle checkpoints, spawn experimenter agents.

**When to use:**
- Root cause is known but fix requires trying multiple approaches
- Problem is complex with multiple valid solutions to evaluate
- Each solution attempt needs research → plan → execute → verify

**Why subagent:** Each hypothesis may require deep research and execution. Fresh 200k context per hypothesis keeps investigations focused.
</objective>

<context>
User's problem: $ARGUMENTS

Check for active experiments:
```bash
ls .planning/experiments/*.md 2>/dev/null | head -5
```

Check for originating debug session:
```bash
ls .planning/debug/*.md 2>/dev/null | head -5
```
</context>

<process>

## 0. Resolve Model Profile

Read model profile for agent spawning:

```bash
MODEL_PROFILE=$(cat .planning/config.json 2>/dev/null | grep -o '"model_profile"[[:space:]]*:[[:space:]]*"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"' || echo "balanced")
```

**Model lookup table:**

| Agent | quality | balanced | budget |
|-------|---------|----------|--------|
| gsd-experimenter | opus | sonnet | sonnet |

## 1. Check Active Experiments

If experiments exist AND no $ARGUMENTS:
- List experiments with status, current hypothesis, problem summary
- User picks number to resume OR describes new problem

If $ARGUMENTS provided OR user describes new problem:
- Continue to problem gathering

## 2. Gather Problem Context

**If coming from /gsd:debug** (debug session provided):
- Read debug file for root cause and symptoms
- Confirm: "Debug session found. Use this as the problem context?"
- If yes: Import root cause, problem description, link to debug file

**If standalone** (no debug session):

Use AskUserQuestion for each:

1. **Problem description** - What are you trying to fix/achieve?
2. **Root cause (if known)** - Do you know why it's happening?
3. **Why experimentation** - Why isn't the fix obvious?
4. **Success criteria** - How will you know it's fixed?
5. **Initial hypothesis (optional)** - Any ideas for first approach?

## 3. Create Experiment File

Generate slug from problem description.

Create `.planning/experiments/{slug}.md`:

```markdown
---
status: planning
problem: "{problem description}"
root_cause: "{root cause or 'Unknown'}"
debug_session: "{path to debug file or null}"
created: {ISO timestamp}
updated: {ISO timestamp}
current_hypothesis: 1
---

## Problem Context

**What we're trying to fix:**
{problem description}

**Root cause (if known):**
{root cause}

**Why experimentation needed:**
{why not obvious}

**Success criteria:**
{success criteria}

## Hypotheses

### Hypothesis 1: {initial approach or "To be defined"}

**Status:** planning
**Approach:** {if user provided initial hypothesis}
**Why it might work:**
**Risks:**

## Learnings

## Resolution
```

Commit the experiment file:
```bash
git add .planning/experiments/{slug}.md
git commit -m "experiment: start {slug}"
```

## 4. Spawn gsd-experimenter Agent

Fill prompt and spawn:

```markdown
<objective>
Run experiment: {slug}

**Problem:** {problem description}
**Success Criteria:** {success criteria}
</objective>

<experiment_file>
Path: .planning/experiments/{slug}.md
</experiment_file>

<mode>
Start from current hypothesis status.
</mode>
```

```
Task(
  prompt=filled_prompt,
  subagent_type="gsd-experimenter",
  model="{experimenter_model}",
  description="Experiment {slug}"
)
```

## 5. Handle Agent Return

**If `## HYPOTHESIS PASSED`:**
- Display solution summary
- Confirm experiment resolved
- Offer: "Run another experiment?" or "Done"

**If `## HYPOTHESIS FAILED`:**
- Display what failed and learnings
- Offer options:
  - "Try next hypothesis" - gather hypothesis idea, spawn new agent
  - "I have an idea" - user provides direction
  - "Abandon experiment" - mark as abandoned

**If `## CHECKPOINT REACHED`:**
- Present checkpoint details to user
- Get user response
- Spawn continuation agent (see step 6)

**If `## EXPERIMENT ABANDONED`:**
- Display summary and recommendations
- Confirm closure
- Offer: "Start fresh experiment?" or "Done"

## 6. Spawn Continuation Agent (After Checkpoint or New Hypothesis)

When user responds to checkpoint or provides new hypothesis direction:

```markdown
<objective>
Continue experiment: {slug}
</objective>

<experiment_file>
Path: .planning/experiments/{slug}.md
</experiment_file>

<continuation>
**Type:** {checkpoint_response | new_hypothesis}
**Content:** {user response or new hypothesis direction}
</continuation>
```

```
Task(
  prompt=continuation_prompt,
  subagent_type="gsd-experimenter",
  model="{experimenter_model}",
  description="Continue experiment {slug}"
)
```

## 7. Hypothesis Loop

After each hypothesis completes (passed or failed):

**If passed:**
- Experiment complete
- Show summary, exit

**If failed:**
- Show learnings
- Ask: "What should we try next?"
- Options:
  1. User provides next hypothesis idea
  2. Agent suggests based on learnings (spawn with "suggest next" mode)
  3. Abandon experiment

**If user provides idea:**
- Add new hypothesis to experiment file
- Spawn agent to execute it

**If agent suggests:**
- Spawn agent in suggestion mode
- Agent returns hypothesis proposal
- User approves or modifies
- Continue to execution

</process>

<integration>

## From /gsd:debug

When debug finds root cause and user chooses "Experiment with fixes":

1. Debug orchestrator calls `/gsd:experiment` with debug context
2. Experiment imports:
   - Problem from debug symptoms
   - Root cause from debug resolution
   - Link to debug session file
3. User confirms and provides success criteria
4. Experiment begins

## Back to /gsd:debug

If during experimentation you discover the root cause was wrong:

1. Return to orchestrator with "Root cause incorrect" finding
2. Orchestrator offers to restart debug session
3. Experiment is paused or abandoned
4. New debug session begins with accumulated evidence

</integration>

<success_criteria>
- [ ] Active experiments checked
- [ ] Problem context gathered (or imported from debug)
- [ ] Experiment file created and committed
- [ ] gsd-experimenter spawned with context
- [ ] Checkpoints handled correctly
- [ ] Hypothesis loop managed until resolution or abandonment
</success_criteria>
