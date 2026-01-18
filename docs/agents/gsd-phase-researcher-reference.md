# gsd-phase-researcher.md — Enhanced Reference (Code-Verified)

## Metadata
| Attribute | Value |
|-----------|-------|
| **Type** | Agent |
| **Location** | `agents/gsd-phase-researcher.md` |
| **Size** | 633 lines |
| **Documentation Tier** | Enhanced Standard |
| **Complexity Score** | 2+2+2+2 = **8/12** |
| **Verified Against** | Source code 2026-01-18 |

---

## Purpose

Researches how to implement a specific phase before planning, producing findings that directly inform task creation. Answers "What do I need to know to PLAN this phase well?"

**Key distinction from project-researcher:**
- Phase-specific (not project-wide)
- Prescriptive ("Use X") not exploratory ("Consider X or Y")
- Consumed immediately by planner
- DOES commit its own RESEARCH.md

---

## Critical Behaviors

| Constraint | Rule | Source Section |
|------------|------|----------------|
| Be PRESCRIPTIVE | "Use X" not "Consider X or Y"; research becomes planner instructions | `<downstream_consumer>` |
| Respect CONTEXT.md | If user locked decisions, research THOSE deeply, don't explore alternatives | `<upstream_input>` |
| Follow source hierarchy | Context7 > Official Docs > WebSearch verified > WebSearch unverified | `<verification_protocol>` |
| Include confidence levels | HIGH/MEDIUM/LOW on all findings | `<verification_protocol>` |
| MUST commit RESEARCH.md | Unlike project-researcher, commit your own output | `<execution_flow>` Step 6 |

---

## Training as Hypothesis Philosophy (CRITICAL)

**Source:** `<philosophy>` lines ~30-70

Claude's training data is 6-18 months stale. Treat pre-existing knowledge as hypothesis, not fact.

**The trap:** Claude "knows" things confidently. But that knowledge may be:
- **Outdated** — Library has new major version
- **Incomplete** — Feature was added after training  
- **Wrong** — Claude misremembered or hallucinated

**The discipline:**
1. **Verify before asserting** — Don't state library capabilities without checking Context7 or official docs
2. **Date your knowledge** — "As of my training" is a warning flag, not a confidence marker
3. **Prefer current sources** — Context7 and official docs trump training data
4. **Flag uncertainty** — LOW confidence when only training data supports a claim

**Honest Reporting:**
Research value comes from accuracy, not completeness theater. Better to say "I couldn't find reliable info on X" than to present uncertain findings as authoritative.

---

## CONTEXT.md Integration

**Source:** `<upstream_input>`

If CONTEXT.md exists (from `/gsd:discuss-phase`), it constrains research scope:

| Section | Research Constraint |
|---------|---------------------|
| **Decisions** | Locked choices — research THESE deeply, don't explore alternatives |
| **Claude's Discretion** | Freedom areas — research options, make recommendations |
| **Deferred Ideas** | Out of scope — ignore completely |

**Examples:**
- User decided "use library X" → research X deeply, don't explore alternatives
- User decided "simple UI, no animations" → don't research animation libraries
- Marked as Claude's discretion → research options and recommend

---

## RESEARCH.md Output Format

**Source:** `<output_format>`

The planner expects these specific sections:

| Section | How Planner Uses It |
|---------|---------------------|
| **Standard Stack** | Plans use these libraries, not alternatives |
| **Architecture Patterns** | Task structure follows these patterns |
| **Don't Hand-Roll** | Tasks NEVER build custom solutions for listed problems |
| **Common Pitfalls** | Verification steps check for these |
| **Code Examples** | Task actions reference these patterns |

### Complete RESEARCH.md Template

**Location:** `.planning/phases/XX-name/{phase}-RESEARCH.md`

