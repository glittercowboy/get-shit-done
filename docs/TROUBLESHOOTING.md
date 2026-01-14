# GSD Troubleshooting Guide

Platform-specific debugging and issue resolution for Claude Code and OpenCode.

---

## Platform Detection

### How the Installer Determines Platform

The installer prompts you to select a platform during installation:

```bash
npx get-shit-done-cc
# Choose: 1) Claude Code or 2) OpenCode
```

You can also specify the platform explicitly:

```bash
npx get-shit-done-cc --platform claude-code --global
npx get-shit-done-cc --platform opencode --global
```

### Wrong Platform Detected

If you installed for the wrong platform:

1. Remove the existing installation:
   ```bash
   # Claude Code
   rm -rf ~/.claude/commands/gsd ~/.claude/get-shit-done

   # OpenCode
   rm -rf ~/.config/opencode/command/gsd ~/.config/opencode/gsd
   ```

2. Reinstall with the correct platform:
   ```bash
   npx get-shit-done-cc --platform [claude-code|opencode]
   ```

---

## Claude Code Issues

### Command Not Found

**Problem:** Running `/gsd:help` returns "command not found"

**Solutions:**

1. Verify files exist:
   ```bash
   ls ~/.claude/commands/gsd/
   ```
   Should show multiple `.md` files.

2. Restart Claude Code to reload slash commands

3. Check for custom config directory:
   ```bash
   echo $CLAUDE_CONFIG_DIR
   ```
   If set, reinstall with:
   ```bash
   CLAUDE_CONFIG_DIR=~/.claude-custom npx get-shit-done-cc --platform claude-code --global
   ```

### Permission Errors

**Problem:** Commands run but Bash operations fail with permission errors

**Solutions:**

1. **Recommended:** Run Claude Code with skip permissions mode:
   ```bash
   claude --dangerously-skip-permissions
   ```

2. **Alternative:** Add granular permissions to `.claude/settings.json`:
   ```json
   {
     "permissions": {
       "allow": [
         "Bash(date:*)",
         "Bash(git add:*)",
         "Bash(git commit:*)",
         "Bash(git status:*)",
         "Bash(mkdir:*)",
         "Bash(cat:*)",
         "Bash(ls:*)"
       ]
     }
   }
   ```

### Custom Config Directory

**Problem:** Need to install to custom location (e.g., `~/.claude-bc`)

**Solution:**

Use `--config-dir` flag:
```bash
npx get-shit-done-cc --platform claude-code --global --config-dir ~/.claude-bc
```

Or set environment variable:
```bash
CLAUDE_CONFIG_DIR=~/.claude-bc npx get-shit-done-cc --platform claude-code --global
```

---

## OpenCode Issues

### Agent Visibility (Tab-Cycle Bug)

**Problem:** Custom GSD agents don't appear when pressing Tab to cycle through agents

**Cause:** Known OpenCode platform bug where custom agents may not register in Tab-cycle UI

**Workarounds:**

1. Type the agent name directly: `@execute-plan`, `@explore`, `@plan`
2. Use command palette (if available) to select agents
3. Use general-purpose agent for GSD commands: `@general`

**Status:** Platform-level issue, not fixable in GSD

### YAML Parsing Crashes with Unquoted Values

**Problem:** OpenCode crashes or errors when parsing frontmatter with unquoted special values

**Example:**
```yaml
---
depends_on: [04-01]  # May crash if 04-01 parsed as float
---
```

**Solution:**

GSD installer handles this automatically by quoting values during transformation. If you manually edit `.opencode/command/` files:

```yaml
# Bad
depends_on: [04-01]

# Good
depends_on: ["04-01"]
```

**Status:** Platform parser limitation, GSD installer applies workarounds

### Agent Permission Errors

**Problem:** Agent tries to use tools it doesn't have permission for

**Cause:** OpenCode uses explicit permission model in agent definitions

**Solution:**

Check `.opencode/agent/*.md` files for correct permissions:

```yaml
# execute-plan agent
permissions:
  edit: allow
  bash: allow
  webfetch: deny

# explore agent
permissions:
  edit: deny
  bash: allow
  webfetch: deny
```

