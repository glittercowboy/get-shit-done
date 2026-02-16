# Feature Research: External AI Agent Co-Planning Integration

**Domain:** Multi-agent co-planning for AI CLI orchestration systems
**Researched:** 2026-02-16
**Confidence:** MEDIUM-HIGH

Research is grounded in analysis of existing multi-agent orchestration patterns (Microsoft Azure Architecture Center, Google ADK, Anthropic Agent Teams), real-world CLI coordination projects (AgentMux, Claude-Code-Workflow, Claude Octopus), academic multi-agent debate research, and the current non-interactive capabilities of Codex CLI, Gemini CLI, and OpenCode CLI. Confidence is not HIGH because the external CLI landscape is evolving rapidly and exact integration behavior depends on CLI versions at implementation time.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = co-planning feels broken or incomplete.

| Feature | Why Expected | Complexity | Dependencies on Existing GSD | Notes |
|---------|--------------|------------|------------------------------|-------|
| **Draft-review interaction pattern** | The fundamental co-planning pattern: Claude drafts an artifact, external agent reviews it, Claude synthesizes feedback. Without this, there is no co-planning. Every multi-agent orchestration framework implements this as a baseline (Microsoft calls it "maker-checker", Google ADK calls it "generator-critic"). | MEDIUM | Existing checkpoint flow in new-project, plan-phase, verify-work | Claude's `codex exec -p "Review this artifact"` / `gemini -p "Review this artifact"` / `opencode -p "Review this artifact"` patterns are well-supported by all three CLIs. |
| **Per-checkpoint agent configuration** | Users must control which external agent(s) participate at which checkpoint (requirements, roadmap, plan, verification). This mirrors the adversary's per-checkpoint config. Without it, co-planning is all-or-nothing, which is too coarse. | MEDIUM | Existing `config.json` adversary checkpoint pattern | Extend config.json's adversary pattern. Users already understand `checkpoints: { requirements: true, roadmap: true }`. |
| **External input as advisory** | Claude must remain the decision-maker. External agent input informs but does not block or override. This prevents the gridlock failure mode documented in multi-agent research (41-86.7% failure rates when no clear authority exists). | LOW | Existing adversary "advisory role" pattern | GSD already established this pattern: "You inform, Claude decides." Apply the same principle to external co-planners. |
| **Structured review output parsing** | External agent responses must be parsed into structured feedback (challenges, suggestions, endorsements) so Claude can act on them. Raw text dumps are noise. | MEDIUM | None | Prompt the external agent with a specific output format. Parse the response. Handle malformed output gracefully (treat as unstructured suggestion). |
| **Timeout and failure handling** | External CLIs can fail (API rate limits, auth issues, binary not found, timeout). Co-planning must gracefully degrade to Claude-only workflow. Research identifies reliability as a top concern for multi-agent systems. | MEDIUM | None | Essential for production UX. A missing `codex` binary should not crash the workflow. Default: 120s timeout per external invocation. |
| **Enable/disable co-planning globally** | Simple on/off toggle, mirroring the adversary global toggle. Users who do not have external CLIs installed should never see co-planning prompts or errors. | LOW | Existing config.json structure | `"co_planning": { "enabled": false }` as default. Only enable via `/gsd:settings` or `/gsd:new-project` preferences. |
| **CLI availability detection** | Auto-detect which external CLIs are installed and available (check `which codex`, `which gemini`, `which opencode`). Only offer agents that are actually available. | LOW | None | Run at config time, not every invocation. Cache result in config.json. |
| **Review feedback display** | Show external agent feedback to the user in a clear, formatted way before Claude acts on it. Users want to see what the external agent said. Transparency is table stakes for any multi-agent system. | LOW | Existing adversary summary display pattern | Mirror the adversary's "Challenges" display with severity markers. |

### Differentiators (Competitive Advantage)

Features that set GSD co-planning apart from other multi-agent CLI orchestration tools. Not required, but highly valuable.

