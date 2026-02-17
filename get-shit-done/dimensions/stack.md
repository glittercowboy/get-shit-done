---
name: stack
short_description: Standard stack for this domain (libraries, frameworks, versions)
tags: [core]
suggested_project_types: [all]
---

Research the technology stack for this project domain.

Investigate and recommend:

1. **Core framework** — The primary framework or runtime. Compare the top 2-3 options, pick one, and justify why.
2. **Language version** — Specify exact version. Check current stable release via Context7 or official docs.
3. **Database** — Primary data store. Match to the domain's read/write patterns and data shape.
4. **Supporting libraries** — Auth, validation, HTTP client, ORM, testing, formatting, linting. Name specific packages with versions.
5. **Dev tooling** — Build tools, bundlers, task runners, dev servers. What the ecosystem actually uses today.
6. **Infrastructure** — Hosting, CI/CD, containerization if relevant. Match to project scale.

For each recommendation:
- State the specific package/tool and version
- Explain WHY this choice over alternatives (not just "it's popular")
- Note any version-specific gotchas or breaking changes
- Flag deprecated alternatives developers might mistakenly choose

Use the output template at `~/.claude/get-shit-done/templates/research-project/STACK.md`.

Quality gates:
- Versions verified against Context7 or official docs (not training data)
- Rationale explains WHY, not just WHAT
- Deprecated alternatives identified
- Installation commands included
