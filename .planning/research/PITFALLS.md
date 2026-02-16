# Domain Pitfalls: External AI Agent Co-Planning Integration

**Domain:** Adding external AI CLI agents (Codex CLI, Gemini CLI, OpenCode) to an existing Claude-based orchestration system
**Researched:** 2026-02-16
**Confidence:** MEDIUM-HIGH (verified with official docs and GitHub issues; some areas LOW due to rapidly evolving CLIs)

## Executive Summary

Integrating external AI CLIs as co-planners into GSD's existing Claude-based orchestration introduces five categories of failure: bash process management failures (hanging, orphaned processes, output parsing breakdowns), multi-model quality variance and conflicting recommendations, prompt incompatibility across model families, coexistence friction with the existing adversary system, and configuration complexity explosion. The most dangerous pitfalls are silent failures where a CLI hangs indefinitely without error output, and "synthesis collapse" where Claude's synthesizer picks the most agreeable recommendation rather than the best one. These pitfalls are well-documented in both GitHub issue trackers and multi-agent systems research.

---

## Critical Pitfalls

### Pitfall 1: CLI Process Hanging and Orphaned Children

**What goes wrong:**
External AI CLIs invoked via bash hang indefinitely, consuming the orchestrator's context window timeout budget and potentially blocking all downstream work. Codex CLI has documented issues where `bash -lc` wrapper processes create orphaned children that keep stdout/stderr pipes open forever. Gemini CLI hangs in non-interactive mode when it attempts to call tools that are disallowed, when a command triggers an interactive prompt, or when the `DEBUG` environment variable is set. OpenCode's `run` command can stall on cold boot if no persistent server is running.

