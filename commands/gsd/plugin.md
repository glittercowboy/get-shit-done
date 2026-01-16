---
name: gsd:plugin
description: Manage GSD plugins (install, uninstall, list)
argument-hint: "<action> [source]"
allowed-tools: [Bash, Read]
---

<overview>
Plugin management for GSD. Install plugins from git repositories or local paths.

**Usage:**
- `/gsd:plugin install <git-url>` - Install from git repo
- `/gsd:plugin install <local-path>` - Install from local folder
- `/gsd:plugin list` - List installed plugins (Phase 3)
- `/gsd:plugin uninstall <name>` - Remove plugin (Phase 3)
</overview>

<process>
Parse the user's command and execute the appropriate action.

**For install:**
1. Extract source (git URL or local path) from user's message
2. Run the plugin installer:
   ```bash
   node ~/.claude/get-shit-done/bin/plugin.js install <source>
   ```
3. Report results to user

**For list:**
Tell user: "The `list` command is not yet implemented. It will be available in Phase 3."

**For uninstall:**
Tell user: "The `uninstall` command is not yet implemented. It will be available in Phase 3."

**If no action specified:**
Show usage help:
```
GSD Plugin Manager

Usage:
  /gsd:plugin install <git-url>    Install from git repository
  /gsd:plugin install <path>       Install from local folder
  /gsd:plugin list                 List installed plugins
  /gsd:plugin uninstall <name>     Remove a plugin

Examples:
  /gsd:plugin install https://github.com/user/my-plugin
  /gsd:plugin install ./my-local-plugin
```
</process>
