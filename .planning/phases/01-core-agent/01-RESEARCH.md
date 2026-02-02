# Phase 1: Core Agent - Research

**Researched:** 2026-02-02
**Domain:** GSD adversarial agent design and implementation
**Confidence:** HIGH

## Summary

This phase creates the `gsd-adversary` agent that challenges artifacts (requirements, roadmaps, plans, verification reports) with structured, constructive feedback. The research domain is well-covered by existing project research (ARCHITECTURE.md, FEATURES.md, PITFALLS.md) which provides HIGH confidence patterns.

The core challenge is translating research findings into an agent that follows existing GSD patterns while implementing adversarial review mechanics. Key design decisions involve: challenge structure format, output format for spawners, checkpoint-specific challenge focus, and convergence signal logic.

**Primary recommendation:** Follow existing agent patterns (gsd-verifier, gsd-plan-checker) for structure and output format. Use severity-classified challenges in markdown with structured sections. Implement stateless rounds where each invocation receives full context (artifact + optional defense).

## Standard Stack

This is a pure prompt engineering task with no external dependencies.

### Core
| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| Markdown agent file | N/A | Agent definition format | GSD standard agent format |
| YAML frontmatter | N/A | Agent metadata | GSD agent pattern |
| XML prompt sections | N/A | Structured prompt content | GSD agent pattern |

### Supporting
| Component | Version | Purpose | When to Use |
|-----------|---------|---------|-------------|
| Task tool | N/A | Spawning adversary | Orchestrator invocation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Markdown output | JSON structured output | Markdown is more readable, aligns with other GSD agents, easier for Claude to defend against |
| Stateless rounds | Stateful history tracking | Stateless is simpler, deferred history to v2.2+ per REQUIREMENTS.md |

## Architecture Patterns

### Recommended Agent Structure
```
agents/
  gsd-adversary.md         # The adversary agent definition
```

### Pattern 1: Agent File Structure (from existing agents)
**What:** Standard GSD agent file with frontmatter + XML sections
**When to use:** All GSD agents follow this pattern
**Example:**
```markdown
---
name: gsd-adversary
description: Challenges artifacts with constructive, severity-classified feedback. Spawned by orchestrators at checkpoint locations.
tools: Read, Bash, Glob, Grep
color: red
---

<role>
[Role definition]
</role>

<challenge_generation>
[Per-checkpoint challenge logic]
</challenge_generation>

<output_format>
[Structured return format]
</output_format>
```

### Pattern 2: Severity Classification (from CONTEXT.md decisions)
**What:** Three-tier severity system for challenges
**When to use:** All challenges must be classified
**Semantics:**
- **BLOCKING:** Cannot proceed until resolved. Hard stop. Must address before moving forward.
- **MAJOR:** Significant concern that should be addressed. Work can proceed but quality/risk affected.
- **MINOR:** Improvement opportunity. Nice-to-fix but not critical.

### Pattern 3: Checkpoint-Specific Challenge Categories (from CONTEXT.md)
**What:** Different challenge focus per artifact type
**When to use:** Adversary adapts based on `<artifact_type>` in prompt

| Checkpoint | Primary Challenges | Secondary Challenges |
|------------|-------------------|---------------------|
| Requirements | Feasibility, Completeness | Conflicts, Scope creep, User focus |
| Roadmap | Phase ordering, Requirement coverage | Scope per phase, Risk distribution |
| Plan | Task completeness, Risk/edge cases | Missing wiring, Complexity hiding |
| Verification | Conclusion validity, Blind spots | Coverage, False positives |

### Pattern 4: Constructive Tone (from CONTEXT.md, REQUIREMENTS AGENT-01)
**What:** Challenges phrased as potential risks, not accusations
**When to use:** All challenge generation

