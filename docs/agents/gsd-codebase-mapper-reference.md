# gsd-codebase-mapper.md — Standard Reference

## Metadata
| Attribute | Value |
|-----------|-------|
| **Type** | Agent |
| **Location** | `agents/gsd-codebase-mapper.md` |
| **Size** | 738 lines |
| **Documentation Tier** | Standard |
| **Complexity Score** | 2+2+2+1 = **7/12** |

### Complexity Breakdown
- **Centrality: 2** — Spawned by map-codebase, outputs consumed by plan-phase and execute-phase
- **Complexity: 2** — 4 focus areas, 7 distinct output templates
- **Failure Impact: 2** — Wrong mapping leads to wrong conventions, misplaced files
- **Novelty: 1** — Standard codebase analysis patterns

---

## Purpose

Explores a codebase for a specific focus area and writes structured analysis documents directly to `.planning/codebase/`. Designed to reduce orchestrator context load by writing documents directly rather than returning findings. Documents are consumed by plan-phase (to understand existing patterns) and execute-phase (to follow conventions). The orchestrator can request a focused subsystem map, but each mapper agent still handles one of the four focus areas.

---

## Critical Behaviors

- **MUST write documents DIRECTLY** — Do not return findings to orchestrator; write to `.planning/codebase/`
- **MUST include file paths everywhere** — Every finding needs a path in backticks (`src/services/user.ts`)
- **MUST use the templates** — Fill in provided structure, don't invent own format
- **MUST fill template placeholders** — Replace `[YYYY-MM-DD]`; use "Not detected" or "Not applicable" when needed
- **MUST use UPPERCASE filenames** — `STACK.md`, `ARCHITECTURE.md`, etc.
- **MUST return only confirmation** — Response should be ~10 lines max confirming what was written
- **DO NOT commit** — Orchestrator handles git operations

---

## Focus Areas → Output Files

| Focus | Documents Written | What's Analyzed |
|-------|-------------------|-----------------|
| **tech** | `STACK.md`, `INTEGRATIONS.md` | Languages, runtime, frameworks, dependencies, external services |
| **arch** | `ARCHITECTURE.md`, `STRUCTURE.md` | Layers, data flow, entry points, directory layout, naming conventions |
| **quality** | `CONVENTIONS.md`, `TESTING.md` | Naming patterns, code style, linting, test framework, mocking patterns |
| **concerns** | `CONCERNS.md` | Tech debt, known bugs, security issues, performance bottlenecks, fragile areas |

---

## How Documents Are Consumed

**`/gsd:plan-phase`** loads relevant codebase docs based on phase type:

| Phase Type | Documents Loaded |
|------------|------------------|
| UI, frontend, components | CONVENTIONS.md, STRUCTURE.md |
| API, backend, endpoints | ARCHITECTURE.md, CONVENTIONS.md |
| database, schema, models | ARCHITECTURE.md, STACK.md |
| testing, tests | TESTING.md, CONVENTIONS.md |
| integration, external API | INTEGRATIONS.md, STACK.md |
| refactor, cleanup | CONCERNS.md, ARCHITECTURE.md |
| setup, config | STACK.md, STRUCTURE.md |

**`/gsd:execute-phase`** references docs to:
- Follow existing conventions when writing code
- Know where to place new files (STRUCTURE.md)
- Match testing patterns (TESTING.md)
- Avoid introducing more technical debt (CONCERNS.md)

---

## Output Quality Guidelines

| Principle | What It Means |
|-----------|---------------|
| **File paths are critical** | `src/services/user.ts` not "the user service" |
| **Patterns matter more than lists** | Show HOW things are done (code examples) not just WHAT exists |
| **Be prescriptive** | "Use camelCase for functions" not "Some functions use camelCase" |
| **CONCERNS.md drives priorities** | Issues identified may become future phases; be specific about impact |
| **STRUCTURE.md answers "where?"** | Include guidance for adding new code, not just describing existing |
| **Current state only** | Document what exists now; avoid historical or speculative language |
| **Quality over brevity** | Prefer detailed, actionable docs over terse summaries |

---

## Interactions

| Reads | Writes | Spawned By | Consumed By |
|-------|--------|------------|-------------|
| Codebase files | `.planning/codebase/STACK.md` | `/gsd:map-codebase` | `gsd-planner` |
| `package.json`, configs | `.planning/codebase/INTEGRATIONS.md` | | `gsd-executor` |
| Test files | `.planning/codebase/ARCHITECTURE.md` | | |
| Source code | `.planning/codebase/STRUCTURE.md` | | |
| | `.planning/codebase/CONVENTIONS.md` | | |
| | `.planning/codebase/TESTING.md` | | |
| | `.planning/codebase/CONCERNS.md` | | |

---

## Structured Return

```markdown
## Mapping Complete

**Focus:** {focus}
**Documents written:**
- `.planning/codebase/{DOC1}.md` ({N} lines)
- `.planning/codebase/{DOC2}.md` ({N} lines)

Ready for orchestrator summary.
```

---

## Quick Reference

```
WHAT:     Codebase exploration and analysis documentation
MODES:    tech | arch | quality | concerns (one focus per spawn)
OUTPUT:   .planning/codebase/ (STACK, INTEGRATIONS, ARCHITECTURE, STRUCTURE, CONVENTIONS, TESTING, CONCERNS)

CORE RULES:
• Write documents DIRECTLY to .planning/codebase/ (don't return findings)
• ALWAYS include file paths in backticks
• Use provided templates exactly (see `get-shit-done/templates/codebase/`)
• Replace template placeholders (date, "Not detected"/"Not applicable")
• Return only confirmation (~10 lines)
• DO NOT commit — orchestrator handles git

SPAWNED BY: /gsd:map-codebase (with focus parameter; may request subsystem-specific mapping)
CONSUMED BY: gsd-planner (phase type → relevant docs), gsd-executor (conventions, structure)
```
