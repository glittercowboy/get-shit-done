---
name: gsd:audit-plan
description: Audit plan quality before execution
argument-hint: "[path-to-plan.md | phase-number]"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

<objective>
Audit plan(s) for quality issues that could cause execution failures.

This is NOT just a linter - it's a comprehensive review that evaluates whether the plan will actually work when executed by gsd-executor.

**What it checks:**
1. Structural completeness (required fields, valid frontmatter)
2. Action specificity (no vague patterns)
3. Verification executability
4. Project idiom compliance (references existing patterns)
5. Dependency correctness (no circular deps, valid waves)
6. Scope reasonableness (task count, context budget)

**Output:** Report with issues grouped by severity + before/after suggestions.
</objective>

<execution_context>
@~/.claude/get-shit-done/references/ui-brand.md
</execution_context>

<context>
$ARGUMENTS — Path to PLAN.md file OR phase number

If path provided: audit that specific plan
If phase number: audit all plans in that phase
If nothing: audit most recent unexecuted plan

@.planning/STATE.md
@.planning/ROADMAP.md
</context>

<process>

## 1. Find Plan(s) to Audit

**If path provided:**
```bash
[ -f "$ARGUMENTS" ] && echo "Found: $ARGUMENTS"
```

**If plan ID provided (e.g., `03-01` or `02.1-03`):**
```bash
# Resolve plan ID to a PLAN.md path
if echo "$ARGUMENTS" | grep -Eq '^[0-9]+(\.[0-9]+)?-[0-9]+$'; then
  PLAN_ID="$ARGUMENTS"
  ls .planning/phases/*/"${PLAN_ID}"-PLAN.md 2>/dev/null
fi
```

**If phase number provided:**
```bash
# Normalize phase number (8 → 08, preserve decimals like 2.1 → 02.1)
if echo "$ARGUMENTS" | grep -Eq '^[0-9]+$'; then
  PHASE=$(printf "%02d" "$ARGUMENTS")
elif echo "$ARGUMENTS" | grep -Eq '^[0-9]+\.[0-9]+$'; then
  PHASE=$(printf "%02d.%s" "${ARGUMENTS%.*}" "${ARGUMENTS#*.}")
else
  PHASE="$ARGUMENTS"
fi
ls .planning/phases/${PHASE}-*/*-PLAN.md 2>/dev/null
```

**If nothing provided:**
```bash
# Find most recent plan without a SUMMARY
for plan in $(ls -t .planning/phases/*/*-PLAN.md 2>/dev/null); do
  summary="${plan%-PLAN.md}-SUMMARY.md"
  [ ! -f "$summary" ] && echo "$plan" && break
done
```

Build list of plan files to audit.

## 2. Structural Checks

For each plan file:

### 2a. Frontmatter Validation

Check frontmatter exists and includes required fields:
```bash
# Show frontmatter for inspection (first YAML block)
awk 'NR==1 && $0!="---"{exit} NR>1 && $0=="---"{exit} {print}' "$PLAN_FILE" | sed -n '1,120p'

# Quick required-field presence check
grep -nE "^(phase|plan|type|wave|depends_on|files_modified|autonomous):|^must_haves:" "$PLAN_FILE"
```

**Required fields:**
- `phase:` — phase directory slug (e.g., `01-foundation`)
- `plan:` — plan number within phase (e.g., `01`)
- `type:` — typically `execute` (or `tdd`)
- `wave:` — integer execution wave (1, 2, 3...)
- `depends_on:` — list/array or empty
- `files_modified:` — list/array of file paths
- `autonomous:` — true/false
- `must_haves:` — goal-backward verification block (truths/artifacts/key_links)

**Issues:**
- Missing field → BLOCKER
- Invalid value → WARNING

### 2b. Task Structure Validation

Each `<task type="auto">` must have:
```xml
<task type="auto">
  <name>...</name>
  <files>...</files>
  <action>...</action>
  <verify>...</verify>
  <done>...</done>
</task>
```

