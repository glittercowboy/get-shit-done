# Model Profiles

Model profiles control which Claude model each GSD agent uses. This allows balancing quality vs token spend.

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

### Custom Profile

When `model_profile` is set to `"custom"`, models are read from the `custom_profile_models` map in config.json instead of the table above.

**Configurable agents (via /gsd:set-profile custom):**
- gsd-planner
- gsd-plan-checker
- gsd-executor
- gsd-verifier
- gsd-codebase-mapper

**Other agents** (gsd-roadmapper, gsd-phase-researcher, gsd-project-researcher, gsd-research-synthesizer, gsd-debugger, gsd-integration-checker) fall back to their `balanced` profile values when custom profile is active.

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

**custom** - User-defined allocation
- Configure individual models for 5 core agents
- Other agents use balanced defaults
- Use when: specific cost/quality tradeoffs needed, experimentation

## Resolution Logic

Orchestrators resolve model before spawning:

```
1. Read .planning/config.json
2. Get model_profile (default: "balanced")
3. If "custom": read from custom_profile_models map, fallback to balanced
4. Otherwise: look up agent in table above
5. Pass model parameter to Task call
```

## Switching Profiles

Runtime: `/gsd:set-profile <profile>`

Profiles: quality, balanced, budget, **custom**

For custom profile, run `/gsd:set-profile custom` and follow interactive prompts to configure each agent.

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

## Config Schema

When custom profile is active, config.json contains:

```json
{
  "model_profile": "custom",
  "custom_profile_models": {
    "gsd-planner": "opus",
    "gsd-plan-checker": "sonnet",
    "gsd-executor": "sonnet",
    "gsd-verifier": "haiku",
    "gsd-codebase-mapper": "haiku"
  }
}
```

The `custom_profile_models` map is preserved when switching to other profiles (quality/balanced/budget) and reused if switching back to custom.
