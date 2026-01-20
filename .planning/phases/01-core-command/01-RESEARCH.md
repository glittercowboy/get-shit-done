# Phase 1: Core Command - Research

**Researched:** 2025-01-19
**Domain:** GSD command architecture, slash command patterns, subagent orchestration
**Confidence:** HIGH

## Summary

This phase implements `/gsd:quick` as a lightweight command that executes small tasks while maintaining GSD guarantees (atomic commits, STATE.md tracking) but skipping optional agents (research, plan-checker, verifier). The CONTEXT.md decisions establish a clear separation from planned phases: quick tasks live in `.planning/quick/` with their own numbering scheme (001, 002, etc.) and do NOT touch ROADMAP.md.

The implementation reuses existing GSD infrastructure (gsd-planner in quick mode, gsd-executor unchanged, commit patterns from execute-plan). The main work is:
1. The orchestrator command itself
2. Interactive description prompting
3. Quick directory management (`.planning/quick/NNN-slug/`)
4. STATE.md integration (new "Quick Tasks Completed" table)

**Primary recommendation:** Build as a thin orchestrator command that spawns 2 agents (planner + executor) and handles the `.planning/quick/` directory structure directly.

## Standard Stack

The implementation uses existing GSD components with no new libraries.

### Core
| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| gsd-planner | existing | Creates PLAN.md | Already has quick mode support documented in design docs |
| gsd-executor | existing | Executes tasks, creates SUMMARY.md | Unchanged from full mode |
| Task tool | Claude Code native | Spawns subagents | Standard GSD orchestration pattern |

### Supporting
| Component | Version | Purpose | When to Use |
|-----------|---------|---------|-------------|
| AskUserQuestion | Claude Code native | Interactive description prompt | Initial task description gathering |
| Edit tool | Claude Code native | STATE.md updates | Inserting rows in Quick Tasks table |
| Bash tool | Claude Code native | Directory creation, git commits | File system and git operations |

### Not Needed
| Instead of | Skip | Reason |
|------------|------|--------|
| gsd-phase-researcher | Skip entirely | Quick tasks don't need domain research |
| gsd-plan-checker | Skip entirely | Quick tasks trade verification for speed |
| gsd-verifier | Skip entirely | No phase verification for quick tasks |
| ROADMAP.md updates | Skip entirely | Quick tasks are ad-hoc, not planned work |
| Decimal phase logic | Skip entirely | Quick tasks use separate `.planning/quick/` directory |

## Architecture Patterns

### Recommended Directory Structure
```
.planning/
├── quick/                          # Quick task storage (separate from phases)
│   ├── 001-fix-button-spacing/
│   │   ├── PLAN.md
│   │   └── SUMMARY.md
│   ├── 002-update-readme/
│   │   ├── PLAN.md
│   │   └── SUMMARY.md
│   └── ...
├── phases/                         # Regular planned phases (unchanged)
├── STATE.md                        # Updated with Quick Tasks table
├── ROADMAP.md                      # NOT modified by quick tasks
└── ...
```

### Pattern 1: Thin Orchestrator with Interactive Prompt
**What:** Command prompts for description inline, then delegates all heavy work to subagents
**When to use:** When user invokes `/gsd:quick`

The command flow:
1. Validate `.planning/ROADMAP.md` exists (error if not - need active project)
2. Prompt user inline: "What do you want to do?"
3. Calculate next quick task number (scan `.planning/quick/` directories)
4. Create directory `.planning/quick/NNN-slug/`
5. Spawn gsd-planner (quick mode)
6. Spawn gsd-executor(s) for each plan created
7. Update STATE.md "Quick Tasks Completed" table
8. Commit artifacts

### Pattern 2: Sequential Numbering with Collision Detection
**What:** 3-digit zero-padded sequential numbers (001, 002, 003...)
**When to use:** Determining next quick task directory name

```bash
# Find existing quick task directories
existing=$(ls -1d .planning/quick/[0-9][0-9][0-9]-* 2>/dev/null | sort -r | head -1)

if [ -z "$existing" ]; then
  next_num="001"
else
  # Extract number from path like .planning/quick/042-some-task
  current_num=$(basename "$existing" | grep -oE '^[0-9]+')
  next_num=$(printf "%03d" $((10#$current_num + 1)))
fi
```

### Pattern 3: STATE.md Quick Tasks Table
**What:** Dedicated section tracking completed quick tasks
**When to use:** After each quick task completion

```markdown
### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 001 | Fix button spacing | 2025-01-19 | abc123f | [001-fix-button-spacing](./quick/001-fix-button-spacing/) |
| 002 | Update readme | 2025-01-19 | def456g | [002-update-readme](./quick/002-update-readme/) |
```

**Algorithm for STATE.md update:**
1. Find `## Accumulated Context` section
2. Find or create `### Quick Tasks Completed` subsection
3. Find or create the table with headers
4. Append new row with task details
5. If section doesn't exist, create it after existing subsections

