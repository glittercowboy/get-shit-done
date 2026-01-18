# Coding Conventions

**Analysis Date:** 2026-01-16

## Naming Patterns

**Files:**
- kebab-case for all markdown files (command-handler.md, user-service.md)
- UPPERCASE.md for important project files (README, CHANGELOG, PROJECT)
- {phase}-{plan}-PLAN.md for executable plans (01-02-PLAN.md)
- {phase}-{plan}-SUMMARY.md for execution summaries

**Commands:**
- Format: `gsd:kebab-case` (e.g., `/gsd:new-project`, `/gsd:execute-phase`)

**Agents:**
- Format: `gsd-kebab-case` (e.g., `gsd-executor`, `gsd-verifier`)

**Variables (in templates):**
- Square brackets: `[Project Name]`, `[Description]` (placeholders)
- Curly braces: `{phase}`, `{plan}` (computed values)
- CAPS_UNDERSCORES for bash variables: `PHASE_ARG`, `PLAN_START_TIME`

**XML Attributes:**
- snake_case for step names: `name="load_project_state"`, `name="parse_arguments"`
- kebab-case for types: `type="checkpoint:human-verify"`

## Code Style

**Formatting (JavaScript):**
- 2-space indentation (`bin/install.js`)
- Single quotes for strings
- Semicolons present in statements
- No linting tools configured (human discipline + style guide)

**Formatting (Markdown):**
- 2-space indentation for nested content within XML tags
- Blank line before and after XML blocks
- Code blocks use triple backticks with language hint

**Linting:**
- No `.eslintrc` or `.prettierrc` - conventions maintained by style guide
- Reference: `GSD-STYLE.md` for comprehensive guidelines

## Import Organization

**JavaScript (`bin/install.js`):**
1. Node.js built-ins (fs, path, os, readline)
2. No external packages (zero dependencies)

## Error Handling

**Patterns:**
- JavaScript: Process exit with error code on failure
- Plans: Task-level `<verify>` blocks prove completion
- Plans: Checkpoint tasks pause for human verification
- Execution: Deviations auto-fixed, documented in SUMMARY.md

**Error Types:**
- Installation errors: Console message + process.exit(1)
- Execution errors: Documented in SUMMARY.md, may trigger gap closure
- Verification failures: Trigger `/gsd:plan-phase N --gaps`

## Logging

**Framework:**
- Console output (console.log, console.error) for installation
- ANSI color codes for terminal styling in `bin/install.js`

**Patterns:**
- Installation: Progress messages with color-coded output
- Execution: SUMMARY.md files document what happened
- State: STATE.md tracks decisions, blockers, metrics

## Comments

**When to Comment (JavaScript):**
- Complex path logic explanation needed
- Non-obvious file operations

**Documentation Style (Markdown):**
- XML semantic containers for structure (`<objective>`, `<process>`, `<step>`)
- Markdown headers for content hierarchy within XML
- Imperative voice: "Execute tasks", "Create file" (not passive)

**Banned Language (`GSD-STYLE.md`):**
- No filler: "Let me", "Just", "Simply", "Basically"
- No sycophancy: "I'd be happy to", "Great!", "Awesome!"

## Function Design

**Size (JavaScript):**
- `bin/install.js` is 232 lines total
- Functions are short (10-30 lines each)
- `copyWithPathReplacement()`, `install()`, `promptLocation()`, etc.

**Parameters:**
- Simple parameters (path, boolean flags)
- No complex objects

**Return Values:**
- Explicit returns
- process.exit() for terminal states

## Module Design

**Exports:**
- Not applicable - single CLI script
- No module exports (runs as entry point)

**Structure:**
- Commands delegate to workflows
- Workflows contain business logic
- Templates provide structure
- References provide guidance
- Agents provide specialized execution

## XML Tag Conventions

**Semantic Containers Only:**
- Use semantic tags: `<objective>`, `<process>`, `<step>`, `<task>`
- Avoid generic tags: `<section>`, `<item>`, `<content>`

**Task Structure:**
```xml
<task type="auto">
  <name>Task N: Action-oriented name</name>
  <files>src/path/file.ts</files>
  <action>What to do, what to avoid and WHY</action>
  <verify>Command or check to prove completion</verify>
  <done>Measurable acceptance criteria</done>
</task>
```

**Task Types:**
- `type="auto"` â Claude executes autonomously
- `type="checkpoint:human-verify"` â User verifies Claude's work
- `type="checkpoint:decision"` â User makes implementation choice

## YAML Frontmatter

**Commands:**
```yaml
---
name: gsd:command-name
description: One-line description
argument-hint: "<required>" or "[optional]"
allowed-tools: [Read, Write, Bash, Glob, Grep]
---
```

**Plans:**
```yaml
---
phase: XX-name
plan: NN
type: execute
wave: N
depends_on: []
files_modified: []
autonomous: true
---
```

---

*Convention analysis: 2026-01-16*
*Update when patterns change*
