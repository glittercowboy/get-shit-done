---
name: architecture
short_description: System structure, components, data flow
tags: [core]
suggested_project_types: [all]
---

Research architecture patterns for this project domain.

Investigate and recommend:

1. **System architecture** — Monolith, microservices, serverless, or hybrid. What pattern fits this domain at this scale? Don't over-architect for scale that doesn't exist yet.
2. **Component boundaries** — Major components, their responsibilities, and how they communicate. Draw clear lines between concerns.
3. **Data flow** — How data moves through the system. Request lifecycle, event propagation, state management patterns.
4. **Patterns to follow** — Specific architectural patterns used by experts in this domain. Include code-level patterns (repository pattern, middleware chain, etc.), not just high-level diagrams.
5. **Anti-patterns to avoid** — Architecture mistakes specific to this domain. What looks reasonable but causes rewrites at scale?
6. **Scalability considerations** — What changes at 100 users, 10K users, 1M users. Identify the first bottleneck and when to worry about it.

For each recommendation:
- Be specific to this domain, not generic architecture textbook advice
- Include brief code examples where patterns are non-obvious
- Explain what breaks if you ignore the recommendation
- Note where the architecture should be flexible vs rigid

Use the output template at `~/.claude/get-shit-done/templates/research-project/ARCHITECTURE.md`.

Quality gates:
- Component boundaries are clear and justified
- Data flow covers the primary user journey
- Patterns include code-level examples, not just names
- Anti-patterns are domain-specific, not generic