### Pattern 4: Subagent Spawning (Planner then Executor)
**What:** Sequential spawning of planner then executor(s)
**When to use:** After directory created

```markdown
# Planner spawn
Task(
  prompt="
<planning_context>
**Mode:** quick
**Phase Directory:** .planning/quick/{NNN}-{slug}/
**Description:** {description}

**Project State:**
@.planning/STATE.md
</planning_context>

<output>
Write PLAN.md to: .planning/quick/{NNN}-{slug}/PLAN.md
Return: ## PLANNING COMPLETE
</output>
",
  subagent_type="gsd-planner",
  description="Quick plan: {description}"
)
```

### Anti-Patterns to Avoid
- **Updating ROADMAP.md:** Quick tasks are interruptions, not planned work. Keep ROADMAP clean for phases only.
- **Using decimal phases:** The CONTEXT.md explicitly chose `.planning/quick/` to separate quick tasks from planned phases.
- **Inline args:** The CONTEXT.md chose interactive prompt instead of `/gsd:quick "description"` style.
- **Adding flags:** No flags (--plan-only, --after N). Keep it minimal per CONTEXT.md.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Plan creation | Custom quick-plan logic | gsd-planner (quick mode) | Already documented in QUICK-MODE-DESIGN.md |
| Task execution | Custom execution | gsd-executor | Unchanged, handles checkpoints/commits |
| Commit format | Custom commit messages | git-integration.md patterns | Consistent with full GSD |
| Wave execution | Custom parallel logic | execute-phase.md patterns | Proven wave-based parallelization |
| Slug generation | Custom slugify | Bash tr/sed pattern | Used throughout GSD commands |

**Key insight:** Quick mode is the same system with a shorter path. Reuse existing agents and patterns.

## Common Pitfalls

### Pitfall 1: Trying to Track Quick Tasks in ROADMAP.md
**What goes wrong:** Pollutes the roadmap with ad-hoc work, loses the clean "planned phases" narrative
**Why it happens:** Natural assumption that all work should be in the roadmap
**How to avoid:** STATE.md "Quick Tasks Completed" table is the tracking mechanism
**Warning signs:** Impulse to add decimal phases or "QUICK" markers to ROADMAP.md

### Pitfall 2: Not Checking for .planning/ROADMAP.md
**What goes wrong:** Command runs without a project context, creates orphan artifacts
**Why it happens:** Forgetting pre-flight validation
**How to avoid:** First step must be `ls .planning/ROADMAP.md` check
**Warning signs:** Quick task directories appearing in non-project codebases

### Pitfall 3: Complex Argument Parsing
**What goes wrong:** Adds complexity that CONTEXT.md explicitly rejected
**Why it happens:** QUICK-MODE-DESIGN.md has `--plan-only` and `--after N` flags
**How to avoid:** CONTEXT.md overrides: "No flags - keep it minimal"
**Warning signs:** Building arg parser for flags that won't be used

### Pitfall 4: Forgetting the Failure Case (No Resume)
**What goes wrong:** Users expect to resume failed quick tasks
**Why it happens:** Full GSD has resume capability
**How to avoid:** CONTEXT.md: "On failure: no resume tracking - user re-runs from scratch"
**Warning signs:** Building checkpoint/resume infrastructure for quick mode

### Pitfall 5: Not Creating .planning/quick/ Directory
**What goes wrong:** First quick task fails because parent directory doesn't exist
**Why it happens:** Assuming directory exists
**How to avoid:** `mkdir -p .planning/quick/` before creating task directory
**Warning signs:** "No such file or directory" errors on first quick task

## Code Examples

Verified patterns from existing GSD codebase:

### Pre-flight Validation
```bash
# Source: commands/gsd/quick.md (to be created)
# Check .planning exists with ROADMAP.md
if [ ! -f .planning/ROADMAP.md ]; then
  echo "Quick mode requires an active project with ROADMAP.md."
  echo "Run /gsd:new-project first."
  exit 1
fi
```

### Next Quick Task Number Calculation
```bash
# Source: new pattern for quick task numbering
# Find highest existing number and increment
last=$(ls -1d .planning/quick/[0-9][0-9][0-9]-* 2>/dev/null | sort -r | head -1 | xargs -I{} basename {} | grep -oE '^[0-9]+')

if [ -z "$last" ]; then
  next_num="001"
else
  next_num=$(printf "%03d" $((10#$last + 1)))
fi
```

### Slug Generation
```bash
# Source: commands/gsd/new-project.md, commands/gsd/quick.md patterns
slug=$(echo "$description" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//;s/-$//' | cut -c1-40)
```

### Directory Creation
```bash
# Ensure .planning/quick/ exists then create task directory
mkdir -p ".planning/quick/${next_num}-${slug}"
```

