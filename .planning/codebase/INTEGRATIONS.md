# External Integrations

**Analysis Date:** 2026-01-24

## Runtimes & Editors

**Supported Runtimes:**
- Claude Code (Anthropic's code editor)
  - Config directory: `~/.claude/` (global) or `./.claude/` (local)
  - Command framework: slash commands (`/gsd:command`)

- OpenCode (Open source alternative)
  - Config directory: `~/.config/opencode/` (XDG standard) or `~/.opencode/`
  - Command framework: skills (`/gsd-command` - flat structure)
  - Supports model provider configuration

**Runtime Detection:**
- Installation script (`bin/install.js`) prompts user to select target runtime
- Tool name mapping layer converts Claude Code tools to OpenCode equivalents
- Support for both runtimes simultaneously via `--both` flag

## Tools & Capabilities

**Claude Code Tools (used via agents):**
- Read - File reading capability
- Bash - Shell execution
- Grep - Pattern searching
- Glob - File globbing
- Write - File writing
- AskUserQuestion - Interactive prompts (mapped to `question` in OpenCode)
- TodoWrite - Todo management (mapped to `todowrite` in OpenCode)
- WebFetch - HTTP requests (mapped to `webfetch` in OpenCode)
- WebSearch - Web search (MCP plugin compatibility)
- SlashCommand - Command invocation (mapped to `skill` in OpenCode)

**MCP Tools:**
- WebSearch via Model Context Protocol (MCP plugin system)
- Tool names preserved as `mcp__*` format
- Maintained for compatibility

## External Services

**npm Registry:**
- Package distribution: Published as `get-shit-done-cc`
- Update checking: Version queries via `npm view get-shit-done-cc version`
- Update mechanism: Background hook (`gsd-check-update.js`) with 10-second timeout
- Cache location: `~/.claude/cache/gsd-update-check.json`

**GitHub:**
- Repository: https://github.com/Marco-Cricchio/get-shit-done
- Issue tracking enabled
- Release automation via GitHub Actions
- CI/CD: Automated release creation on tagged commits (v[0-9]+.[0-9]+.[0-9]+)

## Data Storage

**Local Filesystem Only:**
- No external database or cloud storage
- Configuration stored locally in user home directory
- Cache stored in `~/.claude/cache/` or `~/.opencode/`
- Todo management via local JSON files in `~/.claude/todos/`

**State Management:**
- Session-based todos tracked in JSON format
- Update check cache persisted as JSON
- Version tracking via VERSION files in config directories

## Authentication & Identity

**No External Authentication:**
- System operates without external auth providers
- Uses native Claude Code / OpenCode authentication
- Runtime authentication handled by respective editor

**Authorization:**
- File-based permissions configured in `.claude/settings.json` or `.opencode/settings.json`
- Permission gating available via tool-specific allow/deny lists
- Optional granular permission mode instead of `--dangerously-skip-permissions`

## Monitoring & Observability

**Update Notifications:**
- Statusline hook displays update availability indicator
- Cache-based notification system (non-blocking)
- Check runs silently in background during session start

**Logging:**
- No external logging service
- Console output via color-coded terminal messages
- Hook scripts run with `windowsHide` flag to prevent console flashing on Windows

## CI/CD & Deployment

**GitHub Actions:**
- Release workflow: Automatically creates GitHub Release on tag push
- Changelog extraction from CHANGELOG.md
- NPM package published via automated workflow
- No external CI service dependency

**Hosting:**
- npm registry hosts binary
- GitHub hosts source code and releases
- Installation via npx (npm package execution)

## Environment Configuration

**Installation Configuration:**
- Interactive prompts during `bin/install.js` execution
- CLI flags for non-interactive mode:
  - `--claude` / `--opencode` / `--both` - Runtime selection
  - `--global` / `--local` - Installation location
  - `--config-dir <path>` - Custom config directory
  - `--uninstall` / `-u` - Removal mode

**Environment Variables:**
- `CLAUDE_CONFIG_DIR` - Override default Claude Code config location
- `OPENCODE_CONFIG_DIR` - Override default OpenCode config location
- `OPENCODE_CONFIG` - Alternative OpenCode config file location
- `XDG_CONFIG_HOME` - XDG Base Directory spec support for OpenCode

## Tool Mapping Layer

**Claude Code → OpenCode Conversion:**
- Tool name mapping:
  - `AskUserQuestion` → `question`
  - `SlashCommand` → `skill`
  - `TodoWrite` → `todowrite`
  - `WebFetch` → `webfetch`
  - `WebSearch` → `websearch`

- Command syntax conversion:
  - `/gsd:command` → `/gsd-command` (flat structure)

- Directory paths:
  - `~/.claude/` → `~/.config/opencode/` (XDG standard)

**File Migration:**
- Automatic conversion during installation
- Orphaned file cleanup from previous versions
- Hook registration cleanup from settings.json

## Webhooks & Callbacks

**None Detected:**
- System does not expose webhooks
- No incoming webhook endpoints
- No outgoing webhook integrations

## Session Integration

**Session Tracking:**
- Session ID integration with Claude Code/OpenCode
- Current working directory detection
- Context window monitoring via statusline hook
- Task tracking from agent todos

**Model Detection:**
- Statusline displays active model name
- Model information via workspace context
- Used for session-aware features

---

*Integration audit: 2026-01-24*
