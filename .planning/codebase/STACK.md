# Technology Stack

**Analysis Date:** 2026-02-08

## Languages

**Primary:**
- JavaScript (Node.js) - All codebase files (`bin/install.js`, `hooks/*.js`, `scripts/*.js`)

**Configuration:**
- JSON - Package manifests, settings files (`package.json`, `package-lock.json`)
- Markdown - Documentation, commands, agents, templates (`.md` files throughout)
- YAML - Frontmatter in markdown files (agent/command definitions)

## Runtime

**Environment:**
- Node.js >= 16.7.0
- Specified in `package.json` engines field

**Package Manager:**
- npm (latest)
- Lockfile: `package-lock.json` (lockfileVersion 3, present)

## Frameworks

**Core:**
- None - Pure Node.js with standard library only

**Testing:**
- Not detected - No test framework or test files found

**Build/Dev:**
- esbuild ^0.24.0 - Build tool for bundling hooks (dev dependency only)
  - Used in `scripts/build-hooks.js` to copy hooks to `hooks/dist/` directory
  - Build command: `npm run build:hooks`

## Key Dependencies

**Critical:**
- None - Zero production dependencies (`dependencies: {}` in `package.json`)

**Infrastructure:**
- esbuild ^0.24.0 (dev only) - Used for build process, not runtime

## Configuration

**Environment:**
- No `.env` files required
- Runtime detection via environment variables:
  - `CLAUDE_CONFIG_DIR` - Overrides default `~/.claude` location
  - `GEMINI_CONFIG_DIR` - Overrides default `~/.gemini` location
  - `CURSOR_CONFIG_DIR` - Overrides default `~/.cursor` location
  - `OPENCODE_CONFIG_DIR` - Overrides default `~/.config/opencode` location
  - `XDG_CONFIG_HOME` - Used for OpenCode XDG Base Directory spec compliance

**Build:**
- Build config: `scripts/build-hooks.js` - Simple file copy script
- Pre-publish hook: `prepublishOnly` runs `npm run build:hooks` before npm publish

## Platform Requirements

**Development:**
- Node.js >= 16.7.0
- npm (for package management)
- Git (for version control)
- Cross-platform: Windows, macOS, Linux (uses Node.js path/os modules for compatibility)

**Production:**
- Distribution: npm registry (`get-shit-done-cc` package)
- Installation: Via `npx get-shit-done-cc` (no build step required for end users)
- Target platforms: Claude Code, OpenCode, Gemini CLI, Cursor IDE config directories

---

*Stack analysis: 2026-02-08*