| Bad (Accusatory) | Good (Constructive) |
|------------------|---------------------|
| "This is wrong" | "Potential risk: [specific issue]" |
| "You forgot X" | "Potential gap: [X] appears unaddressed" |
| "This won't work" | "Feasibility concern: [specific blocker]" |
| "Bad decision" | "Trade-off worth considering: [alternative]" |

### Pattern 5: Convergence Recommendation (from CONTEXT.md)
**What:** Adversary recommends converge/continue with rationale; spawner decides
**When to use:** End of every adversary response

Signals for **CONTINUE**:
- BLOCKING challenges remain unaddressed
- Defense didn't address the specific concern raised
- New information revealed a new concern
- Defense rejected challenge without evidence

Signals for **CONVERGE**:
- All BLOCKING challenges adequately addressed
- Remaining challenges are MAJOR/MINOR only AND defense provided reasonable rationale
- Defense revealed information that resolves the concern
- No new challenges discovered after reviewing defense

### Pattern 6: Challenge Structure Format (Recommendation)
**What:** Title + Evidence + Severity + (optionally) Affected Area
**When to use:** Every individual challenge

Based on gsd-plan-checker and gsd-verifier patterns:
```markdown
### Challenge N: [Descriptive Title]

**Severity:** BLOCKING | MAJOR | MINOR
**Concern:** [What is problematic - specific and grounded in artifact]
**Evidence:** [Quote or reference from artifact that supports this concern]
**Affected:** [Which part of artifact / which requirement / which component]
```

### Pattern 7: Output Format (Recommendation)
**What:** Structured markdown return to spawner
**When to use:** Every adversary response

Based on existing agent return patterns:
```markdown
## ADVERSARY CHALLENGES

**Checkpoint:** [requirements | roadmap | plan | verification]
**Round:** [N]/[max]
**Challenges Found:** [count]

### Challenge 1: [Title]
[Challenge structure per Pattern 6]

### Challenge 2: [Title]
[Challenge structure per Pattern 6]

---

### Defense Assessment (if round > 1)

| Previous Challenge | Status | Notes |
|-------------------|--------|-------|
| [Challenge title] | addressed | [How it was addressed] |
| [Challenge title] | rejected | [Why rejection is/isn't valid] |
| [Challenge title] | unaddressed | [Still a concern] |

---

### Convergence Recommendation

**Recommendation:** CONTINUE | CONVERGE
**Rationale:** [Why continue or converge]
**Remaining Concerns:** [N] BLOCKING, [N] MAJOR, [N] MINOR
```

### Anti-Patterns to Avoid (from PITFALLS.md)
- **Sycophancy:** Backing down without new evidence. Maintain position unless defense provides NEW information.
- **Over-aggressiveness:** Blocking everything. Every challenge needs specific evidence.
- **Generic challenges:** Same challenges regardless of checkpoint type. Adapt to artifact.
- **Superficial review:** Attacking conclusions not reasoning. Examine the "why" not just "what."
- **No suggestions:** Per CONTEXT.md, adversary surfaces problems only (no fixes). But challenges must be actionable (specific enough to address).

## Don't Hand-Roll

This is a prompt engineering task, not a coding task. No external libraries needed.

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Challenge taxonomy | Custom categorization system | Checkpoint-specific categories from CONTEXT.md | Already defined by user decisions |
| Severity levels | Custom severity scheme | BLOCKING/MAJOR/MINOR from CONTEXT.md | Already decided |
| Output format | Novel structure | Existing GSD agent patterns | Consistency with codebase |

**Key insight:** The project research (ARCHITECTURE.md, FEATURES.md, PITFALLS.md) already provides comprehensive guidance. Implementation should follow these findings, not reinvent.

## Common Pitfalls

### Pitfall 1: Sycophancy (Rubber-Stamping)
**What goes wrong:** Adversary agrees too easily, defeats purpose
**Why it happens:** LLM training rewards agreeable responses
**How to avoid:**
- Explicit "devil's advocate" framing in role
- "Always find at least one challenge" instruction (per CONTEXT.md)
- Require challenges be grounded in artifact evidence
**Warning signs:** Converges in 1 round, challenges are all MINOR, echoes defender's reasoning

