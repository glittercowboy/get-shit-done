<planning_config>

Configuration options for `.planning/` directory behavior.

<config_schema>
```json
"planning": {
  "commit_docs": true,
  "search_gitignored": false
},
"git": {
  "branching_strategy": "none",
  "phase_branch_template": "gsd/phase-{phase}-{slug}",
  "milestone_branch_template": "gsd/{milestone}-{slug}"
}
```

| Option | Default | Description |
|--------|---------|-------------|
| `commit_docs` | `true` | Whether to commit planning artifacts to git |
| `search_gitignored` | `false` | Add `--no-ignore` to broad rg searches |
| `git.branching_strategy` | `"none"` | Git branching approach: `"none"`, `"phase"`, or `"milestone"` |
| `git.phase_branch_template` | `"gsd/phase-{phase}-{slug}"` | Branch template for phase strategy |
| `git.milestone_branch_template` | `"gsd/{milestone}-{slug}"` | Branch template for milestone strategy |
</config_schema>

<commit_docs_behavior>

**When `commit_docs: true` (default):**
- Planning files committed normally
- SUMMARY.md, STATE.md, ROADMAP.md tracked in git
- Full history of planning decisions preserved

**When `commit_docs: false`:**
- Skip all `git add`/`git commit` for `.planning/` files
- User must add `.planning/` to `.gitignore`
- Useful for: OSS contributions, client projects, keeping planning private

**Using gsd-tools.cjs (preferred):**

```bash
# Commit with automatic commit_docs + gitignore checks:
node ~/.claude/get-shit-done/bin/gsd-tools.cjs commit "docs: update state" --files .planning/STATE.md

# Load config via state load (returns JSON):
INIT=$(node ~/.claude/get-shit-done/bin/gsd-tools.cjs state load)
# commit_docs is available in the JSON output

# Or use init commands which include commit_docs:
INIT=$(node ~/.claude/get-shit-done/bin/gsd-tools.cjs init execute-phase "1")
# commit_docs is included in all init command outputs
```

**Auto-detection:** If `.planning/` is gitignored, `commit_docs` is automatically `false` regardless of config.json. This prevents git errors when users have `.planning/` in `.gitignore`.

**Commit via CLI (handles checks automatically):**

```bash
node ~/.claude/get-shit-done/bin/gsd-tools.cjs commit "docs: update state" --files .planning/STATE.md
```

The CLI checks `commit_docs` config and gitignore status internally — no manual conditionals needed.

</commit_docs_behavior>

<search_behavior>

**When `search_gitignored: false` (default):**
- Standard rg behavior (respects .gitignore)
- Direct path searches work: `rg "pattern" .planning/` finds files
- Broad searches skip gitignored: `rg "pattern"` skips `.planning/`

**When `search_gitignored: true`:**
- Add `--no-ignore` to broad rg searches that should include `.planning/`
- Only needed when searching entire repo and expecting `.planning/` matches

**Note:** Most GSD operations use direct file reads or explicit paths, which work regardless of gitignore status.

</search_behavior>

<setup_uncommitted_mode>

To use uncommitted mode:

1. **Set config:**
   ```json
   "planning": {
     "commit_docs": false,
     "search_gitignored": true
   }
   ```

2. **Add to .gitignore:**
   ```
   .planning/
   ```

3. **Existing tracked files:** If `.planning/` was previously tracked:
   ```bash
   git rm -r --cached .planning/
   git commit -m "chore: stop tracking planning docs"
   ```

4. **Branch merges:** When using `branching_strategy: phase` or `milestone`, the `complete-milestone` workflow automatically strips `.planning/` files from staging before merge commits when `commit_docs: false`.

</setup_uncommitted_mode>

<branching_strategy_behavior>

**Branching Strategies:**

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
- Branch name from `phase_branch_template` (e.g., `gsd/phase-03-authentication`)
- All plan commits go to that branch
- User merges branches manually after phase completion
- `complete-milestone` offers to merge all phase branches

**When `git.branching_strategy: "milestone"`:**
- First `execute-phase` of milestone creates the milestone branch
- Branch name from `milestone_branch_template` (e.g., `gsd/v1.0-mvp`)
- All phases in milestone commit to same branch
- `complete-milestone` offers to merge milestone branch to main

**Template variables:**

| Variable | Available in | Description |
|----------|--------------|-------------|
| `{phase}` | phase_branch_template | Zero-padded phase number (e.g., "03") |
| `{slug}` | Both | Lowercase, hyphenated name |
| `{milestone}` | milestone_branch_template | Milestone version (e.g., "v1.0") |

**Checking the config:**

Use `init execute-phase` which returns all config as JSON:
```bash
INIT=$(node ~/.claude/get-shit-done/bin/gsd-tools.cjs init execute-phase "1")
# JSON output includes: branching_strategy, phase_branch_template, milestone_branch_template
```

Or use `state load` for the config values:
```bash
INIT=$(node ~/.claude/get-shit-done/bin/gsd-tools.cjs state load)
# Parse branching_strategy, phase_branch_template, milestone_branch_template from JSON
```

**Branch creation:**

```bash
# For phase strategy
if [ "$BRANCHING_STRATEGY" = "phase" ]; then
  PHASE_SLUG=$(echo "$PHASE_NAME" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//;s/-$//')
  BRANCH_NAME=$(echo "$PHASE_BRANCH_TEMPLATE" | sed "s/{phase}/$PADDED_PHASE/g" | sed "s/{slug}/$PHASE_SLUG/g")
  git checkout -b "$BRANCH_NAME" 2>/dev/null || git checkout "$BRANCH_NAME"
fi

# For milestone strategy
if [ "$BRANCHING_STRATEGY" = "milestone" ]; then
  MILESTONE_SLUG=$(echo "$MILESTONE_NAME" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//;s/-$//')
  BRANCH_NAME=$(echo "$MILESTONE_BRANCH_TEMPLATE" | sed "s/{milestone}/$MILESTONE_VERSION/g" | sed "s/{slug}/$MILESTONE_SLUG/g")
  git checkout -b "$BRANCH_NAME" 2>/dev/null || git checkout "$BRANCH_NAME"
fi
```

