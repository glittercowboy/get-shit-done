<planning_config>

Configuration options for `.planning/config.json`.

<config_schema>
```json
{
  "mode": "interactive",
  "model_profile": "balanced",
  "depth": "standard",
  "workflow": {
    "research": true,
    "plan_check": true,
    "verifier": true,
    "research_depth": "standard",
    "plan_atomicity": "medium"
  },
  "planning": {
    "commit_docs": true,
    "search_gitignored": false
  },
  "git": {
    "branching_strategy": "none",
    "branch_template": "{type}/{phase}-{name}",
    "phase_branch_template": "gsd/phase-{phase}-{slug}",
    "milestone_branch_template": "gsd/{milestone}-{slug}",
    "commit_format": "conventional"
  },
  "parallelization": {
    "enabled": true,
    "max_wave_size": 4
  }
}
```

## Option Reference

| Section | Option | Default | Description |
|---------|--------|---------|-------------|
| (root) | `mode` | `"interactive"` | Execution mode: `"interactive"`, `"yolo"`, or `"custom"` |
| (root) | `model_profile` | `"balanced"` | Agent model selection: `"quality"`, `"balanced"`, or `"budget"` |
| (root) | `depth` | `"standard"` | Project depth: `"quick"`, `"standard"`, or `"deep"` |
| workflow | `research` | `true` | Whether to run research agents before planning |
| workflow | `plan_check` | `true` | Whether to run plan verification agents |
| workflow | `verifier` | `true` | Whether to run goal verification after execution |
| workflow | `research_depth` | `"standard"` | Research thoroughness: `"quick"`, `"standard"`, or `"deep"` |
| workflow | `plan_atomicity` | `"medium"` | Task granularity: `"small"` (1-2), `"medium"` (2-4), or `"large"` (4-8) |
| planning | `commit_docs` | `true` | Whether to commit planning artifacts to git |
| planning | `search_gitignored` | `false` | Add `--no-ignore` to broad rg searches |
| git | `branching_strategy` | `"none"` | Git branching: `"none"`, `"phase"`, or `"milestone"` |
| git | `branch_template` | `"{type}/{phase}-{name}"` | Custom branch naming template |
| git | `phase_branch_template` | `"gsd/phase-{phase}-{slug}"` | Branch template for phase strategy |
| git | `milestone_branch_template` | `"gsd/{milestone}-{slug}"` | Branch template for milestone strategy |
| git | `commit_format` | `"conventional"` | Commit message format: `"conventional"` or `"simple"` |
| parallelization | `enabled` | `true` | Whether to run plans in parallel waves |
| parallelization | `max_wave_size` | `4` | Maximum plans per wave (1-8) |
</config_schema>

<workflow_options>

## Workflow Options

### research_depth

Controls how thorough the research phase is before planning.

| Value | Behavior | Use when |
|-------|----------|----------|
| `"quick"` | 1 focused search, summary only | You know the domain well |
| `"standard"` | 3-5 searches, analysis | Default for most projects |
| `"deep"` | Comprehensive research with alternatives | New domain, complex architecture |

**Reading the config:**

```bash
RESEARCH_DEPTH=$(jq -r '.workflow.research_depth // "standard"' .planning/config.json)
```

### plan_atomicity

Controls how many tasks per plan.

| Value | Tasks per plan | Use when |
|-------|----------------|----------|
| `"small"` | 1-2 tasks | Complex features, TDD, need fine control |
| `"medium"` | 2-4 tasks | Default for most work |
| `"large"` | 4-8 tasks | Simple features, boilerplate, trusted patterns |

**Reading the config:**

```bash
PLAN_ATOMICITY=$(jq -r '.workflow.plan_atomicity // "medium"' .planning/config.json)
```

</workflow_options>

<git_options>

## Git Options

### branch_template

Custom branch naming with template variables.

| Variable | Description | Example |
|----------|-------------|---------|
| `{type}` | Branch type (feat, fix, etc.) | `feat` |
| `{phase}` | Zero-padded phase number | `03` |
| `{name}` | Phase or plan name | `authentication` |
| `{slug}` | Lowercase, hyphenated name | `user-auth` |
| `{milestone}` | Milestone version | `v1.0` |

