# GSD Plugin System

## What This Is

A plugin architecture for Get-Shit-Done that allows developers to extend GSD's functionality through modular, self-contained plugins. Instead of feature creep in the core, new capabilities live in optional plugins that users install as needed. Plugins range from simple command extensions to complex integrations with their own services and Docker containers.

## Core Value

Easy installation, clean separation, and discoverability — plugins install with one command, keep core GSD simple, and are easy to find and understand.

## Requirements

### Validated

- ✓ Command-driven specification system (`/gsd:*` commands) — existing
- ✓ Plans as executable prompts (PLAN.md files) — existing
- ✓ Wave-based parallel execution with subagent orchestration — existing
- ✓ File-based state management (`.planning/` directory) — existing
- ✓ Zero npm dependencies in core — existing
- ✓ Platform-agnostic (macOS, Windows, Linux) — existing

### Active

- [ ] Plugin installation from git repos or local paths (package-manager style)
- [ ] Plugin activation via commands with optional parameters
- [ ] Self-contained plugins (dependencies including Docker containers live in plugin folder)
- [ ] Plugin discovery mechanism (list available/installed plugins)
- [ ] Unified plugin format that scales from simple to complex
- [ ] Comprehensive plugin development documentation with examples (basic to complex)

### Out of Scope

- Plugin marketplace/registry — v1 installs from git repos or local paths only
- Cross-plugin dependencies — plugins must be independent in v1
- Automated plugin updates/versioning — v1 handles install, not lifecycle management

## Context

GSD is itself a "plugin" to Claude Code — it extends Claude Code's capabilities through command files installed to `~/.claude/`. The plugin system brings this same extensibility pattern to GSD itself.

**Motivating example:** A Neo4j knowledge graph plugin that:
- Runs Neo4j in its own Docker container (self-contained)
- Passively captures research/discovery data from all projects
- Builds a semantic skills knowledge graph over time
- Reduces future research token costs by supplying prior discovery data

This example demonstrates the need for plugins that can:
- Include their own services (Docker)
- Hook into GSD workflows (capture research data)
- Maintain persistent state across projects (knowledge graph)
- Be completely optional (not everyone needs this)

**Current architecture:**
- Commands: `commands/gsd/*.md`
- Workflows: `get-shit-done/workflows/*.md`
- Templates: `get-shit-done/templates/*.md`
- Agents: `agents/*.md`
- Installer: `bin/install.js`

## Constraints

- **Compatibility**: Must work with current GSD structure — cannot break existing `.claude/` setup or command system
- **Core simplicity**: Plugin system itself cannot require external services (databases, servers) — only plugins can have such dependencies
- **Runtime**: Node.js >= 16.7.0 (existing requirement)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Single unified plugin format | Flexibility > simplicity; plugins should scale from simple to complex without different tiers | — Pending |
| Package-manager style installation | Familiar pattern, enables git repos as plugin sources | — Pending |
| Self-contained plugins | Plugin folder contains everything including Docker configs; no pollution of core | — Pending |
| No plugin marketplace in v1 | Scope control; git repos/local paths sufficient for initial adoption | — Pending |

---
*Last updated: 2026-01-16 after initialization*
