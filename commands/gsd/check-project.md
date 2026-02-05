---
name: gsd:check-project
description: Analyze CLAUDE.md for GSD compatibility and conflicts
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

<objective>
Analyze the project's CLAUDE.md files and report compatibility with GSD methodology.

Identifies:
- **Conflicts** - Rules that contradict GSD behavior
- **Redundant** - Rules that GSD already handles (wastes context)
- **Project-specific** - Rules to keep (GSD doesn't cover these)
</objective>

<required_reading>
@~/.claude/get-shit-done/references/gsd-methodology-rules.md
</required_reading>

<process>

## Step 1: Find CLAUDE.md Files

```bash
# Check for CLAUDE.md files
ls -la CLAUDE.md .claude/CLAUDE.md .claude/*.md 2>/dev/null

# Also check for claude.md (lowercase)
ls -la claude.md .claude/claude.md 2>/dev/null
```

**If no CLAUDE.md found:**
```markdown
## GSD Project Compatibility Check

No CLAUDE.md files found in this project.

**This is fine!** GSD's methodology is baked into its commands, so you don't
need a CLAUDE.md to use GSD effectively.

If you want to add project-specific rules (like "run typecheck before commit"),
you can create a CLAUDE.md for those.
```
STOP here.

## Step 2: Read and Parse CLAUDE.md

Read all found CLAUDE.md files:

```bash
cat CLAUDE.md 2>/dev/null
cat .claude/CLAUDE.md 2>/dev/null
cat .claude/*.md 2>/dev/null
```

Parse the content into individual rules/instructions. Look for:
- Bullet points
- Numbered lists
- Imperative sentences ("Always...", "Never...", "Do...")
- Headers with instructions

## Step 3: Categorize Each Rule

For each rule found, categorize based on GSD methodology rules reference:

### Check for Conflicts

Compare against conflict patterns from gsd-methodology-rules.md:

**Planning conflicts:**
- Skipping planning ("just code", "implement directly")
- Skipping research ("don't investigate", "assume you know")

**Execution conflicts:**
- Disabling parallel execution ("never use subagents", "one at a time")
- Ignoring checkpoints ("continue if unsure", "don't pause")
- Preventing deviations ("follow plan exactly", "ask before fixing bugs")

**Git conflicts:**
- Squashing commits ("one commit per plan")
- Broad git operations ("git add .")
- Forcing planning commits when gitignored

**Verification conflicts:**
- Skipping verification ("assume it works", "tests passing is enough")
- Task-based verification ("check tasks completed")

**Structure conflicts:**
- Different folder structure ("use docs/", "no STATE.md")
- Skipping documentation ("minimal docs", "skip frontmatter")

### Check for Redundancies

Rules that GSD already handles (wastes context tokens):

- "Use atomic commits" → GSD does this automatically
- "Always plan before coding" → GSD enforces this
- "Create SUMMARY.md" → GSD creates these
- "Verify work" → GSD has verification gates
- "Use parallel execution" → GSD does wave-based execution
- "Document decisions" → GSD tracks in STATE.md

### Check for Project-Specific

Rules that GSD doesn't cover (keep these):

- Technology commands: "npm run typecheck", "cargo test"
- Environment: "staging deploys to X", "production requires Y"
- Permissions: "never modify package.json without asking"
- Secrets: "never commit .env files"
- Deployment: "push to main deploys to Vercel"
- Team conventions: "use kebab-case for files"

## Step 4: Present Findings

Format output:

```markdown
# GSD Project Compatibility Check

## Conflicts Found

[If conflicts exist:]
| Line | Rule | Conflict | Suggestion |
|------|------|----------|------------|
| 15 | "Never use subagents" | Contradicts GSD parallel execution | Remove or scope to specific cases |
| 23 | "Skip planning for small tasks" | GSD requires planning always | Remove |

[If no conflicts:]
No conflicts found.

## Redundant Rules (GSD handles these)

[If redundancies exist:]
| Line | Rule | GSD Coverage |
|------|------|--------------|
| 8 | "Always use parallel subagents" | Built into wave execution |
| 12 | "Create SUMMARY.md after work" | Automatic in execute-phase |
| 18 | "Never code without a plan" | Enforced by all GSD commands |

These rules waste context tokens since GSD already enforces them.

[If no redundancies:]
No redundant rules found.

## Project-Specific Rules (keep these)

[If project rules exist:]
| Line | Rule | Why Keep |
|------|------|----------|
| 23 | "Run npm run typecheck before commit" | Project-specific tooling |
| 25 | "Never modify package.json without permission" | Team permission |
| 45 | "Push to main deploys to Vercel" | Deployment info |

These are valuable project context - keep them!

[If no project rules:]
No project-specific rules found.

## Summary

- **Conflicts:** {N} (should fix)
- **Redundant:** {N} (can remove to save context)
- **Project-specific:** {N} (keep)

[If conflicts or redundancies exist:]
Would you like me to help clean up the CLAUDE.md?
```

## Step 5: Offer Cleanup (Optional)

If conflicts or redundancies found, offer to help:

Use AskUserQuestion:
- Question: "Would you like help cleaning up CLAUDE.md?"
- Options:
  - "Yes, show me a cleaned version"
  - "Yes, but let me review each change"
  - "No, I'll handle it manually"

**If user wants cleaned version:**
- Remove redundant rules
- Comment out or remove conflicting rules
- Keep project-specific rules
- Show diff of changes

**If user wants to review each:**
- Go through conflicts one by one
- Ask keep/remove/modify for each

</process>

<examples>

## Example: Project with Conflicts

**Original CLAUDE.md:**
```markdown
# Project Rules

- Never use subagents for simple tasks
- Always use parallel subagents for performance
- Run npm run typecheck before committing
- Skip planning for quick fixes
- Push to main deploys to production
```

**Output:**
```markdown
# GSD Project Compatibility Check

## Conflicts Found

| Line | Rule | Conflict | Suggestion |
|------|------|----------|------------|
| 3 | "Never use subagents for simple tasks" | GSD uses subagents for isolation | Remove - GSD manages this |
| 6 | "Skip planning for quick fixes" | GSD requires planning always | Use /gsd:quick for fast tasks |

## Redundant Rules

| Line | Rule | GSD Coverage |
|------|------|--------------|
| 4 | "Always use parallel subagents" | Built into wave execution |

## Project-Specific Rules (keep)

| Line | Rule | Why Keep |
|------|------|----------|
| 5 | "Run npm run typecheck before commit" | Project tooling |
| 7 | "Push to main deploys to production" | Deployment info |

## Summary

- **Conflicts:** 2 (should fix)
- **Redundant:** 1 (can remove)
- **Project-specific:** 2 (keep)
```

## Example: Clean Project

**CLAUDE.md:**
```markdown
# Project Rules

- Run `npm run lint` before committing
- Never commit .env files
- Use kebab-case for file names
```

**Output:**
```markdown
# GSD Project Compatibility Check

## Conflicts Found

No conflicts found.

## Redundant Rules

No redundant rules found.

## Project-Specific Rules (keep)

| Line | Rule | Why Keep |
|------|------|----------|
| 3 | "Run npm run lint before committing" | Project tooling |
| 4 | "Never commit .env files" | Security |
| 5 | "Use kebab-case for file names" | Naming convention |

## Summary

- **Conflicts:** 0
- **Redundant:** 0
- **Project-specific:** 3 (keep)

Your CLAUDE.md is fully compatible with GSD!
```

</examples>

<success_criteria>
- [ ] All CLAUDE.md files found and read
- [ ] Each rule categorized (conflict/redundant/project-specific)
- [ ] Clear report presented with line numbers
- [ ] Actionable suggestions provided
- [ ] Cleanup offered if issues found
</success_criteria>
