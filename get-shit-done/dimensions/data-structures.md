---
name: data-structures
short_description: Language-specific types, feature-to-structure mappings
tags: [extended]
suggested_project_types: [all]
---

Research data structures for this project's features using the project's primary language.

Investigate and document:

1. **Ranked structures by utility** — List the data structures this project needs, ranked by how many features depend on them. Use the language's ACTUAL types (e.g., `dict[str, list[Order]]` not "hash map"), not abstract names. Distinguish core structures (project breaks without them) from supporting ones.
2. **Feature-to-structure mapping** — For every major feature, recommend the best-fit data structure. Include access pattern rationale (why this structure fits the feature's read/write patterns), operation complexity, and an alternative for when assumptions change.
3. **Composite patterns** — When single structures aren't enough, show how to combine them. Include code examples in the project's language. Note the trade-off (what you gain vs memory/complexity cost).
4. **Persistence mapping** — How in-memory structures map to database tables, cache keys, or file formats. Include serialization gotchas (dates, enums, nested objects, circular references).
5. **Anti-patterns** — Structures that seem reasonable but cause problems in this domain. Include the failure mode (when/how it breaks, not just "it's slow").
6. **Complexity reference** — Quick-reference table for all recommended structures: insert, lookup, delete, iterate, and space complexity. Include amortized complexity where relevant.

For each recommendation:
- Use the language's actual type syntax, not abstract CS names
- Include operation complexity for the specific access patterns this project needs
- Show code examples for non-obvious composite patterns
- Note where ORM abstractions help vs hurt for persistence mapping

Use the output template at `~/.claude/get-shit-done/templates/research-project/DATA-STRUCTURES.md`.

Quality gates:
- Language-specific types used throughout (not abstract names)
- Every major feature mapped to a structure
- Ranked list justified by feature count and centrality
- Persistence mapping includes serialization gotchas
