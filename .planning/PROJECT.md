# Declare

## What This Is

Declare is a future-driven meta-prompting engine for agentic development — a fork of GSD (Get Shit Done) that replaces linear phase-based planning with a DAG rooted in declared futures. Instead of sequencing work as phases 1→2→3, Declare starts from a constellation of future declarations ("what is true when this succeeded") and works backwards through causative milestones to concrete actions. It is grounded in the ontological/phenomenological work of Werner Erhard, Michael Jensen, Steve Zaffron, and the Vanto Group methodology.

The name "Declare" connects two worlds: the speech act of declaration (bringing a future into existence through language) and declarative programming (stating what should be true, not how to get there). Declarative Coding — code that declares what should exist, driven by a future you're living into.

## Core Value

Performance is the product of alignment and integrity. Declare makes both structurally enforced and visibly measured — so that every project, every team, every individual operates from a declared future with their word whole and complete.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Future declaration system — users declare a constellation of statements that are true when the project succeeds
- [ ] Past-detection engine — system detects when declared futures are past-derived ("I want X because Y sucks") and guides users through assessment/clearing to reach genuine future-based declarations
- [ ] Three-layer DAG structure — declarations (top) → causative milestones (middle) → actions (bottom), with edges flowing upward (actions cause milestones, milestones realize declarations)
- [ ] Backward derivation — milestones derived from declarations ("what must be true for this to be realized?"), actions derived from milestones
- [ ] Integrity tracking — commitments are explicit and tracked; when broken, the honor protocol activates (acknowledge, inform affected parties, clean up consequences, renegotiate)
- [ ] Alignment tracking — shared future document referenced by all agents; active drift detection that surfaces when work diverges from the declared future
- [ ] Performance scoring — alignment x integrity = performance, visible at project/milestone/action levels
- [ ] DAG visualization of the future→milestone→action structure
- [ ] Claude Code CLI integration — meta-prompting engine that works as slash commands (like GSD)
- [ ] GSD compatibility layer — can operate on existing GSD project structures or migrate them
- [ ] Solo mode — human + AI agent, alignment between the two
- [ ] Occurrence checks — AI periodically verifies "does this still occur as what we declared?" and surfaces drift before it compounds

### Out of Scope

- Team/multi-user features — future milestone, not v1 (solo + AI first)
- Web platform/dashboard — CLI first, web later
- Real-time collaboration — deferred until team mode
- Mobile app — not relevant for CLI-first agentic tool
- Full Vanto Group program replication — we're inspired by the ontology, not building a coaching platform

## Context

### Intellectual Foundations

The project draws from three bodies of work:

1. **Erhard, Jensen, Zaffron — Ontological Leadership Model**
   - Integrity as wholeness/completeness (positive, not normative)
   - The cascade: integrity → workability → performance
   - Six components of "one's word"
   - Honoring vs. keeping your word
   - Source: "Being a Leader and the Effective Exercise of Leadership" (SSRN #1263835)
   - Source: "Integrity: A Positive Model" (SSRN #1542759)

2. **Vanto Group — Three Laws of Performance**
   - How people perform correlates to how situations occur to them
   - How situations occur arises in language
   - Future-based language transforms how situations occur
   - The default future vs. the declared future
   - Five-stage process: Assess → Clear → Create → Align → Implement

3. **GSD (Get Shit Done) — Meta-prompting Engine**
   - Hierarchical project plans for solo agentic development
   - Slash command interface for Claude Code
   - Agent orchestration (researchers, planners, executors, verifiers)
   - The existing codebase we're forking from

### The Core Inversion

GSD is **imperative**: define requirements → sequence phases → execute linearly. The future is the sum of completed phases.

Declare is **declarative**: declare the future → derive what must be true → derive what must be done. The present is given by the future you're living into.

This maps to the Erhard insight: "The present is given by the future into which you are living." If you put the past into the future drawer, it will seem like the past is shaping the present. Declare keeps the past in the past and creates a future to live into.

### Why This Matters for AI-Assisted Development

Current AI coding tools are reactive — they respond to prompts. GSD made them proactive with structured planning. Declare makes them **generative** — the AI and human share a declared future and every action is checked against it. The AI doesn't just execute tasks; it co-holds the future and detects drift.

### Alignment x Integrity = Performance

The two vectors:

- **Alignment** = everyone (human + AI agents) sees the same future. Measured by: shared future document, occurrence checks, drift detection.
- **Integrity** = everyone honors their word. Measured by: commitment tracking, honor protocol activation, renegotiation transparency.

Performance is the multiplication of these two vectors. High alignment with low integrity = lots of plans, nothing delivered. High integrity with low alignment = delivering the wrong things reliably. Both high = breakthrough performance.

## Constraints

- **Tech stack**: Fork of GSD — Node.js CLI, Claude Code meta-prompting, markdown-based artifacts
- **Compatibility**: Must be installable as a Claude Code slash command system (like GSD)
- **Solo-first**: v1 targets a single human + AI agent pair; team features are v2+
- **Ontological fidelity**: The system should faithfully represent the Erhard/Jensen/Zaffron model — not water it down into generic project management

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fork GSD rather than build from scratch | GSD has proven agent orchestration, CLI integration, and meta-prompting patterns | — Pending |
| DAG over linear phases | Linear phases are past-derived sequencing; DAGs represent causal structure | — Pending |
| "Declare" as name | Connects speech act (declaration) with programming paradigm (declarative) | — Pending |
| Three-layer DAG (declarations → milestones → actions) | Maps to Vanto's Create → Align → Implement while adding causal structure | — Pending |
| Integrity as honor protocol, not enforcement | Matches Erhard model — integrity is about honoring, not policing | — Pending |
| CLI first, web later | Validate the ontology in the simplest form factor before building UI | — Pending |

---
*Last updated: 2026-02-15 after initialization*
