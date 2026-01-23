<purpose>
Guide to diagnosing GSD issues by reading actual state and comparing against source.
</purpose>

<diagnostic_commands>

## Check Installation

```bash
# Commands installed?
ls ~/.claude/commands/gsd/*.md 2>/dev/null | wc -l

# Workflows installed?
ls ~/.claude/get-shit-done/workflows/*.md 2>/dev/null | wc -l

# In GSD repo?
ls ./commands/gsd/*.md 2>/dev/null | wc -l
```

## Check Project State

```bash
# Project initialized?
ls -la .planning/PROJECT.md .planning/ROADMAP.md .planning/STATE.md

# Current position
cat .planning/STATE.md | head -30

# Config valid?
cat .planning/config.json | python3 -m json.tool

# Phases present
ls .planning/phases/

# Progress (plans vs summaries)
ls .planning/phases/*/*.PLAN.md 2>/dev/null | wc -l
ls .planning/phases/*/*.SUMMARY.md 2>/dev/null | wc -l
```

## Check Git State

```bash
git status
git log --oneline -5
```

</diagnostic_commands>

<issue_patterns>

## Common Issues (Verify Current State)

| Symptom | Check | Likely Fix |
|---------|-------|------------|
| "Project not initialized" | `ls .planning/` | `/gsd:new-project` |
| "Phase not found" | `grep Phase .planning/ROADMAP.md` | Check actual phase numbers |
| "Plan complete" | `ls .planning/phases/XX/*-SUMMARY.md` | Correct - won't re-run |
| "Command not found" | `ls ~/.claude/commands/gsd/` | Reinstall or restart |
| "State wrong" | Compare STATE.md to actual files | `/gsd:progress` recalculates |

## Recovery Commands

**Soft reset:** `npx get-shit-done-cc@latest`

**Config reset:** `rm .planning/config.json`

**Hard reset:** `rm -rf .planning/` then `/gsd:new-project`

</issue_patterns>

<reading_strategy>
To diagnose any issue:
1. Read user's actual state files
2. Read expected behavior from source
3. Compare and identify mismatch
4. Provide specific fix based on actual state
</reading_strategy>
