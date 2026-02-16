# Domain Pitfalls: Adversarial AI Agents

**Domain:** Adversarial/debate-based AI agent systems
**Researched:** 2026-01-31
**Overall Confidence:** HIGH (verified across multiple peer-reviewed sources)

## Executive Summary

Adversarial AI agents commonly fail through predictable patterns: sycophancy (rubber-stamping), over-aggressiveness (blocking everything), convergence failures (infinite loops or premature termination), and same-model collusion (shared blind spots). Research consistently shows that debate mechanics alone cannot compensate for weak reasoning foundations, and that the strongest agent's accuracy effectively upper-bounds team performance.

---

## Critical Pitfalls

Mistakes that cause system failures or defeat the purpose of adversarial review.

### Pitfall 1: Sycophancy and Conformity Bias (The Rubber-Stamp Problem)

**What goes wrong:** The adversary capitulates to the primary agent's position rather than genuinely challenging it. Weaker models are "almost entirely swayed by the group" with some achieving only 3.6% correction rates against incorrect consensus.

**Why it happens:**
- RLHF training rewards agreeable responses over truthful disagreement
- Majority opinion strongly suppresses independent correction
- Agents lack confidence to maintain dissenting positions under pressure
- "Conformity exceeds Obstinacy" in most LLM debate scenarios

**Consequences:**
- Adversary provides false validation, defeating its purpose
- Flawed plans pass review unchallenged
- Creates dangerous illusion of validation without substance

**Warning signs:**
- Adversary rarely or never blocks/challenges proposals
- Challenges are always "soft" (suggestions vs. objections)
- Convergence happens in 1-2 rounds consistently
- Adversary echoes primary agent's reasoning

**Prevention:**
- Use explicit "devil's advocate" framing with strong instructions to find flaws
- Require adversary to articulate specific objections before approval
- Track challenge rate metrics (target: 30-70% initial challenge rate)
- Use different model families for adversary vs. primary agent

**Phase to address:** Agent prompt design (Phase 1), Calibration testing (Phase 2)