```markdown
# Phase [X]: [Name] - Research

**Researched:** [date]
**Domain:** [primary technology/problem domain]
**Confidence:** [HIGH/MEDIUM/LOW]

## Summary

[2-3 paragraph executive summary]
- What was researched
- What the standard approach is
- Key recommendations

**Primary recommendation:** [one-liner actionable guidance]

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| [name] | [ver] | [what it does] | [why experts use it] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| [name] | [ver] | [what it does] | [use case] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| [standard] | [alternative] | [when alternative makes sense] |

**Installation:**
\`\`\`bash
npm install [packages]
\`\`\`

## Architecture Patterns

### Recommended Project Structure
\`\`\`
src/
├── [folder]/        # [purpose]
├── [folder]/        # [purpose]
└── [folder]/        # [purpose]
\`\`\`

### Pattern 1: [Pattern Name]
**What:** [description]
**When to use:** [conditions]
**Example:**
\`\`\`typescript
// Source: [Context7/official docs URL]
[code]
\`\`\`

### Anti-Patterns to Avoid
- **[Anti-pattern]:** [why it's bad, what to do instead]

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| [problem] | [what you'd build] | [library] | [edge cases, complexity] |

**Key insight:** [why custom solutions are worse in this domain]

## Common Pitfalls

### Pitfall 1: [Name]
**What goes wrong:** [description]
**Why it happens:** [root cause]
**How to avoid:** [prevention strategy]
**Warning signs:** [how to detect early]

## Code Examples

Verified patterns from official sources:

### [Common Operation 1]
\`\`\`typescript
// Source: [Context7/official docs URL]
[code]
\`\`\`

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| [old] | [new] | [date/version] | [what it means] |

**Deprecated/outdated:**
- [Thing]: [why, what replaced it]

## Open Questions

Things that couldn't be fully resolved:

1. **[Question]**
   - What we know: [partial info]
   - What's unclear: [the gap]
   - Recommendation: [how to handle]

## Sources

### Primary (HIGH confidence)
- [Context7 library ID] - [topics fetched]
- [Official docs URL] - [what was checked]

### Secondary (MEDIUM confidence)
- [WebSearch verified with official source]

### Tertiary (LOW confidence)
- [WebSearch only, marked for validation]

## Metadata

**Confidence breakdown:**
- Standard stack: [level] - [reason]
- Architecture: [level] - [reason]
- Pitfalls: [level] - [reason]

**Research date:** [date]
**Valid until:** [estimate - 30 days for stable, 7 for fast-moving]
```

---

## Verification Protocol & Source Hierarchy

**Source:** `<verification_protocol>`

| Level | Sources | Use |
|-------|---------|-----|
| **HIGH** | Context7, official documentation, official releases | State as fact |
| **MEDIUM** | WebSearch verified with official source, multiple credible sources agree | State with attribution |
| **LOW** | WebSearch only, single source, unverified | Flag as needing validation |

---

## Execution Flow

**Source:** `<execution_flow>`

```
Step 1: Receive Research Scope and Load Context
├── Orchestrator provides phase number/name, description, requirements, constraints, output path
├── Load phase context (MANDATORY):
│   ├── PADDED_PHASE=$(printf "%02d" ${PHASE} 2>/dev/null || echo "${PHASE}")
│   ├── PHASE_DIR=$(ls -d .planning/phases/${PADDED_PHASE}-* .planning/phases/${PHASE}-* 2>/dev/null | head -1)
│   └── cat "${PHASE_DIR}"/*-CONTEXT.md 2>/dev/null
└── If CONTEXT.md exists, parse and apply constraints

Step 2: Identify Research Domains
├── Core Technology (primary framework, current version)
├── Ecosystem/Stack (libraries, "blessed" stack)
├── Patterns (expert structure, design patterns)
├── Pitfalls (beginner mistakes, gotchas)
└── Don't Hand-Roll (existing solutions to use)

Step 3: Execute Research Protocol
├── For each domain, follow tool strategy:
│   1. Context7 First → resolve library, query topics
│   2. Official Docs → WebFetch for gaps
│   3. WebSearch → ecosystem discovery with year
│   4. Verification → cross-reference findings
└── Document findings with confidence levels

Step 4: Quality Check
├── All domains investigated (not just some)
├── Negative claims verified with official docs
├── Multiple sources for critical claims
├── Confidence levels assigned honestly
└── "What might I have missed?" review

Step 5: Write RESEARCH.md
├── Write to ${PHASE_DIR}/${PADDED_PHASE}-RESEARCH.md
└── Use complete template format

Step 6: Commit RESEARCH.md
└── git add "${PHASE_DIR}/${PADDED_PHASE}-RESEARCH.md" && git commit (YOU commit, unlike project-researcher)

Step 7: Return Structured Result
└── RESEARCH COMPLETE with summary
```

---

## Interactions

