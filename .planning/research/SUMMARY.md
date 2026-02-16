# Research Summary: External AI Agent Co-Planning Integration

**Domain:** CLI-based AI agent co-planning for workflow orchestration
**Researched:** 2026-02-16
**Overall confidence:** HIGH

## Executive Summary

GSD v2.2 integrates Codex CLI, Gemini CLI, and OpenCode CLI as external co-planners invoked via bash at workflow checkpoints. All three CLIs support non-interactive execution with structured output, making them viable for programmatic invocation from GSD's existing orchestrator layer.

The integration requires zero new npm dependencies. Node.js `child_process.execSync` (already used extensively in `gsd-tools.cjs`) handles CLI invocation. A thin normalization layer in `gsd-tools.cjs` (three new commands: `agent detect`, `agent invoke`, `agent invoke-all`) abstracts the CLI-specific differences. The `config.json` template extends with a `co_planners` section that mirrors the existing `adversary` checkpoint pattern.

The key architectural insight is that co-planners are NOT subagents -- they are external process invocations that return text. The orchestrator treats their output like any other data input: read it, synthesize it, decide. This is fundamentally simpler than the adversary's iterative debate loop because co-planners are single-shot: invoke once per checkpoint, no rounds.

The most critical pitfalls are CLI process hanging (documented in all three tools' issue trackers), output format instability (all CLIs are pre-1.0 and actively changing), and synthesis collapse (Claude gravitating toward agreeable responses rather than diverse insights). All have well-understood mitigations: explicit timeouts, defensive JSON parsing with text fallback, and structured synthesis protocols.

## Key Findings

**Stack:** Zero new dependencies. `child_process.execSync` + `gsd-tools.cjs` normalization layer + `config.json` extension. External CLIs are user-installed prerequisites.

**Architecture:** Co-planners fit as a new "External Process Layer" alongside the existing "Subagent Layer," invoked via Bash rather than Task tool. Co-planners run FIRST (refine artifact), adversary runs SECOND (challenge refined artifact).

**Critical pitfall:** CLI process hanging -- all three CLIs have documented issues with non-interactive mode hanging. Must use explicit timeout, process groups, and graceful degradation.

## CLI Invocation Summary

| CLI | Package | Command | Output Flag | Auto-Approve | Auth |
|-----|---------|---------|-------------|--------------|------|
| **Codex** | `@openai/codex` | `codex exec --ephemeral --full-auto "prompt"` | `--output-last-message <path>` | `--full-auto` | `codex login` |
| **Gemini** | `@google/gemini-cli` | `gemini -p "prompt" --output-format json` | `--output-format json` | `--yolo` | `GEMINI_API_KEY` |
| **OpenCode** | `opencode-ai` | `opencode -p "prompt" -f json -q` | `-f json` | Auto in `-p` mode | Config file |

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Foundation: Normalization Layer** - Build `gsd-tools.cjs` agent commands first
   - Addresses: CLI detection, invocation, output normalization, timeout handling
   - Avoids: Process hanging pitfall (explicit timeout from day one)
   - Rationale: Must be battle-tested before any workflow integration

2. **Configuration: Config Schema + Setup Wizard** - Extend config.json, add setup questions
   - Addresses: Per-checkpoint agent configuration, enable/disable toggle
   - Avoids: Config complexity pitfall (progressive disclosure, smart defaults)
   - Rationale: Config must exist before workflows can read it

3. **Integration: Workflow Checkpoint Wiring** - Wire co-planners into commands/workflows
   - Addresses: Draft-review-synthesize pattern at all checkpoints
   - Avoids: Synthesis collapse (structured synthesis protocol with provenance)
   - Rationale: Builds on foundation (phase 1) and config (phase 2)

4. **Coexistence: Adversary + Co-Planner Ordering** - Define interaction at shared checkpoints
   - Addresses: Co-planner before adversary ordering, both at same checkpoint
   - Avoids: Echo chamber (independent review, no cross-contamination)
   - Rationale: Requires both systems working independently first

5. **Polish: Documentation + Testing** - User docs, integration tests
   - Addresses: User adoption, maintainability
   - Avoids: Config complexity pitfall (clear documentation)

**Phase ordering rationale:**
- Phase 1 must be first: all other phases depend on reliable CLI invocation
- Phase 2 before 3: config must exist before workflows read it
- Phase 3 can target one checkpoint first (plan review), then expand
- Phase 4 is optional for initial release (adversary coexistence adds complexity)
- Phase 5 can partially parallel with phases 3-4

**Research flags for phases:**
- Phase 1: Needs integration testing with ACTUAL CLI binaries (not mocked)
- Phase 3: OpenCode `-p` vs `opencode run` syntax needs live verification at implementation time
- Phase 4: Interaction ordering (co-plan then adversary vs parallel) needs user feedback

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | CLI interfaces verified via official docs + npm registries. All three support non-interactive JSON output. |
| Features | HIGH | Feature landscape grounded in established multi-agent patterns (Microsoft, Google, Anthropic). |
| Architecture | HIGH | Builds on proven GSD patterns (Task tool, config.json checkpoints, gsd-tools.cjs). |
| Pitfalls | HIGH | Process hanging, output instability, synthesis collapse all documented in issue trackers + research. |
| CLI Stability | MEDIUM | All CLIs are pre-1.0, actively evolving. Output formats may change. Defensive parsing required. |
| OpenCode Specifics | MEDIUM | CLI flag syntax inconsistent across docs (`-p` vs `opencode run`). Needs live verification. |

## Gaps to Address

- **OpenCode JSON output schema:** Not formally documented. Need to test `-f json` output structure at implementation time.
- **Parallel invocation in gsd-tools.cjs:** v1 can use sequential `execSync`, but `invoke-all` with 3 agents needs parallel `spawn` for acceptable latency. Architecture decision deferred to implementation.
- **Gemini `--output-format` version requirement:** Confirmed in v0.28.x stable, but earlier versions may still be in use. Need minimum version check.
- **Prompt size strategy:** Stdin piping is recommended over CLI arguments, but exact implementation varies per CLI. Need to test edge cases.
- **User feedback on checkpoint ordering:** Co-planner-then-adversary is the researched recommendation, but users may prefer different ordering. Defer until real usage data.

## Sources

### Primary (HIGH confidence)
- [Codex CLI Reference](https://developers.openai.com/codex/cli/reference/)
- [Codex Non-Interactive Mode](https://developers.openai.com/codex/noninteractive/)
- [Gemini CLI Headless Mode](https://geminicli.com/docs/cli/headless/)
- [OpenCode CLI Docs](https://opencode.ai/docs/cli/)
- [Gemini CLI npm](https://www.npmjs.com/package/@google/gemini-cli)
- [OpenCode npm](https://www.npmjs.com/package/opencode-ai)
- [@openai/codex npm](https://www.npmjs.com/package/@openai/codex)

### Secondary (MEDIUM confidence)
- [Microsoft AI Agent Orchestration Patterns](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns)
- [Multi-Agent System Failures (2025)](https://arxiv.org/html/2503.13657v1)
- [OpenCode GitHub (anomalyco)](https://github.com/anomalyco/opencode)
- [Codex GitHub](https://github.com/openai/codex)
- [Gemini CLI GitHub](https://github.com/google-gemini/gemini-cli)

---
*Research completed: 2026-02-16*
*Ready for roadmap: YES*
