# Intent Fidelity System

Protocol for preserving user intent across the full GSD pipeline. Defines how intent is captured, enriched, handed off, and verified at each phase boundary.

**Problem this solves:** Intent degrades as it passes through agents. The user says "I want X because Y." By the time the executor runs, the task says "implement X" with no trace of Y. Downstream agents fill the gap with assumptions. The result technically works but misses the point.

**Core principle:** Every document in the pipeline carries an intent envelope. Every consumer of that document declares what it reads. Every producer proves it checked.

---

<intent_envelope>

## Intent Envelope Tiers

An intent envelope is metadata attached to a document that tracks the state of user intent. There are three tiers, corresponding to the lifecycle of intent through the pipeline.

### Tier 1: Seed

**Created by:** `discuss-phase` (initial user input) or `plan-phase` (phase-level context from ROADMAP.md)
**Format:** YAML block embedded in document (see `templates/intent-seed.md`)
**Contains:** Raw motivation, success criteria, constraints, richness level

The seed is the earliest capture of intent. It is written once and never modified -- downstream agents read it, they do not edit it. If the user's intent evolves, a new seed is written (not an amendment to the old one).

**Seed placement:**
- Project-level seed: In `PROJECT.md` frontmatter
- Phase-level seed: In `ROADMAP.md` phase detail section
- Plan-level seed: In `PLAN.md` frontmatter

### Tier 2: Context

**Created by:** `discuss-phase` (per-phase context gathering)
**Format:** Structured markdown with `<decisions>` sections (see `templates/context.md`)
**Contains:** Decisions with reasoning, constraints, user voice, Claude's discretion areas

Context is the enriched form of a seed. It adds specificity, captures decisions and their WHY, and marks what is locked vs. flexible. Context is the primary input for planning.

**Relationship to seed:** Context MUST reference its originating seed. A context document without a traceable seed has no accountability anchor.

### Tier 3: Handoff

**Created by:** `verify-phase` or phase completion workflow
**Format:** Structured markdown (see `templates/handoff.md`)
**Contains:** Intended vs. actual, delta analysis, forward-looking context, decisions that carry forward

Handoff is the closing envelope. It compares what was intended (from seed + context) against what was built (from VERIFICATION.md + SUMMARY.md). The delta is the critical output -- it tells the next phase what it inherits, what gaps remain, and what decisions carry forward.

</intent_envelope>

<intent_chain>

## Intent Chain Model

Envelopes connect across phases to form an intent chain. The chain is how downstream agents trace WHY something was built a certain way without re-asking the user.

```
User Input
    |
    v
[Seed] -----> written into ROADMAP.md phase entry
    |
    v
[Context] --> written into {phase}-CONTEXT.md (discuss-phase output)
    |
    v
[Plan] -----> PLAN.md references context decisions by name
    |
    v
[Execute] --> tasks reference plan, plan references context, context references seed
    |
    v
[Handoff] --> compares seed.success_looks_like against VERIFICATION.md results
    |
    v
[Next Phase Seed] --> inherits handoff.next_phase_must_know + handoff.decisions_that_carry_forward
```

### Chain Rules

1. **No orphaned documents.** Every context document traces to a seed. Every plan traces to a context. Every handoff traces to both seed and verification.

2. **No implicit inheritance.** If Phase 3 depends on a decision from Phase 2, the Phase 3 context must name that decision explicitly. "Follows Phase 2 patterns" is insufficient. "Uses JWT auth with 15-min expiry from Phase 2 (see 02-HANDOFF.md)" is sufficient.

3. **Intent only flows forward.** Downstream agents read upstream envelopes. They never modify them. If execution reveals that a seed assumption was wrong, the handoff documents the deviation -- it does not rewrite the seed.

4. **Chains survive context window resets.** Each envelope must be self-contained enough that an agent in a fresh context window can understand the intent without having been in prior conversations.

</intent_chain>

<accountability>

## Accountability Format

Every agent that consumes an intent envelope must prove it checked. The proof format is named mappings, not claimed coverage.

### What Named Mappings Look Like

**Bad (claimed coverage):**
```
I reviewed the context document and incorporated all decisions.
```

**Good (named mappings):**
```
Intent mapping:
- context.layout_style.card_based -> task 3: CardComponent with shadow + rounded corners
- context.layout_style.not_timeline -> task 3: no timeline view in component tree
- context.loading_behavior.infinite_scroll -> task 5: InfiniteScrollProvider wrapping feed
- context.loading_behavior.new_posts_indicator -> task 6: NewPostsBanner with count + click-to-load
- context.empty_state -> task 7: EmptyFeed with illustration + suggested accounts
- context.claudes_discretion.skeleton_design -> task 4: pulse animation skeleton (Claude chose)
```

