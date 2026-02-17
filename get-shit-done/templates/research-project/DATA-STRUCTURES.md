# Data Structures Research Template

Template for `.planning/research/DATA-STRUCTURES.md` — language-specific types and feature-to-structure mappings for the project domain.

<template>

```markdown
# Data Structures Research

**Domain:** [domain type]
**Language:** [primary language]
**Researched:** [date]
**Confidence:** [HIGH/MEDIUM/LOW]

## Ranked Structures by Utility

Structures ranked by how many features they support and how central they are to the project.

| Rank | Structure | Language Type | Features Supported | Centrality |
|------|-----------|---------------|-------------------|------------|
| 1 | [name] | [e.g., `dict[str, list[Order]]`] | [count] | Core / Supporting |
| 2 | [name] | [e.g., `BTreeMap<UserId, Session>`] | [count] | Core / Supporting |
| 3 | [name] | [e.g., `Map<string, UserProfile>`] | [count] | Core / Supporting |
| 4 | [name] | [e.g., `deque[Event]`] | [count] | Core / Supporting |

## Feature-to-Structure Mapping

### [Feature 1]

**Best fit:** [language-specific type, e.g., `dict[str, list[Transaction]]`]
**Why:** [rationale — access pattern, mutation frequency, lookup needs]
**Operations:**

| Operation | Complexity | Frequency |
|-----------|------------|-----------|
| [e.g., lookup by ID] | O(1) | High |
| [e.g., range query] | O(log n) | Medium |
| [e.g., insert] | O(1) amortized | High |

**Alternative:** [other type] — use when [condition]

---

### [Feature 2]

**Best fit:** [language-specific type]
**Why:** [rationale]
**Operations:**

| Operation | Complexity | Frequency |
|-----------|------------|-----------|
| [operation] | [complexity] | [frequency] |

**Alternative:** [other type] — use when [condition]

---

### [Feature 3]

**Best fit:** [language-specific type]
**Why:** [rationale]
**Operations:**

| Operation | Complexity | Frequency |
|-----------|------------|-----------|
| [operation] | [complexity] | [frequency] |

**Alternative:** [other type] — use when [condition]

---

[Continue for all major features...]

## Composite Patterns

When single structures aren't enough.

### [Pattern Name]

**Problem:** [what single structure can't handle]
**Solution:** [combination of structures]

```[language]
// Example showing the composite pattern
[code showing how structures work together]
```

**Trade-off:** [what you gain vs. what it costs in memory/complexity]

### [Pattern Name]

**Problem:** [what single structure can't handle]
**Solution:** [combination of structures]

```[language]
// Example showing the composite pattern
[code showing how structures work together]
```

**Trade-off:** [what you gain vs. what it costs]

## Persistence Mapping

How in-memory structures map to database/cache storage.

| In-Memory Type | Storage Layer | Schema/Format | Notes |
|----------------|---------------|---------------|-------|
| [e.g., `dict[str, User]`] | [e.g., PostgreSQL `users` table] | [e.g., `id PK, name, email`] | [index/query notes] |
| [e.g., `list[Event]`] | [e.g., Redis sorted set] | [e.g., `events:{user_id}`] | [TTL/eviction notes] |
| [e.g., `set[Tag]`] | [e.g., junction table] | [e.g., `item_tags(item_id, tag_id)`] | [query pattern notes] |

### Serialization Considerations

| Structure | Serialization | Gotchas |
|-----------|---------------|---------|
| [type] | [format — JSON, protobuf, etc.] | [what breaks or needs special handling] |
| [type] | [format] | [gotchas] |

## Anti-Patterns

Structures that seem reasonable but cause problems in this domain.

| Anti-Pattern | Why It Seems Right | What Goes Wrong | Use Instead |
|--------------|--------------------|-----------------|-------------|
| [structure for use case] | [surface appeal] | [specific failure mode] | [correct structure] |
| [structure for use case] | [surface appeal] | [specific failure mode] | [correct structure] |
| [structure for use case] | [surface appeal] | [specific failure mode] | [correct structure] |

## Complexity Reference

Quick-reference for the structures recommended above.

| Structure | Insert | Lookup | Delete | Iterate | Space |
|-----------|--------|--------|--------|---------|-------|
| [type] | [O(?)] | [O(?)] | [O(?)] | [O(?)] | [O(?)] |
| [type] | [O(?)] | [O(?)] | [O(?)] | [O(?)] | [O(?)] |
| [type] | [O(?)] | [O(?)] | [O(?)] | [O(?)] | [O(?)] |

## Sources

- [Language standard library documentation]
- [Performance benchmarks]
- [Domain-specific data modeling references]

---
*Data structures research for: [domain]*
*Researched: [date]*
```

</template>

<guidelines>

**Ranked Structures:**
- Use the language's ACTUAL types, not abstract names ("hash map" → `dict[str, User]`)
- Rank by utility: how many features depend on this structure, how central it is
- Distinguish Core (project breaks without it) from Supporting (used by 1-2 features)

**Feature-to-Structure Mapping:**
- Every major feature from FEATURES.md should have a structure recommendation
- Include access pattern rationale — why this structure fits the feature's read/write patterns
- Always provide an alternative for when assumptions change

**Composite Patterns:**
- Show code examples in the project's language
- Common example: index map + ordered collection for fast lookup + ordered iteration
- Include the trade-off — composites cost memory and complexity

**Persistence Mapping:**
- Critical for avoiding impedance mismatch between code and database
- Include serialization gotchas (dates, enums, nested objects)
- Note where ORM abstractions help vs. hurt

**Anti-Patterns:**
- Domain-specific, not textbook examples
- Example: using a flat list for hierarchical data, using a relational table for time-series
- Include the failure mode — when/how it breaks, not just "it's slow"

**Complexity Reference:**
- Only for structures actually recommended in this document
- Include amortized complexity where relevant
- Space complexity matters for large datasets

</guidelines>
