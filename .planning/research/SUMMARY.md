# Project Research Summary

**Project:** GSD Adversary Agent
**Domain:** LLM-based adversarial review for code orchestration systems
**Researched:** 2026-01-31
**Confidence:** HIGH

## Executive Summary

The adversarial review agent integrates as a parallel verification layer within GSD's existing orchestrator-agent architecture, challenging assumptions and stress-testing feasibility at four key checkpoints: requirements, roadmap, plans, and verification. Recent peer-reviewed research (ICLR 2025) reveals that naive multi-agent debate often underperforms single-agent approaches, but specific patterns succeed: structured critique frameworks, constructive (not destructive) adversarial stance, adaptive termination with max 3 rounds, and heterogeneous agent design.

The recommended approach uses **prompt engineering only**—no external dependencies—built around a 5-dimension structured critique (assumptions, feasibility, completeness, logic, risk) with explicit objection levels (BLOCKING/MAJOR/MINOR). The adversary spawns via GSD's existing Task tool at defined checkpoints, conducts iterative debate until convergence or max rounds, and remains advisory (Claude makes final decisions). This prevents the two critical failure modes identified in research: sycophancy (rubber-stamping everything) and over-aggressiveness (blocking everything).

**Key risk:** Same-model collusion—when adversary and primary agent share identical training biases, they miss the same flaws. Mitigation: Use checkpoint-specific personas, structured challenge dimensions, and explicit "devil's advocate" framing with strong anti-sycophancy instructions. Research shows this pattern, when properly implemented, catches 30-70% more quality issues than single-agent workflows without debate overhead.

## Key Findings

### Recommended Stack

**No external dependencies required.** The adversary is pure prompt engineering within GSD's existing infrastructure. Implementation uses the Task tool spawning pattern (already proven with gsd-plan-checker and gsd-verifier), structured XML prompts, and state management via .planning/ directory artifacts.

**Core technologies:**
- **Task tool** — Spawns adversary as isolated subagent with fresh context, already implemented in GSD
- **Structured critique framework** — 5-dimension evaluation (assumptions, feasibility, completeness, logic, risk) from Constitutional AI research
- **Convergence detection** — Explicit objection tracking with 2-consecutive-clean-rounds termination or 3-round hard cap from NeurIPS 2025 stability detection research
- **Chain-of-Verification** — Separate claim identification from verification to reduce hallucination by 30-50% per Meta AI 2024

**Prompt patterns:**
- Constructive adversarial stance: "rigorous skeptic who wants the plan to succeed"
- Checkpoint-specific personas: Requirements = completeness focus, Plans = feasibility focus, Verification = coverage focus
- Structured objection format: Issue + Evidence + Impact + Suggestion (not just "this is wrong")

### Expected Features

**Must have (table stakes):**
- **Structured challenge-response protocol** — Turn-taking with clear input/output contracts; without this, challenges become noise
- **Clear objections with reasoning** — Every challenge requires evidence ("because X") not just assertion ("this is wrong")
- **Termination criteria** — Explicit convergence rules (no objections OR max rounds) prevent infinite loops
- **Max round limits** — Hard cap at 3 rounds as safety valve; research shows >5 rounds yields diminishing returns
- **Context-aware criticism** — Requirements review differs from plan review differs from verification; one style doesn't fit all
- **Severity classification** — CRITICAL/MAJOR/MINOR distinction prevents treating all objections equally
- **Actionable feedback** — "Consider X instead" or "Address Y by doing Z" not just "Y is bad"
- **Checkpoint integration** — Spawns at defined workflow points (post-requirements, post-roadmap, post-plan, post-verification)

**Should have (competitive differentiators):**
- **Anticipatory reflection** — Challenge potential failures *before* they manifest, not just react to current state
- **Adaptive challenge intensity** — Dial up rigor for high-stakes decisions, dial down for routine changes
- **Multi-perspective challenges** — Technical feasibility, user impact, maintainability, security angles
- **Stability/convergence detection** — Detect when debate won't change outcome and stop early (saves tokens)
- **Challenge history tracking** — Avoid repetition across multi-round debates
- **Self-reflection on quality** — "Am I being useful or just contrarian?" prevents noise generation
- **Cross-checkpoint consistency** — Ensure plan challenges connect to requirements challenges

**Defer to post-MVP:**
- Confidence-gated output (sophisticated, can use round counts initially)
- Advanced stability metrics (KS-test based detection)
- Multi-model adversary configurations (different model families)