### Accountability Rules

1. **Every locked decision in context must appear in the mapping.** If the context says "card-based layout" and the plan has no task that implements cards, the plan has a coverage gap.

2. **Claude's discretion items should be mapped too.** They show the agent made a choice, not that it ignored the area.

3. **Unmapped decisions are flagged.** If a decision from context does not appear in the plan mapping, the plan must explicitly state why: "context.error_recovery -- deferred to Phase 4 per ROADMAP.md scope."

4. **Mappings go in the document that consumes the envelope.** For plans, the mapping goes in PLAN.md. For handoffs, the mapping goes in HANDOFF.md. The mapping is not a separate file.

### Where Accountability Appears

| Document | Accountability Section | Maps From | Maps To |
|----------|----------------------|-----------|---------|
| PLAN.md | `<intent_mapping>` | CONTEXT.md decisions | Plan tasks |
| SUMMARY.md | Accomplishments + Deviations | PLAN.md tasks | Actual output |
| HANDOFF.md | Intended vs. Actual | Seed success criteria | VERIFICATION.md results |

</accountability>

<consumer_registry>

## Consumer Registry

Every document in the GSD pipeline must declare its consumers. This makes the information flow explicit and auditable.

### Registry Format

Each document template includes a consumers section (either in frontmatter or as a comment). The format is:

```yaml
consumers:
  - agent: gsd-planner
    reads: decisions, constraints, claudes_discretion
    uses_for: task decomposition, implementation choices
  - agent: gsd-executor
    reads: success_criteria
    uses_for: verification during execution
```

### Current Consumer Map

| Document | Produced By | Consumed By | What They Read |
|----------|------------|-------------|----------------|
| PROJECT.md | discuss-phase | plan-phase, research-phase | Vision, scope, user intent |
| ROADMAP.md | plan-phase | discuss-phase (per-phase), plan-phase (per-plan) | Phase goals, success criteria, dependencies |
| ROADMAP.md intent seed | discuss-phase / plan-phase | discuss-phase (depth assessment) | Motivation, success_looks_like, constraints |
| {phase}-CONTEXT.md | discuss-phase | plan-phase, research-phase | Decisions + reasoning, constraints, user voice |
| PLAN.md | plan-phase | execute-phase | Tasks, must-haves, intent mapping |
| SUMMARY.md | execute-phase | plan-phase (next phase), discuss-phase (next phase) | What shipped, decisions made, next phase readiness |
| VERIFICATION.md | verify-phase | handoff creation | What passed, what failed, evidence |
| HANDOFF.md | verify-phase / completion | discuss-phase (next phase), plan-phase (next phase) | Delta, forward context, carrying decisions |

### Registry Rules

1. **If nobody reads it, do not write it.** Every document must have at least one consumer.

2. **Consumers are specific.** "Other agents" is not a valid consumer. Name the agent and what it reads.

3. **Consumer changes require registry updates.** If a workflow change means SUMMARY.md is now also read by the research agent, update the registry.

4. **Templates carry their consumers.** Each template in `templates/` includes its consumer list. When an agent creates a document from a template, the consumers travel with it.

</consumer_registry>

<anti_patterns>

## Anti-Patterns

### The Telephone Game
Intent degrades silently through paraphrasing. User says "I hate when apps jump my scroll position." Context says "smooth scrolling experience." Plan says "implement scroll." Executor builds basic scroll with no position preservation. Fix: preserve user voice in context, use named mappings in plan.

### The Coverage Claim
Agent says "I reviewed all decisions" but actually missed two. No one catches it because the claim is not verifiable. Fix: named mappings force enumeration. Missing items are visible.

### The Orphaned Document
A context document exists but no seed traces to it. A plan exists but no context feeds it. The document has no accountability anchor. Fix: chain rules require every document to reference its upstream envelope.

### The Implicit Inheritance
"Phase 3 continues from Phase 2" with no specifics. Phase 3 agent guesses what to inherit. Fix: explicit handoff with named decisions that carry forward.

### The Retroactive Rewrite
Execution reveals the seed was wrong. Agent rewrites the seed to match what was built. History is lost. Fix: intent only flows forward. Handoff documents the deviation; seed stays unchanged.

</anti_patterns>