| Feature | Value Proposition | Complexity | Dependencies on Existing GSD | Notes |
|---------|-------------------|------------|------------------------------|-------|
| **Parallel external review** | Send the same artifact to multiple external agents simultaneously (Codex + Gemini review the same roadmap in parallel). Reduces total time vs. sequential reviews. Matches GSD's existing parallel agent pattern. | MEDIUM | Existing parallel Task spawning | Unlike AgentMux or Claude Octopus which coordinate implementation, GSD only coordinates review -- much simpler since agents do not write files. |
| **Synthesis with provenance** | When Claude synthesizes multiple external reviews, attribute each piece of feedback to its source agent. "Codex flagged X, Gemini flagged Y, Claude accepted X and deferred Y because Z." This is the "weighted merging with adjudication" pattern from Microsoft's architecture guide. | MEDIUM | Structured review output parsing | Key differentiator: most multi-agent tools merge without attribution. Provenance enables trust and debugging. |
| **Model-diverse perspectives** | Different LLM providers have different training biases, strengths, and blind spots. Codex (GPT-5.x), Gemini (2.5 Pro), and Claude (Opus) reviewing the same plan surfaces issues that any single model would miss. Research shows multi-agent debate with heterogeneous models reduces factual hallucinations more than homogeneous debate. | LOW (inherent) | CLI availability detection | This is a "free" differentiator from using different CLIs. Document it as a key value proposition. |
| **Escalation to user on disagreement** | When external agents and Claude's adversary strongly disagree, surface the disagreement to the user rather than auto-resolving. This implements the "human-in-the-loop" gate that Microsoft, Google, and Anthropic all recommend for contentious decisions. | MEDIUM | External input as advisory, Adversary integration | Only trigger on genuine disagreements (e.g., external says BLOCKING, Claude's adversary says MINOR). Avoid spamming the user. |
| **Cost-aware agent routing** | Route artifacts to cheaper external agents for routine reviews, expensive ones for critical checkpoints. Mirrors GSD's existing model profile pattern (quality/balanced/budget). | LOW | Per-checkpoint agent configuration, Model profiles | Extend model profile concept: "quality" uses all agents at all checkpoints, "balanced" uses one agent at key checkpoints, "budget" skips co-planning. |
| **Review caching for iterative refinement** | When Claude revises an artifact based on external feedback, cache what was already reviewed so the next round only re-reviews changes. Prevents redundant API calls. | HIGH | Structured review output parsing, Adversary debate loop | Significant implementation complexity. Defer unless token costs become a user complaint. |
| **Cross-agent consistency tracking** | Track whether Codex's feedback on requirements was addressed in the plan phase. Persistent memory across checkpoints. | HIGH | Per-checkpoint configuration, State management | Maps to the "cross-checkpoint consistency" feature from the adversary research. Implement after basic flow works. |
| **Agent personality/role prompting** | Allow users to configure the review perspective for each external agent (e.g., Codex as "security reviewer", Gemini as "UX advocate"). This implements the role specialization pattern from multi-agent research. | MEDIUM | Per-checkpoint agent configuration | Adds significant customizability. Could be a simple `"role_prompt"` field in config. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems. Explicitly do NOT build these.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **External agents writing files directly** | "Let Codex implement part of the plan while Claude implements another part." Sounds like maximum parallelism. | Creates file conflict hell. Research shows 41-86.7% failure rates in multi-agent systems where agents modify shared state. GSD's atomic commit model breaks entirely. The entire postbox/file-based coordination pattern used by dual-agent workflows is fragile. | External agents review only. Claude is the sole writer. This is the "read-only mode" pattern from Microsoft's group chat orchestration. |
| **Real-time streaming debate between agents** | "Let Claude and Codex have a live conversation about the plan." Feels like maximum collaboration. | Requires WebSocket/IPC infrastructure GSD does not have. Context windows fill fast with cross-agent chatter. Research shows message density saturates at ~0.39 messages/turn -- beyond that, messages add redundancy not information. | Structured round-based review (draft -> review -> synthesize). Bounded, predictable, parseable. |
| **Democratic voting between agents** | "Let all agents vote on whether a plan is good." Seems fair. | Majority-rule voting with LLMs suffers from "tyranny of the majority" -- models trained on similar data agree on the same wrong things. Research shows heterogeneous debate outperforms voting. More importantly, GSD's "Claude decides" principle is deliberate: one decision-maker prevents gridlock. | Advisory input with Claude as decision-maker. External agents inform, they do not vote. |
| **Auto-selecting which agents to use per task** | "Let Claude dynamically decide whether to call Codex or Gemini for this specific review." Sounds smart. | Adds nondeterministic routing that is hard to debug, hard to predict costs for, and creates "why did it skip Codex this time?" confusion. The handoff pattern from Microsoft's guide explicitly warns against this when routing is not clear. | User configures agents per checkpoint at setup time. Deterministic, predictable, debuggable. |
| **Nested agent-to-agent delegation** | "Let Codex ask Gemini to review its review." Deeper collaboration! | Exponential complexity. Anthropic's agent teams documentation explicitly states "No nested teams: teammates cannot spawn their own teams." Every orchestration framework warns against this. | One level of delegation: Claude -> external agents. No agent-to-agent chains. |
| **Requiring external agent approval to proceed** | "External agent must approve the plan before execution can begin." Sounds like a quality gate. | Transforms advisory input into a blocker. If Codex's API is down, your entire workflow stops. If the external model hallucinates a BLOCKING concern, you are stuck. Research shows this creates "excessive bouncing" and gridlock. | External input is advisory. Claude can incorporate or dismiss. User can override. No external gates. |
| **Full context sharing with external agents** | "Send the entire PROJECT.md + ROADMAP.md + all research to the external agent for full context." Maximum context! | Exceeds external CLI context windows. Costs scale with input tokens. Most of the context is irrelevant to the specific review. Research shows context fragmentation is a top failure mode. | Send the specific artifact being reviewed + minimal relevant context (phase goal, key constraints). Targeted prompts produce better reviews. |