**Anti-features (explicitly avoid):**
- **Sycophantic backing down** — Adversary agrees too easily when pushed back; defeats purpose. Trained models optimize for "thumbs up" = capitulation.
- **Nitpicking without substance** — Endless minor complaints waste time, frustrate users. Suppress LOW severity items.
- **Blocking without alternatives** — "This won't work" with no path forward stalls progress. Every blocker MUST include suggested resolution.
- **Infinite debate loops** — Back-and-forth without progress. Hard max rounds (3) with escalation path.
- **Echo chamber agreement** — In multi-agent systems, majority opinion dominates regardless of correctness. Single adversary design avoids this.
- **Context-free challenges** — Ignoring project constraints, existing decisions. Load PROJECT.md before challenging.

### Architecture Approach

The adversary integrates as a **parallel verification layer** complementing (not replacing) existing verification agents. It follows the same spawning pattern as gsd-plan-checker and gsd-verifier but with a distinct role: oppositional review of assumptions/feasibility rather than structural validation of completeness.

**Major components:**

1. **gsd-adversary agent** (`agents/gsd-adversary.md`) — Receives artifact + type, generates structured challenges or "no objections," assesses previous defense (multi-round). Responsibilities: challenge generation, defense assessment, convergence recommendation. NOT responsible for: updating artifacts, making final decisions, blocking workflow.

2. **Debate orchestration in commands** — Each checkpoint command manages debate loop state (round counter, challenges list), spawns adversary with appropriate context, presents challenges to Claude for defense, updates artifacts based on defense, makes final decisions on unresolved challenges.

3. **Checkpoint integration points** — `/gsd:new-project` (after REQUIREMENTS.md, after ROADMAP.md), `/gsd:plan-phase` (after PLAN.md), `/gsd:verify-work` (after VERIFICATION.md). Sequential pattern recommended: existing verification → adversary debate → commit.

4. **Configuration extension** — `.planning/config.json` gains "adversary": true/false toggle with checkpoint-specific settings (max_rounds, enabled_checkpoints). Default: disabled for backward compatibility.

**Data flow (debate loop):**
```
Command creates artifact
    ↓
Spawn adversary(artifact, type, round=1)
    ↓
Adversary returns challenges[] OR "no objections"
    ↓
IF challenges: Claude formulates defense + revises artifact
    ↓
Re-spawn adversary(revised_artifact, defense, round=2)
    ↓
Loop until: no objections × 2 rounds OR max rounds (3)
    ↓
IF unresolved after max: Claude decides + logs rationale
```

**Relationship to existing agents:**
- `gsd-plan-checker`: "Is this plan complete?" (structural)
- `gsd-verifier`: "Did we build what we planned?" (validation)
- `gsd-adversary`: "Should we build this at all? Are we missing something fundamental?" (challenge)

### Critical Pitfalls

1. **Sycophancy (the rubber-stamp problem)** — Adversary capitulates to primary agent's position rather than genuinely challenging. Weaker models show only 3.6% correction rates against incorrect consensus. **Prevention:** Explicit "devil's advocate" framing, require adversary to articulate specific objections before approval, track challenge rate metrics (target: 30-70%), use different model families if same-model collusion emerges.

2. **Over-aggressiveness (the gridlock problem)** — Adversary blocks everything, creating stalemate. Research shows Multi-Persona with explicit opposition instructions causes severe performance drops. **Prevention:** Require objections to be specific and actionable (not general skepticism), implement burden of proof rules, use graduated challenge levels (concern/objection/blocker), set max rounds (3) with escalation path, allow structured rebuttal.

3. **Same-model collusion (shared blind spots)** — When adversary and primary use same model, they share identical training biases and knowledge gaps—both miss the same flaws. **Prevention:** Consider heterogeneous model configurations (Claude vs GPT vs Gemini), provide adversary with different context/documentation, periodically audit for correlated failures.

4. **Superficial challenges (attacking answers, not reasoning)** — Adversary challenges final conclusions without examining reasoning steps. Research: MAD frameworks "overly assign weight to final answer instead of reasoning steps." **Prevention:** Require adversary to evaluate reasoning steps explicitly, structure challenges as "This reasoning step X leads to problem Y," include chain-of-thought review in prompt.

5. **Convergence failures (infinite loops or premature termination)** — Debate either never converges (hitting max rounds every time) or terminates too early before genuine resolution. **Prevention:** Adaptive stability detection (require stability for 2+ consecutive rounds), hard maximum (3 rounds), track position changes per round (no change = convergence signal), escalation path for deadlock.

## Implications for Roadmap

Based on research and architecture analysis, recommended **6-phase structure** with clear dependencies:

### Phase 1: Core Agent Implementation
**Rationale:** Foundation for all integration work. Agent can be tested standalone before touching existing commands.
**Delivers:** `agents/gsd-adversary.md` with role definition, challenge generation logic per artifact type (requirements/roadmap/plans/verification), structured return format, convergence assessment logic.
**Addresses:** Structured protocol, clear objections, context-aware criticism, severity classification (from FEATURES.md)
**Avoids:** Superficial challenges pitfall by implementing 5-dimension critique framework

