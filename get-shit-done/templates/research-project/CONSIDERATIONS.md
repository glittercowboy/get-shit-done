# Considerations Research Template

Template for `.planning/research/CONSIDERATIONS.md` — key decision points and tradeoffs for the domain.

<template>

```markdown
# Domain Considerations

**Domain:** [domain type]
**Researched:** [date]
**Confidence:** [HIGH/MEDIUM/LOW]

## Key Decision Points

Major choices that shape the project:

### [Decision Area 1]: [e.g., Authentication Strategy]

| Option | Approach | Tradeoffs |
|--------|----------|-----------|
| [option-a] | [description] | Pros: [X, Y] / Cons: [Z] |
| [option-b] | [description] | Pros: [X, Y] / Cons: [Z] |
| [option-c] | [description] | Pros: [X, Y] / Cons: [Z] |

**Factors to weigh:**
- [Factor 1]: [why it matters for this decision]
- [Factor 2]: [why it matters for this decision]

**Recommendation:** [option] for [context/constraints] because [reasoning].

---

### [Decision Area 2]: [e.g., Data Storage]

| Option | Approach | Tradeoffs |
|--------|----------|-----------|
| [option-a] | [description] | Pros: [X] / Cons: [Y] |
| [option-b] | [description] | Pros: [X] / Cons: [Y] |

**Factors to weigh:**
- [Factor 1]: [why it matters]

**Recommendation:** [option] because [reasoning].

---

### [Decision Area 3]: [e.g., State Management]

[Same format...]

---

## Production Considerations

What matters at scale:

### Performance

| Concern | At MVP | At 10K Users | At 100K Users |
|---------|--------|--------------|---------------|
| [API response time] | [acceptable] | [needs caching] | [needs CDN + edge] |
| [Database queries] | [simple queries fine] | [indexes required] | [read replicas] |
| [File storage] | [local disk] | [object storage] | [CDN distribution] |

### Operations

**Monitoring:**
- What to track: [metrics that matter]
- Options: [tools/approaches]

**Debugging:**
- What makes it easier: [logging patterns, tracing]
- What makes it harder: [distributed systems, async flows]

**Deployment:**
- Considerations: [zero-downtime, rollback strategy]
- Options: [approaches and tradeoffs]

### Cost Drivers

| Resource | Cost Driver | Options to Optimize |
|----------|-------------|---------------------|
| [Compute] | [what drives cost] | [approaches] |
| [Storage] | [what drives cost] | [approaches] |
| [Third-party] | [pricing model] | [alternatives] |

## Architecture Tradeoffs

High-level structural decisions:

### Monolith vs. Services

| Approach | When It Works | When It Doesn't |
|----------|---------------|-----------------|
| Monolith | Small team, fast iteration, unclear boundaries | Large team, different scaling needs per component |
| Services | Clear boundaries, independent scaling, team autonomy | Small team, overhead not justified, premature |

**For this project:** [recommendation and why]

### [Other Architecture Decision]

[Same format...]

## Anti-Patterns to Avoid

Approaches that seem good but cause problems:

| Anti-Pattern | Why It Seems Good | Why It's Not | Instead Do |
|--------------|-------------------|--------------|------------|
| [Premature optimization] | [feels proactive] | [wastes time, wrong abstractions] | [measure first, optimize bottlenecks] |
| [Over-abstraction] | [feels clean] | [harder to understand, change] | [concrete until 3+ uses] |
| [DIY auth] | [full control] | [security surface, maintenance] | [proven library/service] |

## Phase-Specific Considerations

Decisions that will come up during specific phases:

| Phase Topic | Key Decision | Options to Present | Recommendation |
|-------------|--------------|-------------------|----------------|
| [Authentication] | [session vs JWT] | [sessions: simple / JWT: stateless] | [depends on needs] |
| [API design] | [REST vs GraphQL] | [REST: simple / GraphQL: flexible] | [REST for this scope] |
| [Testing] | [unit vs integration focus] | [unit: fast / integration: realistic] | [integration-heavy] |

## Prior Art

How similar projects approached these decisions:

### [Reference Project 1]
- **Decisions made:** [what they chose]
- **Context:** [why it worked for them]
- **Applicable to us:** [yes/no, why]
- **Source:** [link]

### [Reference Project 2]
[Same format...]

## Open Questions

Decisions that need more context or user input:

1. **[Question]**
   - Options: [A, B, C]
   - Need to know: [what information would help decide]
   - Default recommendation: [if we had to choose now]

## Sources

- [Official documentation referenced]
- [Production case studies]
- [Architecture decision records from similar projects]
- [Community discussions with high signal]

---
*Considerations research for: [domain]*
*Researched: [date]*
```

</template>

<guidelines>

**Key Decision Points:**
- Focus on decisions that significantly affect the project
- Present 2-4 realistic options per decision (not exhaustive lists)
- Include concrete tradeoffs, not vague pros/cons
- Make a recommendation but acknowledge when context matters

**Production Considerations:**
- Think about what changes at scale
- Include cost implications (often overlooked)
- Be realistic about MVP vs. future needs
- Don't over-engineer, but note what to watch

**Anti-Patterns:**
- Focus on domain-specific anti-patterns
- Explain WHY they seem good (empathy for the choice)
- Provide concrete alternatives

**Phase-Specific:**
- Map decisions to phases so they're addressed at the right time
- Include preliminary recommendations to guide planning
- Acknowledge when decisions should be deferred

**Prior Art:**
- Reference real projects when possible
- Note what made their context similar/different
- Extract applicable patterns, not just descriptions

**Tone:**
- Present options objectively, then recommend
- "For this context..." not "You should always..."
- Acknowledge uncertainty when present
- Respect that the user makes final decisions

</guidelines>
