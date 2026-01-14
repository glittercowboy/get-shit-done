# GSD Multi-Agent

## What This Is

A multi-agent port of the Get Shit Done (GSD) framework that supports both Claude Code and OpenCode. The installer asks which agent platform to target, then installs the appropriate directory structure and commands. Full feature parity with the existing Claude Code version.

## Core Value

Full feature parity on OpenCode — every GSD command works identically on both agent platforms.

## Requirements

### Validated

- ✓ 26 slash commands for project workflow — existing
- ✓ 16 workflows for execution logic — existing
- ✓ 21 templates for document generation — existing
- ✓ 14 references for conceptual guidance — existing
- ✓ Wave-based parallel execution — existing
- ✓ Context engineering (2-3 tasks/plan, fresh subagent contexts) — existing
- ✓ Atomic git commits per task — existing
- ✓ npm package distribution (`get-shit-done-cc`) — existing

### Active

- [ ] OpenCode port with full feature parity
- [ ] Multi-agent installer (asks: Claude Code or OpenCode?)
- [ ] OpenCode directory structure (`.opencode/command/`, `.opencode/agent/`)
- [ ] OpenCode YAML frontmatter format adaptation
- [ ] Shared source files where possible (commands, workflows, templates, references)
- [ ] Agent-specific adapters only where platform differences require

### Out of Scope

- Other agent platforms (Cursor, Windsurf, Aider, etc.) — v1 is Claude Code + OpenCode only
- New features beyond current GSD — pure port, no additions
- Breaking changes to Claude Code version — must maintain backwards compatibility

## Context

GSD is a meta-prompting framework solving "context rot" (quality degradation as Claude's context fills). It's 99% markdown files with a single Node.js installer.

**Key platform differences (from research):**
- Claude Code: `.claude/commands/`, `allowed-tools` in frontmatter
- OpenCode: `.opencode/command/`, `tools` in frontmatter, explicit `agent` definitions
- OpenCode agents live in `.opencode/agent/*.md` with model/tool configurations
- OpenCode uses `$ARGUMENTS` same as Claude Code

**Existing codebase mapped in `.planning/codebase/`:**
- STACK.md — Node.js 16.7+, zero dependencies
- ARCHITECTURE.md — Layered meta-prompting, wave execution
- STRUCTURE.md — 26 commands, 16 workflows, 21 templates, 14 references
- CONVENTIONS.md — Kebab-case, XML semantic tags, commit formats
- TESTING.md — TDD methodology (no unit tests in GSD itself)
- INTEGRATIONS.md — Zero external services
- CONCERNS.md — Tech debt, fragile areas, scaling limits

## Constraints

- **Maintain Claude Code**: Existing Claude Code version must keep working with no regressions
- **OpenCode conventions**: Must follow `.opencode/` directory structure and YAML frontmatter schema exactly

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Support only Claude Code + OpenCode | Focus on two platforms for v1, avoid scope creep | — Pending |
| Pure port, no new features | Reduce complexity, validate approach before extending | — Pending |
| Shared source where possible | Minimize duplication, single source of truth | — Pending |

---
*Last updated: 2026-01-14 after initialization*