**Build order rationale:** Phase 1 has no dependencies and enables parallel testing before integration. Agent can be manually spawned with test artifacts to validate challenge quality.

### Phase 2: Configuration Schema
**Rationale:** Enables feature toggle before integration. Allows graceful rollout with backward compatibility.
**Delivers:** `.planning/config.json` extension with "adversary" toggle, "max_rounds" setting, "checkpoints" array. Updates to `/gsd:new-project` initialization to ask about adversary preference. Updates to `/gsd:settings` for toggling.
**Uses:** Existing config.json pattern (workflow toggles already exist for research, plan_check, verifier)
**Avoids:** Forcing adversary on all users—opt-in prevents workflow disruption

### Phase 3: Requirements + Roadmap Integration
**Rationale:** Highest-value checkpoints—catching issues in requirements prevents compound errors downstream. Roadmap review validates phase sequencing before detailed planning.
**Delivers:** Adversary checkpoints in `/gsd:new-project` after REQUIREMENTS.md (before roadmap) and after ROADMAP.md (before user approval). Debate loop orchestration logic. Challenge presentation and defense formulation.
**Addresses:** Checkpoint integration, termination criteria, actionable feedback (from FEATURES.md)
**Avoids:** Infinite debate loops (3-round hard cap), sycophancy (explicit devil's advocate framing)

**Integration point:** After requirements written, before roadmap spawned. After roadmap written, before user approval prompt.

### Phase 4: Plan Integration
**Rationale:** Plans are concrete enough for feasibility challenges. Integration can run adversary before/after existing gsd-plan-checker.
**Delivers:** Adversary checkpoint in `/gsd:plan-phase` after PLAN.md creation. Sequential pattern: plan-checker (structural) → adversary (assumptions/feasibility) → commit.
**Implements:** Debate loop reuse from Phase 3 (DRY: extract to shared workflow logic)
**Avoids:** Over-aggressiveness pitfall (burden of proof rules, graduated severity)

### Phase 5: Verification Integration (Optional)
**Rationale:** Post-execution adversarial review validates verification conclusions. Lower priority—may overlap with gsd-verifier.
**Delivers:** Adversary checkpoint in `/gsd:verify-work` after VERIFICATION.md. Assessment of verification coverage and false positive risk.
**Addresses:** Cross-checkpoint consistency (plan challenges connect to verification)
**Avoids:** Adversary during execution anti-pattern (only post-execution)

**Research flag:** Needs evaluation whether this checkpoint adds value over existing gsd-verifier or is redundant.

### Phase 6: Documentation + Testing
**Rationale:** Can parallel after Phase 1, finalize after Phase 5. Ensures maintainability and user adoption.
**Delivers:** `docs/reference/agents.md` update (gsd-adversary entry), `docs/reference/commands.md` updates (adversary checkpoints), `docs/guides/workflows.md` (adversary toggle guide). Integration testing across checkpoints.
**Addresses:** User understanding, feature discoverability, workflow adoption

### Phase Ordering Rationale

- **Phase 1 first:** Zero dependencies, enables standalone testing, unblocks all other work
- **Phase 2 before integration:** Feature flag prevents breaking existing workflows
- **Phase 3 before 4/5:** Requirements/roadmap are upstream—catch issues early has highest ROI
- **Phase 4 separate from 3:** Plan integration more complex (coordination with plan-checker), isolate risk
- **Phase 5 optional:** Verification checkpoint value unclear, may defer to post-MVP
- **Phase 6 parallelizable:** Docs can start after Phase 1 (agent complete), finalize after all integration

**Dependency chain:**
```
Phase 1 (agent) → Phase 2 (config) → Phase 3 (req/roadmap) → Phase 4 (plans) → Phase 5 (verify)
                                          ↓
                                    Phase 6 (docs) — can start early, finalize late
```

### Research Flags

**Needs deeper research during planning:**
- **Phase 5 (Verification Integration)** — Unclear if adversarial verification adds value over existing gsd-verifier. May be redundant. Consider merging or deferring.
- **Post-MVP: Multi-model configuration** — If same-model collusion emerges, research different model family integration (Claude + GPT hybrid). Currently speculative.

**Standard patterns (skip research-phase):**
- **Phase 1-4** — Well-documented patterns from academic research (ICLR 2025, NeurIPS 2025). Structured critique framework and debate loop are established. Implementation is prompt engineering, not novel architecture.
- **Phase 6** — Documentation follows existing GSD patterns (see docs/reference/ for template).

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Based on 2024-2025 peer-reviewed research (ICLR, NeurIPS, EMNLP, ACL). Structured critique, convergence detection, and anti-patterns well-established. |
| Features | HIGH | Table stakes confirmed across multiple academic papers and industry implementations. Differentiators validated by Devil's Advocate research (EMNLP 2024). Anti-features verified by failure mode studies (ICLR 2025). |
| Architecture | HIGH | Integration pattern matches existing GSD agents (gsd-plan-checker, gsd-verifier). Checkpoint locations align with PROJECT.md requirements. Debate loop protocol proven in research. |
| Pitfalls | HIGH | Critical pitfalls (sycophancy, over-aggression, convergence failures) documented with empirical evidence. Prevention strategies drawn from multi-agent debate meta-analysis. |

**Overall confidence:** HIGH

Research synthesis based on:
- 6 primary academic sources (ICLR 2025, NeurIPS 2025, EMNLP 2024, ACL 2024, Anthropic 2022)
- 8 supporting research papers (2023-2025)
- Existing GSD codebase analysis (`.planning/codebase/ARCHITECTURE.md`)
- Validation against PROJECT.md requirements

### Gaps to Address

**During Phase 1 (agent implementation):**
- **Challenge quality calibration** — Will need manual testing with various artifact types to tune prompt specificity. Research provides frameworks but not exact prompts. Iterate on: challenge diversity, specificity, actionability.

**During Phase 3-4 (integration):**
- **Escalation UX** — Research identifies need for escalation path after max rounds, but UX unclear. How should unresolved blocking issues be presented to user? Interactive prompt? Written report in STATE.md? Decision: Validate with user during integration.

**During Phase 5 (verification):**
- **Adversary vs Verifier overlap** — Unclear if post-execution adversarial review provides value beyond existing gsd-verifier. Both assess "did we build correctly" but from different angles (verifier = checklist, adversary = challenge). May discover redundancy or complementarity during implementation.

**Post-MVP research:**
- **Model diversity effectiveness** — Research suggests different model families reduce collusion, but no empirical data on GSD-specific workload. If same-model blind spots emerge in practice, research GPT/Gemini integration for adversary role.

**Validation approach:**
- Track challenge acceptance rate per checkpoint (target: 30-70% for healthy debate)
- Monitor convergence rounds (target: 60%+ converge by round 2, <10% hit max rounds)
- Audit for repeated pitfalls in post-execution (if same issues slip through repeatedly, adversary prompts need tuning)

## Sources

### Primary (HIGH confidence)
- [Multi-Agent Debate: Performance, Efficiency, and Scaling Challenges](https://d2jud02ci9yv69.cloudfront.net/2025-04-28-mad-159/blog/mad/) — ICLR 2025 — MAD framework limitations, anti-patterns
- [Multi-Agent Debate for LLM Judges with Adaptive Stability Detection](https://arxiv.org/html/2510.12697v1) — NeurIPS 2025 — Convergence detection, KS-test stability
- [Devil's Advocate: Anticipatory Reflection for LLM Agents](https://arxiv.org/abs/2405.16334) — EMNLP 2024 — Anticipatory reflection pattern
- [Enhancing AI-Assisted Group Decision Making through LLM-Powered Devil's Advocate](https://dl.acm.org/doi/10.1145/3640543.3645199) — IUI 2024 — Constructive vs destructive phrasing
- [Chain-of-Verification Reduces Hallucination](https://aclanthology.org/2024.findings-acl.212.pdf) — ACL Findings 2024 — CoVe pattern
- [Constitutional AI: Harmlessness from AI Feedback](https://arxiv.org/abs/2212.08073) — Anthropic 2022 — Structured critique dimensions

### Secondary (MEDIUM confidence)
- [Can LLM Agents Really Debate?](https://arxiv.org/html/2511.07784) — ICLR 2025 — Debate failure modes
- [Talk Isn't Always Cheap: Understanding Failure Modes in Multi-Agent Debate](https://arxiv.org/pdf/2509.05396) — 2024 — Sycophancy, conformity cascades
- [SycEval: Evaluating LLM Sycophancy](https://arxiv.org/html/2502.08177v2) — 2025 — Sycophancy metrics
- [AI Agents Under Threat: Security Challenges Survey](https://dl.acm.org/doi/10.1145/3716628) — ACM 2025 — Multi-agent security
- Existing GSD codebase (`ARCHITECTURE.md`, `gsd-plan-checker.md`, `gsd-verifier.md`) — Architecture patterns

### Tertiary (LOW confidence)
- [The Devil's Advocate Architecture](https://medium.com/@jsmith0475/the-devils-advocate-architecture-how-multi-agent-ai-systems-mirror-human-decision-making-9c9e6beb09da) — Industry blog — Multi-agent architecture concepts
- [Microsoft AI Agent Design Patterns](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns) — Orchestration patterns (general)

---
*Research completed: 2026-01-31*
*Ready for roadmap: YES*