Search for incomplete tasks:
```bash
# Count tasks vs required tags (auto tasks)
TASK_COUNT=$(grep -c '<task ' "$PLAN_FILE")
TASK_END_COUNT=$(grep -c '</task>' "$PLAN_FILE")
NAME_COUNT=$(grep -c '<name>' "$PLAN_FILE")
FILES_COUNT=$(grep -c '<files>' "$PLAN_FILE")
ACTION_COUNT=$(grep -c '<action>' "$PLAN_FILE")
VERIFY_COUNT=$(grep -c '<verify>' "$PLAN_FILE")
DONE_COUNT=$(grep -c '<done>' "$PLAN_FILE")

echo "TASKS: $TASK_COUNT (ends: $TASK_END_COUNT)"
echo "TAGS:  name=$NAME_COUNT files=$FILES_COUNT action=$ACTION_COUNT verify=$VERIFY_COUNT done=$DONE_COUNT"

# Per-task validation for auto tasks (prints missing tags with line numbers)
awk '
  function reset_task() { in_task=0; task_type=""; name=files=action=verify=done=0; task_start_line=0 }
  BEGIN { reset_task(); task_index=0 }
  /<task[[:space:]][^>]*type="/ {
    task_index++;
    in_task=1;
    task_start_line=NR;
    if (match($0, /type="[^"]+"/)) { task_type=substr($0, RSTART+6, RLENGTH-7) } else { task_type="" }
    name=files=action=verify=done=0;
  }
  in_task && /<name>/   { name=1 }
  in_task && /<files>/  { files=1 }
  in_task && /<action>/ { action=1 }
  in_task && /<verify>/ { verify=1 }
  in_task && /<done>/   { done=1 }
  /<\/task>/ && in_task {
    if (task_type=="auto" || task_type=="tdd" || task_type=="") {
      if (!name || !files || !action || !verify || !done) {
        printf("MISSING: task %d (%s) at line %d: %s%s%s%s%s\n",
          task_index, task_type, task_start_line,
          (!name ? " <name>" : ""),
          (!files ? " <files>" : ""),
          (!action ? " <action>" : ""),
          (!verify ? " <verify>" : ""),
          (!done ? " <done>" : "")
        );
      }
    }
    reset_task();
  }
' "$PLAN_FILE"
```

**If `<task>` and `</task>` counts don't match:** → BLOCKER (malformed task blocks)
**If any `MISSING:` lines printed for `type="auto"`:** → BLOCKER

### 2c. must_haves Section

```bash
# must_haves is YAML frontmatter (not an XML tag)
grep -nE "^must_haves:|^[[:space:]]+truths:|^[[:space:]]+artifacts:|^[[:space:]]+key_links:" "$PLAN_FILE"
```

**If `must_haves` missing entirely:** → BLOCKER
**If `truths/artifacts/key_links` exist but are empty:** → WARNING (verification will be weak)

## 3. Action Specificity Checks

Scan for vague patterns that cause executor confusion:

**Vague action patterns (WARNING):**
```bash
grep -iE "set up|handle|proper|appropriate|as needed|accordingly|similar to|like the other|best practices" "$PLAN_FILE"
```

| Vague Pattern | Problem | Suggest |
|---------------|---------|---------|
| "Set up the infrastructure" | What infrastructure? | Specify exact files/components |
| "Handle edge cases" | Which cases? | List specific cases |
| "Add proper error handling" | What errors? How handled? | Name errors and handlers |
| "Use best practices" | Which practices? | Reference specific pattern/file |
| "Similar to the other X" | Which X? | Reference exact file path |

**For each vague pattern found:**
- Extract context (surrounding lines)
- Suggest specific replacement from codebase

## 4. Verification Executability

For each `<verify>` block:

**Check if command is executable:**
```bash
# Heuristic: show verify lines and flag obviously non-executable phrases
awk '
  /<verify>/ { in_verify=1; next }
  /<\/verify>/ { in_verify=0 }
  in_verify { print NR ": " $0 }
' "$PLAN_FILE" | head -n 80

grep -nEi "<verify>[^<]*(tests pass|it works|works correctly|build succeeds|looks good|should work)[^<]*</verify>" "$PLAN_FILE"
```

**Issues:**
- No executable command → WARNING ("Tests pass" is not executable)
- Command references non-existent file → WARNING
- Command has syntax errors → WARNING

**Verify patterns that need fixing:**
| Bad | Good |
|-----|------|
| "Tests pass" | `npm test -- --grep "feature"` |
| "It works correctly" | `curl localhost:3000/api/health` |
| "Build succeeds" | `npm run build 2>&1 | tail -5` |

## 5. Project Idiom Checks

**Only if codebase docs exist** (`.planning/codebase/` directory):

### 5a. Pattern References

For tasks creating new code, check if they reference existing patterns:

```bash
# Find "Create" or "Add" actions
grep -B2 -A10 '<action>' "$PLAN_FILE" | grep -iE "create|add|implement|build"
```

**For each creation task:**
- Does action mention existing file to follow? ("like src/services/UserService.ts")
- Does action specify conventions? ("use @Observable", "follow Theme colors")

