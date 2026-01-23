# External Integrations

**Analysis Date:** 2026-01-23

## APIs & External Services

**Version Checking:**
- npm registry (registry.npmjs.org)
  - Service: npm package version lookup
  - Used for: `gsd-check-update` hook that checks for GSD updates
  - Client: Node.js `execSync('npm view get-shit-done-cc version')`
  - Timeout: 10 seconds
  - Location: `hooks/gsd-check-update.js` lines 45

**IDE Communication:**
- Claude Code API (proprietary)
  - Service: IDE integration and slash command execution
  - Used for: Installing commands into Claude Code, executing workflows
  - Client: Direct file installation to `~/.claude/` configuration directory
  - Location: `bin/install.js` handles installation

- OpenCode API (open source IDE)
  - Service: Compatible IDE with similar command system
  - Used for: Alternative to Claude Code installation
  - Client: File installation to `~/.config/opencode/` with permission configuration
  - Location: `bin/install.js` handles OpenCode-specific logic (lines 47-795)

## Data Storage

**Local Storage Only:**
- File system: All state and configuration stored locally
  - Installation state: `~/.claude/get-shit-done/` or `.opencode/get-shit-done/`
  - Project plans: `.planning/` directory in project root
  - Todo tracking: `~/.claude/todos/` for session-based task files
  - Cache: `~/.claude/cache/` for update check results

**No Database Services:**
- No remote database connection
- No SQLite or sql.js (explicitly removed in v1.6.x per CHANGELOG.md)
- No cloud storage integration

## Authentication & Identity

**Auth Provider:**
- None used - no authentication system required
- Tools run as local CLI with file-based configuration
- IDE authentication handled by Claude Code/OpenCode separately

## Monitoring & Observability

**Error Tracking:**
- None - no error reporting service

**Logs:**
- Console output from installer
- Silent failures in hooks (intentional - hooks should not break the IDE)
- Optional debug output via stdout

## CI/CD & Deployment

**Hosting:**
- npm public registry for package distribution
- GitHub (https://github.com/glittercowboy/get-shit-done) for source code

**CI Pipeline:**
- npm `prepublishOnly` hook runs `npm run build:hooks` before publishing
- No external CI service (relies on npm's built-in lifecycle hooks)

**Installation Methods:**
- `npx get-shit-done-cc` - Direct npm execution
- `node bin/install.js` - Direct script execution
- Supports Docker and non-interactive environments

## Environment Configuration

**Installation Paths (User-Configurable):**
- Claude Code: `~/.claude/` (default) or `$CLAUDE_CONFIG_DIR` or `--config-dir` flag
- OpenCode: `~/.config/opencode/` (default) or `$OPENCODE_CONFIG_DIR` or `$XDG_CONFIG_HOME/opencode`
- Local: `./.claude/` or `./.opencode/` in project directory

**Settings Files Created/Modified:**
- `settings.json` - Stores statusline and hook configuration for IDE
- `opencode.json` - OpenCode permissions configuration (added in v1.9+)

**Config File Locations:**
- `get-shit-done/get-shit-done/config.json` - Example template for project setup
- Version file: `get-shit-done/VERSION` - Tracks installed version

## Webhooks & Callbacks

**Incoming:**
- None - GSD is a CLI tool, not a server

**Outgoing:**
- None - GSD does not make outbound API calls except for version checking

**IDE Hooks (Local):**
- SessionStart hook: Runs `gsd-check-update.js` in background when IDE session begins
- Statusline hook: Runs `gsd-statusline.js` to render status information in IDE

## Update Mechanism

**Version Checking:**
- `gsd-check-update.js` (`hooks/gsd-check-update.js`)
  - Runs in background when IDE session starts
  - Calls `npm view get-shit-done-cc version` to get latest version
  - Caches result in `~/.claude/cache/gsd-update-check.json` for performance
  - Does not auto-update; only notifies user in statusline

**User Update:**
- Manual: `npx get-shit-done-cc@latest` command
- Or re-run installer: `npx get-shit-done-cc`

## IDE Integrations

**Claude Code (Primary):**
- Installation: Nested command structure at `commands/gsd/*.md`
- Example: `commands/gsd/help.md` → invoked as `/gsd:help`
- Statusline integration: Displays model, current task, directory, and context usage
- Reads from: `~/.claude/todos/` for task tracking

**OpenCode (Secondary):**
- Installation: Flat command structure at `command/gsd-*.md`
- Example: `commands/gsd/help.md` → invoked as `/gsd-help`
- Converted frontmatter: Tool names translated, color names converted to hex
- Permissions: Read and external_directory access granted via `opencode.json`

## No External Dependencies

**Explicitly Removed:**
- sql.js (v1.6.x) - Previously used for graph database, now removed to reduce bundle size

**Never Used:**
- ORM libraries (Prisma, TypeORM, etc.)
- API clients (Stripe, Supabase, etc.)
- Authentication libraries (passport, next-auth, etc.)
- Monitoring/logging services

---

*Integration audit: 2026-01-23*
