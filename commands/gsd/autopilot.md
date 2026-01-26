---
name: gsd:autopilot
description: Fully automated milestone execution from existing roadmap
argument-hint: "[--from-phase N] [--dry-run] [--background]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

<objective>
Generate and run a shell script that autonomously executes all remaining phases in the current milestone.

Each phase: plan → execute → verify → handle gaps → next phase.

The shell script outer loop provides infinite context (each `claude -p` gets fresh 200k). State persists in `.planning/` enabling resume after interruption.

**Requires:** `.planning/ROADMAP.md` (run `/gsd:new-project` first)
</objective>

<execution_context>
@~/.claude/get-shit-done/references/ui-brand.md
@~/.claude/get-shit-done/templates/autopilot-script.sh
</execution_context>

<context>
Arguments: $ARGUMENTS

**Flags:**
- `--from-phase N` — Start from specific phase (default: first incomplete)
- `--dry-run` — Generate script but don't run it
- `--background` — Run detached with nohup (default: attached with streaming output)
</context>

<process>

## 1. Validate Prerequisites

```bash
# Check roadmap exists
if [ ! -f .planning/ROADMAP.md ]; then
  echo "ERROR: No roadmap found. Run /gsd:new-project first."
  exit 1
fi

# Check not already running
if [ -f .planning/autopilot.lock ]; then
  PID=$(cat .planning/autopilot.lock)
  if ps -p $PID > /dev/null 2>&1; then
    echo "ERROR: Autopilot already running (PID: $PID)"
    echo "To force restart: rm .planning/autopilot.lock"
    exit 1
  fi
fi
```

## 2. Parse Roadmap State

```bash
# Get incomplete phases
INCOMPLETE=$(grep -E "^- \[ \] \*\*Phase" .planning/ROADMAP.md | sed 's/.*Phase \([0-9.]*\).*/\1/' | tr '\n' ' ')

# Get completed phases
COMPLETED=$(grep -E "^- \[x\] \*\*Phase" .planning/ROADMAP.md | sed 's/.*Phase \([0-9.]*\).*/\1/' | tr '\n' ' ')

# Check autopilot state for resume
if [ -f .planning/STATE.md ]; then
  AUTOPILOT_STATUS=$(grep "^- \*\*Mode:\*\*" .planning/STATE.md | sed 's/.*: //')
  LAST_PHASE=$(grep "^- \*\*Current Phase:\*\*" .planning/STATE.md | sed 's/.*: //')
fi
```

**If no incomplete phases:** Report milestone already complete, offer `/gsd:complete-milestone`.

**If `--from-phase N` specified:** Validate phase exists, use as start point.

**If autopilot was interrupted (Mode: running):** Auto-resume from last phase.

## 3. Load Config

```bash
# Read config values
CHECKPOINT_MODE=$(cat .planning/config.json 2>/dev/null | grep -o '"checkpoint_mode"[[:space:]]*:[[:space:]]*"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"' || echo "queue")
MAX_RETRIES=$(cat .planning/config.json 2>/dev/null | grep -o '"max_retries"[[:space:]]*:[[:space:]]*[0-9]*' | grep -o '[0-9]*$' || echo "3")
BUDGET_LIMIT=$(cat .planning/config.json 2>/dev/null | grep -o '"budget_limit_usd"[[:space:]]*:[[:space:]]*[0-9.]*' | grep -o '[0-9.]*$' || echo "0")
WEBHOOK_URL=$(cat .planning/config.json 2>/dev/null | grep -o '"notify_webhook"[[:space:]]*:[[:space:]]*"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"' || echo "")
MODEL_PROFILE=$(cat .planning/config.json 2>/dev/null | grep -o '"model_profile"[[:space:]]*:[[:space:]]*"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"' || echo "balanced")
```

## 4. Present Execution Plan

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► AUTOPILOT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Milestone:** [from ROADMAP.md]

| Status | Phases |
|--------|--------|
| ✓ Complete | {completed_phases} |
| ○ Remaining | {incomplete_phases} |

**Settings:**
- Checkpoint mode: {queue|skip}
- Max retries: {N}
- Budget limit: ${N} (0 = unlimited)
- Notifications: {webhook|bell|none}

───────────────────────────────────────────────────────────────

**Execution Plan:**

For each remaining phase:
1. Plan phase (if no plans exist)
2. Execute phase (parallel waves)
3. Verify phase goal
4. If gaps found → plan gaps → execute gaps → re-verify
5. Move to next phase

Checkpoints queued to: `.planning/checkpoints/pending/`

───────────────────────────────────────────────────────────────
```

## 5. Generate Script

Read template from `@~/.claude/get-shit-done/templates/autopilot-script.sh` and fill:
- `{{project_dir}}` — Current directory (absolute path)
- `{{project_name}}` — From PROJECT.md
- `{{phases}}` — Array of incomplete phase numbers
- `{{checkpoint_mode}}` — queue or skip
- `{{max_retries}}` — From config
- `{{budget_limit}}` — From config (0 = unlimited)
- `{{webhook_url}}` — From config (empty = disabled)
- `{{model_profile}}` — From config
- `{{timestamp}}` — Current datetime

Write to `.planning/autopilot.sh`:
```bash
mkdir -p .planning/logs .planning/checkpoints/pending .planning/checkpoints/approved
chmod +x .planning/autopilot.sh
```

**Ensure gitignore entries exist** (autopilot transient files should not be committed):
```bash
# Add to .gitignore if not already present
GITIGNORE_ENTRIES="
# GSD autopilot (transient files)
.planning/autopilot.sh
.planning/autopilot.lock
.planning/logs/
.planning/checkpoints/
"