---

## Interaction Patterns (Research-Backed)

Based on analysis of multi-agent orchestration patterns from Microsoft Azure Architecture Center, Google ADK, academic multi-agent debate research, and real-world CLI coordination projects, these are the relevant patterns for GSD co-planning:

### Pattern 1: Draft-Review-Synthesize (RECOMMENDED -- Primary Pattern)

**How it works:**
1. Claude drafts artifact (requirements, roadmap, plan, verification report)
2. Artifact sent to configured external agent(s) for review
3. External agent(s) return structured feedback
4. Claude synthesizes feedback, revises artifact where warranted

**Why this pattern:** This is the "maker-checker" / "generator-critic" pattern. It is the most well-understood, most reliable, and lowest-risk multi-agent pattern. Microsoft, Google, and every framework recommend starting here. It preserves Claude's authorship and decision authority.

**GSD integration point:** Runs at the same checkpoints as the adversary (post-requirements, post-roadmap, post-plan, post-verification). Can run in parallel with or sequential to the adversary.

### Pattern 2: Parallel Fan-Out/Gather (RECOMMENDED -- For Multiple Agents)

**How it works:**
1. Same artifact sent to multiple external agents simultaneously
2. All reviews collected in parallel
3. Claude receives all feedback and synthesizes

**Why this pattern:** Reduces latency when using multiple external agents. GSD already does this with parallel research agents. The key: each agent writes to its own output (no shared mutable state).

**GSD integration point:** Wrap each external CLI call in its own process. Collect all results. Pass to Claude for synthesis.

### Pattern 3: Sequential Refinement (AVAILABLE -- For Deep Review)

**How it works:**
1. Claude drafts artifact
2. Agent A reviews
3. Claude revises based on Agent A
4. Agent B reviews the revised version
5. Claude finalizes

**Why this pattern:** When reviews need to build on each other (e.g., Codex reviews technical feasibility, then Gemini reviews user impact of the technically-feasible version).

**GSD integration point:** Optional mode for users who want deeper review at the cost of more time.

### Pattern 4: Structured Debate is NOT Recommended for External Agents

**Why not:** Structured debate (multiple rounds of argument and counter-argument between agents) requires agents to read each other's responses and respond directly. External CLI agents are stateless between invocations -- there is no persistent conversation. Simulating debate by passing context back and forth burns tokens rapidly and adds complexity. GSD already has the adversary for debate. External agents are better used for independent review, not debate.

---

## Feature Dependencies

```
CLI Availability Detection
    |
    +---> Enable/Disable Co-Planning (config.json)
              |
              +---> Per-Checkpoint Agent Configuration
              |         |
              |         +---> Draft-Review-Synthesize Pattern
              |         |         |
              |         |         +---> Structured Review Output Parsing
              |         |         |         |
              |         |         |         +---> Review Feedback Display
              |         |         |         |
              |         |         |         +---> Synthesis with Provenance
              |         |         |
              |         |         +---> Timeout & Failure Handling
              |         |
              |         +---> Parallel External Review
              |         |
              |         +---> Cost-Aware Agent Routing
              |
              +---> Agent Personality/Role Prompting
              |
              +---> Escalation to User on Disagreement
                        |
                        +---> Cross-Agent Consistency Tracking (future)
```

### Dependency Notes

