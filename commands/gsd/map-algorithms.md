---
name: gsd:map-algorithms
description: Generate algorithm documentation from existing code (Code → Math direction)
argument-hint: "[optional: specific files or patterns to analyze, e.g., 'src/filters/*.py']"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - Write
  - Task
  - AskUserQuestion
---

<objective>
Generate algorithm documentation from existing code implementations.

This is the **Code → Math** direction of algorithm documentation:
- `/gsd:map-algorithms` — Code → Math (generate/update docs from code)
- `/gsd:algorithm-drift` — Compare spec vs code, suggest actions

Output: `.planning/algorithms/*.md` files following the algorithm template.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/map-algorithms.md
@~/.claude/get-shit-done/templates/algorithm.md
</execution_context>

<context>
Focus area: $ARGUMENTS (optional - specific files/patterns to analyze)

**Load minimal context:**
- Check for .planning/codebase/STACK.md (technology context)
- Check for .planning/codebase/ARCHITECTURE.md (structure context)
</context>

<process>

<step name="load_context">
Load minimal project context:

```bash
cat .planning/codebase/STACK.md 2>/dev/null | head -50
cat .planning/codebase/ARCHITECTURE.md 2>/dev/null | head -50
```

Note technology stack and architecture patterns for subagent prompts.
Check for existing algorithm docs:

```bash
ls .planning/algorithms/*.md 2>/dev/null
```

Store list of existing docs for later conflict resolution.
</step>

<step name="detect_patterns">
If $ARGUMENTS provided, skip detection and use user's files as candidates.

Otherwise, spawn Explore agent to find algorithm patterns:

Use Task tool:
```
subagent_type: "general-purpose"
description: "Detect algorithm patterns in codebase"
```

Search for state estimation, optimization, neural networks, control systems, signal processing, numerical methods, robotics patterns.

Wait for agent to complete, collect findings.
</step>

<step name="propose_candidates">
Present detected algorithms to user via AskUserQuestion:

```
header: "Algorithms"
question: "Which algorithms should be documented?"
options:
  - label: "[Algorithm 1 name]"
    description: "[files] - [type]"
  - label: "All detected"
    description: "Document all [N] algorithms found"
  - label: "Specify custom"
    description: "I'll provide my own list"
multiSelect: true
```

Allow user to rename, merge/split groupings, add/remove files.
</step>

<step name="handle_existing">
For each confirmed algorithm, check if documentation already exists.

If existing doc found, use AskUserQuestion:
```
header: "Existing Doc"
question: "Algorithm doc already exists for [name]. What should I do?"
options:
  - label: "Update" - Regenerate from current code (overwrites)
  - label: "Skip" - Keep existing doc unchanged
  - label: "Delete" - Remove existing doc, don't regenerate
```

Track decisions for spawn step.
</step>

<step name="spawn_subagents">
Ensure directory exists: `mkdir -p .planning/algorithms`

Spawn N parallel subagents (one per algorithm).

IMPORTANT: Spawn ALL agents in a SINGLE message with multiple Task tool calls to maximize parallelism.

Each agent:
- Reads relevant code files
- Produces .planning/algorithms/<name>.md
- Uses template structure (Purpose → I/O → Diagram → Steps → Implementation → Notes)
- run_in_background: true
</step>

<step name="collect_results">
Wait for all subagents to complete using TaskOutput.

Verify files were created:
```bash
ls -la .planning/algorithms/*.md
```

Validate each file has required sections (Diagram, owns frontmatter, Method steps).

If any agent failed or file incomplete, report which and suggest re-run.
</step>

<step name="commit_documentation">
Commit algorithm documentation (see workflow for commit config check).
</step>

<step name="offer_next">
Present completion summary and next steps:
- List created files
- Mention `/gsd:algorithm-drift` for checking drift
- Offer `/gsd:progress` to continue project work
</step>

</process>

<success_criteria>
- [ ] .planning/algorithms/ directory created
- [ ] User confirmed algorithm candidates
- [ ] Algorithm docs follow template structure
- [ ] Diagram is present in each doc (REQUIRED)
- [ ] owns: frontmatter links to implementation files
- [ ] Parallel subagents completed without errors
- [ ] User knows next steps
</success_criteria>
