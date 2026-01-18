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
| Follow source hierarchy | Context7 > Official Docs > WebSearch verified > WebSearch unverified | `<source_hierarchy>` |
| Include confidence levels | HIGH/MEDIUM/LOW on all findings | `<verification_protocol>` |
| MUST commit RESEARCH.md | Unlike project-researcher, commit your own output | `<execution_flow>` Step 5 |

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

```markdown
# Phase [X]: [Name] - Research

**Researched:** [date]
**Confidence:** [HIGH/MEDIUM/LOW overall]

## Standard Stack

| Library | Version | Purpose | Confidence |
|---------|---------|---------|------------|
| [lib] | [ver] | [what it does] | [H/M/L] |

## Architecture Patterns

### [Pattern Name]
- **What:** [description]
- **When:** [when to use]
- **Example:** [brief code or structure]

## Don't Hand-Roll

| Problem | Use Instead | Why |
|---------|-------------|-----|
| [problem] | [solution] | [rationale] |

## Common Pitfalls

| Pitfall | Symptom | Prevention |
|---------|---------|------------|
| [mistake] | [how you notice] | [how to avoid] |

## Code Examples

### [Example Name]
\`\`\`[language]
// [code snippet]
\`\`\`

## Open Questions

**[Question]**
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

## Source Hierarchy

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
├── Orchestrator provides phase number, description, requirements
├── Load phase context (MANDATORY):
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
└── Section names match what plan-phase expects

Step 5: Write and Commit RESEARCH.md
├── Write to .planning/phases/XX-name/{phase}-RESEARCH.md
├── Use complete template format
└── git add && git commit (YOU commit, unlike project-researcher)

Step 6: Return Structured Result
└── RESEARCH COMPLETE with summary
```

---

## Interactions

| Category | Details |
|----------|---------|
| **Reads** | `{phase}-CONTEXT.md` (if exists), Context7 docs, Official docs (WebFetch), WebSearch results |
| **Writes** | `.planning/phases/XX-name/{phase}-RESEARCH.md` |
| **Spawned By** | `/gsd:plan-phase`, `/gsd:research-phase` |
| **Consumed By** | `gsd-planner` (Standard Stack, Patterns, Pitfalls sections) |

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
.planning/phases/XX-name/{phase}-RESEARCH.md

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
- `gsd-planner` — Parses specific sections (Standard Stack, Patterns, Pitfalls, Code Examples)
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
| `<role>` | 1-30 | Identity, spawners, responsibilities |
| `<upstream_input>` | 31-60 | CONTEXT.md integration |
| `<downstream_consumer>` | 61-90 | How planner uses output |
| `<philosophy>` | 91-150 | Training as hypothesis, honest reporting |
| `<source_hierarchy>` | 151-200 | HIGH/MEDIUM/LOW sources |
| `<output_format>` | 201-400 | Complete RESEARCH.md template |
| `<execution_flow>` | 401-550 | Step-by-step process |
| `<structured_returns>` | 551-600 | Return message formats |
| `<success_criteria>` | 601-633 | Completion checklist |

---

## Quick Reference

```
WHAT:     Phase-specific research to inform planning
MODES:    Single mode (phase implementation research)
OUTPUT:   .planning/phases/XX-name/{phase}-RESEARCH.md

CORE RULES:
• Be PRESCRIPTIVE ("Use X") not exploratory ("Consider X or Y")
• Respect CONTEXT.md constraints (locked decisions, discretion areas, deferred)
• Follow source hierarchy: Context7 > Official > WebSearch
• Commit your own RESEARCH.md (unlike project-researcher)
• Training data is hypothesis — verify with current sources

SPAWNED BY: /gsd:plan-phase, /gsd:research-phase
CONSUMED BY: gsd-planner (Standard Stack, Patterns, Pitfalls sections)
```