- **CLI Detection requires Config**: Detection results stored in config so they are not re-run on every command invocation.
- **Per-Checkpoint Config requires Global Toggle**: Cannot configure checkpoints if co-planning is globally disabled.
- **Draft-Review requires Per-Checkpoint Config**: The pattern needs to know which agents run at which checkpoints.
- **Parallel Review requires Draft-Review**: Parallel is an optimization of the basic draft-review pattern.
- **Provenance requires Structured Parsing**: Cannot attribute feedback without structured output.
- **Escalation requires both External Input and Adversary**: Disagreement detection needs both systems producing classified feedback.

---

## MVP Definition

### Launch With (v1 -- Core Co-Planning)

Minimum viable co-planning: one external agent can review artifacts at configured checkpoints.

- [x] **CLI Availability Detection** -- `which codex`, `which gemini`, `which opencode` at config time
- [x] **Global enable/disable toggle** -- `co_planning.enabled` in config.json, default false
- [x] **Per-checkpoint agent configuration** -- which agent(s) at which checkpoint(s)
- [x] **Draft-Review-Synthesize pattern** -- core interaction loop
- [x] **Structured review output parsing** -- prompt for format, parse response, handle malformed
- [x] **Timeout and failure handling** -- graceful degradation to Claude-only on failure
- [x] **Review feedback display** -- show external feedback before Claude acts
- [x] **External input as advisory** -- Claude decides, external informs

### Add After Validation (v1.x)

Features to add once the basic flow works and users provide feedback.

- [ ] **Parallel external review** -- send to multiple agents simultaneously (trigger: users want Codex + Gemini)
- [ ] **Synthesis with provenance** -- attribute feedback to source agent (trigger: users want to know who said what)
- [ ] **Agent personality/role prompting** -- custom review perspectives (trigger: users want security-focused Codex reviews)
- [ ] **Escalation to user on disagreement** -- surface conflicts between external and adversary (trigger: adversary + co-planner interactions are live)
- [ ] **Cost-aware agent routing** -- integrate with model profiles (trigger: users complain about token costs)

### Future Consideration (v2+)

Features to defer until co-planning is validated and stable.

- [ ] **Review caching for iterative refinement** -- too complex for initial release
- [ ] **Cross-agent consistency tracking** -- requires persistent state across checkpoints
- [ ] **Sequential refinement mode** -- power user feature, low demand initially
- [ ] **Model-diverse perspective documentation** -- marketing/docs feature, not code

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Draft-Review-Synthesize pattern | HIGH | MEDIUM | P1 |
| Per-checkpoint agent configuration | HIGH | LOW | P1 |
| Structured review output parsing | HIGH | MEDIUM | P1 |
| Timeout and failure handling | HIGH | MEDIUM | P1 |
| CLI availability detection | MEDIUM | LOW | P1 |
| Global enable/disable | MEDIUM | LOW | P1 |
| Review feedback display | HIGH | LOW | P1 |
| External input as advisory | HIGH | LOW | P1 |
| Parallel external review | MEDIUM | MEDIUM | P2 |
| Synthesis with provenance | MEDIUM | MEDIUM | P2 |
| Agent personality/role prompting | LOW | MEDIUM | P2 |
| Escalation to user on disagreement | MEDIUM | MEDIUM | P2 |
| Cost-aware agent routing | LOW | LOW | P2 |
| Review caching | LOW | HIGH | P3 |
| Cross-agent consistency | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch -- core co-planning functionality
- P2: Should have -- adds significant value after core works
- P3: Nice to have -- defer until product-market fit established

---

## Competitor/Ecosystem Feature Analysis

| Feature | AgentMux | Claude Octopus | Claude-Code-Workflow | GSD Co-Planning (Proposed) |
|---------|----------|----------------|---------------------|---------------------------|
| Multi-CLI coordination | Claude Code only (multiple instances) | Codex + Gemini + Claude | Gemini + Qwen + Codex | Codex + Gemini + OpenCode |
| Coordination pattern | Shared task list + MCP messaging | Quality gates between agents | JSON-driven workflow execution | Draft-review at existing checkpoints |
| External agents write code | Yes | Yes | Yes | **No** (review only) |
| Per-checkpoint control | No | No | No | **Yes** (granular config) |
| Integrated with planning workflow | No (generic orchestration) | No (generic orchestration) | Partial (workflow-level) | **Yes** (deeply integrated) |
| Advisory vs. authoritative | N/A (all agents equal) | Quality gates block | Workflow blocks | **Advisory** (Claude decides) |
| Adversary + co-planning combined | No | No | No | **Yes** (both at same checkpoints) |
| Graceful degradation | Partial | Unknown | Unknown | **Yes** (falls back to Claude-only) |

