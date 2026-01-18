# gsd-project-researcher.md — Enhanced Reference (Code-Verified)

## Metadata
| Attribute | Value |
|-----------|-------|
| **Type** | Agent |
| **Location** | `agents/gsd-project-researcher.md` |
| **Size** | 866 lines |
| **Documentation Tier** | Enhanced Standard |
| **Complexity Score** | 2+2+2+2 = **8/12** |
| **Verified Against** | Source code 2026-01-18 |

---

## Purpose

Researches the domain ecosystem before roadmap creation, producing comprehensive findings that inform phase structure. Answers "What does this domain ecosystem look like?" by surveying technology landscape, feature categories, architecture patterns, and domain-specific pitfalls.

**Key distinction:** Project-level research (entire domain) vs Phase-researcher (specific implementation).

---

## Critical Behaviors

| Constraint | Rule | Source Section |
|------------|------|----------------|
| Treat training as hypothesis | Training data is 6-18 months stale; verify with Context7/official docs | `<philosophy>` |
| Follow source hierarchy | Context7 > Official Docs > WebSearch verified > WebSearch unverified | `<source_hierarchy>` |
| Include confidence levels | HIGH/MEDIUM/LOW on all findings with justification | `<verification_protocol>` |
| DO NOT commit | Spawned in parallel; orchestrator commits all files together | `<execution_flow>` Step 6 |
| Be opinionated | Clear recommendations, not just lists of options | `<success_criteria>` |

---

## Training as Hypothesis Philosophy (CRITICAL)

**Source:** `<philosophy>` lines ~40-80

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

---

## Modes/Variants

| Mode | Trigger | Output Focus |
|------|---------|--------------|
| **Ecosystem** (default) | "What tools/approaches exist for X?" | Comprehensive list, popularity, when to use each |
| **Feasibility** | "Can we do X?" or "Is Y possible?" | YES/NO/MAYBE with conditions, blockers, risk factors |
| **Comparison** | "Compare A vs B" | Comparison matrix, clear recommendation with rationale, tradeoffs |

---

## Tool Strategy (CRITICAL)

**Source:** `<tool_strategy>`

Execute in this order for each research domain:

```
1. Context7 FIRST
   └── For known technologies
   └── Resolve library, query specific topics
   └── Confidence: HIGH

2. Official Docs (WebFetch)
   └── For authoritative gaps not in Context7
   └── Direct URLs to official documentation
   └── Confidence: HIGH

3. WebSearch
   └── For ecosystem discovery
   └── ALWAYS include current year in query
   └── Cross-reference multiple sources
   └── Confidence: MEDIUM (verified) or LOW (unverified)

4. Verification Pass
   └── Cross-reference all findings
   └── Check for contradictions
   └── Assign final confidence levels
```

---

## Source Hierarchy

**Source:** `<source_hierarchy>`

| Level | Sources | How to Use |
|-------|---------|------------|
| **HIGH** | Context7, official documentation, official releases | State as fact |
| **MEDIUM** | WebSearch verified with official source, multiple credible sources agree | State with attribution |
| **LOW** | WebSearch only, single source, unverified | Flag as needing validation |

---

## Output Files (5 Standard + 2 Conditional)

**Source:** `<output_files>`

### Standard (Always Created)

| File | Purpose | Key Sections |
|------|---------|--------------|
| **SUMMARY.md** | Executive summary with roadmap implications | Key Findings, Roadmap Implications, Confidence Assessment |
| **STACK.md** | Technology recommendations | Recommended Stack (by category), Alternatives Considered, Installation |
| **FEATURES.md** | Feature landscape | Table Stakes, Differentiators, Anti-Features, MVP Recommendation |
| **ARCHITECTURE.md** | System structure patterns | Component Boundaries, Data Flow, Critical Connections |
| **PITFALLS.md** | Common mistakes | Problem, Symptom, Prevention, If You Hit It |

### Conditional

| File | When Created | Purpose |
|------|--------------|---------|
| **COMPARISON.md** | Comparison mode | Side-by-side matrix, clear winner with rationale |
| **FEASIBILITY.md** | Feasibility mode | YES/NO/MAYBE, blockers, risk factors |

---

## Output File Templates

**Source:** `<output_files>` detailed templates

### STACK.md Template
```markdown
# Technology Stack

**Project:** [name]
**Researched:** [date]

## Recommended Stack

### Core Framework
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| [tech] | [ver] | [what] | [rationale] |

### Database
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|

### Infrastructure
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|

### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|

## Installation

\`\`\`bash
# Core
npm install [packages]

# Dev dependencies
npm install -D [packages]
\`\`\`

## Sources
- [Context7/official sources]
```

### FEATURES.md Template
```markdown
# Feature Landscape

**Domain:** [type of product]
**Researched:** [date]

## Table Stakes

Features users expect. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|

## Differentiators

Features that set product apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|

## Anti-Features

Features to explicitly NOT build. Common mistakes in this domain.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|

## MVP Recommendation

For MVP, prioritize:
1. [Table stakes feature]
2. [One differentiator]

Defer to post-MVP:
- [Feature]: [reason]

## Sources
- [Competitor analysis, market research]
```

---

## Quality Check Protocol

**Source:** `<execution_flow>` Step 4

Before declaring research complete, verify:

- [ ] All domains investigated (not just some)
- [ ] Negative claims verified with official docs
- [ ] Multiple sources for critical claims
- [ ] Confidence levels assigned honestly
- [ ] "What might I have missed?" review completed
- [ ] Current year included in WebSearch queries
- [ ] Publication dates checked for currency

