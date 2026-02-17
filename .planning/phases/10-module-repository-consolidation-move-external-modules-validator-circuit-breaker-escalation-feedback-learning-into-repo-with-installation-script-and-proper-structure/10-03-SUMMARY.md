---
phase: 10-installation-system
plan: 03
subsystem: installation-hooks-and-mcp
tags: [claude-code-hooks, mcp-configuration, settings-json, statusline, session-start]

dependency_graph:
  requires:
    - Plan 10-01 (installation orchestrator structure)
  provides:
    - Hook installation to ~/.claude/hooks/ with settings.json configuration
    - MCP server configuration with safe merge strategy
    - Idempotent installation scripts (safe to run multiple times)
  affects:
    - User's Claude Code statusline display
    - Session start behavior (update checks)
    - Telegram MCP server availability

tech_stack:
  added:
    - Claude Code settings.json configuration API
    - Atomic file write pattern (tmp + rename)
  patterns:
    - Safe merge strategy for user configuration
    - Cross-platform path handling with forward slashes
    - Backup before modification (.mcp.json.backup)
    - Graceful degradation for missing source files

key_files:
  created:
    - scripts/install-hooks.js (hook installer)
    - scripts/install-mcp.js (MCP config installer)
  modified:
    - .claude/.mcp.json (telegram server configuration)

decisions:
  - decision: Prefer hooks/dist/ over hooks/ source
    rationale: Bundled hooks include dependencies, more reliable for distribution
    alternatives: Always use source (would fail for npx installations)
  - decision: Skip statusLine if already configured (unless --force-statusline)
    rationale: Preserve user's custom statusline configuration
    alternatives: Always overwrite (would break user customization)
  - decision: Merge GSD servers with existing .mcp.json, user servers take precedence
    rationale: Safe for users with existing MCP servers, no data loss
    alternatives: Overwrite entire file (would delete user's servers)
  - decision: Create backup before .mcp.json modification
    rationale: Safety net for recovery if merge goes wrong
    alternatives: No backup (riskier for users)
  - decision: Export single function when required, object when main module
    rationale: Matches install-whisper.js pattern, consistent with orchestrator expectations
    alternatives: Always export object (would require orchestrator refactor)

metrics:
  duration: 2
  completed_date: 2026-02-17
  tasks_completed: 2
  files_created: 2
  files_modified: 1
  commits: 3
---

# Phase 10 Plan 03: Claude Code Hooks & MCP Configuration Summary

Hook installation and MCP server configuration scripts with safe merge strategy, preserving user settings.

## What Was Built

Created two installation scripts that integrate GSD into Claude Code's hook system and MCP server configuration. The hook installer copies statusline and update check hooks to ~/.claude/hooks/ and configures settings.json. The MCP installer creates/updates .claude/.mcp.json with the Telegram MCP server configuration while preserving any existing user servers.

## Tasks Completed

### Task 1: Create hook installation script
**Commit:** 622a73c
**Files:** scripts/install-hooks.js

Created hook installer that:
- Copies gsd-statusline.js and gsd-check-update.js to ~/.claude/hooks/
- Prefers hooks/dist/ if exists (bundled), falls back to hooks/ source
- Configures settings.json with statusLine command
- Adds SessionStart hook for update checks
- Merges with existing settings (preserves user configuration)
- Uses forward slashes for cross-platform path compatibility
- Supports --force-statusline flag to replace existing statusline
- Idempotent: safe to run multiple times

Key features:
- Detects and skips if hooks already configured
- Creates ~/.claude/hooks/ directory if needed
- Handles missing source files gracefully (logs warnings)
- Debug mode with --debug flag

### Task 2: Create MCP server configuration script
**Commit:** 7de36ae
**Files:** scripts/install-mcp.js, .claude/.mcp.json

Created MCP installer that:
- Creates/updates .claude/.mcp.json with telegram MCP server
- Merges with existing config (user servers take precedence)
- Creates backup before modification (.mcp.json.backup)
- Uses atomic write pattern (tmp file + rename)
- Validates JSON before writing
- Reports added vs skipped servers

Telegram MCP server configuration:
```json
{
  "telegram": {
    "command": "node",
    "args": ["mcp-servers/telegram-mcp/dist/index.js"],
    "env": {
      "TELEGRAM_BOT_TOKEN": "${TELEGRAM_BOT_TOKEN}",
      "TELEGRAM_OWNER_ID": "${TELEGRAM_OWNER_ID}"
    }
  }
}
```

Merge strategy ensures:
- GSD servers added as defaults
- User's existing servers preserved
- No data loss on re-run
- Backup available for recovery

## Verification Results

All verification steps passed:

1. ✓ node scripts/install-hooks.js (hooks installed, settings.json updated)
2. ✓ node scripts/install-mcp.js (mcp.json created/merged)
3. ✓ ls ~/.claude/hooks/gsd-*.js (hooks exist)
4. ✓ cat .claude/.mcp.json (telegram server configured)
5. ✓ npm run install:gsd (steps 3 and 4 complete without errors)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed module export pattern mismatch**
- **Found during:** Task 2 verification (npm run install:gsd)
- **Issue:** Scripts exported objects `{ installHooks, configureSettings }` but orchestrator expected single function exports (pattern from install-whisper.js). This caused "require(...) is not a function" error.
- **Fix:** Changed exports to match install-whisper.js pattern - export single function when required as module, run directly when main module.
- **Files modified:** scripts/install-hooks.js, scripts/install-mcp.js
- **Commit:** 7d5dcf0

This was a blocking issue (Rule 3) that prevented the orchestrator from calling the installers. The fix ensures consistency across all installer modules.

## Integration Points

**Provides to Plan 01 (Installation Orchestrator):**
- Step 3: install-hooks.js now callable from orchestrator
- Step 4: install-mcp.js now callable from orchestrator
- Both steps complete successfully in npm run install:gsd

**Provides to Future Plans:**
- Hook system enables statusline display and session-start hooks
- MCP configuration enables Telegram integration for blocking questions
- Patterns established for other installer scripts (env template, health check)

**Integration with existing code:**
- Uses hooks from hooks/ directory (created in earlier phases)
- Configures .claude/.mcp.json (tracked in git per Phase 08.1 decision)
- Follows cross-platform path handling from bin/install.js

## Self-Check: PASSED

### Created Files Verification

- [x] scripts/install-hooks.js exists
- [x] scripts/install-mcp.js exists
- [x] ~/.claude/hooks/gsd-statusline.js exists (installed)
- [x] ~/.claude/hooks/gsd-check-update.js exists (installed)
- [x] .claude/.mcp.json exists with telegram server

### Commits Verification

- [x] 622a73c exists (Task 1: hook installer)
- [x] 7de36ae exists (Task 2: MCP installer)
- [x] 7d5dcf0 exists (Bug fix: export pattern)

### Functional Verification

- [x] npm run install:gsd completes successfully
- [x] Hooks callable when run directly (node scripts/install-hooks.js)
- [x] Hooks callable from orchestrator (require pattern)
- [x] MCP config is valid JSON
- [x] Backup created before .mcp.json modification

All claims verified successfully.