**GSD's unique positioning:** Unlike generic multi-agent orchestrators, GSD integrates external review into an existing, opinionated workflow with checkpoints, adversarial review, and state management. The "review only, Claude writes" model avoids the file-conflict problems that plague AgentMux and similar tools.

---

## External CLI Capabilities Summary

All three target CLIs support non-interactive, pipeable execution -- the prerequisite for programmatic integration:

| CLI | Non-Interactive Command | Structured Output | Context Limits | Notes |
|-----|------------------------|-------------------|----------------|-------|
| **Codex CLI** | `codex exec -p "prompt"` | `--json` for JSONL events | Model-dependent (GPT-5.x) | Streams progress to stderr, final output to stdout. Pipe-friendly. |
| **Gemini CLI** | `gemini -p "prompt"` | `--output-format json` | 1M+ tokens (Gemini 2.5 Pro) | Headless mode for scripting. Stdin piping supported. |
| **OpenCode CLI** | `opencode -p "prompt"` | `-f json` for JSON output | Model-dependent (multi-provider) | `-q` quiet mode for scripts. Auto-approves permissions in non-interactive. |

**Key finding:** All three CLIs are designed for programmatic use and support piping prompts in and capturing structured output. The integration surface is clean and consistent across all three.

---

## Sources

### Multi-Agent Orchestration Patterns
- [Microsoft Azure Architecture Center - AI Agent Orchestration Patterns](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns) -- Comprehensive pattern catalog (sequential, concurrent, group chat, handoff, magentic)
- [Google ADK Multi-Agent Patterns](https://developers.googleblog.com/developers-guide-to-multi-agent-patterns-in-adk/) -- Generator-critic, parallel fan-out, hierarchical decomposition
- [Anthropic Agent Teams Documentation](https://code.claude.com/docs/en/agent-teams) -- Agent team architecture, limitations, best practices

### Multi-Agent Research
- [Why Do Multi-Agent LLM Systems Fail? (2025)](https://arxiv.org/html/2503.13657v1) -- Failure taxonomy: specification failures, inter-agent misalignment, task verification
- [Multi-Agent Debate Strategies for Requirements Engineering (2025)](https://arxiv.org/html/2507.05981v1) -- Debate patterns applied to software planning
- [Multi-LLM-Agents Debate - Performance and Scaling (ICLR 2025)](https://d2jud02ci9yv69.cloudfront.net/2025-04-28-mad-159/blog/mad/) -- Message density saturation at 0.39 messages/turn
- [Why Your Multi-Agent System is Failing (2025)](https://towardsdatascience.com/why-your-multi-agent-system-is-failing-escaping-the-17x-error-trap-of-the-bag-of-agents/) -- Context fragmentation, 17x error amplification

### External CLI Documentation
- [Codex CLI Non-Interactive Mode](https://developers.openai.com/codex/noninteractive/) -- `codex exec` command reference
- [Gemini CLI Headless Mode](https://geminicli.com/docs/cli/headless/) -- Non-interactive execution
- [OpenCode CLI Reference](https://opencode.ai/docs/cli/) -- `-p` flag and JSON output

### Ecosystem Projects
- [AgentMux](https://github.com/stevehuang0115/agentmux) -- Multi-Claude-Code orchestrator with MCP messaging
- [Claude Octopus](https://github.com/nyldn/claude-octopus) -- Multi-provider CLI coordination
- [Claude-Code-Workflow](https://github.com/catlog22/Claude-Code-Workflow) -- JSON-driven multi-agent framework

---

## Confidence Assessment

| Area | Confidence | Rationale |
|------|------------|-----------|
| Table Stakes | HIGH | Grounded in established multi-agent patterns from Microsoft, Google, and academic research |
| Differentiators | MEDIUM-HIGH | Patterns are validated; GSD-specific integration points need implementation validation |
| Anti-Features | HIGH | Extensively documented failure modes in multi-agent research; real-world project failures confirm |
| Interaction Patterns | HIGH | Draft-review is the most well-established pattern across all frameworks |
| External CLI Capabilities | MEDIUM | Documented non-interactive modes verified via official docs; exact behavior may vary by version |
| Complexity Estimates | MEDIUM | Based on GSD's existing adversary implementation complexity; external CLI integration adds uncertainty |
| Competitor Analysis | MEDIUM | Open-source projects evolve rapidly; feature sets may change |

---

*Feature research for: External AI Agent Co-Planning Integration*
*Researched: 2026-02-16*
