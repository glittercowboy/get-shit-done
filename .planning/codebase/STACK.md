# Technology Stack

**Analysis Date:** 2025-01-10

## Languages

**Primary:**
- JavaScript - `bin/install.js`, `bin/install-opencode.js`, `bin/uninstall-opencode.js`

**Secondary:**
- Markdown - `commands/gsd/*.md`, `get-shit-done/workflows/*.md`, `get-shit-done/templates/*.md`, `get-shit-done/references/*.md`

## Runtime

**Environment:**
- Node.js >=16.7.0 - `package.json`
- No browser runtime (CLI tool only)

**Package Manager:**
- npm - inferred from package.json structure
- No lockfile present

## Frameworks

**Core:**
- Not detected (vanilla Node.js CLI)

**Testing:**
- Not applicable (no automated tests)

**Build/Dev:**
- Not applicable (no build process)

## Key Dependencies

**Critical:**
- Node.js built-ins - fs, path, os, readline for file operations

**Infrastructure:**
- Not applicable

## Configuration

**Environment:**
- No environment variables required
- Configuration via CLI flags and JSON config files

**Build:**
- No build configuration (direct Node.js execution)

## Platform Requirements

**Development:**
- Any platform with Node.js 16.7+

**Production:**
- Distributed as npm package via npx
- Runs on user's Node.js installation

---

*Stack analysis: 2025-01-10*
*Update after major dependency changes*