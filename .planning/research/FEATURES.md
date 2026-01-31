# Feature Landscape: Adversarial Review Agent

**Domain:** AI-powered adversarial review and debate systems
**Researched:** 2025-01-31
**Overall Confidence:** HIGH (based on multiple academic papers and industry implementations)

---

## Table Stakes

Features users expect. Missing = agent feels incomplete or ineffective.

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **Structured challenge-response protocol** | Core mechanism for adversarial review. Without structured turns, challenges become noise. | Low | None | Academic consensus: turn-taking structure (challenger -> artifact owner -> judge) is fundamental. |
| **Clear objections with reasoning** | "This is wrong" without "because X" is useless feedback. Evidence-based challenges are baseline. | Low | None | Must articulate *why* something is problematic, not just *that* it is. |
| **Termination criteria** | Unbounded debate wastes resources. Must know when to stop. | Medium | None | Options: consensus reached, max rounds, stability detection, budget exhausted. |
| **Max round limits** | Safety valve to prevent infinite loops. Even with smart termination, hard limits are essential. | Low | Termination criteria | Research suggests 3-5 rounds typical; beyond 5 shows diminishing returns. |
| **Context-aware criticism** | Reviewing requirements differs from reviewing code differs from reviewing plans. One style doesn't fit all. | Medium | None | Adapt challenge focus: feasibility for requirements, completeness for plans, edge cases for code. |
| **Severity classification** | Not all objections are equal. Must distinguish blockers from suggestions. | Low | None | Typical: CRITICAL (must address), HIGH (should address), MEDIUM (consider), LOW (nitpick). |
| **Actionable feedback** | Objections without paths forward are frustrating. Must suggest what to change. | Medium | Clear objections | "Consider X instead" or "Address Y by doing Z" — not just "Y is bad." |
| **Checkpoint integration** | Must plug into workflow at defined points, not arbitrarily interrupt. | Medium | Orchestrator API | Key checkpoints: post-requirements, post-roadmap, post-plan, pre-commit, post-verification. |

---

## Differentiators

Features that set the agent apart. Not expected, but significantly improve quality.

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| **Anticipatory reflection** | Challenge potential failures *before* they manifest, not just react to current state. | High | Context awareness | Per "Devil's Advocate: Anticipatory Reflection" paper — decompose into subtasks, identify failure modes proactively. |
| **Adaptive challenge intensity** | Dial up rigor for high-stakes decisions, dial down for routine changes. | Medium | Severity classification | Requirements for a security feature need harder scrutiny than a UI tweak. |
| **Multi-perspective challenges** | Challenge from different angles: technical feasibility, user impact, maintainability, security. | Medium | Context awareness | Devil's Advocate Architecture pattern: separate "agents" for security, tech lead, user advocate perspectives. |
| **Stability/convergence detection** | Detect when further debate won't change the outcome and stop early. | High | Termination criteria | Research: KS-statistic based detection, consecutive stable rounds (2+ rounds with < threshold change). |
| **Structured argument decomposition** | Break complex challenges into testable sub-claims. | Medium | Clear objections | Makes it easier to partially accept/reject challenges. "Your plan has 3 issues: A (valid), B (valid), C (not applicable)." |
| **Self-reflection on challenge quality** | Meta-evaluate: "Am I being useful or just contrarian?" | Medium | None | Prevents the adversary from devolving into noise generation. |
| **Backtrack with remedy** | When a challenge is accepted, provide concrete fix, not just "you're wrong." | Medium | Actionable feedback | Per Devil's Advocate paper: "post-action alignment with subtask objectives and backtracking with remedy." |
| **Challenge history tracking** | Remember what was previously challenged to avoid repetition and track resolution. | Medium | State management | Essential for multi-round debates. "Issue X was raised in round 1, addressed in round 2, verified in round 3." |
| **Confidence-gated output** | Only allow artifact to proceed when adversary confidence drops below threshold. | High | Stability detection | "Proceed when adversary objection confidence < 0.3" rather than arbitrary round counts. |
| **Cross-checkpoint consistency** | Ensure challenges at requirements phase connect to challenges at plan phase. | High | Checkpoint integration, History tracking | "This plan doesn't address the feasibility concern raised during requirements review." |

