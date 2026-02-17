---
name: best-practices
short_description: Coding standards, testing strategy, safety patterns
tags: [extended]
suggested_project_types: [all]
---

Research coding best practices and quality standards for this project's stack and domain.

Investigate and document:

1. **Coding standards** — Official style guides for the primary language/framework. Specific linting and formatting tools with recommended configs. Naming conventions that match community standards.
2. **File structure standards** — How to organize files, max file lengths, when and how to split modules. Follow the framework's conventions, not generic advice.
3. **Testing strategy** — Test pyramid for this domain. Specific tools for unit, integration, and E2E testing. What to test, what NOT to test, and coverage targets that are realistic (not aspirational 100%).
4. **Code safety patterns** — Defensive programming at system boundaries. Error handling strategy by layer (edge, service, data). Resource cleanup patterns specific to this language/runtime.
5. **Security patterns** — OWASP-relevant patterns for this stack. Input validation, auth token handling, secrets management. How this framework handles XSS, CSRF, injection, etc.
6. **Anti-patterns** — Stack-specific practices that seem reasonable but cause problems. Include WHY developers fall into them and the correct alternative.
7. **Code review checklist** — Actionable items an executor agent can verify. Domain-specific checks beyond generic code quality.

For each recommendation:
- Reference official style guides and documentation (with URLs)
- Name specific tools and packages, not abstract categories
- Include the enforcement mechanism (lint rule, CI check, manual review)

Use the output template at `~/.claude/get-shit-done/templates/research-project/BEST-PRACTICES.md`.

Quality gates:
- Practices are specific to this stack, not language-agnostic platitudes
- Official style guides cited with URLs
- Testing tools are specific packages with versions
- Anti-patterns include the "why it seems right" reasoning
