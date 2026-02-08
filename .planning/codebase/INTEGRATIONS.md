# External Integrations

**Analysis Date:** 2026-02-08

## APIs & External Services

**Package Registry:**
- npm registry - Version checking for updates
  - Integration method: `npm view get-shit-done-cc version` command executed via `child_process.execSync`
  - Location: `hooks/gsd-check-update.js` (line 45)
  - Purpose: Check for newer versions of GSD package
  - Auth: None required (public npm registry)
  - Timeout: 10 seconds
  - Caching: Results cached to `~/.claude/cache/gsd-update-check.json`

**External APIs:**
- None - No REST APIs, GraphQL, or HTTP clients used

## Data Storage

**Databases:**
- None - No database connections or ORMs

**File Storage:**
- Local filesystem only - All data stored in:
  - AI IDE config directories (`~/.claude/`, `~/.gemini/`, `~/.cursor/`, `~/.config/opencode/`)
  - Project-local directories (`.claude/`, `.gemini/`, `.cursor/`)
  - Cache directory: `~/.claude/cache/` for update check results
  - Todo storage: `~/.claude/todos/` (session-based JSON files)

**Caching:**
- File-based cache - Update check results stored in JSON file
  - Location: `~/.claude/cache/gsd-update-check.json`
  - Format: `{ update_available: boolean, installed: string, latest: string, checked: number }`

## Authentication & Identity

**Auth Provider:**
- None - No authentication or identity services

**OAuth Integrations:**
- None

## Monitoring & Observability

**Error Tracking:**
- None - Errors handled silently in hooks (fail gracefully to avoid breaking statusline)

**Analytics:**
- None

**Logs:**
- Console output only - Installation script uses `console.log`/`console.error`
- No structured logging or log aggregation

## CI/CD & Deployment

**Hosting:**
- npm registry - Package distribution via npm
  - Package name: `get-shit-done-cc`
  - Repository: GitHub (`git+https://github.com/glittercowboy/get-shit-done.git`)
  - Deployment: Manual via `npm publish` (after `prepublishOnly` hook runs build)

**CI Pipeline:**
- Not detected - No CI configuration files (`.github/workflows/`, `.gitlab-ci.yml`, etc.) found in root
- Note: GitHub repository exists but CI workflows not present in this codebase

## Environment Configuration

**Required env vars:**
- None required - All environment variables are optional overrides for config directory paths

**Optional env vars:**
- `CLAUDE_CONFIG_DIR` - Custom Claude Code config directory
- `GEMINI_CONFIG_DIR` - Custom Gemini CLI config directory
- `CURSOR_CONFIG_DIR` - Custom Cursor IDE config directory
- `OPENCODE_CONFIG_DIR` - Custom OpenCode config directory
- `XDG_CONFIG_HOME` - XDG Base Directory config home (affects OpenCode default location)

**Secrets location:**
- No secrets required - All operations use public npm registry and local filesystem

## Webhooks & Callbacks

**Incoming:**
- None - No webhook endpoints or HTTP servers

**Outgoing:**
- None - No outgoing webhooks or callbacks

## Runtime-Specific Integrations

**Claude Code:**
- Config directory: `~/.claude/` (or `CLAUDE_CONFIG_DIR`)
- Settings file: `settings.json` (hooks, statusline configuration)
- Commands: `commands/gsd/` directory
- Agents: `agents/gsd-*.md` files

**OpenCode:**
- Config directory: `~/.config/opencode/` (or `OPENCODE_CONFIG_DIR` / `XDG_CONFIG_HOME/opencode`)
- Config file: `opencode.json` (permissions configuration)
- Commands: `command/gsd-*.md` files (flat structure)
- Uses XDG Base Directory specification

**Gemini CLI:**
- Config directory: `~/.gemini/` (or `GEMINI_CONFIG_DIR`)
- Settings file: `settings.json` (hooks, experimental agents config)
- Commands: `commands/gsd/` directory (TOML format)
- Agents: `agents/gsd-*.md` files (converted frontmatter format)

**Cursor IDE:**
- Config directory: `~/.cursor/` (or `CURSOR_CONFIG_DIR`)
- Settings file: `settings.json` (minimal hook support)
- Commands: `commands/gsd/` directory
- Agents: `agents/gsd-*.md` files (simplified frontmatter)
- No statusline support

---

*Integration audit: 2026-02-08*
