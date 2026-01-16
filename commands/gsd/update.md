---
name: gsd:update
description: Update GSD to latest version with changelog display
---

<objective>
Check for GSD updates, install if available, and display what changed.

Provides a better update experience than raw `npx get-shit-done-cc` by showing version diff and changelog entries.
</objective>

<process>

<step name="get_installed_version">
Read installed version:

```bash
cat ~/.claude/get-shit-done/VERSION 2>/dev/null
```

**If VERSION file missing:**
```
## GSD Update

**Installed version:** Unknown

Your installation doesn't include version tracking.

Running fresh install...
```

Proceed to install step (treat as version 0.0.0 for comparison).
</step>

<step name="check_latest_version">
Check npm for latest version:

```bash
npm view get-shit-done-cc version 2>/dev/null
```

**If npm check fails:**
```
Couldn't check for updates (offline or npm unavailable).

To update manually: `npx get-shit-done-cc --global`
```

STOP here if npm unavailable.
</step>

<step name="compare_versions">
Compare installed vs latest:

**If installed == latest:**
```
## GSD Update

**Installed:** X.Y.Z
**Latest:** X.Y.Z

You're already on the latest version.
```

STOP here if already up to date.

**If installed > latest:**
```
## GSD Update

**Installed:** X.Y.Z
**Latest:** A.B.C

You're ahead of the latest release (development version?).
```

STOP here if ahead.
</step>

<step name="run_update">
Run the update:

```bash
npx get-shit-done-cc --global
```

Capture output. If install fails, show error and STOP.
</step>

<step name="fetch_changelog">
Fetch changelog from GitHub:

Use WebFetch tool with:
- URL: `https://raw.githubusercontent.com/glittercowboy/get-shit-done/main/CHANGELOG.md`
- Prompt: "Extract all version entries with their dates and changes. Return the raw markdown for each version section."

**If fetch fails:**
Fall back to local:
```bash
cat ~/.claude/get-shit-done/CHANGELOG.md 2>/dev/null
```
</step>

<step name="extract_changes">
From the changelog, extract entries between:
- **From:** installed version (exclusive)
- **To:** latest version (inclusive)

Parse each `## [X.Y.Z]` section and collect all versions in the range.
</step>

<step name="display_result">
Format beautiful output:

```
╔═══════════════════════════════════════════════════════════╗
║  GSD Updated: v1.5.10 → v1.5.15                           ║
╚═══════════════════════════════════════════════════════════╝

✨ What's New
────────────────────────────────────────────────────────────

## [1.5.15] - 2026-01-20

### Added
- Feature X
- Feature Y

## [1.5.14] - 2026-01-18

### Fixed
- Bug in feature A

────────────────────────────────────────────────────────────

⚠️  Restart Claude Code to pick up the new commands.

[View full changelog](https://github.com/glittercowboy/get-shit-done/blob/main/CHANGELOG.md)
```

**Key elements:**
- Box header with version transition
- All changelog entries in the range
- **BREAKING:** changes surfaced prominently
- Restart reminder (critical for picking up new commands)
- Link to full changelog
</step>

</process>

<success_criteria>
- [ ] Installed version read correctly
- [ ] Latest version checked via npm
- [ ] Update skipped if already current
- [ ] Update executed successfully
- [ ] Changelog fetched (remote or local fallback)
- [ ] Changes between versions displayed
- [ ] Restart reminder shown
</success_criteria>