**If no pattern reference:** → INFO
Suggest: "Reference existing pattern: [find similar file]"

### 5b. Technology Choices

Check for explicit technology decisions:

```bash
grep -iE "use|install|add|import" "$PLAN_FILE" | grep -v "node_modules"
```

**If ambiguous:** (e.g., "add authentication" without specifying library) → WARNING

## 6. Dependency Checks

### 6a. Circular Dependencies

```bash
# Extract depends_on from each plan
for plan in $PLANS; do
  name=$(basename "$plan" -PLAN.md)
  deps=$(grep -nE "^depends_on:" "$plan" | head -1 | sed 's/depends_on:[[:space:]]*//')
  echo "$name: $deps"
done
```

Build dependency graph and check for cycles → BLOCKER if found

### 6b. Wave Assignment

```bash
# Verify wave assignments match dependencies
for plan in $PLANS; do
  wave=$(grep "wave:" "$plan" | awk '{print $2}')
  deps=$(grep -nE "^depends_on:" "$plan" | head -1 | sed 's/depends_on:[[:space:]]*//')
  # Check that deps have lower wave numbers
done
```

**If dependency has higher wave:** → BLOCKER (will execute out of order)

### 6c. File Conflicts

```bash
# Check for same file modified by parallel tasks
grep -hE "^files_modified:" $PLANS | sort | uniq -d
```

**If same file in multiple parallel plans:** → WARNING (potential conflicts)

## 7. Scope Checks

### 7a. Task Count

```bash
TASK_COUNT=$(grep -c '<task ' "$PLAN_FILE")
```

| Count | Status |
|-------|--------|
| 1-3 | OK |
| 4 | WARNING ("Consider splitting") |
| 5+ | BLOCKER ("Too many tasks - split into multiple plans") |

### 7b. Context Budget

Estimate context usage based on:
- Number of files in `<files>` sections
- Size of referenced context files
- Complexity of actions

**If estimated > 50% context:** → WARNING ("May run out of context")

## 8. Present Findings

Output report in this format:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► PLAN AUDIT REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Plans audited:** {N}

## Summary

| Category | Issues | Status |
|----------|--------|--------|
| Structural | {n} | ✓/⚠/✗ |
| Specificity | {n} | ✓/⚠/✗ |
| Verification | {n} | ✓/⚠/✗ |
| Dependencies | {n} | ✓/⚠/✗ |
| Scope | {n} | ✓/⚠/✗ |

**Overall:** {READY | NEEDS FIXES | BLOCKED}

---

## Issues Found

### ✗ BLOCKER: {issue title}

**Location:** {plan file}:{line number}
**Problem:** {what's wrong}

**Current:**
```xml
{current content}
```

**Suggested fix:**
```xml
{improved content}
```

**Why:** {explanation}

---

### ⚠ WARNING: {issue title}

**Location:** {plan file}:{line number}
**Problem:** {what's wrong}
**Suggestion:** {how to fix}

---

### ℹ INFO: {issue title}

**Suggestion:** {optional improvement}

---

## Context Recommendations

Consider adding these files to plan context:
- `@src/services/ExampleService.ts` — Similar service pattern
- `@src/tests/example.test.ts` — Test pattern to follow

---

## Next Steps

{If BLOCKED:}
Fix blockers before execution. Run audit again after fixes.

{If NEEDS FIXES:}
Warnings won't prevent execution but may cause issues.
- Fix warnings, OR
- Proceed with `/gsd:execute-phase` (warnings documented)

{If READY:}
Plan is ready for execution.
/gsd:execute-phase {phase}
```

</process>

<offer_next>
Based on audit result:

**If READY:**
```
Plan audit passed. Ready for execution.

/gsd:execute-phase {phase}
```

**If NEEDS FIXES:**
```
Plan has warnings. Options:

1. Fix warnings first (recommended)
2. Execute anyway — /gsd:execute-phase {phase}
3. Re-audit after fixes — /gsd:audit-plan {path}
```

**If BLOCKED:**
```
Plan has blockers that will cause execution failures.

Fix blockers first, then re-run:
/gsd:audit-plan {path}
```
</offer_next>

<success_criteria>
- [ ] Plan(s) found based on arguments
- [ ] All structural checks completed
- [ ] Vague patterns identified with suggestions
- [ ] Verification commands validated
- [ ] Dependencies checked for cycles
- [ ] Scope assessed for reasonableness
- [ ] Report presented with severity levels
- [ ] Specific before/after suggestions provided
- [ ] Next steps clear based on audit result
</success_criteria>