if [ -f .gitignore ]; then
  if ! grep -q "GSD autopilot" .gitignore; then
    echo "$GITIGNORE_ENTRIES" >> .gitignore
  fi
else
  echo "$GITIGNORE_ENTRIES" > .gitignore
fi
```

## 6. Present Run Instructions

**IMPORTANT:** The autopilot script must run **outside** of Claude Code in a separate terminal. Claude Code's Bash tool has a 10-minute timeout which would interrupt long-running execution.

Present the following:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► AUTOPILOT READY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Script generated: .planning/autopilot.sh

───────────────────────────────────────────────────────────────

## Run in a separate terminal

**Attached (recommended — see output live):**
```
cd {project_dir} && bash .planning/autopilot.sh
```

**Background (for overnight runs):**
```
cd {project_dir} && nohup bash .planning/autopilot.sh > .planning/logs/autopilot.log 2>&1 &
```

**Monitor logs:**
```
tail -f .planning/logs/autopilot.log
```

───────────────────────────────────────────────────────────────

**Why a separate terminal?**
Claude Code's Bash tool has a 10-minute timeout. Autopilot runs for
hours across multiple phases — it needs to run independently.

**Resume after interruption:**
Just run the script again. It detects completed phases and continues.

**Check on checkpoints:**
`/gsd:checkpoints` — review and approve any pending human input

───────────────────────────────────────────────────────────────
```

## 7. Update State

Before presenting instructions, update STATE.md to mark autopilot as ready:

```markdown
## Autopilot

- **Mode:** running
- **Started:** [timestamp]
- **Current Phase:** [first phase]
- **Phases Remaining:** [list]
- **Checkpoints Pending:** (none yet)
- **Last Error:** none
```

</process>

<checkpoint_queue>
Plans with `autonomous: false` pause at checkpoints.

**Queue structure:**
```
.planning/checkpoints/
├── pending/
│   └── phase-03-plan-02.json    # Waiting for user
└── approved/
    └── phase-03-plan-02.json    # User approved, ready to continue
```

**Pending checkpoint format:**
```json
{
  "phase": "03",
  "plan": "02",
  "plan_name": "OAuth Integration",
  "checkpoint_type": "auth-gate",
  "awaiting": "OAuth client credentials for Google",
  "context": "Plan paused after task 2. Tasks 3-4 require OAuth setup.",
  "created": "2026-01-26T14:30:00Z",
  "completed_tasks": [
    {"task": 1, "commit": "abc123", "name": "Create OAuth service skeleton"},
    {"task": 2, "commit": "def456", "name": "Add Google OAuth config structure"}
  ]
}
```

**Approved checkpoint format:**
```json
{
  "phase": "03",
  "plan": "02",
  "approved": true,
  "response": "Client ID: xxx, Secret: yyy",
  "approved_at": "2026-01-26T15:00:00Z"
}
```

**Workflow:**
1. Executor hits checkpoint → writes to `pending/`
2. Autopilot logs checkpoint, continues with other phases
3. User reviews `pending/` (manually or via `/gsd:checkpoints`)
4. User creates approval in `approved/`
5. Next autopilot run (or current if phase revisited) picks up approval
6. Continuation agent spawned with approval context
</checkpoint_queue>

<cost_tracking>
Track token usage for budget enforcement:

**Per-phase logging:**
After each `claude -p` call, parse output for token counts:
```bash
# Extract from claude -p output (format varies)
TOKENS=$(grep -o 'tokens: [0-9]*' "$LOG_FILE" | tail -1 | grep -o '[0-9]*')
```

**Accumulate in state:**
```markdown
## Cost Tracking

| Phase | Tokens | Est. Cost |
|-------|--------|-----------|
| 1 | 45,230 | $0.68 |
| 2 | 62,100 | $0.93 |
| Total | 107,330 | $1.61 |
```

**Budget check:**
```bash
if [ "$BUDGET_LIMIT" -gt 0 ]; then
  TOTAL_COST=$(calculate_cost)
  if (( $(echo "$TOTAL_COST > $BUDGET_LIMIT" | bc -l) )); then
    notify "Budget exceeded: \$$TOTAL_COST / \$$BUDGET_LIMIT"
    update_state "paused" "budget_exceeded"
    exit 0
  fi
fi
```
</cost_tracking>

<notifications>
**Terminal bell:**
```bash
echo -e "\a"  # On completion or error
```

**Webhook:**
```bash
notify() {
  local message="$1"
  local status="${2:-info}"

  if [ -n "$WEBHOOK_URL" ]; then
    curl -s -X POST "$WEBHOOK_URL" \
      -H "Content-Type: application/json" \
      -d "{\"text\": \"GSD Autopilot: $message\", \"status\": \"$status\"}" \
      > /dev/null 2>&1
  fi

  # Always terminal bell
  echo -e "\a"
}
```

**Notification triggers:**
- Phase complete
- Checkpoint queued
- Error/retry
- Budget warning (80%)
- Budget exceeded
- Milestone complete
</notifications>

<success_criteria>
- [ ] Roadmap exists validation
- [ ] Lock file prevents concurrent runs
- [ ] Incomplete phases parsed from ROADMAP.md
- [ ] Resume detection from STATE.md
- [ ] Config loaded (checkpoint mode, retries, budget, webhook)
- [ ] Execution plan presented clearly
- [ ] User confirms before running
- [ ] Script generated with project-specific values
- [ ] Execution mode matches user choice
- [ ] STATE.md updated with autopilot section
- [ ] Logs written to .planning/logs/
</success_criteria>
