# Model Profiles

Model profiles control which Claude model each GSD agent uses. This allows balancing quality vs token spend.

## Profile Definitions

| Agent | `unlimited` | `quality` | `balanced` | `budget` |
|-------|-------------|-----------|------------|----------|
| gsd-planner | opus | opus | opus | sonnet |
| gsd-roadmapper | opus | opus | sonnet | sonnet |
| gsd-executor | opus | opus | sonnet | sonnet |
| gsd-phase-researcher | opus | opus | sonnet | haiku |
| gsd-project-researcher | opus | opus | sonnet | haiku |
| gsd-research-synthesizer | opus | sonnet | sonnet | haiku |
| gsd-debugger | opus | opus | sonnet | sonnet |
| gsd-codebase-mapper | opus | sonnet | haiku | haiku |
| gsd-verifier | opus | sonnet | sonnet | haiku |
| gsd-plan-checker | opus | sonnet | sonnet | haiku |
| gsd-integration-checker | opus | sonnet | sonnet | haiku |

## Profile Philosophy

**unlimited** - Maximum reasoning power
- Opus for all agents without exception
- Every operation uses the most capable model
- Use when: API quota is not a constraint, critical architecture work, complex debugging
- Trade-off: Highest token spend, suitable for paid API or high-quota users

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

## Resolution Logic

Orchestrators resolve model before spawning:

```
1. Read .planning/config.json
2. Get model_profile (default: "balanced")
3. Look up agent in table above
4. Pass model parameter to Task call
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

**Why Opus for all in unlimited?**
When cost is not a constraint, there's no reason to use lower-capability models. The unlimited profile is for users with paid API access or high quotas who want maximum quality for every operation.