If permissions are wrong, reinstall GSD:
```bash
npx get-shit-done-cc --platform opencode --global
```

---

## Installation Issues

### Path Resolution: ~/.claude vs ~/.config/opencode

**Problem:** Commands reference wrong paths after installation

**Expected Behavior:**

| Platform | Global Path | Local Path |
|----------|-------------|------------|
| Claude Code | `~/.claude/` | `./.claude/` |
| OpenCode | `~/.config/opencode/` | `.opencode/` |

**Verification:**

```bash
# Claude Code
cat ~/.claude/commands/gsd/new-project.md | grep "@~"

# OpenCode
cat ~/.config/opencode/command/gsd/new-project.md | grep "@~"
```

Paths should match the platform's convention.

**Fix:** Reinstall with correct platform flag.

### Manual Installation Steps

If `npx` fails, install manually:

1. Clone the repository:
   ```bash
   git clone https://github.com/glittercowboy/get-shit-done.git
   cd get-shit-done
   ```

2. Run installer:
   ```bash
   node bin/install.js --platform claude-code --global
   ```

### Verifying Installation

**Claude Code:**
```bash
ls ~/.claude/commands/gsd/
ls ~/.claude/get-shit-done/
# Should show GSD files
```

Launch Claude Code and run: `/gsd:help`

**OpenCode:**
```bash
ls ~/.config/opencode/command/gsd/
ls ~/.config/opencode/gsd/
# Should show GSD files
```

Launch OpenCode and run: `@general` (then test GSD commands)

---

## Command Execution

### @-Reference Resolution

**Problem:** Commands fail with "file not found" when reading @-references

**Cause:** Path in @-reference doesn't exist or uses wrong platform convention

**Example:**
```
@~/.claude/get-shit-done/workflows/execute-plan.md  # Claude Code
@~/.config/opencode/gsd/workflows/execute-plan.md   # OpenCode
```

**Solution:**

1. Verify file exists at referenced path
2. Check that installer transformed paths correctly
3. Reinstall if paths are wrong

### $ARGUMENTS Not Working

**Problem:** Commands with `$ARGUMENTS` variable don't receive input

**Cause:** Both platforms support `$ARGUMENTS`, but syntax matters

**Correct Usage:**
```xml
<objective>
Execute plan for phase $ARGUMENTS
</objective>
```

**Verification:**

Test with a simple command:
```bash
/gsd:plan-phase 1     # Claude Code
@general /gsd:plan-phase 1  # OpenCode
```

If `$ARGUMENTS` is empty, check that you're passing the argument correctly.

### Frontmatter Errors

**Problem:** Commands fail to parse or execute due to frontmatter issues

**Common Causes:**

1. **Invalid YAML syntax:**
   ```yaml
   # Bad
   depends_on: [1, 2, 3]  # May parse as numbers

   # Good
   depends_on: ["1", "2", "3"]
   ```

2. **Missing required fields:**
   ```yaml
   # Claude Code requires 'name'
   ---
   name: gsd:command-name
   ---

   # OpenCode doesn't use 'name'
   ---
   description: Command description
   ---
   ```

**Solution:**

Don't manually edit frontmatter. Reinstall GSD to get correct platform-specific format:
```bash
npx get-shit-done-cc --platform [your-platform] --global
```

---

## Known Platform Limitations

### OpenCode

- **Agent visibility:** Custom agents may not Tab-cycle (use direct names)
- **YAML parsing:** Unquoted numeric-like values can crash parser
- **Permission model:** Explicit tool permissions required in agent definitions

### Claude Code

- **Permission prompts:** Can interrupt workflow unless `--dangerously-skip-permissions` used
- **Custom config:** Requires `CLAUDE_CONFIG_DIR` env var or `--config-dir` flag

---

## Getting Help

If you encounter issues not covered here:

1. Check the [GitHub Issues](https://github.com/glittercowboy/get-shit-done/issues)
2. Review `.planning/STATE.md` for known blockers
3. File a new issue with:
   - Platform (Claude Code or OpenCode)
   - Installation method (global/local)
   - Full error message
   - Output of verification commands above

---

**Last Updated:** 2026-01-14
