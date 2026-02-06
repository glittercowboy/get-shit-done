---
name: set-profile
description: Switch model profile for GSD agents (quality/balanced/budget)
arguments:
  - name: profile
    description: "Profile name: quality, balanced, or budget"
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
</profiles>

<process>

## 1. Validate argument

```
if $ARGUMENTS.profile not in ["quality", "balanced", "budget"]:
  Error: Invalid profile "$ARGUMENTS.profile"
  Valid profiles: quality, balanced, budget
  STOP
```

## 2. Ensure config exists

```bash
ls .planning/config.json 2>/dev/null
```

If `.planning/config.json` missing, create it with defaults:
```bash
mkdir -p .planning
```
```json
{
  "model_profile": "balanced",
  "workflow": {
    "research": true,
    "plan_check": true,
    "verifier": true
  }
}
```
Write this to `.planning/config.json`, then continue.

## 3. Update config.json

Read current config:
```bash
cat .planning/config.json
```

Update `model_profile` field:
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

</examples>