**Sources:** [ICLR 2025 MAD Study](https://d2jud02ci9yv69.cloudfront.net/2025-04-28-mad-159/blog/mad/), [Sycophancy Research](https://arxiv.org/html/2502.08177v2), [Identity Bias Study](https://arxiv.org/html/2510.07517)

---

### Pitfall 2: Over-Aggressiveness (The Gridlock Problem)

**What goes wrong:** Adversary blocks everything, creating stalemate. Research shows Multi-Persona approaches that "explicitly instruct the devil agent to counter whatever the angel agent says" cause severe performance drops.

**Why it happens:**
- Overly strong adversarial instructions create reflexive opposition
- No mechanism to recognize when objections have been adequately addressed
- Adversary rewards blocking over constructive critique
- Judge/arbiter cannot resolve persistent disagreement

**Consequences:**
- No work gets approved; productivity collapses
- Legitimate proposals blocked alongside flawed ones
- Users bypass or disable adversarial review entirely
- "Once the judge determines the devil's side is correct, the angel has no opportunity to continue debating"

**Warning signs:**
- Challenge rate exceeds 90%
- Same objections repeated across multiple rounds
- Primary agent's responses become defensive/adversarial
- Convergence never achieved, always hits max rounds

**Prevention:**
- Require objections to be specific and actionable (not general skepticism)
- Implement "burden of proof" rules (adversary must justify each objection)
- Use graduated challenge levels (concern, objection, blocker)
- Give primary agent structured rebuttal opportunities
- Set reasonable max rounds (3-5) with escalation path

**Phase to address:** Interaction protocol design (Phase 1), Round limit tuning (Phase 2)

**Sources:** [MAD Performance Study](https://d2jud02ci9yv69.cloudfront.net/2025-04-28-mad-159/blog/mad/), [Can LLM Agents Really Debate?](https://arxiv.org/html/2511.07784)

---

### Pitfall 3: Same-Model Collusion (Shared Blind Spots)

**What goes wrong:** When adversary and primary agent are instances of the same model, they share identical training biases, knowledge gaps, and reasoning patterns. Both miss the same flaws.

**Why it happens:**
- Same training data creates identical knowledge cutoffs
- Shared RLHF biases toward similar response patterns
- Models from same family exhibit correlated failure modes
- "Intense competitive relationships may render interactions untrustworthy"

**Consequences:**
- Systematic blind spots go undetected
- False confidence in validation ("two agents agreed")
- Debate becomes echo chamber despite adversarial framing
- "Cooperation among agents may cause a domino effect, where one compromised agent jeopardizes others"

**Warning signs:**
- Both agents consistently miss similar types of issues
- Debates converge quickly without substantive exchange
- Neither agent questions assumptions from training data
- Post-deployment issues cluster in predictable domains

**Prevention:**
- Use different model families (Claude vs. GPT vs. Gemini)
- Introduce heterogeneous agent configurations
- Provide adversary with different context/documentation
- Include external knowledge retrieval for adversary
- Periodically audit for correlated failures

**Phase to address:** Architecture design (Phase 1), Model selection (Phase 1), Blind spot testing (Phase 3)

**Sources:** [Multi-Agent Security Study](https://dl.acm.org/doi/10.1145/3716628), [RedDebate Paper](https://arxiv.org/html/2506.11083), [SIPRI Agent Interaction Analysis](https://www.sipri.org/commentary/essay/2025/its-too-late-why-world-interacting-ai-agents-demands-new-safeguards)

---

### Pitfall 4: Superficial Challenges (Attacking Answers, Not Reasoning)

**What goes wrong:** Adversary challenges final conclusions without examining reasoning steps. Research shows MAD frameworks "overly assign weight to the final answer instead of the reasoning steps."

**Why it happens:**
- Easier to critique outcomes than trace logic chains
- Token efficiency favors surface-level review
- No explicit instruction to examine reasoning process
- "Agents debate full responses rather than reasoning components"

**Consequences:**
- Correct conclusions with flawed reasoning pass review
- Wrong conclusions from sound reasoning get rejected
- Root causes of problems remain unaddressed
- Technical debt accumulates despite review

**Warning signs:**
- Challenges focus on "what" not "why"
- Adversary cannot explain what reasoning flaw led to the problem
- Approved items fail in edge cases not covered by conclusion
- Debates resolve quickly without discussing approach

**Prevention:**
- Require adversary to evaluate reasoning steps explicitly
- Structure challenges as: "This reasoning step [X] leads to problem [Y]"
- Include chain-of-thought review in adversary prompt
- Ask adversary to identify weakest reasoning link, not just wrong answers
- Implement "reasoning audit" as separate challenge dimension

**Phase to address:** Prompt engineering (Phase 1), Challenge taxonomy (Phase 2)

**Sources:** [MAD Challenges Study](https://d2jud02ci9yv69.cloudfront.net/2025-04-28-mad-159/blog/mad/), [LLM Debate Analysis](https://arxiv.org/html/2511.07784)

---

### Pitfall 5: Convergence Failures (Infinite Loops or Premature Termination)

**What goes wrong:** Debate either never converges (infinite loops hitting max rounds) or terminates too early before genuine resolution. Both waste resources or provide false validation.

**Why it happens:**
- Fixed round counts ignore actual convergence state
- No stability detection mechanism
- "Debate itself is not inherently corrective" without directed interventions
- Single low-variance round can trigger premature stop

**Consequences:**
- Infinite loops: wasted compute, user frustration, timeout errors
- Premature termination: unresolved issues passed through
- Unpredictable review times break workflow integration
- "Fixed-round debates risk either premature stopping before consensus or unnecessary computation after convergence"

**Warning signs:**
- Review times vary wildly (1 round to max rounds)
- Max rounds hit frequently (>30% of reviews)
- Items approved on round 1 later found flawed
- Back-and-forth without position changes

**Prevention:**
- Implement adaptive stability detection (KS statistic across rounds)
- Require stability for 2+ consecutive rounds before termination
- Set hard maximum (5-10 rounds) as safety bound
- Track position changes per round (no change = convergence signal)
- Use heuristic: "majority support should not decrease across q consecutive rounds"

**Phase to address:** Convergence detection (Phase 2), Round management (Phase 2)

**Sources:** [Adaptive Stability Detection](https://arxiv.org/html/2510.12697v1), [ICLR MAD Study](https://d2jud02ci9yv69.cloudfront.net/2025-04-28-mad-159/blog/mad/)

---

## Moderate Pitfalls

Mistakes that reduce effectiveness or create technical debt.

### Pitfall 6: Quality Assessment Gaps

**What goes wrong:** Adversary cannot reliably distinguish sound arguments from persuasive but flawed ones. "Weaker models struggle to recognize sound reasoning from peers."

**Why it happens:**
- Persuasive language triggers acceptance regardless of logic
- Models susceptible to logical fallacies (68% opinion change rate with fallacious arguments)
- No ground truth available during debate
- Quality judgment requires meta-reasoning capabilities

**Prevention:**
- Use stronger model for adversary role
- Require adversary to explain why an argument is sound/unsound
- Include explicit fallacy detection in adversary prompt
- Cross-validate with external knowledge sources

**Phase to address:** Model selection (Phase 1), Evaluation criteria (Phase 2)

---

### Pitfall 7: Majority Pressure Suppression

**What goes wrong:** In multi-agent scenarios, minority positions (even correct ones) get suppressed by majority pressure. "Weak agents rarely successfully overturn initial majorities."

**Why it happens:**
- Social conformity patterns from training data
- Confidence display creates bandwagon effect
- "Making confidences visible can induce over-confidence cascades"

**Prevention:**
- Hide inter-agent confidence scores
- Allow private reasoning before group discussion
- Weight novel objections higher than confirmations
- Implement "anti-conformity" mechanisms

**Phase to address:** Information flow design (Phase 1), Visibility controls (Phase 2)

---

### Pitfall 8: Context Window Degradation

**What goes wrong:** Over long interactions, adversary loses track of original instructions and constraints. "Even basic instructions can fall apart during long interactions."

**Why it happens:**
- Earlier context gets compressed/forgotten as window fills
- Instruction following degrades with token distance
- Multi-round debates compound context length

**Prevention:**
- Re-inject core instructions each round
- Keep individual rounds compact
- Summarize previous rounds rather than including full history
- Use system prompts that persist across rounds

**Phase to address:** Context management (Phase 2), Round structure (Phase 2)

---

### Pitfall 9: Role Confusion and Artificial Opposition

**What goes wrong:** Rigid "devil's advocate" role creates opposition for its own sake rather than truth-seeking. Performance drops when "devil agent has no opportunity to continue debating" after losing.

**Why it happens:**
- Role assignment creates identity commitment
- Losing debate feels like failure, not progress
- No graceful way to "concede good point"

**Prevention:**
- Frame as "challenger seeking to strengthen" not "opponent seeking to defeat"
- Allow adversary to acknowledge valid points explicitly
- Define success as "finding real issues OR confirming quality"
- Permit role flexibility as debate evolves

**Phase to address:** Prompt framing (Phase 1), Success metrics (Phase 2)

---

## Minor Pitfalls

Mistakes that cause inefficiency but are easily correctable.

### Pitfall 10: Fixed Round Inefficiency

**What goes wrong:** Running predetermined number of rounds regardless of convergence wastes compute on resolved debates.

**Prevention:** Implement early stopping when positions stabilize (no changes for 2 consecutive rounds).

**Phase to address:** Optimization (Phase 3)

---

### Pitfall 11: Monolithic Response Handling

**What goes wrong:** Treating entire response as single unit prevents targeted critique.

**Prevention:** Structure responses into reviewable sections (assumptions, approach, implementation, risks).

**Phase to address:** Response format (Phase 1)

---

### Pitfall 12: Missing Escalation Path

**What goes wrong:** No clear resolution when adversary and primary fundamentally disagree.

**Prevention:** Define escalation to human/external arbiter after max rounds without convergence.

**Phase to address:** Workflow integration (Phase 2)

---

## Phase-Specific Warnings

| Phase | Likely Pitfall | Mitigation | Priority |
|-------|---------------|------------|----------|
| Agent Design | Sycophancy from weak prompts | Explicit devil's advocate framing, require specific objections | HIGH |
| Agent Design | Over-aggressive blocking | Burden of proof rules, graduated challenge levels | HIGH |
| Agent Design | Superficial challenges | Require reasoning-step analysis, not just conclusion critique | HIGH |
| Model Selection | Same-model collusion | Different model families, heterogeneous configs | HIGH |
| Interaction Protocol | Infinite loops | Adaptive stability detection, hard max rounds | MEDIUM |
| Interaction Protocol | Premature termination | Multi-round stability requirement | MEDIUM |
| Calibration | Role confusion | "Strengthen" framing, allow graceful concession | MEDIUM |
| Integration | Missing escalation | Human arbiter path after max rounds | LOW |
| Optimization | Fixed round waste | Early stopping on convergence | LOW |

---

## Anti-Patterns to Explicitly Avoid

### Anti-Pattern: Debate as Inference-Time Scaling

**Trap:** Treating adversarial debate as compute multiplier for accuracy.
**Reality:** "Current MAD methods fail to consistently outperform simpler single-agent strategies, even with increased computational resources."
**Instead:** Use debate for catching blind spots and surface assumptions, not boosting accuracy.

### Anti-Pattern: Unanimous Agreement as Success

**Trap:** Measuring success by quick convergence to agreement.
**Reality:** Quick agreement often signals sycophancy or shared blind spots.
**Instead:** Track challenge diversity and substantive resolution.

### Anti-Pattern: Adversary as Gatekeeper

**Trap:** Giving adversary veto power over all decisions.
**Reality:** Creates gridlock and encourages gaming/bypassing.
**Instead:** Make adversary advisory; primary agent (or human) makes final call.

---

## Implementation Recommendations for gsd-adversary

Based on research findings, the `gsd-adversary` agent should:

1. **Be advisory, not authoritative** - Claude makes final decisions (avoids gridlock)
2. **Challenge reasoning steps, not just conclusions** - Prevents superficial review
3. **Use graduated challenge levels** - Concern < Objection < Blocker (prevents over-aggression)
4. **Require specific, actionable objections** - "This assumption [X] fails when [Y]"
5. **Allow graceful acknowledgment** - "Valid point, challenge withdrawn"
6. **Track convergence via position stability** - Not fixed rounds
7. **Set reasonable bounds** - Max 5 rounds, min 1 substantive challenge attempted
8. **Consider model diversity** - Different model family if same-model blind spots emerge

---

## Sources

### Primary Research (HIGH confidence)
- [Can LLM Agents Really Debate?](https://arxiv.org/html/2511.07784) - ICLR 2025 controlled study
- [Multi-LLM-Agents Debate: Performance, Efficiency, and Scaling Challenges](https://d2jud02ci9yv69.cloudfront.net/2025-04-28-mad-159/blog/mad/) - ICLR Blogposts 2025
- [Multi-Agent Debate for LLM Judges with Adaptive Stability Detection](https://arxiv.org/html/2510.12697v1) - Convergence mechanisms
- [RedDebate: Safer Responses Through Multi-Agent Red Teaming](https://arxiv.org/html/2506.11083) - Safety-focused debate design

### Supporting Research (MEDIUM confidence)
- [AI Agents Under Threat: Security Challenges Survey](https://dl.acm.org/doi/10.1145/3716628) - ACM Computing Surveys 2025
- [When Identity Skews Debate: Anonymization for Bias-Reduced Reasoning](https://arxiv.org/html/2510.07517) - Identity bias analysis
- [SycEval: Evaluating LLM Sycophancy](https://arxiv.org/html/2502.08177v2) - Sycophancy measurement
- [SIPRI: Interacting AI Agents Demand New Safeguards](https://www.sipri.org/commentary/essay/2025/its-too-late-why-world-interacting-ai-agents-demands-new-safeguards) - Agent interaction risks

### Practitioner Resources (MEDIUM confidence)
- [Microsoft AI Agent Failure Modes Taxonomy](https://www.microsoft.com/en-us/security/blog/2025/04/24/new-whitepaper-outlines-the-taxonomy-of-failure-modes-in-ai-agents/)
- [CSA Agentic AI Red Teaming Guide](https://cloudsecurityalliance.org/artifacts/agentic-ai-red-teaming-guide)
