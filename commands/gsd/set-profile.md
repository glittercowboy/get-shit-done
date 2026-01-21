---
name: set-profile
description: Switch model profile for GSD agents (quality/balanced/budget/adaptive)
arguments:
  - name: profile
    description: "Profile name: quality, balanced, budget, or adaptive"
    required: true
---

<objective>
Switch the model profile used by GSD agents. This controls which Claude model each agent uses, balancing quality vs token spend.
</objective>

<profiles>
| Profile | Description |
|---------|-------------|
| **quality** | Opus everywhere except read-only verification |
| **balanced** | Opus for planning, Sonnet for execution/verification (default) |
| **budget** | Sonnet for writing, Haiku for research/verification |
| **adaptive** | Intelligent selection based on task complexity (35-65% cost savings) |
</profiles>

<process>

## 1. Validate argument

```
if $ARGUMENTS.profile not in ["quality", "balanced", "budget", "adaptive"]:
  Error: Invalid profile "$ARGUMENTS.profile"
  Valid profiles: quality, balanced, budget, adaptive
  STOP
```

## 2. Check for project

```bash
ls .planning/config.json 2>/dev/null
```

If no `.planning/` directory:
```
Error: No GSD project found.
Run /gsd:new-project first to initialize a project.
```

## 3. Update config.json

Read current config:
```bash
cat .planning/config.json
```

Update `model_profile` field (or add if missing):
```json
{
  "model_profile": "$ARGUMENTS.profile"
}
```

Write updated config back to `.planning/config.json`.

## 4. Confirm

```
✓ Model profile set to: $ARGUMENTS.profile

Agents will now use:
[Show table from model-profiles.md for selected profile]

Next spawned agents will use the new profile.
```

</process>

<examples>

**Switch to budget mode:**
```
/gsd:set-profile budget

✓ Model profile set to: budget

Agents will now use:
| Agent | Model |
|-------|-------|
| gsd-planner | sonnet |
| gsd-executor | sonnet |
| gsd-verifier | haiku |
| ... | ... |
```

**Switch to quality mode:**
```
/gsd:set-profile quality

✓ Model profile set to: quality

Agents will now use:
| Agent | Model |
|-------|-------|
| gsd-planner | opus |
| gsd-executor | opus |
| gsd-verifier | sonnet |
| ... | ... |
```

**Switch to adaptive mode:**
```
/gsd:set-profile adaptive

✓ Model profile set to: adaptive

Agents will now use intelligent model selection:
| Agent | Model Selection |
|-------|-----------------|
| gsd-planner | evaluated (haiku/sonnet/opus based on complexity) |
| gsd-executor | evaluated (haiku/sonnet/opus based on complexity) |
| gsd-verifier | evaluated (haiku/sonnet/opus based on complexity) |

Complexity scoring: 0-3pts=haiku/sonnet, 4-7pts=sonnet, 8+pts=opus
Automatic fallback on rate limits
Usage logged to .planning/usage.json
```

</examples>
