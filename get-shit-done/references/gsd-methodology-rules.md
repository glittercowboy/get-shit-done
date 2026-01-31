# GSD Methodology Rules

Reference for `/gsd:check-project` to identify conflicts and redundancies in user's CLAUDE.md.

---

## Rule Categories

Rules are organized into categories for conflict detection:

1. **Planning** - Rules about planning before execution
2. **Execution** - Rules about how code is executed
3. **Git** - Rules about version control
4. **Verification** - Rules about checking work
5. **Structure** - Rules about file organization
6. **Context** - Rules about context management

---

## Planning Rules

### PLAN-01: Planning is Mandatory
**GSD enforces:** Plans MUST exist before any code execution.
**Conflict patterns:**
- "just code", "skip planning", "code first"
- "planning is optional", "for small tasks, skip"
- "implement directly without plan"

### PLAN-02: Discovery Before Planning
**GSD enforces:** Research/discovery is mandatory (Levels 0-3) before planning.
**Conflict patterns:**
- "skip research", "don't waste time researching"
- "assume you know", "no need to investigate"

### PLAN-03: Goal-Backward Planning
**GSD enforces:** Plans derive must_haves from goal-backward analysis.
**Conflict patterns:**
- "task list is enough", "no need for must_haves"
- "skip goal analysis"

---

## Execution Rules

### EXEC-01: Parallel Wave Execution
**GSD enforces:** Plans execute in waves, parallel when possible.
**Conflict patterns:**
- "execute sequentially", "one at a time"
- "never use parallel", "disable subagents"
- "avoid Task tool"
**Redundant patterns:**
- "use parallel execution", "spawn subagents"
- "execute plans in parallel"

### EXEC-02: Checkpoint Protocol
**GSD enforces:** Checkpoints pause execution and return structured state.
**Conflict patterns:**
- "ask inline", "continue if unsure"
- "don't pause for checkpoints"
- "handle decisions yourself"

### EXEC-03: Deviation Rules
**GSD enforces:** Auto-fix bugs, security gaps, blockers. Ask for architectural changes.
**Conflict patterns:**
- "follow plan exactly", "no deviations"
- "ask before fixing bugs"
- "don't add security validation without asking"
**Redundant patterns:**
- "fix bugs as you find them"
- "add security validation"

### EXEC-04: Context Budget
**GSD enforces:** Plans target ~50% context, max 2-3 tasks per plan.
**Conflict patterns:**
- "maximize context usage", "use 80% context"
- "pack as many tasks as possible"
- "5+ tasks per plan is fine"

---

## Git Rules

### GIT-01: Atomic Per-Task Commits
**GSD enforces:** Every task gets its own commit with format `{type}({phase}-{plan}): {task}`.
**Conflict patterns:**
- "squash commits", "one commit per plan"
- "batch commits", "commit at end"
**Redundant patterns:**
- "atomic commits", "commit after each task"
- "use conventional commits"

### GIT-02: No Broad Git Operations
**GSD enforces:** Never use `git add .` or `git add -A`. Stage individual files.
**Conflict patterns:**
- "git add .", "git add -A", "add all files"
- "stage everything"
**Redundant patterns:**
- "stage files individually"
- "never use git add ."

### GIT-03: Respect Gitignore for Planning
**GSD enforces:** If `.planning/` is gitignored, don't commit planning docs.
**Conflict patterns:**
- "always commit planning files"
- "ignore gitignore for planning"

---

## Verification Rules

### VER-01: Verification is Mandatory
**GSD enforces:** Phase completion requires verification, not just task completion.
**Conflict patterns:**
- "skip verification", "assume it works"
- "tests passing is enough"
- "if summary says done, it's done"
**Redundant patterns:**
- "always verify", "verification required"

### VER-02: Goal-Backward Verification
**GSD enforces:** Verify against must_haves (goals), not tasks completed.
**Conflict patterns:**
- "check task completion only"
- "verify tasks were done"

### VER-03: Three-Level Artifact Verification
**GSD enforces:** Check exists, substantive (real code), wired (connected).
**Conflict patterns:**
- "file exists is enough"
- "don't check if code is real"

---

## Structure Rules

### STRUCT-01: .planning/ Directory Structure
**GSD enforces:** Mandatory structure with ROADMAP.md, STATE.md, phases/, etc.
**Conflict patterns:**
- "use docs/ folder", "planning in root"
- "no STATE.md needed", "skip roadmap"
**Redundant patterns:**
- "create .planning/ directory"
- "maintain STATE.md"

### STRUCT-02: STATE.md is Mandatory
**GSD enforces:** STATE.md must be updated after every plan completion.
**Conflict patterns:**
- "STATE.md is optional"
- "don't track state"

### STRUCT-03: SUMMARY.md Requirements
**GSD enforces:** SUMMARY.md with specific frontmatter (phase, plan, tech-stack, etc.).
**Conflict patterns:**
- "minimal documentation", "skip frontmatter"
- "summary not needed"
**Redundant patterns:**
- "create SUMMARY.md", "document completed work"

---

## Context Rules

### CTX-01: Load Planning Context
**GSD enforces:** Load CONTEXT.md, RESEARCH.md, DISCOVERY.md before execution.
**Conflict patterns:**
- "don't read planning files"
- "skip context loading"

### CTX-02: TDD Gets Separate Plan
**GSD enforces:** TDD features get dedicated plans (not mixed with other tasks).
**Conflict patterns:**
- "batch TDD with other tasks"
- "skip TDD for speed"

---

## Detection Patterns

### Conflict Keywords
Words/phrases that often indicate conflicts:
- "never", "don't", "skip", "avoid", "disable"
- "just code", "directly", "without"
- "optional", "not needed", "unnecessary"

### Redundancy Keywords
Words/phrases that indicate GSD already handles this:
- "always", "must", "required"
- "atomic commits", "parallel execution"
- "verify", "plan first", "document"

### Project-Specific Indicators
Patterns that are project-specific (keep these):
- Technology-specific: "npm run", "cargo", "python"
- Environment: "staging", "production", "Vercel", "AWS"
- Testing: "run tests before", "typecheck"
- Permissions: "never modify X without asking"
- API keys, secrets, credentials mentions
- Deployment instructions