---

## Execution Flow

**Source:** `<execution_flow>`

```
Step 1: Receive Project Context
├── Parse PROJECT.md content
├── Understand core value, constraints
└── Identify domain to research

Step 2: Identify Research Domains
├── Technology Landscape (frameworks, platforms)
├── Feature Landscape (table stakes, differentiators)
├── Architecture Patterns (component boundaries)
└── Domain Pitfalls (common mistakes)

Step 3: Execute Research Protocol
├── For each domain, follow tool strategy in order
├── Document findings with confidence levels
└── Cross-reference all findings

Step 4: Quality Check
├── Run verification protocol checklist
└── Flag any gaps or uncertainties

Step 5: Write Output Files
├── SUMMARY.md (always)
├── STACK.md (always)
├── FEATURES.md (always)
├── ARCHITECTURE.md (if patterns discovered)
├── PITFALLS.md (always)
├── COMPARISON.md (if comparison mode)
└── FEASIBILITY.md (if feasibility mode)

Step 6: Return Structured Result
├── DO NOT commit
└── Return to orchestrator with summary
```

---

## Interactions

| Category | Details |
|----------|---------|
| **Reads** | PROJECT.md (if exists), Context7 docs, Official docs (WebFetch), WebSearch results |
| **Writes** | `.planning/research/SUMMARY.md`, `STACK.md`, `FEATURES.md`, `ARCHITECTURE.md`, `PITFALLS.md` |
| **Spawned By** | `/gsd:new-project`, `/gsd:new-milestone` |
| **Consumed By** | `gsd-roadmapper` (phase structure), `gsd-research-synthesizer` (synthesis) |

---

## Structured Returns

### Research Complete
```markdown
## RESEARCH COMPLETE

**Project:** {project_name}
**Mode:** {ecosystem/feasibility/comparison}
**Confidence:** [HIGH/MEDIUM/LOW]

### Key Findings
- [3-5 bullet points of most important discoveries]

### Files Created
| File | Purpose |
|------|---------|
| .planning/research/SUMMARY.md | Executive summary |
| .planning/research/STACK.md | Technology recommendations |
| ... | ... |

### Confidence Assessment
| Area | Level | Reason |
|------|-------|--------|

### Roadmap Implications
[Key recommendations for phase structure]

### Open Questions
[Gaps that couldn't be resolved]
```

### Research Blocked
```markdown
## RESEARCH BLOCKED

**Project:** {project_name}
**Blocked by:** [what's preventing progress]

### Attempted
[What was tried]

### Options
1. [Option to resolve]
2. [Alternative approach]

### Awaiting
[What's needed to continue]
```

---

## Anti-Patterns

| Anti-Pattern | Why Bad | Correct Approach |
|--------------|---------|------------------|
| State training knowledge as fact | May be outdated/wrong | Verify with Context7/official docs first |
| Skip Context7 | Miss authoritative current info | Context7 FIRST for known technologies |
| Present LOW confidence as authoritative | Misleads downstream consumers | Flag uncertainty, recommend validation |
| Commit files | Other researchers running in parallel | DO NOT commit; orchestrator handles |
| Mix research modes | Confusing output | One mode per research session |
| Skip version numbers | Incompatible recommendations | Specific versions with rationale |
| Generic recommendations | Not actionable | Opinionated: "Use X because Y" |

---

## Change Impact Analysis

### If gsd-project-researcher Changes:

**Upstream Impact:**
- `new-project` command — May need to update parallel spawn logic
- `new-milestone` command — Same spawning pattern

**Downstream Impact:**
- `gsd-research-synthesizer` — Expects 4 specific files (STACK, FEATURES, ARCH, PITFALLS)
- `gsd-roadmapper` — Reads SUMMARY.md for phase suggestions

**Breaking Changes to Watch:**
- Output file names/paths
- SUMMARY.md section structure
- Confidence level values
- File commit behavior (must NOT commit)

---

## Section Index

| Section | Lines (approx) | Purpose |
|---------|----------------|---------|
| `<role>` | 1-30 | Identity, spawners, responsibilities |
| `<philosophy>` | 31-80 | Training as hypothesis, honest reporting |
| `<research_modes>` | 81-150 | Ecosystem, Feasibility, Comparison |
| `<source_hierarchy>` | 151-200 | HIGH/MEDIUM/LOW confidence sources |
| `<tool_strategy>` | 201-280 | Context7 → Official → WebSearch order |
| `<verification_protocol>` | 281-350 | Quality check checklist |
| `<output_files>` | 351-600 | All output file templates |
| `<execution_flow>` | 601-750 | Step-by-step process |
| `<structured_returns>` | 751-830 | Return message formats |
| `<success_criteria>` | 831-866 | Completion checklist |

---

## Quick Reference

```
WHAT:     Domain ecosystem research before roadmap creation
MODES:    Ecosystem (default), Feasibility, Comparison
OUTPUT:   .planning/research/ (SUMMARY, STACK, FEATURES, ARCHITECTURE, PITFALLS)

CORE RULES:
• Treat training data as hypothesis — verify with Context7/official docs
• Follow source hierarchy: Context7 > Official > WebSearch verified > unverified
• Include confidence levels on all findings (HIGH/MEDIUM/LOW)
• DO NOT commit — orchestrator handles commits after all researchers complete
• Be opinionated — clear recommendations, not just lists

SPAWNED BY: /gsd:new-project, /gsd:new-milestone
CONSUMED BY: gsd-roadmapper (phase structure), gsd-research-synthesizer
```