---

## Anti-Features

Features to explicitly NOT build. Common mistakes in adversarial systems.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Sycophantic backing down** | Adversary agrees too easily when pushed back. Defeats the purpose. Trained models optimize for "thumbs up" which produces capitulation. | Maintain position unless presented with *new evidence*. Require explicit refutation, not just assertion. |
| **Nitpicking without substance** | Endless minor complaints that don't improve quality. Wastes time, frustrates users. | Enforce severity threshold. Suppress LOW severity items after initial review unless specifically requested. |
| **Blocking without alternatives** | "This won't work" with no path forward creates frustration and stalls progress. | Every blocking objection MUST include at least one suggested resolution. |
| **Infinite debate loops** | Adversary and creator go back-and-forth indefinitely. Resource drain, no progress. | Hard max rounds (e.g., 5). Escalation to human after max rounds. Stability detection to exit early. |
| **One-size-fits-all criticism** | Same challenges for requirements as for code. Misses context-specific issues. | Different challenge profiles per checkpoint type. Requirements focus on feasibility; code focuses on correctness. |
| **Echo chamber agreement** | In multi-agent systems, majority opinion dominates regardless of correctness ("tyranny of the majority"). | Single adversary design avoids this. If multiple reviewers, ensure genuine independence. |
| **Persuasion over truth** | Adversary "wins" debates through rhetoric rather than evidence. Optimizes for convincing, not for accuracy. | Ground challenges in specific, verifiable claims. "Line 42 has bug X" not "this code feels fragile." |
| **Context-free challenges** | Challenges that ignore project constraints, existing decisions, or stated non-goals. | Load project context (PROJECT.md, existing decisions) before challenging. Respect stated constraints. |
| **Asymmetric burden of proof** | Requiring artifact creator to prove every detail while adversary can assert without evidence. | Adversary must also provide evidence for challenges. "I claim X is problematic because Y evidence shows Z." |
| **Premature optimization** | Challenging MVP decisions with production-scale concerns. | Scope challenges to current milestone context. "For MVP, this is acceptable; flag for post-MVP hardening." |

---

## Feature Dependencies

```
Structured Protocol
       │
       ├──► Clear Objections ──► Actionable Feedback ──► Backtrack with Remedy
       │
       ├──► Termination Criteria ──► Max Round Limits
       │                        └──► Stability Detection ──► Confidence-Gated Output
       │
       ├──► Context Awareness ──► Adaptive Intensity
       │                     └──► Multi-Perspective Challenges
       │
       └──► Checkpoint Integration ──► Cross-Checkpoint Consistency
                                  └──► Challenge History Tracking
```

**Critical Path for MVP:**
1. Structured Protocol (foundation)
2. Clear Objections with Reasoning
3. Termination Criteria + Max Rounds
4. Context Awareness
5. Checkpoint Integration

**Post-MVP Enhancements:**
- Anticipatory Reflection
- Stability Detection
- Cross-Checkpoint Consistency

---

## MVP Recommendation

For MVP `gsd-adversary` agent, prioritize:

### Must Implement (Table Stakes)
1. **Structured challenge-response protocol** — Define clear input/output contract
2. **Clear objections with reasoning** — Every challenge has evidence
3. **Termination criteria** — "No objections" OR max rounds (recommend 3)
4. **Context-aware criticism** — At minimum, distinguish checkpoint types
5. **Severity classification** — CRITICAL/HIGH/MEDIUM/LOW
6. **Actionable feedback** — Suggestions with every objection

