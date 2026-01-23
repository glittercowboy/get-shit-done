# Workflow: Troubleshoot GSD Issues (Dynamic)

<objective>
Diagnose GSD issues by reading actual state files and comparing against expected behavior from source. Don't guess - verify.
</objective>

<process>

## Step 1: Detect GSD Location

```bash
if [ -f "bin/install.js" ] && [ -d "commands/gsd" ]; then
  GSD_ROOT="."
  GSD_TYPE="repo"
elif [ -d "$HOME/.claude/commands/gsd" ]; then
  GSD_ROOT="$HOME/.claude"
  GSD_TYPE="global"
elif [ -d ".claude/commands/gsd" ]; then
  GSD_ROOT=".claude"
  GSD_TYPE="local"
else
  GSD_ROOT="NOT_FOUND"
fi
```

## Step 2: Gather Symptom Context

Ask if not provided:
1. What command did you run?
2. What did you expect?
3. What actually happened (exact error)?
4. What did you do before this?

## Step 3: Check Fundamentals

Run these checks to verify basic setup:

```bash
# Project initialized?
ls -la .planning/PROJECT.md .planning/ROADMAP.md .planning/STATE.md 2>/dev/null

# Commands installed?
ls {GSD_ROOT}/commands/gsd/*.md 2>/dev/null | wc -l

# Workflows installed?
ls {GSD_ROOT}/get-shit-done/workflows/*.md 2>/dev/null | wc -l

# Agents installed?
ls {GSD_ROOT}/agents/gsd-*.md 2>/dev/null | wc -l
```

**Common fundamental issues:**
- No `.planning/` → Run `/gsd:new-project` first
- No commands → Run `npx get-shit-done-cc@latest`
- Commands but no workflows → Reinstall

## Step 4: Read User's Current State

```bash
# Current position and context
cat .planning/STATE.md

# Configuration
cat .planning/config.json

# Phase status
cat .planning/ROADMAP.md

# What phases exist
ls .planning/phases/

# Plans vs summaries (completion status)
ls .planning/phases/*/*.PLAN.md 2>/dev/null | wc -l
ls .planning/phases/*/*.SUMMARY.md 2>/dev/null | wc -l
```

## Step 5: Read Expected Behavior

Based on the symptom, read the source to understand what SHOULD happen:

```bash
# For command issues
cat {GSD_ROOT}/commands/gsd/{command}.md

# For workflow issues
cat {GSD_ROOT}/get-shit-done/workflows/{workflow}.md

# For agent issues
cat {GSD_ROOT}/agents/gsd-{agent}.md
```

## Step 6: Compare Expected vs Actual

| Check | How to Verify |
|-------|---------------|
| Phase number valid | `grep "Phase" .planning/ROADMAP.md` |
| Plan exists | `ls .planning/phases/XX-name/*-PLAN.md` |
| Already completed | `ls .planning/phases/XX-name/*-SUMMARY.md` |
| Config valid | `cat .planning/config.json \| python -m json.tool` |
| State consistent | Compare STATE.md position with actual files |

## Step 7: Diagnose and Fix

Based on findings, provide:

1. **Root cause** - What's actually wrong
2. **Why it happened** - How they got here
3. **Fix** - Exact commands to run
4. **Verification** - How to confirm it's fixed
5. **Prevention** - How to avoid this

</process>

<diagnostic_patterns>

## Common Issues and Checks

**"Project not initialized"**
```bash
ls -la .planning/ 2>/dev/null || echo "No .planning directory"
```
Fix: `/gsd:new-project`

**"Phase not found"**
```bash
cat .planning/ROADMAP.md | grep -E "Phase [0-9]"
ls .planning/phases/
```
Fix: Check actual phase numbers, may be different than expected

**"Plan already complete"**
```bash
ls .planning/phases/XX-name/*-SUMMARY.md
```
This is correct behavior - GSD won't re-run completed plans.

**"State out of sync"**
```bash
# Count summaries (actual progress)
find .planning/phases -name "*-SUMMARY.md" | wc -l

# Compare to STATE.md claims
cat .planning/STATE.md | grep -A5 "Current Position"
```
Fix: Manually update STATE.md or run `/gsd:progress`

**"Config invalid"**
```bash
cat .planning/config.json | python3 -m json.tool 2>&1
```
Fix: Recreate via `/gsd:settings` or fix JSON manually

**"Git issues"**
```bash
git status
git log --oneline -5
```
Fix: Resolve conflicts/changes before GSD commands

</diagnostic_patterns>

<recovery_procedures>

## When Things Go Wrong

**Soft reset (keep state):**
```bash
npx get-shit-done-cc@latest
```

**Medium reset (keep project):**
```bash
rm .planning/config.json
# Next command prompts for config
```

**Recover interrupted execution:**
```bash
# See what completed
ls .planning/phases/*/*.SUMMARY.md

# See git state
git log --oneline -10

# Delete incomplete SUMMARY files
rm .planning/phases/XX-name/XX-YY-SUMMARY.md  # if no commit

# Re-run
/clear
/gsd:execute-phase N
```

**Hard reset (start over):**
```bash
# BACKUP FIRST
cp -r .planning/ .planning-backup-$(date +%Y%m%d)

rm -rf .planning/
/gsd:new-project
```

</recovery_procedures>

<success_criteria>
- Read actual state files (not assumptions)
- Compare against source behavior
- Identify specific root cause
- Provide exact fix commands
- Verify fix resolves issue
</success_criteria>
