---
name: gsd:discuss-phase
description: Gather phase context through adaptive questioning before planning
argument-hint: "<phase>"
allowed-tools: [Read, Write, Bash, Glob, Grep, AskUserQuestion]
---

<objective>
Extract implementation decisions that downstream agents need — researcher and planner will use CONTEXT.md to know what to investigate and what choices are locked.

**How it works:**
1. Analyze the phase to identify gray areas (UI, UX, behavior, etc.)
2. Present gray areas — user selects which to discuss
3. Deep-dive each selected area until satisfied
4. Create CONTEXT.md with decisions that guide research and planning

**Output:** `{phase}-CONTEXT.md` — decisions clear enough that downstream agents can act without asking the user again
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/discuss-phase.md
@~/.claude/get-shit-done/templates/context.md
</execution_context>

<context>
Phase number: $ARGUMENTS (required)

**Load project state:**
@.planning/STATE.md

**Load roadmap:**
@.planning/ROADMAP.md
</context>

<process>

## 0. Check Enhancements

```bash
DECISION_LEDGER=$(node ~/.claude/hooks/gsd-config.js get enhancements.decision_ledger --default false --format raw 2>/dev/null)
```

**If `decision_ledger` is `true`:** Use Enhanced Flow (Decision Ledger mode)
**Otherwise:** Use Standard Flow (gray areas mode)

---

## Standard Flow (decision_ledger: false or not set)

1. Validate phase number (error if missing or not in roadmap)
2. Check if CONTEXT.md exists (offer update/view/skip if yes)
3. **Analyze phase** — Identify domain and generate phase-specific gray areas
4. **Present gray areas** — Multi-select: which to discuss? (NO skip option)
5. **Deep-dive each area** — 4 questions per area, then offer more/next
6. **Write CONTEXT.md** — Sections match areas discussed
7. Offer next steps (research or plan)

---

## Enhanced Flow (decision_ledger: true)

### E1. Validate and Load Phase

Same as standard: validate phase number, check existing CONTEXT.md

### E2. Initialize Decision Ledger (File-backed)

Create a Decision Ledger markdown file in the phase directory. This file is the source of truth (not “in-memory” notes), so the user can review it later and confirm everything discussed was actually implemented.

**Find or create phase directory + ledger path:**

```bash
PHASE_ARG="$ARGUMENTS"

# Normalize phase number (8 → 08, preserve decimals like 2.1 → 02.1)
if echo "$PHASE_ARG" | grep -Eq '^[0-9]+$'; then
  PHASE=$(printf "%02d" "$PHASE_ARG")
elif echo "$PHASE_ARG" | grep -Eq '^[0-9]+\.[0-9]+$'; then
  PHASE=$(printf "%02d.%s" "${PHASE_ARG%.*}" "${PHASE_ARG#*.}")
else
  PHASE="$PHASE_ARG"
fi

PHASE_DIR=$(ls -d .planning/phases/${PHASE}-* 2>/dev/null | head -1)
if [ -z "$PHASE_DIR" ]; then
  PHASE_NAME=$(grep "Phase ${PHASE}:" .planning/ROADMAP.md | sed 's/.*Phase [0-9.]*: //' | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
  mkdir -p ".planning/phases/${PHASE}-${PHASE_NAME}"
  PHASE_DIR=".planning/phases/${PHASE}-${PHASE_NAME}"
fi

LEDGER_FILE="${PHASE_DIR}/${PHASE}-DECISION-LEDGER.md"
CONTEXT_FILE="${PHASE_DIR}/${PHASE}-CONTEXT.md"
```

**If `LEDGER_FILE` exists:** reuse it (append/update). If user wants a clean slate, overwrite it.

Initialize (or reset) ledger file:

```markdown
# Phase {PHASE}: {Name} — Decision Ledger

**Status:** Draft
**Created:** {date}

This file records decisions verbatim during `/gsd:discuss-phase`.
Use it later as a checklist to confirm the implementation matches what was agreed.

## Decisions

| # | Area | Decision | Verbatim User Statement | Round |
|---|------|----------|------------------------|-------|
```

**Rules:**
- Capture exact wording, not paraphrased summaries
- Include context that led to decision
- Record which round each decision was made
- Keep the file updated after every round (append new rows, don’t wait until the end)

### E3. Analyze Phase for Discussion Areas

Analyze the phase goal and identify:

1. **Terminology & Concepts** — Core nouns that need definition
   - What terms might mean different things?
   - What conceptual model underpins this feature?
   - Any renames or migrations from existing terms?

2. **User Experience** — How it should look and feel
   - What's the ideal flow?
   - What should users see at each step?
   - What's the "aha moment"?

3. **Entry Points & Creation** — Where users start
   - Single entry or multiple paths?
   - What creation options exist? (manual, curated, generate, AI)
   - What's gated vs always available?

4. **Behaviors & Edge Cases** — What happens when
   - Happy path flow
   - Error handling
   - Offline/interrupted/cancelled scenarios

5. **Scope Boundaries** — What's in and out
   - What might seem related but isn't part of this?
   - What's explicitly deferred?

