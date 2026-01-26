---
name: gsd:algorithm-drift
description: Check for drift between algorithm spec and code implementation
argument-hint: "<algorithm-name> (e.g., 'ekf' or 'extended-kalman-filter')"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

<objective>
Compare algorithm specification against its code implementation to detect drift.

This is an **analyzer only** — presents information, user decides action. Does NOT modify files without approval.

**Drift scenarios:**
- Code changed, spec outdated → suggest `/gsd:map-algorithms` to regenerate spec
- Spec is right, code wrong → suggest `/gsd:add-phase` + `/gsd:plan-phase` to fix code
</objective>

<context>
Algorithm name: $ARGUMENTS

**Required:**
- Algorithm spec must exist in `.planning/algorithms/`
- Spec must have `owns:` frontmatter listing implementation files

**If no argument provided:**
List available algorithms and ask user to select one.
</context>

<process>

<step name="find_algorithm">
**If $ARGUMENTS provided:**

```bash
# Try exact match first
ls .planning/algorithms/${ARGUMENTS}.md 2>/dev/null

# Try with common variations
ls .planning/algorithms/${ARGUMENTS}*.md 2>/dev/null
ls .planning/algorithms/*${ARGUMENTS}*.md 2>/dev/null
```

**If multiple matches:** Present options via AskUserQuestion.

**If no match:** Show available algorithms and exit.

**If no arguments:**

```bash
ls .planning/algorithms/*.md 2>/dev/null
```

If algorithms exist, use AskUserQuestion to select one.
If none exist, inform user to run `/gsd:map-algorithms` first.
</step>

<step name="load_spec">
Read the algorithm specification:

```bash
cat .planning/algorithms/${ALGORITHM_NAME}.md
```

Extract:
1. **owns:** list from frontmatter (implementation files)
2. **Method steps** (what the spec says the algorithm does)
3. **I/O** (expected inputs and outputs)
4. **Conventions** (domain-specific rules)
5. **Implementation notes** (how spec maps to code)
</step>

<step name="load_code">
For each file in `owns:`:

```bash
cat [owned-file-path]
```

Read the actual implementation code.

**If owned file doesn't exist:**
Flag as critical drift — spec references non-existent code.
</step>

<step name="analyze_drift">
Compare spec against code. Check for:

**Structural drift:**
- Functions in spec not in code (or vice versa)
- Different step order than spec describes
- Missing or extra processing stages

**Parameter drift:**
- Different I/O signatures
- Changed variable names/types
- Different constants or magic numbers

**Mathematical drift:**
- Different equations or formulas
- Changed algorithms or techniques
- Different conventions (coordinate frames, units)

**Implementation drift:**
- Code refactored beyond spec recognition
- New files not listed in `owns:`
- Dead code that spec still describes

For each detected drift, note:
- What spec says
- What code does
- Severity (critical / significant / minor)
- Which is likely "right" based on patterns
</step>

<step name="present_analysis">
Present drift analysis clearly:

```
╔═══════════════════════════════════════════════════════╗
║  DRIFT ANALYSIS: [Algorithm Name]                     ║
╚═══════════════════════════════════════════════════════╝

Spec: .planning/algorithms/[name].md
Code: [list of owned files]

---

## Drift Summary

| Category | Status | Details |
|----------|--------|---------|
| Structure | [OK/DRIFT] | [brief] |
| Parameters | [OK/DRIFT] | [brief] |
| Math/Logic | [OK/DRIFT] | [brief] |
| Implementation | [OK/DRIFT] | [brief] |

---

## Detailed Findings

### 1. [Drift Item Title]

**Spec says:**
[quote or summary from spec]

**Code does:**
[what the actual code shows, with file:line reference]

**Severity:** [critical/significant/minor]

---

### 2. [Next Drift Item]
...

---

## Suggested Actions

**If code is right, spec is outdated:**
Run `/gsd:map-algorithms [owned-files]` to regenerate spec from current code.

**If spec is right, code needs fixing:**
1. `/gsd:add-phase "Fix [algorithm-name] to match spec"`
2. `/gsd:plan-phase [N]`
3. `/gsd:execute-phase [N]`

---

What would you like to do?
```
</step>

<step name="route_action">
Use AskUserQuestion:

```
header: "Action"
question: "How do you want to resolve this drift?"
options:
  - label: "Update spec from code"
    description: "Run /gsd:map-algorithms to regenerate spec"
  - label: "Fix code to match spec"
    description: "Create phase to update implementation"
  - label: "No action needed"
    description: "Drift is intentional or acceptable"
  - label: "Review more"
    description: "Show me specific file contents"
```

**If "Update spec from code":**
```
To regenerate the spec, run:

/gsd:map-algorithms [owned-file-paths]

This will overwrite the existing spec with documentation generated from current code.
```

**If "Fix code to match spec":**
```
To fix the code, run:

/gsd:add-phase "Update [algorithm-name] to match spec"

Then:
/gsd:plan-phase [N]
/gsd:execute-phase [N]

The planner will automatically load the algorithm spec when planning touches owned files.
```

**If "No action needed":**
Note that drift is acknowledged and intentional.

**If "Review more":**
Show specific file contents as requested.
</step>

</process>

<no_drift_output>
If no significant drift detected:

```
╔═══════════════════════════════════════════════════════╗
║  DRIFT ANALYSIS: [Algorithm Name]                     ║
╚═══════════════════════════════════════════════════════╝

Spec: .planning/algorithms/[name].md
Code: [list of owned files]

---

## Status: In Sync

No significant drift detected between spec and implementation.

| Category | Status |
|----------|--------|
| Structure | OK |
| Parameters | OK |
| Math/Logic | OK |
| Implementation | OK |

---

Minor notes (if any):
- [any observations that don't rise to drift level]

---

No action needed. Spec and code are aligned.
```
</no_drift_output>

<success_criteria>
- [ ] Algorithm spec located and loaded
- [ ] All owned files read and analyzed
- [ ] Drift analysis presented clearly with file:line references
- [ ] Suggested actions are actionable (specific commands to run)
- [ ] User knows next steps based on their choice
</success_criteria>