**Why it happens:**
- Codex wraps commands in `bash -lc`, and timeout only kills the wrapper PID, not child processes (GitHub issue #4337, #7852)
- Gemini CLI freezes when non-interactive mode encounters tool calls or interactive shell prompts with no stdin to respond (GitHub issue #12337, #10909, #16567)
- Shell initialization scripts (`.bashrc`, `.zshrc`) can hang the login shell that Codex spawns
- Rate limiting or quota exhaustion causes indefinite "Working..." states with no error output (Codex issue #6512)
- All three CLIs lack standardized exit codes for timeout vs. error vs. success in their non-interactive modes

**How to avoid:**
- Wrap every CLI invocation with an explicit `timeout` command: `timeout 120 codex exec --json "prompt"`
- Use process groups (`setsid`) so the entire tree can be killed on timeout
- Set `BASH_ENV=/dev/null` and use `--noprofile --norc` to prevent shell init hangs
- For Codex: use `--skip-git-repo-check` when operating on read-only review tasks
- For Gemini: always pass `--output-format json` or `--output-format stream-json` to get parseable output
- For OpenCode: use `opencode serve` + `opencode run --attach` to avoid cold boot per invocation
- Implement a "liveness probe" pattern: if no output received within N seconds, kill and retry or skip

**Warning signs:**
- Bash tool calls that never return (Claude's own context window fills waiting)
- Orchestrator reaches 70%+ context usage without completing co-planning step
- stderr contains shell initialization output (profile loading, conda activation, etc.)
- Process list shows orphaned node/python processes from previous CLI invocations

**Phase to address:** Phase 1 (Foundation) -- process wrapper must be the first thing built and battle-tested before any real co-planning runs

**Sources:**
- [Codex CLI: Commands hang indefinitely when timeout occurs (Issue #4337)](https://github.com/openai/codex/issues/4337)
- [Codex CLI: --full-auto flags cause indefinite hang with orphaned processes (Issue #7852)](https://github.com/openai/codex/issues/7852)
- [Codex CLI: Implement default timeout (Issue #4775)](https://github.com/openai/codex/issues/4775)
- [Gemini CLI: Consistently hangs in non-interactive mode (Issue #16567)](https://github.com/google-gemini/gemini-cli/issues/16567)
- [Gemini CLI: Hangs when calling disallowed tools (Issue #12337)](https://github.com/google-gemini/gemini-cli/issues/12337)
- [Gemini CLI: Prevent freezing in non-interactive mode (PR #14580)](https://github.com/google-gemini/gemini-cli/pull/14580)

---

### Pitfall 2: Synthesis Collapse (Sycophantic Merging)

**What goes wrong:**
Claude synthesizes feedback from multiple external agents but gravitates toward the most agreeable or Claude-similar recommendation rather than the best one. When Codex (GPT-based), Gemini, and OpenCode (variable backend) all provide different recommendations, Claude's synthesizer conflates "convergence" with "correctness" and produces a watered-down consensus that loses the unique insights each model offered.

**Why it happens:**
- Claude's RLHF training biases toward agreement and smooth resolution
- The synthesizer sees three different opinions as conflict to resolve rather than diversity to leverage
- Cognition's research shows "actions carry implicit decisions, and conflicting decisions carry bad results" -- the synthesizer tries to eliminate conflict rather than surface it
- Without a structured reconciliation protocol, Claude defaults to weighted averaging of positions
- GPT-family models tend to be more verbose and assertive; Gemini more concise -- Claude may interpret assertiveness as confidence
- Research shows "adding more agents is not a silver bullet" and can degrade accuracy through "Coordination Tax"

**How to avoid:**
- Structure synthesis as a deliberate step with explicit rules: "For each recommendation point, identify where agents AGREE, where they DISAGREE, and where they raise unique points not mentioned by others"
- Require the synthesizer to preserve disagreements, not resolve them -- surface them to the orchestrator
- Use a "best of each" pattern rather than "average of all": extract the strongest contribution from each agent
- Tag each recommendation with its source model so the orchestrator can weight appropriately
- Implement a "novel insight" detector: if only one agent raised a point, it deserves MORE attention, not less
- Never let the synthesizer silently drop a recommendation -- require explicit "included/excluded with rationale"

**Warning signs:**
- Synthesis output is shorter than any individual agent's input
- All three agents raised different concerns but synthesis mentions only common ones
- Synthesis language is hedging ("could consider", "might want to") rather than specific
- The synthesized artifact looks like Claude would have produced it alone (no new insights)

**Phase to address:** Phase 2 (Synthesis Protocol) -- the merging logic must be tested with deliberately conflicting inputs before it handles real artifacts

**Sources:**
- [Cognition: Don't Build Multi-Agents](https://cognition.ai/blog/dont-build-multi-agents)
- [TDS: Why Your Multi-Agent System is Failing (17x Error Trap)](https://towardsdatascience.com/why-your-multi-agent-system-is-failing-escaping-the-17x-error-trap-of-the-bag-of-agents/)
- [Microsoft: AI Agent Orchestration Patterns](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns)

---

### Pitfall 3: Output Format Fragility

**What goes wrong:**
Each CLI returns output in a different format, and format changes across versions break the orchestrator's parser without warning. Codex returns JSONL events in `--json` mode, Gemini returns a single JSON object in `--output-format json` mode (or NDJSON in `stream-json`), and OpenCode returns "raw JSON events" in `--format json` mode. When a CLI updates its output schema (Codex had a regression in v0.4.44-0.4.46 that broke basic commands), the entire co-planning pipeline silently produces garbage.

**Why it happens:**
- All three CLIs are pre-1.0 and actively changing output formats
- No formal schema versioning in any CLI's JSON output
- Codex uses event-based JSONL (multiple line types: `thread.started`, `turn.completed`, etc.) while Gemini uses single-object JSON with `response`/`stats`/`error` fields -- fundamentally different parsing strategies
- OpenCode documentation does not even specify the JSON schema for `--format json`
- stderr and stdout mixing varies by CLI and mode
- Gemini's `--output-format json` writes once at completion; Codex's `--json` streams continuously -- a parser designed for one will break on the other

**How to avoid:**
- Build a CLI-specific adapter layer with one adapter per CLI, each responsible for normalizing output to a common internal format
- Parse output defensively: expect the "happy path" JSON but gracefully handle raw text, partial JSON, or unexpected fields
- Pin CLI versions in the installation/documentation and test against those specific versions
- Include a "format probe" step: before real co-planning, send a trivial prompt to verify the CLI returns parseable output
- Write integration tests that run against actual CLI binaries (not mocked output)
- Extract the "final answer" text from each CLI separately: Codex's final message is in the last `turn.completed` event, Gemini's is in `response` field, OpenCode's format is undocumented

**Warning signs:**
- Parser returns empty/null when CLI clearly ran successfully (format changed)
- JSON parse errors in logs after a CLI update
- One CLI consistently returns less useful output than others (format mismatch, not quality)
- Output contains ANSI escape codes or TUI rendering artifacts (non-interactive mode not fully clean)

**Phase to address:** Phase 1 (Foundation) -- adapter layer must exist before any real orchestration, and must include automated format validation tests

**Sources:**
- [Codex Non-Interactive Mode Docs](https://developers.openai.com/codex/noninteractive/)
- [Gemini CLI Headless Mode Docs](https://google-gemini.github.io/gemini-cli/docs/cli/headless.html)
- [OpenCode CLI Docs](https://opencode.ai/docs/cli/)
- [Codex Plugin Regression (Issue #7410)](https://github.com/openai/codex/issues/7410)
- [Gemini CLI: Structured JSON Output request (Issue #8022)](https://github.com/google-gemini/gemini-cli/issues/8022)

---

### Pitfall 4: Prompt Incompatibility Across Model Families

**What goes wrong:**
Prompts optimized for Claude (XML-structured, context-first, instruction-rich) produce poor results when sent to GPT-based Codex or Gemini. Claude's existing GSD prompts use XML tags (`<role>`, `<process>`, `<execution_context>`) extensively -- GPT models process these differently and Gemini may ignore or misinterpret them. The result is that external agents provide low-quality feedback not because the model is weak, but because the prompt was wrong for that model.

**Why it happens:**
- Claude was specifically trained on XML-tagged prompts; GPT models prefer markdown/delimiter-based structure; Gemini handles both but with different effectiveness
- Context placement matters differently: Claude prefers documents at the top of the prompt, GPT prefers instructions first then context
- GSD's existing prompts assume Claude-specific behaviors: `<task>` XML parsing, structured return formats, tool-use patterns
- Token efficiency varies: the same prompt may be well within Claude's budget but too large for a smaller Codex model's effective window
- System prompt handling differs: Claude's system prompt is persistent; Codex's `codex exec` treats the whole prompt as user input; Gemini's `--prompt` flag is a single string
- Codex in `--full-auto` mode with `--json` has its own permission model that may reject operations a Claude subagent would perform

**How to avoid:**
- Create model-family-specific prompt templates: `prompt-claude.md`, `prompt-codex.md`, `prompt-gemini.md`
- For Codex/GPT: use markdown headers and delimiters instead of XML tags; place instructions before context
- For Gemini: use either XML tags or markdown headers consistently; keep prompts concise
- Strip GSD-internal references (`@file` syntax, tool names) from prompts sent to external CLIs -- they have no meaning outside Claude Code
- Dramatically reduce prompt size for external agents: they are reviewers, not full-context planners -- send the artifact to review plus focused instructions, not the entire GSD context
- Test each prompt template with a trivial artifact first to verify the model produces structured, parseable output

**Warning signs:**
- External agent output is generic/unhelpful despite the artifact having real issues
- Codex returns "I don't understand the XML tags" or parses them as literal content
- Gemini response ignores structure and gives a wall of unformatted text
- External agents echo back the prompt structure instead of responding to it
- Token counts for external invocations are much higher than expected (prompt bloat)

**Phase to address:** Phase 2 (Prompt Templates) -- must be developed and tested per-model before the synthesis protocol can work. This is a prerequisite for every other integration step.

**Sources:**
- [Prompt Engineering Best Practices Comparison Matrix](https://www.dataunboxed.io/blog/prompt-engineering-best-practices-complete-comparison-matrix)
- [Mastering Claude Prompts: XML vs Markdown](https://algorithmunmasked.com/2025/05/14/mastering-claude-prompts-xml-vs-markdown-formatting-for-optimal-results/)
- [Gemini Prompt Design Strategies](https://ai.google.dev/gemini-api/docs/prompting-strategies)
- [Codex Prompting Guide](https://cookbook.openai.com/examples/gpt-5/gpt-5-1-codex-max_prompting_guide)

---

### Pitfall 5: Adversary System Interference

**What goes wrong:**
The existing `gsd-adversary` (Claude-based) and the new external co-planners operate at the same checkpoints but with different roles, creating confusion about whose feedback takes priority, redundant work, and potential deadlock. If both the adversary and an external agent flag the same issue with contradictory recommendations, the orchestrator has no clear resolution protocol.

**Why it happens:**
- The adversary system was designed for a Claude-only world where all agents share the same reasoning patterns
- Co-planners add diverse perspectives (the whole point) but the checkpoint system doesn't distinguish between adversarial challenges and co-planning recommendations
- If co-planners run BEFORE the adversary, the adversary may challenge the co-planners' contributions rather than the original artifact
- If co-planners run AFTER the adversary, they may undermine changes the adversary successfully advocated for
- The adversary's BLOCKING/MAJOR/MINOR severity system doesn't map to co-planner "suggestions"
- Context budget: running both the adversary AND co-planners at every checkpoint may blow the context window

**How to avoid:**
- Define clear ordering: co-planners review the DRAFT artifact, Claude synthesizes, THEN adversary reviews the SYNTHESIZED artifact
- Keep the adversary and co-planners as separate, sequential steps -- never merge their roles
- Co-planners produce RECOMMENDATIONS (constructive additions); adversary produces CHALLENGES (constructive criticism) -- different output formats, different handling
- Make co-planning optional per checkpoint (configurable): some checkpoints benefit from diverse input, others (like verification) do not
- Budget context explicitly: co-planning step gets X% of context, adversary step gets Y%, synthesis gets Z%
- If co-planners and adversary conflict, the adversary's BLOCKING challenges take precedence (safety > innovation)

**Warning signs:**
- Adversary challenges the co-planners' recommendations rather than the artifact
- Same issue flagged by both systems with contradictory fixes
- Checkpoint takes 3x longer than without co-planning (context bloat)
- Claude synthesizer starts "negotiating" between adversary and co-planners instead of making decisions
- Co-planning is skipped/disabled because it "takes too long" (integration friction)

**Phase to address:** Phase 2 (Integration Protocol) -- the ordering and role separation must be designed before any real checkpoint runs both systems

**Sources:**
- Existing GSD `gsd-adversary.md` agent definition (codebase)
- Existing GSD `checkpoints.md` reference (codebase)
- [Cognition: Don't Build Multi-Agents](https://cognition.ai/blog/dont-build-multi-agents)

---

## Moderate Pitfalls

### Pitfall 6: Authentication and Credential Sprawl

**What goes wrong:**
Each external CLI requires its own authentication: Codex needs `CODEX_API_KEY`, Gemini needs Google Cloud authentication or API key, OpenCode needs provider-specific API keys configured. Users must manage 3+ additional sets of credentials, and any one failing silently degrades the co-planning pipeline.

**Why it happens:**
- Each CLI has a different auth mechanism (env var, OAuth, config file)
- Auth failures in non-interactive mode may not produce clear error messages
- Codex specifically notes `CODEX_API_KEY` is "only supported in `codex exec`" mode
- Rate limits differ per provider and are not communicated consistently
- Quota exhaustion causes Codex to hang indefinitely (Issue #6512) rather than exit with error

**How to avoid:**
- Build an auth preflight check: before co-planning starts, verify each configured CLI can authenticate with a trivial prompt
- Make each CLI optional: if auth fails, skip that co-planner and log a warning rather than blocking
- Document auth setup clearly in user onboarding (which env vars, where to get keys)
- Store auth validation results in session state so the preflight only runs once per session
- Handle rate limits with exponential backoff and a fallback to "skip this agent"

**Warning signs:**
- Co-planning step silently produces output from only 1-2 agents instead of 3
- Intermittent failures correlate with time of day (rate limiting)
- Users report "co-planning never works" but the real issue is missing env vars

**Phase to address:** Phase 1 (Foundation) -- auth preflight check should be part of the process wrapper

---

### Pitfall 7: Context Isolation Between Co-Planners

**What goes wrong:**
Each external CLI runs in isolation with no knowledge of what other co-planners said. If Codex recommends approach A and Gemini recommends approach B that's incompatible with A, neither knows about the conflict. Only the synthesizer sees both, but by then the recommendations are finalized.

**Why it happens:**
- This is the fundamental "Flappy Bird problem" from Cognition's research: sub-agents making implicit decisions without shared context
- CLI-based invocation is inherently stateless -- each call is independent
- No mechanism to pass one CLI's output as input to another CLI in the same review cycle
- Sequential invocation would add latency; parallel invocation prevents information sharing

**How to avoid:**
- Accept isolation as a feature, not a bug: diverse, independent perspectives are the VALUE of co-planning
- Put the reconciliation burden entirely on the synthesizer with explicit instructions to detect incompatible recommendations
- If needed, implement a two-pass pattern: Round 1 gets independent reviews, Round 2 sends each agent a summary of others' feedback and asks "anything to revise?"
- Keep the synthesizer's prompt focused: "Your job is to detect conflicts and preserve diversity, not create consensus"

**Warning signs:**
- Synthesized output contains contradictions (e.g., "use library X" in one section and "use library Y" in another)
- External agents' recommendations are mutually exclusive but synthesis includes both
- Users report confusion about which recommendation to follow

**Phase to address:** Phase 2 (Synthesis Protocol)

**Sources:**
- [Cognition: Don't Build Multi-Agents](https://cognition.ai/blog/dont-build-multi-agents)

---

### Pitfall 8: Cost and Latency Explosion

**What goes wrong:**
Running 3 external AI CLIs per checkpoint turns a 30-second adversary review into a 3-5 minute multi-model review cycle. Token costs multiply: each external model processes the full artifact plus prompt, and Claude processes all their outputs for synthesis. Users disable co-planning because it's too slow and expensive for routine work.

**Why it happens:**
- Each CLI invocation has cold start latency (especially OpenCode without `serve`)
- External models process the full artifact independently (3x the token cost of a single review)
- Synthesis adds another Claude invocation on top of the reviews
- Network latency to 3 different API providers adds up
- Some models (Gemini with thinking mode) take significantly longer for complex prompts

**How to avoid:**
- Make co-planning configurable per checkpoint type: full co-planning for ROADMAP and REQUIREMENTS (high-stakes), Claude-only for PLANS and VERIFICATION (routine)
- Run external CLIs in parallel (all 3 simultaneously), not sequentially
- Use a "budget mode" that invokes only 1 external CLI (configurable which one)
- Cache common preflight results to avoid redundant work
- Set hard latency budgets: if a CLI hasn't responded in 120 seconds, kill it and proceed without
- Consider using cheaper/faster model tiers for routine reviews (Gemini Flash, GPT-4o-mini via Codex model flag)

**Warning signs:**
- Checkpoint review time exceeds 5 minutes consistently
- Users skip co-planning steps ("just plan it")
- Monthly API costs spike unexpectedly
- Context window fills before synthesis completes

**Phase to address:** Phase 3 (Optimization) -- but latency budgets should be set in Phase 1

---

### Pitfall 9: Silent Quality Degradation from Model Misconfiguration

**What goes wrong:**
An external CLI is configured to use a weaker model than intended (e.g., Codex defaults to a smaller model, Gemini uses Flash instead of Pro) and produces superficial reviews that the synthesizer treats as valid input. The co-planning system appears to work but adds noise rather than signal.

**Why it happens:**
- Each CLI has different default models and the user may not override them
- Model names and tiers change across CLI versions
- OpenCode supports multiple providers with different quality levels
- No quality gate verifies that external agent output meets a minimum standard
- The synthesizer cannot distinguish between a thoughtful review and a generic one

**How to avoid:**
- Explicitly configure the model for each CLI in a central config file (e.g., `.planning/config.json`)
- Implement output quality heuristics: minimum response length, must contain specific sections, must reference the artifact
- Log which model each CLI actually used (parseable from JSON output for Codex and Gemini)
- Provide sensible defaults with documentation: "For co-planning, use Codex with `--model o3`, Gemini with `--model gemini-2.5-pro`"

**Warning signs:**
- External agent reviews are generic ("looks good", "consider edge cases") without specific artifact references
- One CLI consistently produces shorter, less useful output than others
- Synthesis output is not meaningfully different from Claude-only planning

**Phase to address:** Phase 1 (Configuration) and Phase 3 (Quality gates)

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Parsing CLI output with regex instead of JSON parser | Quick implementation | Breaks on format changes, edge cases | Never -- always use proper JSON parsing |
| Hardcoding CLI paths (`/usr/local/bin/codex`) | Avoids path resolution logic | Breaks on different systems, package managers | Never -- use `which`/`command -v` |
| Skipping auth preflight checks | Faster startup | Silent failures, confusing error messages | Only in development, never in production |
| Sending full GSD context to external CLIs | No prompt adaptation needed | Wasted tokens, poor output quality, prompt leakage | Never -- always use adapted prompts |
| Single timeout value for all CLIs | Simple configuration | Some CLIs need more time; one slow CLI blocks fast ones | Early prototyping only -- differentiate by Phase 2 |
| Treating all agent output equally in synthesis | Simple merge logic | Weaker models' noise dilutes stronger models' signal | Never -- weight by model quality or output quality metrics |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Codex CLI | Using `codex exec` without `--json` and parsing stdout as plain text | Always use `--json` for JSONL output, extract `turn.completed` events |
| Codex CLI | Not setting `--skip-git-repo-check` for read-only review tasks | Set the flag when the CLI doesn't need git access |
| Codex CLI | Ignoring the `--sandbox` flag, causing Codex to modify files | Use default read-only sandbox for review tasks |
| Gemini CLI | Using `--output-format text` and parsing unstructured prose | Use `--output-format json` and parse the `response` field |
| Gemini CLI | Not passing `--yolo` or `--approval-mode` for non-interactive use | Configure approval mode to prevent tool-use hangs |
| Gemini CLI | Forgetting that `DEBUG` env var causes freezing in non-interactive mode | Ensure `DEBUG` is unset or empty before invoking |
| OpenCode | Not using `opencode serve` + `--attach` pattern | Use persistent server to avoid cold boot penalty |
| OpenCode | Assuming JSON output format is documented/stable | Treat as experimental; validate output structure defensively |
| All CLIs | Running in user's shell profile (loading aliases, conda, nvm, etc.) | Use `env -i` or `--noprofile --norc` to get clean environment |
| All CLIs | Not killing process groups on timeout | Use `setsid` + `kill(-pgid)` to terminate entire process tree |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Sequential CLI invocation | 3x latency of single agent | Run all 3 CLIs in parallel with `&` and `wait` | Always slower than necessary |
| Cold boot per invocation | 5-15 second startup overhead per call | Use persistent server (OpenCode) or session resume (Codex) | Every invocation |
| Full artifact in prompt | High token cost, slow response | Send only relevant sections + focused review instructions | Artifacts > 2000 tokens |
| Unbounded output parsing | Parsing hangs on unexpectedly large output | Set output token limits in CLI flags; truncate if needed | When models produce verbose output |
| Synchronous synthesis | Claude waits for all CLIs before starting synthesis | Start synthesis as soon as first result arrives (progressive) | > 2 concurrent CLI calls |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Passing API keys as CLI arguments | Visible in process list (`ps aux`) | Use environment variables, never command-line flags |
| Sending proprietary code to external models | IP leakage through third-party APIs | Document which models see which code; allow per-project opt-out |
| Codex `--sandbox danger-full-access` for review tasks | External agent can modify/delete files | Always use read-only sandbox for co-planning |
| Logging full CLI output including prompts | Sensitive context in log files | Sanitize logs; only log metadata and extracted recommendations |
| Not validating external agent output for injection | Malicious or hallucinated file paths/commands in recommendations | Never execute recommendations directly; treat as advisory text only |

## "Looks Done But Isn't" Checklist

- [ ] **Process wrapper:** Handles timeout, orphaned children, and clean shell environment -- verify by killing a hanging CLI mid-run and confirming no orphaned processes remain
- [ ] **Output parsing:** Handles all three CLI formats correctly -- verify by running integration tests against actual CLI binaries, not mocked output
- [ ] **Auth preflight:** Detects missing credentials before co-planning starts -- verify by unsetting one API key and confirming graceful degradation
- [ ] **Prompt templates:** Model-specific prompts produce structured, parseable output -- verify by sending the same artifact to all 3 CLIs and checking output quality
- [ ] **Synthesis protocol:** Preserves disagreements and novel insights -- verify by sending deliberately conflicting inputs and checking that conflicts surface in output
- [ ] **Adversary integration:** Co-planners and adversary operate in correct order without interfering -- verify by running a checkpoint with both systems and checking that adversary reviews the synthesized artifact
- [ ] **Configuration:** Per-checkpoint co-planning toggle works -- verify by disabling co-planning for one checkpoint type and confirming it's skipped
- [ ] **Graceful degradation:** System works with 0, 1, 2, or 3 external CLIs available -- verify by removing CLIs one at a time and confirming planning still completes

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| CLI hanging indefinitely | LOW | Kill process group, retry with shorter timeout, fall back to Claude-only |
| Output format breaks after CLI update | MEDIUM | Roll back CLI version, update adapter, pin version in docs |
| Synthesis collapse (sycophantic merge) | MEDIUM | Re-run synthesis with stronger instructions, manually review agent outputs |
| Prompt incompatibility producing garbage | LOW | Swap to fallback prompt template, reduce prompt complexity |
| Adversary/co-planner conflict | LOW | Skip co-planning for that checkpoint, use adversary-only path |
| Auth credential failure | LOW | Skip that CLI, continue with remaining agents |
| Cost explosion | MEDIUM | Switch to budget mode (1 CLI), reduce checkpoints using co-planning |
| Quality degradation from weak model | MEDIUM | Reconfigure model tier, add output quality gate, audit recent outputs |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| CLI process hanging | Phase 1 (Foundation) | Integration test: invoke each CLI with timeout, verify clean termination |
| Synthesis collapse | Phase 2 (Synthesis Protocol) | Test with deliberately conflicting inputs, verify disagreements preserved |
| Output format fragility | Phase 1 (Foundation) | Adapter tests against real CLI binaries for each supported version |
| Prompt incompatibility | Phase 2 (Prompt Templates) | Send same artifact to all CLIs, verify structured output quality |
| Adversary interference | Phase 2 (Integration Protocol) | Run checkpoint with both systems, verify correct ordering and separation |
| Auth credential sprawl | Phase 1 (Foundation) | Preflight test with missing credentials, verify graceful degradation |
| Context isolation | Phase 2 (Synthesis Protocol) | Verify synthesizer detects incompatible recommendations |
| Cost/latency explosion | Phase 3 (Optimization) | Benchmark full checkpoint time, set budgets, implement parallel execution |
| Silent quality degradation | Phase 3 (Quality Gates) | Implement output quality heuristics, audit per-model contribution value |

## Sources

### Official Documentation (HIGH confidence)
- [Codex CLI Non-Interactive Mode](https://developers.openai.com/codex/noninteractive/)
- [Codex CLI Features](https://developers.openai.com/codex/cli/features/)
- [Gemini CLI Headless Mode](https://google-gemini.github.io/gemini-cli/docs/cli/headless.html)
- [Gemini CLI Configuration](https://google-gemini.github.io/gemini-cli/docs/get-started/configuration.html)
- [OpenCode CLI Documentation](https://opencode.ai/docs/cli/)

### GitHub Issues (HIGH confidence -- verified real-world failures)
- [Codex: Commands hang indefinitely on timeout (Issue #4337)](https://github.com/openai/codex/issues/4337)
- [Codex: --full-auto orphaned child processes (Issue #7852)](https://github.com/openai/codex/issues/7852)
- [Codex: Default timeout missing (Issue #4775)](https://github.com/openai/codex/issues/4775)
- [Codex: Hangs when out of credits (Issue #6512)](https://github.com/openai/codex/issues/6512)
- [Codex: Plugin regression breaks commands (Issue #7410)](https://github.com/openai/codex/issues/7410)
- [Gemini CLI: Hangs in non-interactive mode (Issue #16567)](https://github.com/google-gemini/gemini-cli/issues/16567)
- [Gemini CLI: Hangs on disallowed tools (Issue #12337)](https://github.com/google-gemini/gemini-cli/issues/12337)
- [Gemini CLI: Interactive prompts block agent (Issue #10909)](https://github.com/google-gemini/gemini-cli/issues/10909)
- [Gemini CLI: DEBUG env var causes freeze (PR #14580)](https://github.com/google-gemini/gemini-cli/pull/14580)

### Multi-Agent Research (MEDIUM-HIGH confidence)
- [Cognition: Don't Build Multi-Agents](https://cognition.ai/blog/dont-build-multi-agents)
- [TDS: 17x Error Trap of the Bag of Agents](https://towardsdatascience.com/why-your-multi-agent-system-is-failing-escaping-the-17x-error-trap-of-the-bag-of-agents/)
- [Microsoft: AI Agent Orchestration Patterns](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns)

### Prompt Engineering Comparison (MEDIUM confidence)
- [Prompt Engineering Best Practices Comparison Matrix](https://www.dataunboxed.io/blog/prompt-engineering-best-practices-complete-comparison-matrix)
- [Claude XML vs Markdown Formatting](https://algorithmunmasked.com/2025/05/14/mastering-claude-prompts-xml-vs-markdown-formatting-for-optimal-results/)
- [Gemini Prompt Design Strategies](https://ai.google.dev/gemini-api/docs/prompting-strategies)
- [Codex Prompting Guide](https://cookbook.openai.com/examples/gpt-5/gpt-5-1-codex-max_prompting_guide)

---
*Pitfalls research for: External AI Agent Co-Planning Integration into GSD*
*Researched: 2026-02-16*
