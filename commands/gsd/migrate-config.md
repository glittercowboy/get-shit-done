---
name: gsd:migrate-config
description: Upgrade .planning/config.json to the latest template (adds missing keys, preserves overrides)
argument-hint: "[--write] [--no-backup] [--commit]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Grep
  - AskUserQuestion
---

<objective>
Migrate/upgrade `.planning/config.json` to match the latest GSD config template.

This:
- Adds newly introduced keys (with default values)
- Preserves all existing user values and unknown keys
- Optionally writes a backup before modifying the file
- Optionally commits the change
</objective>

<execution_context>
@~/.claude/get-shit-done/references/ui-brand.md
</execution_context>

<context>
Current config: @.planning/config.json
Template: @~/.claude/get-shit-done/templates/config.json
</context>

<process>

## 0. Validate

```bash
ls .planning 2>/dev/null
```

If `.planning/` is missing:
- Explain this is project-local config
- Suggest `/gsd:new-project`
- Exit

## 1. Preview Upgrade

Run the config upgrade in preview mode (no writes):

```bash
node ~/.claude/hooks/gsd-config.js upgrade
```

If config is missing or invalid JSON, the output will say so.

## 2. Confirm

If `$ARGUMENTS` contains `--write`, skip this confirmation.

Otherwise use AskUserQuestion:
- header: "Migrate Config"
- question: "Apply config upgrade (write .planning/config.json)?"
- options:
  - "Apply" — write config upgrade
  - "Abort" — no changes

## 3. Apply Upgrade

Write config with backup (default):

```bash
node ~/.claude/hooks/gsd-config.js upgrade --write
```

If `$ARGUMENTS` contains `--no-backup`, pass `--no-backup` to the command.

## 4. Optional Commit

If `$ARGUMENTS` contains `--commit`, commit without prompting.

Otherwise use AskUserQuestion:
- header: "Git"
- question: "Commit .planning/config.json upgrade?"
- options:
  - "Commit"
  - "Don't commit"

If commit selected:
```bash
git status --porcelain
git add .planning/config.json
git commit -m "chore(config): migrate gsd config"
```

</process>

<success_criteria>
- [ ] Preview runs and shows what will change
- [ ] Upgrade preserves user overrides/unknown keys
- [ ] Writes updated `.planning/config.json` with valid JSON
- [ ] Optional backup created unless disabled
- [ ] Optional commit supported
</success_criteria>
