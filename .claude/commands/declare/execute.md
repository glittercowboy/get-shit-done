---
description: Execute actions for a milestone with wave-based scheduling and upward verification
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - Task
argument-hint: "[M-XX] [--confirm]"
---

Execute all pending actions for a milestone using wave-based scheduling, parallel agent spawning, per-wave verification, and automatic milestone completion.

**Step 1: Determine milestone scope.**

Parse `$ARGUMENTS` for a milestone ID (matching pattern `M-XX`) and a `--confirm` flag.

If `$ARGUMENTS` contains a milestone ID, use it directly and proceed to Step 2.

If `$ARGUMENTS` is empty or contains no milestone ID (interactive mode):
- Run the milestone picker:

```bash
node dist/declare-tools.cjs execute
```

- Parse the JSON output. It contains a `milestones` array with `{id, title, status, actionCount, doneCount}` objects.
- Display a numbered list:

```
## Select a Milestone to Execute

1. M-01: [title] — [status] ([doneCount]/[actionCount] actions done)
2. M-02: [title] — [status] ([doneCount]/[actionCount] actions done)
```

- Ask the user: "Which milestone would you like to execute? Provide the ID (e.g., M-01)."
- Wait for the user's response, then use their provided ID in Step 2.

Check if `--confirm` is present in `$ARGUMENTS`. If so, pause between waves for user review.

**Step 2: Load execution data.**

Run:

```bash
node dist/declare-tools.cjs execute --milestone M-XX
```

Parse the JSON output.

If `allDone` is true:
- Display: "All actions for M-XX are already complete. Milestone status: [status]"
- Exit.

Display a banner:

```
## Executing: M-XX — [milestoneTitle]

**Declarations:** [for each declaration: "D-XX (title)"]
**Actions:** [pendingCount] pending of [totalActions] total | **Waves:** [waves.length]
```

**Step 3: For each wave, execute actions.**

Iterate over each wave in the `waves` array:

**3a. Generate exec plans (on-demand, per wave):**

For each action in the wave:

```bash
node dist/declare-tools.cjs generate-exec-plan --action A-XX --milestone M-XX --wave N
```

Parse the JSON output and note the `outputPath` for each action.

If any generation returns an error, display it and suggest fixes (e.g., "Run /declare:actions first to create the milestone plan folder").

**3b. Display wave banner:**

```
--- Wave N of [total waves] ---
**Actions:** A-XX ([title]), A-XX ([title])
Spawning [count] agent(s)...
```

**3c. Spawn executor agents in parallel using the Task tool:**

For each action in the wave, spawn a Task with instructions like:

```
Execute the plan at [outputPath].

Read the EXEC-PLAN file at the path above. Follow all tasks described in it.
Make atomic commits per task. When complete, report:
- What was done
- Files created or modified
- Commit hashes
- Any issues encountered

Context: This action is part of milestone M-XX ([milestoneTitle]).
```

Use one Task tool call per action. If the wave has multiple actions, spawn them all in the same response so they execute in parallel.

**3d. After all agents in the wave complete, verify:**

Run:

```bash
node dist/declare-tools.cjs verify-wave --milestone M-XX --actions "A-01,A-02"
```

(Use the comma-separated list of action IDs from the current wave.)

Parse the verification JSON output.

Display automated check results:

```
### Wave N Verification

| Action | Check        | Result |
| ------ | ------------ | ------ |
| A-XX   | action-exists | PASS   |
| A-XX   | produces-exist| PASS   |
```

Perform AI review: Given the trace context from the verification result (`traceContext.whyChain` and `traceContext.declarations`), assess whether the completed work meaningfully advances the milestone. Produce a 1-2 sentence assessment.

If `passed` is false (verification failed):
- Identify which actions failed and what checks failed.
- Retry up to 2 times: re-spawn the failed action's Task agent with the failure context appended:

```
Previous attempt failed verification. Failure details:
- Check [check-name] failed for action A-XX
- [Details from allChecks]

Please fix the issues and try again.
```

- After 2 retries with continued failure, surface to user:
  "Action A-XX failed verification after 2 retries. Details: [failure info]. What would you like to do?"
- Wait for user guidance before continuing.

If `--confirm` flag was set, pause after successful verification:
- "Wave N complete and verified. Proceed to Wave N+1? (yes/no)"
- Wait for user confirmation before continuing.

**3e. Update action statuses in PLAN.md:**

After successful wave verification, update each completed action's status in the milestone's PLAN.md file:

1. Use the `milestoneFolderPath` from Step 2 to locate the PLAN.md file.
2. Read the PLAN.md file.
3. For each action in the completed wave, find `**Status:** PENDING` (or `**Status:** ACTIVE`) for that action and change it to `**Status:** DONE`.
4. Write the updated PLAN.md back.

**Step 4: After all waves complete, check milestone completion.**

If `milestoneCompletable` is true from the final verify-wave result:
1. Read `.planning/MILESTONES.md`.
2. Find the row for M-XX in the milestones table.
3. Change its Status from PENDING or ACTIVE to DONE.
4. Write the updated MILESTONES.md back.
5. Display: "Milestone M-XX marked as DONE."

Display completion banner:

```
## Execution Complete: M-XX — [milestoneTitle]

**Actions completed:** [pendingCount]
**Waves executed:** [waves.length]
**Milestone status:** [DONE or current status]
```

**Error handling:**

- If any CJS command returns a JSON with an `error` field, display it clearly and suggest fixes.
- If milestone folder not found, suggest running `/declare:actions` first to create the milestone plan.
- If no pending actions, report the milestone is already complete.
- If a Task agent fails (non-verification failure), display the error and ask the user how to proceed.

**Key patterns:**

- Execution scope is per-milestone (never cross-milestone).
- Wave scheduling is automatic from the action graph.
- Auto-advance between waves by default; `--confirm` pauses for user review.
- GSD-style banners with progress at each stage.
- Atomic commits per task (handled by executor agents).
- Two-layer verification: automated checks (CJS tool) then AI review (this slash command).
- Max 2 retries on verification failure before escalating to user.
- Milestone auto-DONE when all actions complete and verify.
