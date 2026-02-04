# Preferences Template

Template for `.planning/preferences.md` — project-level tool and workflow preferences injected into agent prompts.

---

## File Template

```markdown
# Project Preferences

Tool, skill, and MCP preferences for this project. Agents read this file and follow these instructions when applicable.

## Skills

- Use `frontend-design` skill for all frontend/UI work
- Use `code-review` skill before completing any phase

## MCPs

- Use `context7` MCP for library/framework research instead of web search
- Use `chrome-devtools` MCP for visual verification of UI changes

## Tool Preferences

- Prefer `pytest` over `unittest` for all test tasks
- Use `pnpm` instead of `npm` for package management

## Phase-Specific

- Phases involving API work: always generate OpenAPI spec
- Phases involving database: run migrations in a transaction
```

---

<guidelines>

**Location:** `.planning/preferences.md` (project-level)

**Format:** Free-form markdown. Write instructions as you would tell a developer.

**Scope:** Preferences apply to all agents spawned for this project (planner, executor, researcher, verifier).

**Granularity:** Can be broad ("use pnpm everywhere") or phase-specific ("API phases should generate OpenAPI spec").

**Creation:** Manual — create `.planning/preferences.md` anytime. No command needed.

**Priority:** Preferences are advisory context, not hard overrides. If a preference conflicts with a plan's explicit instructions, the plan wins.
</guidelines>

<examples>

**Frontend-heavy project:**
```markdown
# Project Preferences

## Skills
- Use `frontend-design` skill for all UI component work
- Use `code-review` skill after each phase completes

## MCPs
- Use `context7` MCP for React/Next.js documentation lookups
- Use `chrome-devtools` MCP to verify visual output after UI tasks

## Tools
- Use `pnpm` for all package operations
- Use `vitest` instead of `jest` for testing
```

**Backend API project:**
```markdown
# Project Preferences

## MCPs
- Use `context7` MCP for framework documentation (FastAPI, SQLAlchemy)

## Tools
- Use `uv` instead of `pip` for Python package management
- Use `httpie` instead of `curl` for API testing in verify steps

## Conventions
- All API endpoints must include OpenAPI docstrings
- Database migrations use Alembic with --autogenerate
```

</examples>
