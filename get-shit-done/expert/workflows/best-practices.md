# Workflow: GSD Best Practices (Dynamic)

<objective>
Provide best practice guidance by reading actual GSD implementation and extracting patterns. Recommendations come from source, not memory.
</objective>

<process>

## Step 1: Detect GSD Location

```bash
if [ -f "bin/install.js" ] && [ -d "commands/gsd" ]; then
  GSD_ROOT="."
elif [ -d "$HOME/.claude/commands/gsd" ]; then
  GSD_ROOT="$HOME/.claude"
elif [ -d ".claude/commands/gsd" ]; then
  GSD_ROOT=".claude"
fi
```

## Step 2: Understand the Question

Categories of best practice questions:
- Project setup
- Phase planning
- Execution workflow
- State management
- Git workflow
- Model selection
- Specific scenarios

## Step 3: Read Relevant Source

| Topic | Files to Read |
|-------|---------------|
| Project setup | `workflows/discovery-phase.md`, `workflows/new-project.md` |
| Planning | `workflows/plan-phase.md`, `references/plan-format.md` |
| Execution | `workflows/execute-plan.md`, `workflows/execute-phase.md` |
| State | `templates/state.md`, `templates/project.md` |
| Git | `references/git-integration.md` |
| Config | `workflows/*.md` (look for config.json reads) |
| Checkpoints | `references/checkpoints.md` |
| TDD | `references/tdd.md` |

## Step 4: Extract Patterns from Source

Look for:
- **Explicit guidance** - Comments, documentation in workflows
- **Implicit patterns** - How workflows actually behave
- **Error handling** - What workflows check for
- **Config options** - What settings affect behavior

## Step 5: Synthesize Recommendation

From source files, provide:
1. **What to do** - Specific practice
2. **Why** - Rationale from implementation
3. **How** - Exact commands/steps
4. **Avoid** - Anti-patterns from source
5. **Source** - Which files you read

</process>

<core_practices>
## Essential Patterns (Read Source to Verify)

**Clear context before major commands**
Read workflow files - they assume fresh context. Commands like execute-phase spawn agents that need full 200k.

**2-3 tasks per plan**
Read `workflows/plan-phase.md` or `agents/gsd-planner.md` - look for task count guidance. Plans stay within ~50% context.

**Atomic commits per task**
Read `references/git-integration.md` - format is `{type}({phase}-{plan}): {description}`.

**STATE.md is ground truth**
Read `templates/state.md` - every workflow reads it first, updates it last.

**Use discuss-phase for UI/UX**
Read `commands/gsd/discuss-phase.md` - captures user vision before planning.

</core_practices>

<config_recommendations>
## Configuration Best Practices

Read config schema from workflows:
```bash
grep -A20 "config.json" {GSD_ROOT}/get-shit-done/workflows/*.md | head -50
```

**mode:**
- `interactive` - Start here, learn the system
- `yolo` - After you trust it (skips confirmations)

**depth:**
- `quick` - Prototypes, experiments
- `standard` - Normal development (default)
- `comprehensive` - Production, complex systems

**model_profile:**
- `quality` - Opus everywhere (expensive, thorough)
- `balanced` - Opus planning, Sonnet execution (default)
- `budget` - Sonnet everywhere (fast iteration)

**workflow flags:**
- `research` - Enable for unfamiliar domains
- `plan_check` - Enable for production code
- `verifier` - Always enable (catches real issues)
</config_recommendations>

<anti_patterns>
## What Not to Do

Read workflows to understand why these fail:

**Don't run commands mid-conversation**
Workflows assume fresh context. Check any workflow's context usage.

**Don't edit PLAN.md during execution**
Executor already loaded it. Read `agents/gsd-executor.md`.

**Don't skip phases**
Read `workflows/execute-phase.md` - dependencies matter.

**Don't over-scope phases**
Read `agents/gsd-planner.md` - target is 3-5 plans per phase.

**Don't ignore verification**
Read `agents/gsd-verifier.md` - it catches real issues.
</anti_patterns>

<scenario_guidance>
## Common Scenarios

For each scenario, read relevant workflow to verify:

**Starting new project:**
Read `workflows/discovery-phase.md` for questioning flow.

**Brownfield (existing code):**
Read `workflows/map-codebase.md` - run this first.

**Urgent fix:**
Read `commands/gsd/quick.md` or `commands/gsd/insert-phase.md`.

**Resuming work:**
Read `commands/gsd/resume-work.md` and `commands/gsd/progress.md`.
</scenario_guidance>

<success_criteria>
- Read actual source for recommendations
- Cite which files informed guidance
- Explain WHY (from implementation)
- Provide specific commands
- Acknowledge when source changes behavior
</success_criteria>
