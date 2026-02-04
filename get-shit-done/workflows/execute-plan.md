<purpose>
Execute a phase prompt (PLAN.md) and create the outcome summary (SUMMARY.md).
This is a loader that assembles modular workflow pieces based on plan requirements.
</purpose>

<required_reading>
Read STATE.md before any operation to load project context.
Read config.json for planning behavior settings.

@~/.claude/get-shit-done/references/git-integration.md
</required_reading>

<modular_loading>
## Context-Optimized Loading

This workflow uses modular loading to minimize context consumption.
Load only the pieces required for the specific plan being executed.

### Always Loaded (Core)

These modules are always required for plan execution:

@~/.claude/get-shit-done/workflows/execute-plan/_base.md
@~/.claude/get-shit-done/workflows/execute-plan/_commits.md
@~/.claude/get-shit-done/workflows/execute-plan/_deviation.md

### Conditionally Loaded

Load these modules based on plan characteristics:

**If plan has `autonomous: false` or contains checkpoints:**
@~/.claude/get-shit-done/workflows/execute-plan/_checkpoints.md

**If `config.workflow.verifier` is true:**
@~/.claude/get-shit-done/workflows/execute-plan/_verification.md

**If plan has `tdd: true` in frontmatter or tasks have `tdd="true"` attribute:**
@~/.claude/get-shit-done/workflows/execute-plan/_tdd.md

### Loading Logic

Before spawning executor agents, determine which modules to load:

```bash
# Read plan frontmatter
PLAN_FILE=".planning/phases/XX-name/{phase}-{plan}-PLAN.md"

# Check for TDD flag
HAS_TDD=$(grep -q 'tdd:\s*true\|tdd="true"' "$PLAN_FILE" && echo "true" || echo "false")

# Check for checkpoints (autonomous: false means has checkpoints)
HAS_CHECKPOINTS=$(grep -q 'autonomous:\s*false\|type="checkpoint' "$PLAN_FILE" && echo "true" || echo "false")

# Check verifier config
VERIFIER_ENABLED=$(cat .planning/config.json 2>/dev/null | grep -o '"verifier"[[:space:]]*:[[:space:]]*[^,}]*' | grep -q 'true' && echo "true" || echo "false")
```

### Expected Context Savings

| Plan Type | Modules Loaded | Lines | Savings vs Full |
|-----------|----------------|-------|-----------------|
| Standard | base + commits + deviation | ~750 | 60% |
| TDD | base + commits + deviation + tdd | ~900 | 52% |
| With Checkpoints | base + commits + deviation + checkpoints | ~950 | 49% |
| With Verification | base + commits + deviation + verification | ~1050 | 44% |
| Full (all modules) | All 6 modules | ~1400 | 25% |

**Note:** Original monolithic execute-plan.md was ~1,856 lines.
</modular_loading>

<orchestrator_guidance>
## For Orchestrators (execute-phase.md)

When spawning executor agents, build execution context by concatenating only required modules:

1. **Always include:** _base.md, _commits.md, _deviation.md
2. **Check plan frontmatter** for tdd, autonomous flags
3. **Check config.json** for verifier setting
4. **Concatenate** only required modules into agent prompt

This keeps executor agents focused and preserves context quality.

See execute-phase.md for implementation of conditional loading.
</orchestrator_guidance>
