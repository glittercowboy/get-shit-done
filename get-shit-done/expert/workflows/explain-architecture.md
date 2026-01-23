# Workflow: Explain GSD Architecture (Dynamic)

<objective>
Answer architecture questions by reading actual implementation files. Trace data flow through the real codebase, not from memory.
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

## Step 2: Identify What to Read

Based on the question, determine which files contain the answer:

| Question Pattern | Files to Read |
|------------------|---------------|
| "How does X command work?" | `commands/gsd/X.md` + referenced workflows |
| "How does execution work?" | `get-shit-done/workflows/execute-plan.md` |
| "How does planning work?" | `get-shit-done/workflows/plan-phase.md` |
| "What do agents do?" | `agents/gsd-*.md` (list then read specific) |
| "How does state work?" | `get-shit-done/templates/state.md` + workflows that update it |
| "How do plans work?" | `get-shit-done/templates/plan.md` + `references/plan-format.md` |
| "How do checkpoints work?" | `get-shit-done/references/checkpoints.md` |
| "How does git work?" | `get-shit-done/references/git-integration.md` |
| "How do deviations work?" | Search workflows for "deviation" sections |
| "How does context engineering work?" | Read orchestrator workflows, look for Task tool spawning |

## Step 3: Read Core Files for System Overview

For general architecture questions, read these key files:

```bash
# Main entry point docs
cat {GSD_ROOT}/README.md
cat {GSD_ROOT}/CLAUDE.md

# Core workflows
cat {GSD_ROOT}/get-shit-done/workflows/execute-plan.md
cat {GSD_ROOT}/get-shit-done/workflows/plan-phase.md

# Agent definitions
ls {GSD_ROOT}/agents/gsd-*.md
```

## Step 4: Trace Data Flow

For "how does X connect to Y" questions:

1. **Find entry point** - Which command starts this flow?
2. **Read command** - What workflow does it load?
3. **Read workflow** - What agents does it spawn? What state does it read/write?
4. **Read agents** - What do they produce?
5. **Read templates** - What format are outputs?

**Example trace for "how does execute-phase work":**
```
commands/gsd/execute-phase.md
  ↓ loads
get-shit-done/workflows/execute-phase.md
  ↓ reads
.planning/ROADMAP.md (finds plans)
  ↓ spawns
agents/gsd-executor.md (per plan)
  ↓ produces
{phase}-{plan}-SUMMARY.md (per plan)
  ↓ spawns
agents/gsd-verifier.md (after all plans)
  ↓ produces
{phase}-VERIFICATION.md
  ↓ updates
.planning/STATE.md, .planning/ROADMAP.md
```

## Step 5: Extract Key Patterns

Look for these patterns in the source:

**Orchestrator pattern:**
- Workflow loads state
- Routes based on config
- Spawns agents via Task tool
- Collects results
- Updates state

**State management:**
- Reads STATE.md first
- Updates at end
- Never during execution

**Agent spawning:**
- `Task tool with subagent_type="gsd-*"`
- Fresh context per agent
- Structured return format

## Step 6: Synthesize with File Citations

Answer the question, citing which files you read:

```
Based on reading:
- {GSD_ROOT}/get-shit-done/workflows/execute-plan.md (lines 50-120)
- {GSD_ROOT}/agents/gsd-executor.md

Here's how execution works: ...
```

</process>

<deep_dive_reads>
## For Specific Architecture Topics

**Context engineering:**
- Read any workflow's agent spawning logic
- Look for Task tool calls with fresh context
- Check plan sizing (2-3 tasks per plan)

**State files:**
```bash
cat {GSD_ROOT}/get-shit-done/templates/state.md
cat {GSD_ROOT}/get-shit-done/templates/project.md
cat {GSD_ROOT}/get-shit-done/templates/roadmap.md
```

**Plan format:**
```bash
cat {GSD_ROOT}/get-shit-done/templates/plan.md
cat {GSD_ROOT}/get-shit-done/references/plan-format.md
```

**Agent system:**
```bash
ls {GSD_ROOT}/agents/
cat {GSD_ROOT}/agents/gsd-executor.md
cat {GSD_ROOT}/agents/gsd-planner.md
cat {GSD_ROOT}/agents/gsd-verifier.md
```

**Deviation handling:**
```bash
grep -l "deviation" {GSD_ROOT}/get-shit-done/workflows/*.md
# Then read those files
```

**Wave parallelization:**
```bash
grep -l "wave" {GSD_ROOT}/get-shit-done/workflows/*.md
# Usually in execute-phase.md
```
</deep_dive_reads>

<success_criteria>
- Read actual source files (not memory)
- Trace real data flow through files
- Cite specific files and sections
- Show the actual implementation
- Update answer if files have changed
</success_criteria>
