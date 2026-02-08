# Model Profiles

Model profiles control which model each GSD agent uses. This allows balancing quality vs token spend.

## Profile Definitions

| Agent | `quality` | `balanced` | `budget` |
|-------|-----------|------------|----------|
| gsd-planner | opus | opus | sonnet |
| gsd-roadmapper | opus | sonnet | sonnet |
| gsd-executor | opus | sonnet | sonnet |
| gsd-phase-researcher | opus | sonnet | haiku |
| gsd-project-researcher | opus | sonnet | haiku |
| gsd-research-synthesizer | sonnet | sonnet | haiku |
| gsd-debugger | opus | sonnet | sonnet |
| gsd-codebase-mapper | sonnet | haiku | haiku |
| gsd-verifier | sonnet | sonnet | haiku |
| gsd-plan-checker | sonnet | sonnet | haiku |
| gsd-integration-checker | sonnet | sonnet | haiku |

## Custom Model Configuration

For users who want to use specific models (including non-Anthropic models) with fallbacks:

```json
{
  "model_profile": "custom",
  "models": {
    "planning": ["google/antigravity-claude-opus-4-6-thinking", "openai/gpt-5.2"],
    "coding": ["openai/gpt-5.3-codex", "openai/gpt-5.2-codex"],
    "research": ["google/antigravity-gemini-3-pro", "zai-coding-plan/glm-4.7"],
    "verification": ["google/antigravity-claude-opus-4-5-thinking", "openai/gpt-5.2"]
  }
}
```

### Role Mapping

| Role | Agents | Use Case |
|------|--------|----------|
| `planning` | gsd-planner, gsd-roadmapper | Architecture decisions, roadmaps, task breakdown |
| `coding` | gsd-executor, gsd-debugger | Implementation, debugging, code execution |
| `research` | gsd-*-researcher, gsd-codebase-mapper | Domain research, feature analysis, pitfall discovery |
| `verification` | gsd-verifier, gsd-plan-checker, gsd-integration-checker | Plan checking, work validation, quality gates |

### Fallback Behavior

Each role accepts either:
- A single model string: `"coding": "openai/gpt-5.2-codex"`
- An array with fallbacks: `"coding": ["openai/gpt-5.3-codex", "openai/gpt-5.2-codex"]`

The first model in the array is primary; subsequent models are fallbacks if the primary is unavailable.

## Profile Philosophy

**quality** - Maximum reasoning power
- Opus for all decision-making agents
- Sonnet for read-only verification
- Use when: quota available, critical architecture work

**balanced** (default) - Smart allocation
- Opus only for planning (where architecture decisions happen)
- Sonnet for execution and research (follows explicit instructions)
- Sonnet for verification (needs reasoning, not just pattern matching)
- Use when: normal development, good balance of quality and cost

**budget** - Minimal Opus usage
- Sonnet for anything that writes code
- Haiku for research and verification
- Use when: conserving quota, high-volume work, less critical phases

**custom** - Full control
- Specify exact models per role with fallbacks
- Mix providers (Anthropic, OpenAI, Google, etc.)
- Use when: specific model requirements, multi-provider setups

## Resolution Logic

Orchestrators resolve model before spawning:

```
1. Read .planning/config.json
2. Get model_profile (default: "balanced")
3. If "custom" and models.{role} exists → use custom model
4. Otherwise → look up agent in profile table
5. Pass model parameter to Task call
```

## Switching Profiles

Runtime: `/gsd:set-profile <profile>`

Per-project default: Set in `.planning/config.json`:
```json
{
  "model_profile": "balanced"
}
```

## Design Rationale

**Why Opus for gsd-planner?**
Planning involves architecture decisions, goal decomposition, and task design. This is where model quality has the highest impact.

**Why Sonnet for gsd-executor?**
Executors follow explicit PLAN.md instructions. The plan already contains the reasoning; execution is implementation.

**Why Sonnet (not Haiku) for verifiers in balanced?**
Verification requires goal-backward reasoning - checking if code *delivers* what the phase promised, not just pattern matching. Sonnet handles this well; Haiku may miss subtle gaps.

**Why Haiku for gsd-codebase-mapper?**
Read-only exploration and pattern extraction. No reasoning required, just structured output from file contents.