### Pitfall 2: Over-Aggressiveness (Gridlock)
**What goes wrong:** Adversary blocks everything, nothing passes
**Why it happens:** Strong adversarial instructions create reflexive opposition
**How to avoid:**
- Graduated severity (BLOCKING/MAJOR/MINOR)
- "Burden of proof" - every challenge needs specific evidence
- Allow graceful acknowledgment when defense is valid
**Warning signs:** Challenge rate >90%, same objections repeated, never converges

### Pitfall 3: Superficial Challenges
**What goes wrong:** Challenges target conclusions not reasoning
**Why it happens:** Easier to critique outcomes than trace logic
**How to avoid:**
- Require challenges to reference specific artifact content
- Ask "why is this problematic" not just "what is wrong"
- Include reasoning step analysis
**Warning signs:** Challenges are vague, no evidence cited, debates resolve without discussing approach

### Pitfall 4: Context Loss in Multi-Round
**What goes wrong:** Loses track of original artifact/concerns
**Why it happens:** Context window fills with back-and-forth
**How to avoid:**
- Stateless design (each round gets full context)
- Defense Assessment table summarizes previous round
- Keep responses focused, not verbose
**Warning signs:** Repeats resolved challenges, forgets artifact details

### Pitfall 5: Role Confusion
**What goes wrong:** Creates opposition for opposition's sake
**Why it happens:** Rigid "devil's advocate" role creates identity commitment
**How to avoid:**
- Frame as "challenger seeking to strengthen" (constructive stance from CONTEXT.md)
- Define success as "finding real issues OR confirming quality"
- Allow position change when defense provides new evidence
**Warning signs:** Maintains challenges despite valid rebuttals, never acknowledges good points

## Code Examples

### Agent Frontmatter
```yaml
---
name: gsd-adversary
description: Challenges artifacts with constructive, severity-classified feedback. Spawned by orchestrators at checkpoint locations.
tools: Read, Bash, Glob, Grep
color: red
---
```

### Role Section Example
```xml
<role>
You are a GSD adversary. Your job is to challenge artifacts and surface potential problems before they become real problems in execution.

You are spawned by orchestrators at four checkpoints:
- Requirements: After REQUIREMENTS.md created
- Roadmap: After ROADMAP.md created
- Plans: After PLAN.md created
- Verification: After VERIFICATION.md created

**Core stance:** Constructive adversary. Surface problems, not solutions. Every challenge must be:
- SPECIFIC: Point to exact content in the artifact
- GROUNDED: Cite evidence for why it's problematic
- CONSTRUCTIVE: "Potential risk..." not "This is wrong"

**Critical rule:** Always find at least one challenge. Nothing is perfect. Your job is to find what could go wrong, not to approve.
</role>
```

### Challenge Template Example
```xml
<challenge_template>
### Challenge N: [Descriptive title]

**Severity:** [BLOCKING | MAJOR | MINOR]
**Concern:** [What is problematic]
**Evidence:** [Quote or reference from artifact]
**Affected:** [Section/requirement/component affected]
</challenge_template>
```

### Convergence Assessment Example
```xml
<convergence_logic>
After reviewing defense (if provided), determine recommendation:

**CONTINUE if:**
- Any BLOCKING challenge is unaddressed or inadequately addressed
- Defense rejected challenge without providing evidence
- Review of defense revealed new concerns

**CONVERGE if:**
- All BLOCKING challenges addressed with evidence
- Only MAJOR/MINOR remain AND defense provided reasonable rationale
- No new concerns discovered

Always include rationale explaining the recommendation.
</convergence_logic>
```

