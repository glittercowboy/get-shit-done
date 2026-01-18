---
name: gsd:doctor
description: Diagnose common GSD setup and project issues (config, hooks, git)
allowed-tools:
  - Read
  - Bash
  - Grep
  - Glob
  - AskUserQuestion
---

<objective>
Run a health check for GSD installation + current project.

Detects:
- Missing or invalid `.planning/config.json`
- Missing planning artifacts (STATE/ROADMAP/PROJECT)
- Missing required hooks/scripts in Claude config dir
- Dirty git status that may cause confusing diffs/conflicts

Outputs a concise report with fix commands.
</objective>

<execution_context>
@~/.claude/get-shit-done/references/ui-brand.md
</execution_context>

<process>

## 1. Environment

```bash
node --version 2>/dev/null || echo "node: missing"
git --version 2>/dev/null || echo "git: missing"
```

## 2. Project Structure

```bash
ls .planning 2>/dev/null || echo ".planning: missing"
ls .planning/config.json 2>/dev/null || echo ".planning/config.json: missing"
ls .planning/STATE.md 2>/dev/null || echo ".planning/STATE.md: missing"
ls .planning/ROADMAP.md 2>/dev/null || echo ".planning/ROADMAP.md: missing"
ls .planning/PROJECT.md 2>/dev/null || echo ".planning/PROJECT.md: missing"
```

If `.planning/` is missing: recommend `/gsd:new-project` and stop.

## 3. Config Validation (schema + JSON)

```bash
node ~/.claude/hooks/gsd-config.js validate || true
```

If missing keys detected: recommend `/gsd:migrate-config`.
If invalid JSON: recommend `/gsd:migrate-config` (or `/gsd:settings --reset`).

## 4. Hook Install Check

Validate required hook scripts exist:

```bash
ls ~/.claude/hooks/gsd-config.js 2>/dev/null || echo "missing: hooks/gsd-config.js"
ls ~/.claude/hooks/statusline.js 2>/dev/null || echo "missing: hooks/statusline.js"
ls ~/.claude/hooks/gsd-check-update.js 2>/dev/null || echo "missing: hooks/gsd-check-update.js"
```

If any missing: recommend reinstall/update:
```bash
npx get-shit-done-cc@latest --global
```

## 5. Git Status

```bash
git rev-parse --is-inside-work-tree 2>/dev/null && git status --porcelain || true
```

If dirty: warn that plan execution may create mixed diffs; recommend committing/stashing before `/gsd:execute-phase`.

## 6. Next Steps

Based on findings, present 1-3 recommended actions, e.g.:
- `/gsd:new-project`
- `/gsd:migrate-config`
- `/gsd:settings`
- Reinstall via `npx get-shit-done-cc@latest --global`

</process>

<success_criteria>
- [ ] Produces a clear health report
- [ ] Detects missing/invalid config and suggests migration
- [ ] Detects missing hooks and suggests reinstall
- [ ] Detects dirty git status and warns
</success_criteria>