**Merge options at complete-milestone:**

| Option | Git command | Result |
|--------|-------------|--------|
| Squash merge (recommended) | `git merge --squash` | Single clean commit per branch |
| Merge with history | `git merge --no-ff` | Preserves all individual commits |
| Delete without merging | `git branch -D` | Discard branch work |
| Keep branches | (none) | Manual handling later |

Squash merge is recommended — keeps main branch history clean while preserving the full development history in the branch (until deleted).

**Use cases:**

| Strategy | Best for |
|----------|----------|
| `none` | Solo development, simple projects |
| `phase` | Code review per phase, granular rollback, team collaboration |
| `milestone` | Release branches, staging environments, PR per version |

</branching_strategy_behavior>

<adversary_config>

Configuration for the adversary agent challenge system. The adversary reviews planning artifacts and raises challenges before execution begins.

<config_schema>

**Full adversary config shape:**

```json
"adversary": {
  "enabled": true,
  "max_rounds": 3,
  "checkpoints": {
    "requirements": true,
    "roadmap": true,
    "plan": true,
    "verification": true
  }
}
```

**Checkpoint values support two forms:**

Boolean shorthand (common):
```json
"plan": true
```

Object form (per-checkpoint override):
```json
"plan": {
  "enabled": true,
  "max_rounds": 4
}
```

| Option | Default | Description |
|--------|---------|-------------|
| `adversary.enabled` | `true` | Global kill switch. When `false`, adversary never runs at any checkpoint. |
| `adversary.max_rounds` | `3` | Default max challenge rounds for all checkpoints. |
| `adversary.checkpoints.{name}` | `true` | Enable/disable adversary at a specific checkpoint. Boolean shorthand. |
| `adversary.checkpoints.{name}.enabled` | `true` | Enable/disable adversary at a specific checkpoint. Object form. |
| `adversary.checkpoints.{name}.max_rounds` | (inherit) | Override max rounds for a specific checkpoint. Object form only. |

**Checkpoint names:** `requirements`, `roadmap`, `plan`, `verification`

**Precedence chain for max_rounds:**

1. `adversary.checkpoints.{name}.max_rounds` (checkpoint-level override) -- highest priority
2. `adversary.max_rounds` (adversary-level default)
3. System default: `3` -- lowest priority

**Missing config behavior:** If `adversary` key is missing entirely, or `config.json` does not exist, the system defaults apply: adversary enabled, all checkpoints enabled, max_rounds=3. The adversary is opt-out, not opt-in.

</config_schema>

<reading_config>

**Standard reading block for orchestrators.**

Orchestrators in Phases 3-5 copy this block before spawning `gsd-adversary`. It reads the adversary config for a specific checkpoint and outputs `enabled|rounds` for the orchestrator to consume.

```bash
# Read adversary config for a specific checkpoint
CHECKPOINT_NAME="plan"
CHECKPOINT_CONFIG=$(node -e "
  try {
    const c = JSON.parse(require('fs').readFileSync('.planning/config.json', 'utf8'));
    const adv = c.adversary || {};
    if (adv.enabled === false) { console.log('false|3'); process.exit(0); }
    const cp = adv.checkpoints?.[process.argv[1]];
    let enabled, rounds;
    if (typeof cp === 'boolean') { enabled = cp; rounds = adv.max_rounds ?? 3; }
    else if (typeof cp === 'object' && cp !== null) { enabled = cp.enabled ?? true; rounds = cp.max_rounds ?? adv.max_rounds ?? 3; }
    else { enabled = true; rounds = adv.max_rounds ?? 3; }
    console.log(enabled + '|' + rounds);
  } catch(e) { console.log('true|3'); }
" "$CHECKPOINT_NAME" 2>/dev/null || echo "true|3")

CHECKPOINT_ENABLED=$(echo "$CHECKPOINT_CONFIG" | cut -d'|' -f1)
MAX_ROUNDS=$(echo "$CHECKPOINT_CONFIG" | cut -d'|' -f2)
```

**How it works:**

1. **Global kill switch:** Checks `adv.enabled === false` first. If the global flag is off, immediately returns `false|3` regardless of checkpoint settings.
2. **Boolean shorthand:** `typeof cp === 'boolean'` -- uses the boolean as enabled, inherits `max_rounds` from adversary level or system default.
3. **Object form:** `typeof cp === 'object'` -- reads `cp.enabled` and `cp.max_rounds`, falling back through the precedence chain.
4. **Missing checkpoint:** If the checkpoint key does not exist in config, defaults to enabled with inherited max_rounds.
5. **Error handling:** JavaScript `try/catch` returns `true|3` on any parse error. Bash `|| echo "true|3"` catches node failures.

**Why `node -e` instead of `grep`:** The adversary config uses nested objects with polymorphic values (boolean or object). Grep-based parsing cannot reliably handle this. Existing simple config values (like `commit_docs`) continue using grep patterns.

**Usage in orchestrators:**

```bash
if [ "$CHECKPOINT_ENABLED" = "true" ]; then
  # Spawn gsd-adversary with MAX_ROUNDS
  # ... adversary challenge loop ...
fi
```

</reading_config>

</adversary_config>

</planning_config>
