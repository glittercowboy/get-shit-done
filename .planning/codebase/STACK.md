# Technology Stack

**Analysis Date:** 2026-01-24

## Languages

**Primary:**
- JavaScript (Node.js) - Main runtime for CLI, hooks, and installation scripts
- Markdown - All agent instructions, command definitions, and workflow documentation

**Supporting:**
- YAML - GitHub Actions workflow definitions
- JSON - Configuration files, package manifests, settings

## Runtime

**Environment:**
- Node.js >=16.7.0 (runtime requirement specified in `package.json`)
- Runs on macOS, Windows, and Linux

**Package Manager:**
- npm (Node Package Manager)
- Lockfile: `package-lock.json` present (v3 format)

## Frameworks

**Build/Dev:**
- esbuild ^0.24.0 - Bundler for hooks (used via `npm run build:hooks`)
- Used for compiling hook scripts for distribution

**CLI/Runtime:**
- No external framework dependencies (pure Node.js)
- Uses native Node.js modules: `fs`, `path`, `os`, `readline`, `child_process`
- CLI orchestration through manual invocation chain

## Key Dependencies

**Production:**
- None - Zero runtime dependencies (only native Node.js)

**Development:**
- esbuild ^0.24.0 - For hook compilation and distribution

## Configuration

**Environment:**
- Runtime configuration stored in `~/.claude/` or `~/.opencode/` directories depending on installation target
- Project-level config stored in `./.claude/` or `./.opencode/` for local installations
- CLAUDE_CONFIG_DIR and OPENCODE_CONFIG_DIR environment variables for custom config paths

**Build:**
- `package.json` - Main manifest with version (2.0.0), dependencies, and build scripts
- `scripts/build-hooks.js` - Build script that copies hooks to `hooks/dist/`
- Prepublish hook runs build automatically before npm publish

**npm Scripts:**
- `npm run build:hooks` - Compile and copy hooks to distribution directory
- `prepublishOnly` - Auto-builds hooks before package publication

## Platform Requirements

**Development:**
- Node.js 16.7.0 or higher
- npm (or compatible package manager)
- Standard Unix-like shell (bash/zsh) for CLI operations

**Installation Target:**
- Claude Code editor or OpenCode IDE
- Global installation: `~/.claude/` (Claude Code) or `~/.config/opencode/` (OpenCode)
- Local installation: `./.claude/` or `./.opencode/` within project

**Distribution:**
- Published as npm package: `get-shit-done-cc`
- Installed via `npx get-shit-done-cc` (no global installation required)

## Package Information

**Name:** get-shit-done-cc

**Version:** 2.0.0

**License:** MIT

**Repository:** https://github.com/Marco-Cricchio/get-shit-done

**Bin Entry Point:** `bin/install.js` - Interactive installer prompts for runtime (Claude Code/OpenCode) and installation location (global/local)

## File Distribution

**Included in npm package (`files` in package.json):**
- `bin/` - Installation script and entry point
- `commands/` - Command definitions for GSD system
- `get-shit-done/` - Templates, references, and workflow documentation
- `agents/` - Agent instruction files (markdown)
- `hooks/dist/` - Compiled hook scripts
- `scripts/` - Build utilities

## Update Mechanism

**Update Checking:**
- `hooks/gsd-check-update.js` - Background hook that checks for updates via npm registry
- Runs during session start
- Compares installed version against latest published version
- Caches result in `~/.claude/cache/gsd-update-check.json`
- Updates triggered by: `/gsd:update` command

---

*Stack analysis: 2026-01-24*
