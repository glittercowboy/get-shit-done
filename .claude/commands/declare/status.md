---
description: Show graph state, layer counts, health indicators, and last activity
allowed-tools:
  - Read
  - Bash
  - Grep
  - Glob
---

Show the current state of the Declare project graph.

**Step 1: Run the status tool.**

```bash
node dist/declare-tools.cjs status
```

Parse the JSON output.

**Step 2: Handle errors.**

If the output contains an `error` field (e.g., "No Declare project found"), display the error and suggest running `/declare:init`.

**Step 3: Format the status display.**

Render a rich visual summary with these sections:

**Project header:** Display the project name prominently.

**Graph Stats:** Show counts in a compact format:
- Declarations: N
- Milestones: N
- Actions: N
- Edges: N

**Status Distribution:** Show the breakdown by status (PENDING/ACTIVE/DONE) as a visual bar or counts.

**Validation Health:**
- If `health` is "healthy": show a pass indicator
- If `health` is "warnings": show warnings with the validation error list
- If `health` is "errors": show errors with the validation error list and actionable suggestions for each

For each validation error, provide a brief suggestion:
- `orphan`: "Connect this node to a parent with an edge"
- `cycle`: "Check for circular dependencies in your graph"
- `broken_edge`: "The target node may have been removed -- update or remove the edge"

**Last Activity:** Show the timestamp and commit message from the last git activity.

The overall feel should be like a dashboard -- compact, scannable, with clear health indicators.
