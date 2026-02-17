# Best Practices Research Template

Template for `.planning/research/BEST-PRACTICES.md` — coding standards, testing strategy, and safety patterns for the project domain.

<template>

```markdown
# Best Practices Research

**Domain:** [domain type]
**Stack:** [primary language/framework]
**Researched:** [date]
**Confidence:** [HIGH/MEDIUM/LOW]

## Coding Standards

### Style Guide

| Area | Standard | Tool/Enforcement | Reference |
|------|----------|-------------------|-----------|
| Formatting | [rules] | [tool + config] | [official guide URL] |
| Linting | [rules] | [tool + config] | [official guide URL] |
| Naming | [conventions] | [lint rule or manual] | [official guide URL] |

### Naming Conventions

| Element | Convention | Example | Anti-Example |
|---------|------------|---------|--------------|
| [files] | [pattern] | [good] | [bad] |
| [functions] | [pattern] | [good] | [bad] |
| [classes/types] | [pattern] | [good] | [bad] |
| [constants] | [pattern] | [good] | [bad] |
| [database fields] | [pattern] | [good] | [bad] |

### File Structure Standards

| File Type | Max Length | Organization Rule |
|-----------|-----------|-------------------|
| [modules] | [lines] | [how to split when too long] |
| [components] | [lines] | [how to split when too long] |
| [tests] | [lines] | [how to organize] |

## Testing Strategy

### Test Pyramid

| Level | Tool | Coverage Target | What to Test |
|-------|------|-----------------|--------------|
| Unit | [tool] | [%] | [what belongs here] |
| Integration | [tool] | [%] | [what belongs here] |
| E2E | [tool] | [%] | [what belongs here] |

### Test Conventions

- **File naming:** [pattern, e.g., `*.test.ts` or `test_*.py`]
- **Test structure:** [pattern, e.g., Arrange-Act-Assert or Given-When-Then]
- **Mocking strategy:** [when to mock, what tools, what NOT to mock]
- **Fixture management:** [how to handle test data]

### What NOT to Test

| Skip | Why |
|------|-----|
| [thing] | [reason — e.g., framework internals, trivial getters] |
| [thing] | [reason] |

## Code Safety Patterns

### Defensive Programming

| Pattern | When to Apply | Example |
|---------|---------------|---------|
| [input validation] | [boundary] | [brief code/pseudocode] |
| [null/undefined handling] | [boundary] | [brief code/pseudocode] |
| [error boundaries] | [boundary] | [brief code/pseudocode] |
| [resource cleanup] | [boundary] | [brief code/pseudocode] |

### Error Handling Strategy

| Layer | Pattern | Example |
|-------|---------|---------|
| [boundary/edge] | [how to handle] | [brief code/pseudocode] |
| [service/business logic] | [how to handle] | [brief code/pseudocode] |
| [data access] | [how to handle] | [brief code/pseudocode] |

### Security Patterns

| Pattern | Purpose | Implementation |
|---------|---------|----------------|
| [pattern] | [what it prevents] | [how to implement in this stack] |
| [pattern] | [what it prevents] | [how to implement in this stack] |
| [pattern] | [what it prevents] | [how to implement in this stack] |

## Anti-Patterns

### What NOT to Do

| Anti-Pattern | Why It's Wrong | Do This Instead |
|--------------|----------------|-----------------|
| [practice] | [specific problem it causes] | [correct approach] |
| [practice] | [specific problem it causes] | [correct approach] |
| [practice] | [specific problem it causes] | [correct approach] |
| [practice] | [specific problem it causes] | [correct approach] |

## Code Review Checklist

- [ ] **Naming:** Variables/functions describe intent, not implementation
- [ ] **Safety:** Input validated at system boundaries
- [ ] **Errors:** Errors handled at correct layer, not swallowed
- [ ] **Resources:** Connections/handles/streams cleaned up
- [ ] **Tests:** New code has tests at appropriate level
- [ ] **[domain-specific]:** [domain-specific check]
- [ ] **[domain-specific]:** [domain-specific check]

## Dependency Management

| Practice | Rule | Why |
|----------|------|-----|
| Adding dependencies | [criteria for when to add vs. write] | [rationale] |
| Version pinning | [strategy — exact, range, or lockfile-only] | [rationale] |
| Audit frequency | [schedule] | [rationale] |

## Sources

- [Official style guides]
- [Language/framework documentation]
- [Community-adopted standards]

---
*Best practices research for: [domain]*
*Researched: [date]*
```

</template>

<guidelines>

**Coding Standards:**
- Reference official style guides for the chosen stack, not generic advice
- Include specific tooling (prettier, eslint, black, rubocop, etc.) with config recommendations
- Naming conventions should match the language's community standards

**Testing Strategy:**
- Be prescriptive about tools — name specific packages, not abstract categories
- Coverage targets should be realistic for this domain (100% is rarely appropriate)
- Include what NOT to test — prevents wasted effort on low-value tests

**Code Safety Patterns:**
- Focus on system boundaries (user input, external APIs, file I/O)
- Internal code should trust internal contracts, not defensively check everything
- Include language-specific idioms (e.g., Python context managers, Go defer, Rust ownership)

**Anti-Patterns:**
- Must be specific to this stack and domain, not textbook generics
- Include the "why" — developers repeat anti-patterns because they seem reasonable
- Always provide the correct alternative

**Code Review Checklist:**
- Actionable items an executor agent can verify
- Domain-specific items beyond generic code quality
- Should map to the safety patterns section

</guidelines>