**Examples:**

```json
"branch_template": "{type}/{phase}-{name}"       // feat/03-authentication
"branch_template": "gsd/{milestone}/{phase}"    // gsd/v1.0/03
"branch_template": "feature/{slug}"             // feature/user-auth
```

### commit_format

Controls commit message style.

| Value | Format | Example |
|-------|--------|---------|
| `"conventional"` | `type(scope): message` | `feat(03-01): add login endpoint` |
| `"simple"` | Plain message | `Add login endpoint` |

**Reading the config:**

```bash
COMMIT_FORMAT=$(jq -r '.git.commit_format // "conventional"' .planning/config.json)
```

</git_options>

<parallelization_options>

## Parallelization Options

### max_wave_size

Maximum number of plans that can run in parallel within a wave.

| Value | Behavior |
|-------|----------|
| `1` | Sequential execution (no parallelization) |
| `2-4` | Light parallelization, safer for shared resources |
| `4-8` | Heavy parallelization, requires independent plans |

**Reading the config:**

```bash
MAX_WAVE_SIZE=$(jq -r '.parallelization.max_wave_size // 4' .planning/config.json)
```

**Note:** Plans are still grouped by their `wave` frontmatter. `max_wave_size` limits how many plans in the same wave run concurrently.

</parallelization_options>

<commit_docs_behavior>

## commit_docs Behavior

**When `commit_docs: true` (default):**
- Planning files committed normally
- SUMMARY.md, STATE.md, ROADMAP.md tracked in git
- Full history of planning decisions preserved

**When `commit_docs: false`:**
- Skip all `git add`/`git commit` for `.planning/` files
- User must add `.planning/` to `.gitignore`
- Useful for: OSS contributions, client projects, keeping planning private

**Checking the config:**

```bash
# Prefer jq for reliable JSON parsing
COMMIT_DOCS=$(jq -r '.planning.commit_docs // true' .planning/config.json)

# Auto-detect gitignored (overrides config)
git check-ignore -q .planning 2>/dev/null && COMMIT_DOCS=false
```

**Auto-detection:** If `.planning/` is gitignored, `commit_docs` is automatically `false` regardless of config.json.

</commit_docs_behavior>

<branching_strategy_behavior>

## Branching Strategies

| Strategy | When branch created | Branch scope | Merge point |
|----------|---------------------|--------------|-------------|
| `none` | Never | N/A | N/A |
| `phase` | At `execute-phase` start | Single phase | User merges after phase |
| `milestone` | At first `execute-phase` of milestone | Entire milestone | At `complete-milestone` |

**When `git.branching_strategy: "none"` (default):**
- All work commits to current branch
- Standard GSD behavior

**When `git.branching_strategy: "phase"`:**
- `execute-phase` creates/switches to a branch before execution
- Branch name from `phase_branch_template`
- User merges branches manually after phase completion

**When `git.branching_strategy: "milestone"`:**
- First `execute-phase` of milestone creates the milestone branch
- All phases in milestone commit to same branch
- `complete-milestone` offers to merge milestone branch to main

</branching_strategy_behavior>

<json_parsing>

## JSON Parsing Standard

**Prefer `jq` for config reading:**

```bash
# Good - reliable JSON parsing
RESEARCH_DEPTH=$(jq -r '.workflow.research_depth // "standard"' .planning/config.json)
MAX_WAVE_SIZE=$(jq -r '.parallelization.max_wave_size // 4' .planning/config.json)
COMMIT_FORMAT=$(jq -r '.git.commit_format // "conventional"' .planning/config.json)

# Fallback if jq not available (less reliable)
RESEARCH_DEPTH=$(cat .planning/config.json 2>/dev/null | grep -o '"research_depth"[[:space:]]*:[[:space:]]*"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"' || echo "standard")
```

**Why jq is preferred:**
- Handles nested JSON correctly
- Provides default values with `//` operator
- More readable and maintainable
- No regex edge cases

</json_parsing>

</planning_config>