### Planner Spawn (Quick Mode)
```markdown
# Source: QUICK-MODE-DESIGN.md, adapted for .planning/quick/ structure
Task(
  prompt="
<planning_context>

**Mode:** quick
**Directory:** .planning/quick/{NNN}-{slug}/
**Description:** {description}

**Project State:**
@.planning/STATE.md

</planning_context>

<output>
Write PLAN.md to: .planning/quick/{NNN}-{slug}/PLAN.md
Return: ## PLANNING COMPLETE
</output>
",
  subagent_type="gsd-planner",
  description="Quick plan: {description}"
)
```

### Executor Spawn
```markdown
# Source: commands/gsd/execute-phase.md, adapted for quick tasks
Task(
  prompt="
Execute quick task {NNN}.

Plan: @.planning/quick/{NNN}-{slug}/PLAN.md
Project state: @.planning/STATE.md
",
  subagent_type="gsd-executor",
  description="Execute: {description}"
)
```

### STATE.md Table Update (Conceptual)
```markdown
# Use Edit tool to append row to Quick Tasks Completed table
# Anchor: "### Quick Tasks Completed" section
# If section doesn't exist, create after "### Blockers/Concerns"

| {NNN} | {description} | {date} | {commit_hash} | [{NNN}-{slug}](./quick/{NNN}-{slug}/) |
```

### Commit Pattern
```bash
# Source: get-shit-done/references/git-integration.md
# Stage specific files only (never git add .)
git add .planning/quick/${next_num}-${slug}/
git add .planning/STATE.md
git commit -m "$(cat <<'EOF'
docs(quick-{NNN}): {description}

Quick task completed.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

## State of the Art

| Old Approach (QUICK-MODE-DESIGN.md) | Current Approach (CONTEXT.md) | Why Changed | Impact |
|-------------------------------------|------------------------------|-------------|--------|
| `/gsd:quick "description"` inline args | Interactive prompt | Simpler UX, no quoting issues | Command parsing simplified |
| Decimal phases (3.1, 3.2) | `.planning/quick/NNN-slug/` | Cleaner separation from planned work | Directory logic completely different |
| Update ROADMAP.md | Do NOT update ROADMAP.md | Roadmap is plan, not execution log | Skip ROADMAP editing entirely |
| `--plan-only`, `--after N` flags | No flags | Keep it minimal | No argument parsing needed |
| STATE.md brief mention | Full "Quick Tasks Completed" table | Proper tracking mechanism | Need table creation/update logic |

**Key context:** CONTEXT.md from `/gsd:discuss-phase` represents user decisions that override the earlier QUICK-MODE-DESIGN.md. The research must follow CONTEXT.md.

## Open Questions

Things that couldn't be fully resolved:

1. **Table Creation Timing**
   - What we know: STATE.md needs "Quick Tasks Completed" table
   - What's unclear: Should table be created on first quick task, or pre-created in STATE.md template?
   - Recommendation: Create on first quick task (check if exists, create if not)

2. **Multi-Plan Wave Execution**
   - What we know: Quick tasks can produce multiple plans (per QUICK-MODE-DESIGN.md)
   - What's unclear: CONTEXT.md mentions "execute each plan" but doesn't specify wave logic
   - Recommendation: Reuse execute-phase wave pattern for consistency

3. **PLAN.md Naming in Quick Directory**
   - What we know: Directory is `NNN-slug/`, contains PLAN.md and SUMMARY.md
   - What's unclear: Should PLAN.md be named `PLAN.md` or `{NNN}-PLAN.md`?
   - Recommendation: Simple `PLAN.md` since it's inside a numbered directory already

## Sources

### Primary (HIGH confidence)
- `.planning/phases/01-core-command/01-CONTEXT.md` - User decisions that override original requirements
- `commands/gsd/execute-phase.md` - Wave execution patterns
- `get-shit-done/workflows/execute-plan.md` - Executor workflow details
- `get-shit-done/workflows/execute-phase.md` - Subagent spawning patterns
- `get-shit-done/references/git-integration.md` - Commit format and patterns
- `get-shit-done/templates/state.md` - STATE.md structure

### Secondary (MEDIUM confidence)
- `docs/QUICK-MODE-DESIGN.md` - Original design (partially superseded by CONTEXT.md)
- `docs/QUICK-MODE-MVP.md` - MVP approach (partially superseded by CONTEXT.md)

### Changes from Design Docs
The CONTEXT.md decisions override several aspects of QUICK-MODE-DESIGN.md:
- No inline args (interactive prompt instead)
- No decimal phases (`.planning/quick/` instead)
- No ROADMAP.md updates
- No flags
- "Quick Tasks Completed" table for tracking

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing GSD agents unchanged
- Architecture: HIGH - Patterns well-documented in existing commands
- Pitfalls: HIGH - CONTEXT.md explicitly addresses common misunderstandings

**Research date:** 2025-01-19
**Valid until:** Stable - patterns from existing GSD codebase
