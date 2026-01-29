---
name: gsd:redefine-scope
description: Update phase scope when requirements change mid-project
argument-hint: "[phase]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - AskUserQuestion
---

<objective>
Handle scope changes gracefully without breaking directory structure or losing context.

When phase scope changes (e.g., "Pipeline Progress UI" → "Testing Infrastructure + Bug Fixes"),
this workflow updates all relevant files while preserving history.
</objective>

<trigger>
Use this workflow when:
- Phase scope has changed from original roadmap
- .continue-here.md contains `<remaining_work>` that differs from ROADMAP
- User explicitly says "scope changed", "redefine phase", "update scope"
- Previous phase revealed new requirements for next phase
</trigger>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
</context>

<process>

## 1. Identify Phase and Current Scope

```bash
# Get phase from argument or detect from STATE.md
PHASE="${ARGUMENTS:-$(grep "^current_phase:" .planning/STATE.md | sed 's/current_phase: //')}"
PHASE_DIR=".planning/phases/${PHASE}"

# Check if SCOPE.md exists
if [ -f "${PHASE_DIR}/SCOPE.md" ]; then
  echo "Current SCOPE.md:"
  cat "${PHASE_DIR}/SCOPE.md"
else
  echo "No SCOPE.md found - will create one"
fi

# Check for .continue-here with scope context
CONTINUE_FILE=$(ls .planning/phases/*/.continue-here*.md 2>/dev/null | head -1)
if [ -n "$CONTINUE_FILE" ]; then
  echo ""
  echo "Found checkpoint with context:"
  grep -A20 "<remaining_work>" "$CONTINUE_FILE" | head -25
fi
```

## 2. Gather New Scope from User

**Ask user to define new scope:**

Use AskUserQuestion or read from .continue-here.md `<remaining_work>` section.

Questions to clarify:
1. What is the NEW goal for this phase?
2. What tasks are now in scope?
3. What was removed from scope (if anything)?
4. What triggered this scope change?

## 3. Update SCOPE.md

```bash
# Increment scope version
CURRENT_VERSION=$(grep "Scope Version:" "${PHASE_DIR}/SCOPE.md" | grep -oE '[0-9]+' || echo "0")
NEW_VERSION=$((CURRENT_VERSION + 1))
```

**Write updated SCOPE.md:**

```markdown
# Phase ${PHASE}: [New Phase Name]

**Goal:** [New goal]
**Scope Version:** ${NEW_VERSION}
**Created:** [original date]
**Last Modified:** $(date +%Y-%m-%d)

## Current Scope

[New scope details from user]

## Scope History

| Version | Date | Change |
|---------|------|--------|
| ${NEW_VERSION} | $(date +%Y-%m-%d) | [Change description] |
| ${CURRENT_VERSION} | [previous date] | [Previous scope] |
```

## 4. Update ROADMAP.md

Find the phase entry in ROADMAP.md and update:
- Phase name (if changed)
- Goal description
- Add note about scope change

```markdown
| **-0.5.6 Testing Infrastructure + Remaining Fixes** | Fixture System + BUG-D/E/G/H + Unit Tests | - | Not Started | 4-6h |

> **Scope Change v2 (2026-01-28):** Originally "Pipeline Progress UI", redefined after Phase 5 verification revealed testing infrastructure priority.
```

## 5. Update STATE.md

Update both frontmatter and Session Continuity:

**Frontmatter:**
```yaml
scope_version: ${NEW_VERSION}
next_action: /gsd:plan-phase ${PHASE}
```

**Session Continuity:**
```markdown
Last session: [now]
Stopped at: Scope redefined for Phase ${PHASE}
Next step: /gsd:plan-phase ${PHASE}
```

## 6. Log Decision in PROJECT.md

Add to Key Decisions table:

```markdown
| Phase ${PHASE} | Scope redefined from "[old]" to "[new]" | [Trigger: e.g., "Phase 5 verification revealed bugs need testing infrastructure first"] | Pending |
```

## 7. Handle Obsolete Plans (if any)

```bash
# Check for existing plans that may be obsolete
ls "${PHASE_DIR}"/*-PLAN.md 2>/dev/null
```

**If plans exist:**
- Ask user: "Existing plans found. Should they be archived?"
- If yes: Move to `${PHASE_DIR}/archive/` with timestamp
- If no: Keep them (user may want to reuse parts)

## 8. Confirm Changes

```
✓ Scope redefined for Phase ${PHASE}

Changes made:
- SCOPE.md updated (v${CURRENT_VERSION} → v${NEW_VERSION})
- ROADMAP.md updated with new scope
- STATE.md updated with new next_action
- PROJECT.md decision logged

Old scope: [old scope summary]
New scope: [new scope summary]

Next: /gsd:plan-phase ${PHASE}
```

</process>

<success_criteria>
- [ ] SCOPE.md created/updated with version history
- [ ] ROADMAP.md reflects new scope
- [ ] STATE.md frontmatter updated
- [ ] Decision logged in PROJECT.md
- [ ] User knows to run /gsd:plan-phase next
</success_criteria>