| Category | Details |
|----------|---------|
| **Reads** | `{phase}-CONTEXT.md` (if exists), Context7 docs, Official docs (WebFetch), WebSearch results |
| **Writes** | `${PHASE_DIR}/${PADDED_PHASE}-RESEARCH.md` |
| **Spawned By** | `/gsd:plan-phase`, `/gsd:research-phase` |
| **Consumed By** | `gsd-planner` (Standard Stack, Architecture Patterns, Don't Hand-Roll, Common Pitfalls, Code Examples) |

---

## Structured Returns

### Research Complete
```markdown
## RESEARCH COMPLETE

**Phase:** {phase_number} - {phase_name}
**Confidence:** [HIGH/MEDIUM/LOW]

### Key Findings
- [3-5 bullet points]

### File Created
`${PHASE_DIR}/${PADDED_PHASE}-RESEARCH.md`

### Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | [level] | [why] |
| Architecture | [level] | [why] |
| Pitfalls | [level] | [why] |

### Open Questions
[Gaps for planner awareness]

### Ready for Planning
Research complete and committed. Planner can now create PLAN.md files.
```

### Research Blocked
```markdown
## RESEARCH BLOCKED

**Phase:** {phase_number} - {phase_name}
**Blocked by:** [what's preventing progress]

### Attempted
[What was tried]

### Options
1. [Resolution option]
2. [Alternative approach]

### Awaiting
[What's needed to continue]
```

---

## Anti-Patterns

| Anti-Pattern | Why Bad | Correct Approach |
|--------------|---------|------------------|
| Exploratory output | Planner needs instructions, not options | Be PRESCRIPTIVE: "Use X" not "Consider X or Y" |
| Ignore CONTEXT.md | Contradicts user decisions | Research LOCKED decisions deeply, don't explore alternatives |
| Research deferred ideas | Wastes time, out of scope | Ignore Deferred Ideas section completely |
| Generic recommendations | Not actionable for tasks | Specific: "Three.js r160 with @react-three/fiber 8.15" |
| Skip code examples | Planner needs reference patterns | Include working snippets for key patterns |
| Don't commit | Planner expects committed file | MUST commit (unlike project-researcher) |

---

## Change Impact Analysis

### If gsd-phase-researcher Changes:

**Upstream Impact:**
- `plan-phase` command — Expects research file at specific path
- `research-phase` command — Same spawning pattern

**Downstream Impact:**
- `gsd-planner` — Parses specific sections (Standard Stack, Architecture Patterns, Don't Hand-Roll, Common Pitfalls, Code Examples)
- Plans reference RESEARCH.md content directly

**Breaking Changes to Watch:**
- Section names (planner expects specific headings)
- File path format
- Commit behavior (must commit)
- Confidence level format

---

## Section Index

| Section | Lines (approx) | Purpose |
|---------|----------------|---------|
| `<role>` | 8-24 | Identity, spawners, responsibilities |
| `<upstream_input>` | 26-36 | CONTEXT.md integration |
| `<downstream_consumer>` | 38-50 | How planner uses output |
| `<philosophy>` | 52-96 | Training as hypothesis, honest reporting |
| `<tool_strategy>` | 98-292 | Context7/WebFetch/WebSearch + verification protocol |
| `<output_format>` | 294-431 | Complete RESEARCH.md template |
| `<execution_flow>` | 433-543 | Step-by-step process |
| `<structured_returns>` | 545-606 | Return message formats |
| `<success_criteria>` | 608-632 | Completion checklist |

---

## Quick Reference

```
WHAT:     Phase-specific research to inform planning
MODES:    Single mode (phase implementation research)
OUTPUT:   ${PHASE_DIR}/${PADDED_PHASE}-RESEARCH.md

CORE RULES:
• Be PRESCRIPTIVE ("Use X") not exploratory ("Consider X or Y")
• Respect CONTEXT.md constraints (locked decisions, discretion areas, deferred)
• Follow source hierarchy: Context7 > Official > WebSearch
• Commit your own RESEARCH.md (unlike project-researcher)
• Training data is hypothesis — verify with current sources

SPAWNED BY: /gsd:plan-phase, /gsd:research-phase
CONSUMED BY: gsd-planner (Standard Stack, Architecture Patterns, Don't Hand-Roll, Common Pitfalls, Code Examples)
```
