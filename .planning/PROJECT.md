# Get Shit Done (GSD)

## What This Is

A meta-prompting, context engineering and spec-driven development system for Claude Code, OpenCode, and Gemini. GSD orchestrates specialized AI agents through markdown-as-prompts to manage project planning, execution, and verification workflows. Installed via `npx get-shit-done-cc` and used through slash commands like `/gsd:plan-phase`, `/gsd:execute-phase`.

## Core Value

Every unit of engineering work should make subsequent units easier — not harder. GSD compounds development quality over time through structured planning, execution, and knowledge accumulation.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- Multi-agent orchestration (researchers, planners, executors, verifiers)
- Markdown-as-prompts architecture (commands, workflows, agents, templates, references)
- Project lifecycle: new-project -> plan-phase -> execute-phase -> complete-milestone
- Wave-based parallel execution with dependency analysis
- State management via `.planning/` artifacts (PROJECT.md, ROADMAP.md, STATE.md, REQUIREMENTS.md)
- Codebase mapping with parallel mapper agents (7 structured documents)
- Cross-project knowledge via gsd-memory MCP server
- Multi-runtime support (Claude Code, OpenCode, Gemini CLI)
- Quick mode for ad-hoc tasks
- Debug sessions with persistent state across context resets
- Todo management (add/check todos)
- Milestone management (complete, audit, plan gaps)
- Session continuity (pause/resume work)

### Active

<!-- Current scope. Building toward these. -->

- [ ] Documentation generation — auto-generate Docusaurus site from `.planning/` artifacts
- [ ] Compound learning — knowledge accumulation system that improves code quality over time

### Out of Scope

- Web UI / dashboard for GSD itself — CLI-first tool
- Cloud-hosted documentation — local-first, optional deploy
- Real-time collaboration — single-developer workflow tool
- Non-AI IDE support — requires Claude Code, OpenCode, or Gemini CLI

## Current Milestone: v1.12.0 — Documentation & Compound Learning

**Goal:** Add documentation generation and compound learning to make GSD a self-improving development system.

**Target features:**

1. **Documentation Generation (`/gsd:docs`)**
   - New GSD command that generates a Docusaurus site from `.planning/` artifacts
   - Mirrors `.planning/` structure: Overview, Architecture, Requirements, Phase History, Decisions
   - Auto-generates on `/gsd:complete-milestone` + manual `/gsd:docs` for on-demand refresh
   - Source committed to repo (`docs/`), optional deploy (GitHub Pages etc.)
   - Developers can extend with custom pages beyond what GSD generates
   - Available to all GSD users for their projects (platform feature)

2. **Compound Learning**
   - Knowledge accumulation system inspired by compound engineering methodology
   - After each phase/milestone: extract what worked, what failed, decisions, patterns, rework causes
   - During planning: query past knowledge to prevent repeating mistakes, inform better plans
   - During review: check against past learnings, flag regressions and known anti-patterns
   - Per-project vector store for semantic search of project history
   - Feedback loop: execute -> extract learnings -> store -> inform next plan -> review -> repeat

## Context

- Current version: 1.11.2
- 28 slash commands, 11 agent types, 12 workflows
- Existing gsd-memory MCP server provides cross-project knowledge (grep-based, not vector)
- Compound Engineering Plugin (EveryInc) serves as inspiration for the learning methodology
- The `.planning/codebase/` already contains 7 structured documents about the codebase state
- Docusaurus is React-based static site generator with MDX support, versioning, and plugin ecosystem

## Constraints

- **Compatibility**: Must work with existing GSD installation flow (`npx get-shit-done-cc`)
- **Architecture**: Follow existing markdown-as-prompts pattern (new commands/agents/workflows as .md files)
- **Dependencies**: Docusaurus requires Node.js >= 18; must handle gracefully for projects on Node 16
- **Lightweight**: Vector DB should be embeddable/local — no external service dependency
- **Non-breaking**: Existing GSD commands and workflows must continue working unchanged

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Docusaurus for docs | React-based, MDX support, versioning, widely adopted, plugin ecosystem | — Pending |
| Per-project vector store | Project-specific patterns most relevant; gsd-memory handles cross-project | — Pending |
| Compound learning at plan + review | Prevents mistakes upstream, catches regressions downstream | — Pending |

---
*Last updated: 2026-02-06 after milestone v1.12.0 initialization*
