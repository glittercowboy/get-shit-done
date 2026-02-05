# GSD Cursor Integration

## What This Is

Adding Cursor IDE support to the main GSD installer (`bin/install.js`) by consolidating the conversion logic from `cursor-gsd/scripts/migrate.sh`. This enables users to install GSD directly to `~/.cursor/` using `npx get-shit-done-cc --cursor --global`.

## Core Value

Single unified installer that supports all AI runtimes (Claude Code, OpenCode, Gemini, Cursor) with consistent behavior and conversion logic.

## Requirements

### Validated

- ✓ Multi-runtime installer supporting Claude Code, OpenCode, Gemini — existing
- ✓ Path replacement during installation (`~/.claude/` → target path) — existing
- ✓ Frontmatter conversion (`allowed-tools:` → `tools:` object) — existing
- ✓ Tool name mapping per runtime — existing
- ✓ Color name to hex conversion — existing
- ✓ Global and local install modes — existing
- ✓ Interactive and flag-based runtime selection — existing
- ✓ Settings.json hook configuration — existing
- ✓ Hooks bundling and deployment — existing

### Active

- [ ] Add `--cursor` flag to installer CLI
- [ ] Add Cursor to runtime selection prompt
- [ ] Implement Cursor-specific path conversion (`~/.claude/` → `~/.cursor/`)
- [ ] Implement Cursor command format conversion (`/gsd:` → `/gsd-`)
- [ ] Implement Cursor tool name mapping (same as existing snake_case pattern)
- [ ] Configure Cursor install directory (`~/.cursor/` global only)
- [ ] Remove `cursor-gsd/` subfolder after consolidation

### Out of Scope

- Local install for Cursor — keeping global-only for simplicity
- Cursor-specific hooks changes — reuse existing Claude Code hooks pattern
- New UI for cursor-gsd standalone distribution — consolidating into main installer

## Context

The `cursor-gsd/` subfolder contains a separate adaptation of GSD for Cursor IDE, with its own migration and install scripts. The migration script (`migrate.sh`) performs these conversions:

1. **Path references:** `~/.claude/` → `~/.cursor/`
2. **Command references:** `/gsd:cmd` → `/gsd-cmd` (files) — Cursor displays as `/gsd/cmd`
3. **Tool names:** PascalCase → snake_case (Read → read, Write → write)
4. **Frontmatter:** `allowed-tools:` array → `tools:` object with booleans
5. **Colors:** Named colors → hex values

The main installer already handles most of these conversions for OpenCode and Gemini. The task is to add Cursor as another runtime option using the same patterns.

## Constraints

- **No new dependencies** — maintain zero runtime dependencies
- **Reuse existing patterns** — Cursor conversion should follow OpenCode/Gemini approach
- **Backward compatible** — existing Claude/OpenCode/Gemini installs unaffected

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Global-only for Cursor | Simplify initial implementation, local installs less common | — Pending |
| Reuse Claude Code hooks | Cursor shares similar hook system | — Pending |
| Remove cursor-gsd after consolidation | Eliminate duplicate code and maintenance burden | — Pending |

---
*Last updated: 2026-02-05 after initialization*
