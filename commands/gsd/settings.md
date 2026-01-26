---
name: gsd:settings
description: Configure GSD workflow toggles and model profile
allowed-tools:
  - Read
  - Write
  - AskUserQuestion
---

<objective>
Allow users to toggle workflow agents on/off and select model profile via interactive settings.

Updates `.planning/config.json` with workflow preferences and model profile selection.
</objective>

<process>

## 1. Validate Environment

```bash
ls .planning/config.json 2>/dev/null
```

**If not found:** Error - run `/gsd:new-project` first.

## 2. Read Current Config

```bash
cat .planning/config.json
```

Parse current values (default to `true` if not present):
- `workflow.research` — spawn researcher during plan-phase
- `workflow.plan_check` — spawn plan checker during plan-phase
- `workflow.verifier` — spawn verifier during execute-phase
- `model_profile` — which model each agent uses (default: `balanced`)
- `claude_plan_type` — detected plan type (team/personal/unknown)
- `team_plan_checked_at` — last plan check timestamp

## 2.5. Display Plan Information

If `claude_plan_type` is detected, show plan context:

**For Team Plans:**

```
─────────────────────────────────────────────────────────
Claude Code Plan

Type: Team Account
Status: ⚠️  May hit rate limits with multi-agent workflows

GSD spawns multiple parallel agents which can exhaust
team plan rate limits faster than typical usage.

Recommendations:
• Disable optional workflow agents below to reduce usage
• Run /gsd:check-plan for detailed guidance
• Consider personal plan for frequent GSD usage

Estimated reduction by disabling all optional agents: ~60%
─────────────────────────────────────────────────────────
```

**For Personal Plans:**

```
─────────────────────────────────────────────────────────
Claude Code Plan

Type: Personal Account
Status: ✓ Well-suited for GSD workflows

Your personal plan has higher rate limits suitable for
GSD's multi-agent orchestration.

Configure workflow agents below based on your preferences.
─────────────────────────────────────────────────────────
```

**For Unknown:**

```
─────────────────────────────────────────────────────────
Claude Code Plan

Type: Unknown
Status: Run /gsd:check-plan to detect your plan type

If you're on a Team account, consider disabling optional
workflow agents below to reduce rate limit usage.
─────────────────────────────────────────────────────────
```

## 3. Present Settings

Use AskUserQuestion with current values shown:

```
AskUserQuestion([
  {
    question: "Which model profile for agents?",
    header: "Model",
    multiSelect: false,
    options: [
      { label: "Quality", description: "Opus everywhere except verification (highest cost)" },
      { label: "Balanced (Recommended)", description: "Opus for planning, Sonnet for execution/verification" },
      { label: "Budget", description: "Sonnet for writing, Haiku for research/verification (lowest cost)" }
    ]
  },
  {
    question: "Spawn Plan Researcher? (researches domain before planning)",
    header: "Research",
    multiSelect: false,
    options: [
      { label: "Yes", description: "Research phase goals before planning" },
      { label: "No", description: "Skip research, plan directly" }
    ]
  },
  {
    question: "Spawn Plan Checker? (verifies plans before execution)",
    header: "Plan Check",
    multiSelect: false,
    options: [
      { label: "Yes", description: "Verify plans meet phase goals" },
      { label: "No", description: "Skip plan verification" }
    ]
  },
  {
    question: "Spawn Execution Verifier? (verifies phase completion)",
    header: "Verifier",
    multiSelect: false,
    options: [
      { label: "Yes", description: "Verify must-haves after execution" },
      { label: "No", description: "Skip post-execution verification" }
    ]
  }
])
```

**Pre-select based on current config values.**

## 4. Update Config

Merge new settings into existing config.json:

```json
{
  ...existing_config,
  "model_profile": "quality" | "balanced" | "budget",
  "workflow": {
    "research": true/false,
    "plan_check": true/false,
    "verifier": true/false
  }
}
```

Write updated config to `.planning/config.json`.

## 5. Confirm Changes

Display:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► SETTINGS UPDATED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Claude Plan: {Team Account/Personal Account/Unknown}

| Setting              | Value |
|----------------------|-------|
| Model Profile        | {quality/balanced/budget} |
| Plan Researcher      | {On/Off} |
| Plan Checker         | {On/Off} |
| Execution Verifier   | {On/Off} |

These settings apply to future /gsd:plan-phase and /gsd:execute-phase runs.

Quick commands:
- /gsd:check-plan — check plan type and rate limit guidance
- /gsd:set-profile <profile> — switch model profile
- /gsd:plan-phase --research — force research
- /gsd:plan-phase --skip-research — skip research
- /gsd:plan-phase --skip-verify — skip plan check
```

</process>

<success_criteria>
- [ ] Current config read
- [ ] User presented with 4 settings (profile + 3 toggles)
- [ ] Config updated with model_profile and workflow section
- [ ] Changes confirmed to user
</success_criteria>
