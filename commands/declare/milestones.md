---
description: Derive milestones and actions backward from declared futures
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
argument-hint: "[D-XX]"
---

Derive milestones and actions by working backward from declared futures.

**Step 1: Load current graph state.**

```bash
node /Users/guilherme/Projects/get-shit-done/dist/declare-tools.cjs load-graph
```

Parse the JSON output. If the output contains an `error` field, tell the user to run `/declare:init` first and stop.

If no declarations exist in the graph, tell the user to run `/declare:future` first and stop.

Note all declarations, milestones, and actions from the graph -- the workflow needs full context.

**Step 2: Determine scope.**

- If `$ARGUMENTS` contains a declaration ID (e.g., `D-01`), derive only for that specific declaration.
- Otherwise, derive for all declarations that have no milestones yet (PENDING declarations with no edges leading to milestones).

**Step 3: Follow the backward derivation workflow.**

Read and follow the full workflow instructions:

@/Users/guilherme/Projects/get-shit-done/workflows/milestones.md

Pass the loaded graph state into the workflow so it knows about existing declarations, milestones, and actions.

**Step 4: Persist each confirmed milestone.**

After the user confirms each proposed milestone, persist it:

```bash
node /Users/guilherme/Projects/get-shit-done/dist/declare-tools.cjs add-milestone --title "Milestone Title" --realizes "D-XX"
```

Parse the JSON output to confirm the milestone was created and note its assigned ID (e.g., M-01).

**Step 5: Persist each confirmed action.**

After the user confirms each proposed action, persist it:

```bash
node /Users/guilherme/Projects/get-shit-done/dist/declare-tools.cjs add-action --title "Action Title" --causes "M-XX"
```

Parse the JSON output to confirm the action was created and note its assigned ID (e.g., A-01).

**Step 6: Milestone merge detection.**

After all declarations have been derived, follow the merge detection section in the workflow. If merges are needed and user confirms, perform them by reading and rewriting the artifact files directly.

**Step 7: Show summary and suggest next step.**

After derivation is complete:

1. Reload the graph to get final counts:
```bash
node /Users/guilherme/Projects/get-shit-done/dist/declare-tools.cjs load-graph
```

2. Show a summary: number of declarations processed, milestones derived, actions derived, any merges performed.
3. Suggest: "Run `/declare:status` to see the full graph."