### E4. Interview Rounds

For each discussion area:

**Ask 2-4 questions** using AskUserQuestion, probing:
- Interpretations and meanings
- Specific examples
- Boundaries and edge cases
- Priorities if tradeoffs needed

**After each round:**
1. Summarize "What I heard" in 5-10 bullets
2. **Update `LEDGER_FILE`** with new decisions (verbatim, append table rows)
3. Ask: "Anything missing or wrong before we continue?"

**Continue until you can answer:**
- [ ] I can describe the complete user journey
- [ ] Core nouns are defined (Terminology section complete)
- [ ] All entry points enumerated
- [ ] Scope boundaries explicit (in AND out)
- [ ] No ambiguous words remain

### E5. Decision Ledger Sign-off

**REQUIRED before writing CONTEXT.md:**

Present the complete Decision Ledger (from `LEDGER_FILE`):

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 DECISION LEDGER REVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{N} decisions captured:

| # | Decision | Your Words |
|---|----------|------------|
| 1 | [decision] | "[exact quote]" |
| 2 | [decision] | "[exact quote]" |
...

Is this complete and accurate?
```

Use AskUserQuestion:
- header: "Ledger"
- question: "Decision Ledger complete and accurate?"
- options:
  - "Approved" — Proceed to write CONTEXT.md
  - "Missing something" — Add more decisions
  - "Needs correction" — Fix incorrect entries

Loop until "Approved".

When approved:
- Update `LEDGER_FILE` status to **Approved**
- Keep the table intact (do not rewrite decisions into prose)

### E6. Write Enhanced CONTEXT.md

Write `CONTEXT_FILE` as the planning-friendly summary, and link to the full ledger file for traceability.

```markdown
# Phase {X}: {Name} — Context

## Terminology & Concepts

### Term Mappings
| Old Term | New Term | Meaning |
|----------|----------|---------|
| ... | ... | ... |

### Definitions
- **{Noun}:** {plain language definition}
- **{Noun}:** {plain language definition}

### Relationship Model
- {Thing} contains {Things}
- {Thing} rotates through {Things}

## Entry Points

### Primary Entry
{Where users start this flow}

### Creation Options Matrix
| Type | Manual | Curated | Generate | AI-Gated |
|------|--------|---------|----------|----------|
| {type} | Yes/No | Yes/No | Yes/No | Yes/No |

## Decision Ledger

See: `{phase}-DECISION-LEDGER.md` (approved verbatim record)

## Decisions

### Locked
{Decisions from ledger that are final}

### Claude's Discretion
{Areas Claude can decide during implementation}

## Behaviors

### Happy Path
1. User does X
2. They see Y
3. Result is Z

### Edge Cases
- If {condition}: {behavior}

## Scope

### In Scope
- {explicit inclusions}

### Out of Scope
- {explicit exclusions with reasoning}

### Deferred Ideas
- {captured for future phases}
```

### E6.5. Commit Context + Ledger (Recommended)

Commit both files so they can be referenced later during planning, execution, and verification:

```bash
git add "$CONTEXT_FILE" "$LEDGER_FILE"
git commit -m "$(cat <<'EOF'
docs(${PHASE}): capture phase context + decision ledger

Phase ${PHASE}: decisions recorded and approved
EOF
)"
```

### E7. Offer Next Steps

Same as standard flow: offer research or plan

**CRITICAL: Scope guardrail**
- Phase boundary from ROADMAP.md is FIXED
- Discussion clarifies HOW to implement, not WHETHER to add more
- If user suggests new capabilities: "That's its own phase. I'll note it for later."
- Capture deferred ideas — don't lose them, don't act on them

**Domain-aware gray areas:**
Gray areas depend on what's being built. Analyze the phase goal:
- Something users SEE → layout, density, interactions, states
- Something users CALL → responses, errors, auth, versioning
- Something users RUN → output format, flags, modes, error handling
- Something users READ → structure, tone, depth, flow
- Something being ORGANIZED → criteria, grouping, naming, exceptions

Generate 3-4 **phase-specific** gray areas, not generic categories.

**Probing depth:**
- Ask 4 questions per area before checking
- "More questions about [area], or move to next?"
- If more → ask 4 more, check again
- After all areas → "Ready to create context?"

**Do NOT ask about (Claude handles these):**
- Technical implementation
- Architecture choices
- Performance concerns
- Scope expansion
</process>

<success_criteria>

**Standard Flow:**
- Gray areas identified through intelligent analysis
- User chose which areas to discuss
- Each selected area explored until satisfied
- Scope creep redirected to deferred ideas
- CONTEXT.md captures decisions, not vague vision
- User knows next steps

**Enhanced Flow (decision_ledger: true):**
- Decision Ledger file created at start (`{phase}-DECISION-LEDGER.md`)
- All decisions captured verbatim (not summarized)
- Terminology & Concepts section completed
- Entry Points enumerated with creation matrix
- Decision Ledger sign-off obtained before writing (ledger marked Approved)
- CONTEXT.md links to the approved ledger (traceable record for post-implementation review)
- User knows next steps

</success_criteria>