### Should Implement (High-Value Differentiators)
1. **Adaptive challenge intensity** — Scale rigor to artifact importance
2. **Challenge history tracking** — Avoid repetition in multi-round debates
3. **Self-reflection on quality** — Prevent noise generation

### Defer to Post-MVP
- **Anticipatory reflection** — Complex, requires deeper integration
- **Stability/convergence detection** — Nice optimization, not essential
- **Cross-checkpoint consistency** — Requires broader state management
- **Confidence-gated output** — Sophisticated, can use round counts initially

---

## Implementation Complexity Estimates

| Feature | Effort | Risk | Notes |
|---------|--------|------|-------|
| Structured protocol | 2-3 hours | Low | Define input schema, output schema, iteration flow |
| Clear objections | 1-2 hours | Low | Prompt engineering for evidence-based challenges |
| Termination criteria | 2-3 hours | Low | Consensus detection + max rounds |
| Context awareness | 3-4 hours | Medium | Different prompts per checkpoint type |
| Severity classification | 1 hour | Low | Add severity field to objection schema |
| Actionable feedback | 1-2 hours | Low | Prompt engineering addition |
| Checkpoint integration | 2-3 hours | Medium | Depends on orchestrator architecture |
| Adaptive intensity | 2-3 hours | Low | Parameter-driven prompt variation |
| History tracking | 3-4 hours | Medium | State management across rounds |
| Anticipatory reflection | 6-8 hours | High | Significant prompt complexity |
| Stability detection | 4-6 hours | Medium | Requires metrics and thresholds |

---

## Sources

### Academic Research
- [AI Debate Aids Assessment of Controversial Claims](https://arxiv.org/abs/2506.02175) — Debate protocol structure, judge accuracy
- [Multi-Agent Debate for LLM Judges with Adaptive Stability Detection](https://arxiv.org/html/2510.12697v1) — Termination criteria, convergence detection
- [Devil's Advocate: Anticipatory Reflection for LLM Agents](https://arxiv.org/abs/2405.16334) — Anticipatory reflection pattern
- [Talk Isn't Always Cheap: Understanding Failure Modes in Multi-Agent Debate](https://arxiv.org/abs/2509.05396) — Sycophancy, echo chambers, failure modes
- [D3: Debate, Deliberate, Decide](https://arxiv.org/html/2410.04663v3) — Budgeted stopping rules

### Industry & Architecture
- [The Devil's Advocate Architecture](https://medium.com/@jsmith0475/the-devils-advocate-architecture-how-multi-agent-ai-systems-mirror-human-decision-making-9c9e6beb09da) — Multi-agent architecture with reviewer agent
- [AI Agent Architecture Patterns](https://tanagram.ai/news/ai-agent-architecture-patterns-for-code-review-automation-the-complete-guide) — Code review automation patterns
- [Microsoft AI Agent Design Patterns](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns) — Orchestration patterns
- [Agentic AI Red Teaming Guide (CSA)](https://cloudsecurityalliance.org/artifacts/agentic-ai-red-teaming-guide) — Red team verification patterns

### AI Safety & Alignment
- [Anthropic Recommended Research Directions](https://alignment.anthropic.com/2025/recommended-directions/) — Adversarial techniques for alignment
- [OpenAI: AI Safety via Debate](https://openai.com/index/debate/) — Foundational debate protocol research
- [Sycophancy is the first LLM dark pattern](https://www.seangoedecke.com/ai-sycophancy/) — Why sycophancy is dangerous

---

## Confidence Assessment

| Area | Confidence | Rationale |
|------|------------|-----------|
| Table Stakes | HIGH | Consistent across multiple academic papers and implementations |
| Differentiators | HIGH | Well-documented in research, clear value proposition |
| Anti-Features | HIGH | Multiple sources on failure modes, sycophancy well-studied |
| Complexity Estimates | MEDIUM | Based on similar agent implementations, may vary with specifics |
| MVP Recommendation | HIGH | Aligned with research on effective vs. ineffective debate systems |
