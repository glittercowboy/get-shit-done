---
name: gsd:settings
description: Configure GSD workflow toggles and model profile
allowed-tools:
  - Read
  - Write
  - Bash
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
- `git.branching_strategy` — branching approach (default: `"none"`)
- `adversary.enabled` — global adversary toggle (default: `true`)
- `adversary.checkpoints.*` — per-checkpoint toggles (default: all `true`)
- `adversary.max_rounds` — global max debate rounds (default: `3`)
- `co_planners.enabled` — co-planner toggle (default: `false`)
- `co_planners.agents` — globally configured agents (default: `[]`)
- `co_planners.checkpoints` — per-checkpoint agent overrides (default: `{}`)

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
  },
  {
    question: "Git branching strategy?",
    header: "Branching",
    multiSelect: false,
    options: [
      { label: "None (Recommended)", description: "Commit directly to current branch" },
      { label: "Per Phase", description: "Create branch for each phase (gsd/phase-{N}-{name})" },
      { label: "Per Milestone", description: "Create branch for entire milestone (gsd/{version}-{name})" }
    ]
  },
  {
    question: "Enable adversarial review? (challenges artifacts before execution)",
    header: "Adversary",
    multiSelect: false,
    options: [
      { label: "Yes (Recommended)", description: "Challenge requirements, roadmaps, plans, and verification" },
      { label: "No", description: "Skip adversarial review at all checkpoints" }
    ]
  },
  // ONLY show if adversary = "Yes":
  {
    question: "Which checkpoints should trigger adversarial review?",
    header: "Adversary Checkpoints",
    multiSelect: true,
    options: [
      { label: "Requirements", description: "Challenge REQUIREMENTS.md after creation" },
      { label: "Roadmap", description: "Challenge ROADMAP.md after creation" },
      { label: "Plan", description: "Challenge PLAN.md after creation" },
      { label: "Verification", description: "Challenge verification conclusions" }
    ]
  },
  // ONLY show if adversary = "Yes":
  {
    question: "Maximum debate rounds per checkpoint?",
    header: "Max Rounds",
    multiSelect: false,
    options: [
      { label: "1", description: "Single challenge only (fastest)" },
      { label: "2", description: "Challenge + defense" },
      { label: "3 (Recommended)", description: "Challenge + defense + final assessment" },
      { label: "5", description: "Extended debate (most thorough)" }
    ]
  },

  // ── Co-Planner Settings ──
  // ALWAYS show the toggle
  {
    question: "Enable external co-planners? (external CLIs review artifacts at checkpoints)",
    header: "Co-Planners",
    multiSelect: false,
    options: [
      { label: "No (Default)", description: "Workflow runs with Claude only" },
      { label: "Yes", description: "External CLIs (codex, gemini, opencode) review artifacts" }
    ]
  },
  // ONLY show if co-planners = "Yes":
  // 1. Show: "Detecting installed CLIs..."
  // 2. Run: node ~/.claude/get-shit-done/bin/gsd-tools.cjs coplanner detect
  //    (uses Bash tool — outputs JSON)
  // 3. Parse JSON result and map each CLI to badge text:
  //    - available: true                    → "(installed)"
  //    - available: false, error: NOT_FOUND → "(not installed)"
  //    - available: false, other error      → "(status unknown)"
  //    - detection failure/timeout          → "(status unknown)"
  // 4. Annotate options below with badge text inline:
  {
    question: "Which external agents to use as default?",
    header: "Global Co-Planner Agents",
    multiSelect: true,
    options: [
      { label: "codex (<badge>)", description: "OpenAI Codex CLI" },
      { label: "gemini (<badge>)", description: "Google Gemini CLI" },
      { label: "opencode (<badge>)", description: "OpenCode CLI" }
    ]
  },
  // If any selected agent has "(not installed)" or "(status unknown)" badge:
  // Display note: "Note: Agents marked as not-installed will be skipped until installed."
  // ONLY show if co-planners = "Yes":
  {
    question: "Use different agents at specific checkpoints?",
    header: "Per-Checkpoint Overrides",
    multiSelect: false,
    options: [
      { label: "No", description: "Same agents at all checkpoints" },
      { label: "Yes", description: "Configure each checkpoint separately" }
    ]
  },
  // ONLY show if overrides = "Yes" — one question per checkpoint:
  // Per-checkpoint options reuse cached detection results from step 2 above
  {
    question: "Agents for 'requirements' checkpoint?",
    header: "Requirements Checkpoint",
    multiSelect: true,
    options: [
      { label: "codex (<badge>)", description: "OpenAI Codex CLI" },
      { label: "gemini (<badge>)", description: "Google Gemini CLI" },
      { label: "opencode (<badge>)", description: "OpenCode CLI" }
    ]
  },
  {
    question: "Agents for 'roadmap' checkpoint?",
    header: "Roadmap Checkpoint",
    multiSelect: true,
    options: [
      { label: "codex (<badge>)", description: "OpenAI Codex CLI" },
      { label: "gemini (<badge>)", description: "Google Gemini CLI" },
      { label: "opencode (<badge>)", description: "OpenCode CLI" }
    ]
  },
  {
    question: "Agents for 'plan' checkpoint?",
    header: "Plan Checkpoint",
    multiSelect: true,
    options: [
      { label: "codex (<badge>)", description: "OpenAI Codex CLI" },
      { label: "gemini (<badge>)", description: "Google Gemini CLI" },
      { label: "opencode (<badge>)", description: "OpenCode CLI" }
    ]
  },
  {
    question: "Agents for 'verification' checkpoint?",
    header: "Verification Checkpoint",
    multiSelect: true,
    options: [
      { label: "codex (<badge>)", description: "OpenAI Codex CLI" },
      { label: "gemini (<badge>)", description: "Google Gemini CLI" },
      { label: "opencode (<badge>)", description: "OpenCode CLI" }
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
  },
  "git": {
    "branching_strategy": "none" | "phase" | "milestone"
  },
  "adversary": {
    "enabled": true/false,
    "max_rounds": 1/2/3/5,
    "checkpoints": {
      "requirements": true/false,
      "roadmap": true/false,
      "plan": true/false,
      "verification": true/false
    }
  },
  "co_planners": {
    "enabled": true/false,
    "timeout_ms": 120000,
    "agents": ["codex", "gemini"],
    "checkpoints": {
      "requirements": { "agents": ["codex"] },
      "plan": { "agents": ["codex", "gemini"] }
    }
  }
}
```

**Adversary merge rules:**
- Read existing `adversary` section from config first (preserve existing values)
- When toggling `enabled: false`, preserve existing checkpoint and max_rounds values
- When toggling checkpoints, write `true` for selected and `false` for unselected
- When changing max_rounds, write the numeric value (1, 2, 3, or 5)
- If no existing adversary section, use defaults: `enabled: true`, `max_rounds: 3`, all checkpoints `true`

**Co-Planner merge rules:**
- Read existing `co_planners` section from config first (preserve `timeout_ms`)
- When toggling `enabled: false`, preserve existing agents and checkpoints values
- When setting global agents, write the selected array
- When setting per-checkpoint overrides, only write checkpoints that differ from global. If same as global, omit (cleaner config).
- If no overrides selected, write `"checkpoints": {}`

Write updated config to `.planning/config.json`.

## 5. Confirm Changes

Display:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► SETTINGS UPDATED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Setting              | Value |
|----------------------|-------|
| Model Profile        | {quality/balanced/budget} |
| Plan Researcher      | {On/Off} |
| Plan Checker         | {On/Off} |
| Execution Verifier   | {On/Off} |
| Git Branching        | {None/Per Phase/Per Milestone} |
| Adversary            | {On/Off} |
| Adversary Checkpoints| {list of enabled checkpoints} |
| Max Rounds           | {1/2/3/5} |
| Co-Planners          | {On/Off} |
| Co-Planner Agents    | {codex, gemini / none} |
| Checkpoint Overrides | {Yes: list / No} |

These settings apply to future /gsd:plan-phase and /gsd:execute-phase runs.

Quick commands:
- /gsd:set-profile <profile> — switch model profile
- /gsd:plan-phase --research — force research
- /gsd:plan-phase --skip-research — skip research
- /gsd:plan-phase --skip-verify — skip plan check
```

</process>

<success_criteria>
- [ ] Current config read
- [ ] User presented with up to 15 settings (profile + 3 workflow + branching + 3 adversary + up to 7 co-planner)
- [ ] Config updated with model_profile, workflow, git, adversary, and co_planners sections
- [ ] Changes confirmed to user
</success_criteria>