### Checkpoint-Specific Challenge Focus
```xml
<checkpoint_challenges>

## Requirements Checkpoint

Challenge for:
- **Feasibility:** Can this actually be built with stated constraints?
- **Completeness:** Are obvious requirements missing for this type of product?
- **Conflicts:** Do requirements contradict each other?
- **Scope creep:** Are implementation details masquerading as requirements?

## Roadmap Checkpoint

Challenge for:
- **Phase ordering:** Does the sequence make sense? Dependencies respected?
- **Requirement coverage:** Do all requirements map to phases?
- **Scope per phase:** Is any phase too large or too small?
- **Risk distribution:** Are risky items appropriately front-loaded?

## Plan Checkpoint

Challenge for:
- **Task completeness:** Are tasks atomic enough? Can they be verified?
- **Risk/edge cases:** What could go wrong? What's not covered?
- **Missing wiring:** Are integration points explicitly planned?
- **Complexity hiding:** Are there "implement X" tasks hiding complexity?

## Verification Checkpoint

Challenge for:
- **Conclusion validity:** Are the verification conclusions justified?
- **Blind spots:** What wasn't checked that should have been?
- **Coverage:** Were all must-haves actually verified?
- **False positives:** Could passing checks hide real issues?

</checkpoint_challenges>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Generic critique | Checkpoint-specific challenges | GSD design decision | More relevant challenges |
| Fixed round debate | Adaptive convergence | Research finding | Exit early when stable |
| Adversary as blocker | Advisory only | GSD design decision | Prevents gridlock |

**Current best practices (from project research):**
- Constructive stance reduces defensive responses
- Severity classification prioritizes issues
- Stateless rounds simplify implementation
- Advisory (not blocking) prevents workflow stalls

## Open Questions

### 1. Optimal Challenge Intensity per Checkpoint
- **What we know:** Different checkpoints need different focus (per CONTEXT.md)
- **What's unclear:** How many challenges is appropriate? Should requirements get more than verification?
- **Recommendation:** Claude's discretion per CONTEXT.md. Start with finding all genuine concerns, let severity classification prioritize.

### 2. Project Context Depth per Checkpoint
- **What we know:** Adversary needs PROJECT.md context to understand constraints
- **What's unclear:** How much additional context? Prior phase summaries?
- **Recommendation:** Minimal context - PROJECT.md summary for all checkpoints. Prior summaries only if spawner determines they're relevant.

### 3. "Always Find One Challenge" Edge Case
- **What we know:** CONTEXT.md says "always find at least one challenge"
- **What's unclear:** What if artifact is genuinely solid?
- **Recommendation:** Find at least one MINOR challenge (future improvement, edge case to monitor, assumption to verify). Nothing is literally perfect.

## Sources

### Primary (HIGH confidence)
- `.planning/phases/01-core-agent/01-CONTEXT.md` - User decisions for Phase 1
- `.planning/research/ARCHITECTURE.md` - Architectural integration patterns
- `.planning/research/FEATURES.md` - Feature landscape and MVP recommendation
- `.planning/research/PITFALLS.md` - Critical pitfalls to avoid
- `.planning/REQUIREMENTS.md` - Requirements AGENT-01, AGENT-02, AGENT-03, CONV-02

### Secondary (HIGH confidence)
- `agents/gsd-verifier.md` - Existing verification agent patterns
- `agents/gsd-plan-checker.md` - Existing checking agent patterns
- `agents/gsd-planner.md` - Agent structure and output patterns
- `get-shit-done/templates/summary.md` - Template structure patterns

### Tertiary (MEDIUM confidence)
- Project research academic sources (cited in PITFALLS.md):
  - ICLR 2025 MAD studies
  - Devil's Advocate anticipatory reflection paper
  - Sycophancy research

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - This is prompt engineering, no dependencies
- Architecture: HIGH - Existing research provides detailed patterns
- Pitfalls: HIGH - PITFALLS.md catalogs research-backed failure modes

**Research date:** 2026-02-02
**Valid until:** 30 days (stable domain, project research already comprehensive)
