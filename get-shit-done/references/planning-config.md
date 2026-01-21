<planning_config>

Configuration options for `.planning/` directory behavior.

<config_schema>

## Full Schema

```json
{
  "planning": {
    "commit_docs": true,
    "search_gitignored": false
  },
  "statusline": {
    "level": "standard",
    "show_costs": true,
    "show_model_usage": false,
    "show_adaptive_info": false,
    "show_rate_limits": true,
    "show_git_state": false,
    "show_tests": false,
    "show_time": false
  }
}
```

## Planning Options

| Option | Default | Description |
|--------|---------|-------------|
| `commit_docs` | `true` | Whether to commit planning artifacts to git |
| `search_gitignored` | `false` | Add `--no-ignore` to broad rg searches |

## Statusline Options

| Option | Default | Description |
|--------|---------|-------------|
| `level` | `"standard"` | Display level: `"minimal"`, `"standard"`, or `"detailed"` |
| `show_costs` | `true` | Display session/project cost tracking |
| `show_model_usage` | `false` | Display H/S/O model distribution (adaptive profile only) |
| `show_adaptive_info` | `false` | Display last model selection + complexity score (adaptive only) |
| `show_rate_limits` | `true` | Display rate limit warnings when triggered |
| `show_git_state` | `false` | Display git status (uncommitted, ahead/behind) |
| `show_tests` | `false` | Display test runner status (future enhancement) |
| `show_time` | `false` | Display session duration |

**Configure with:** `/gsd:statusline-settings`

**Display Levels:**
- `minimal`: Model + directory + context only
- `standard`: Adds phase progress and costs
- `detailed`: All enabled options displayed

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

**Checking the config:**

```bash
# Check config.json first
COMMIT_DOCS=$(cat .planning/config.json 2>/dev/null | grep -o '"commit_docs"[[:space:]]*:[[:space:]]*[^,}]*' | grep -o 'true\|false' || echo "true")

# Auto-detect gitignored (overrides config)
git check-ignore -q .planning 2>/dev/null && COMMIT_DOCS=false
```

**Auto-detection:** If `.planning/` is gitignored, `commit_docs` is automatically `false` regardless of config.json. This prevents git errors when users have `.planning/` in `.gitignore`.

**Conditional git operations:**

```bash
if [ "$COMMIT_DOCS" = "true" ]; then
  git add .planning/STATE.md
  git commit -m "docs: update state"
fi
```

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

</setup_uncommitted_mode>

</planning_config>
