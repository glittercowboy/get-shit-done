# gsd-debugger.md — Enhanced Reference (Code-Verified)

## Metadata
| Attribute | Value |
|-----------|-------|
| **Type** | Agent |
| **Location** | `agents/gsd-debugger.md` |
| **Size** | 1184 lines |
| **Verified Against** | `agents/gsd-debugger.md`, `commands/gsd/debug.md`, `get-shit-done/workflows/diagnose-issues.md` |

---

## Purpose

Investigates bugs using systematic scientific method, manages persistent debug sessions, and handles checkpoints when user input is needed. Operates as investigator (user is reporter) — gathers symptoms, forms falsifiable hypotheses, tests one at a time, maintains debug file state that survives context resets.

---

## Critical Behaviors

| Constraint | Rule | Source Section |
|------------|------|----------------|
| Create debug file IMMEDIATELY | `.planning/debug/{slug}.md` before any investigation | `<debug_file_protocol>` |
| Update file BEFORE action | If context resets mid-action, file shows what was happening | `<debug_file_protocol>` |
| ONE hypothesis at a time | Multiple changes = no idea what mattered | `<investigation_techniques>` |
| FALSIFIABLE hypotheses | "Component remounts on route change" not "Something wrong" | `<investigation_techniques>` |
| NEVER ask user about cause | Ask about experience (what they saw), investigate cause yourself | `<philosophy>` |
| APPEND to Eliminated | Prevents re-investigating disproven hypotheses after context reset | `<debug_file_protocol>` |

---

## Modes/Variants

| Mode | Trigger | Behavior |
|------|---------|----------|
| **find_and_fix** (default) | No flags | Find root cause, fix, verify, archive session |
| **find_root_cause_only** | `goal: find_root_cause_only` | Diagnose only, skip fix_and_verify, return diagnosis |
| **symptoms_prefilled** | `symptoms_prefilled: true` | Skip symptom gathering, start at investigation loop with status "investigating" |

---

## Meta-Debugging: Your Own Code (CRITICAL)

**Source:** `<philosophy>` lines ~60-100

When debugging code you wrote, you're fighting your own mental model.

**Why this is harder:**
- You made the design decisions — they feel obviously correct
- You remember intent, not what you actually implemented
- Familiarity breeds blindness to bugs

**The discipline:**
1. **Treat your code as foreign** — Read it as if someone else wrote it
2. **Question your design decisions** — Implementation decisions are hypotheses, not facts
3. **Admit your mental model might be wrong** — The code's behavior is truth; your model is a guess
4. **Prioritize code you touched** — If you modified 100 lines and something breaks, those are prime suspects

**The hardest admission:** "I implemented this wrong." Not "requirements were unclear" — YOU made an error.

---

## Cognitive Biases to Avoid (CRITICAL)

**Source:** `<philosophy>` Cognitive Biases table

| Bias | Trap | Antidote |
|------|------|----------|
| **Confirmation** | Only look for evidence supporting hypothesis | Actively seek disconfirming evidence. "What would prove me wrong?" |
| **Anchoring** | First hypothesis becomes fixation | Generate 3+ independent hypotheses before investigating any |
| **Availability** | "I saw this before" dominates thinking | Treat each bug as novel until evidence suggests otherwise |
| **Sunk cost** | Already invested in wrong investigation path | Every 30 min: "If I started fresh, is this still the path I'd take?" |

---

## Research vs Reasoning Decision Tree

**Source:** `<research_vs_reasoning>` lines ~400-500

```
Is this an error message I don't recognize?
├─ YES → Web search the error message
└─ NO ↓

Is this library/framework behavior I don't understand?
├─ YES → Check docs (Context7 or official docs)
└─ NO ↓

Is this code I/my team wrote?
├─ YES → Reason through it (logging, tracing, hypothesis testing)
└─ NO ↓

Is this a platform/environment difference?
├─ YES → Research platform-specific behavior
└─ NO ↓

Can I observe the behavior directly?
├─ YES → Add observability and reason through it
└─ NO → Research the domain/concept first, then reason
```

**Red Flags:**
- Researching too much: Read 20 blog posts but haven't looked at your code
- Reasoning too much: Staring at code for an hour without progress
- Doing it right: Alternate between research and reasoning

---

## Debug File Protocol

**Source:** `<debug_file_protocol>`

### File Location
```
DEBUG_DIR=.planning/debug
DEBUG_RESOLVED_DIR=.planning/debug/resolved
```

### File Structure
```markdown
---
status: gathering | investigating | fixing | verifying | resolved
trigger: "[verbatim user input]"
created: [ISO timestamp]
updated: [ISO timestamp]
---

## Current Focus      ← OVERWRITE before every action
hypothesis: [current theory]
test: [how testing it]
expecting: [what result means]
next_action: [immediate next step]

## Symptoms           ← IMMUTABLE after gathering
expected: [what should happen]
actual: [what actually happens]
errors: [error messages]
reproduction: [how to trigger]
started: [when broke / always broken]

## Eliminated         ← APPEND only (prevents re-investigation)
- hypothesis: [theory that was wrong]
  evidence: [what disproved it]
  timestamp: [when eliminated]

## Evidence           ← APPEND only (facts discovered)
- timestamp: [when found]
  checked: [what examined]
  found: [what observed]
  implication: [what this means]

## Resolution         ← OVERWRITE as understanding evolves
root_cause: [empty until found]
fix: [empty until applied]
verification: [empty until verified]
files_changed: []
```

### Update Rules

| Section | Rule | When |
|---------|------|------|
| Frontmatter.status | OVERWRITE | Each phase transition |
| Frontmatter.updated | OVERWRITE | Every file update |
| Current Focus | OVERWRITE | Before every action |
| Symptoms | IMMUTABLE | After gathering complete |
| Eliminated | APPEND | When hypothesis disproved |
| Evidence | APPEND | After each finding |
| Resolution | OVERWRITE | As understanding evolves |

---

## Execution Flow

**Source:** `<execution_flow>`

```
1. check_active_session
   ├── ls .planning/debug/*.md 2>/dev/null | grep -v resolved
   ├── If sessions exist AND no $ARGUMENTS → list sessions
   ├── If sessions exist AND $ARGUMENTS → new session
   └── If no sessions → prompt for issue description

2. create_debug_file
   ├── Generate slug (lowercase, hyphens, max 30 chars)
   ├── mkdir -p .planning/debug
   ├── Create file with status: gathering (or "investigating" if symptoms_prefilled)
   └── Proceed to symptom_gathering

3. symptom_gathering (SKIP if symptoms_prefilled: true)
   ├── Expected behavior → Update Symptoms.expected
   ├── Actual behavior → Update Symptoms.actual
   ├── Error messages → Update Symptoms.errors
   ├── When it started → Update Symptoms.started
   ├── Reproduction steps → Update Symptoms.reproduction
   └── Update status to "investigating"

4. investigation_loop
   ├── Phase 1: Initial evidence gathering
   │   ├── Update Current Focus
   │   ├── If errors exist, search codebase
   │   ├── Read relevant files COMPLETELY
   │   └── APPEND to Evidence
   ├── Phase 2: Form hypothesis
   │   └── Update Current Focus with SPECIFIC, FALSIFIABLE hypothesis
   ├── Phase 3: Test hypothesis
   │   └── Execute ONE test, append to Evidence
   └── Phase 4: Evaluate
       ├── CONFIRMED → proceed to fix_and_verify or return_diagnosis
       └── ELIMINATED → Append to Eliminated, return to Phase 2

5. fix_and_verify (goal: find_and_fix only)
   ├── Update status to "fixing"
   ├── Implement MINIMAL fix
   ├── Update Resolution
   ├── Update status to "verifying"
   ├── Verify fix against original symptoms
   ├── If verification fails → status "investigating" and return to investigation_loop
   └── If verification passes → proceed to archive_session

6. archive_session
   ├── Update status to "resolved"
   ├── Move to .planning/debug/resolved/
   └── Commit with root cause + debug session path in message
```

---

## Investigation Techniques

**Source:** `<investigation_techniques>`

| Situation | Technique | When to Use |
|-----------|-----------|-------------|
| Large codebase, many files | Binary search / divide and conquer | Unknown failure location |
| Confused about what's happening | Rubber duck, Observability first | Complex flow |
| Complex system, many interactions | Minimal reproduction | Hard to isolate |
| Know desired output | Working backwards | Clear end state |
| Used to work, now doesn't | Differential debugging, Git bisect | Recent regression |
| Many possible causes | Comment out everything | Many interactions |

---

## Checkpoint Types

| Type | When | What User Does |
|------|------|----------------|
| **human-verify** | Need confirmation you can't observe | User tests and reports back |
| **human-action** | Need user action (auth, physical) | User performs action |
| **decision** | Need user to choose investigation direction | User selects option |

---

## Interactions

| Category | Details |
|----------|---------|
| **Reads** | Codebase files, test output, error logs |
| **Writes** | `.planning/debug/{slug}.md` (moves to `.planning/debug/resolved/` after verified fix), code fixes |
| **Spawned By** | `/gsd:debug` command |
| **Consumed By** | User (debug session state persists across context resets) |

---

## Structured Returns

| Return Type | Mode | Content |
|-------------|------|---------|
| **ROOT CAUSE FOUND** | find_root_cause_only | Root cause, evidence summary, files involved, suggested fix direction |
| **DEBUG COMPLETE** | find_and_fix | Root cause, fix applied, verification, files changed, commit hash |
| **INVESTIGATION INCONCLUSIVE** | Any | What was checked, hypotheses eliminated, remaining possibilities |
| **CHECKPOINT REACHED** | Any | Type, progress, investigation state, what's needed from user |

---

## Anti-Patterns

| Anti-Pattern | Why Bad | Correct Approach |
|--------------|---------|------------------|
| Ask user about cause | User doesn't know cause | Ask about experience, investigate cause yourself |
| Change multiple things | Can't isolate what worked | Test ONE hypothesis at a time |
| Skip file creation | State lost on context reset | Create debug file IMMEDIATELY |
| Overwrite Eliminated section | Re-investigate disproven theories | APPEND only |
| Vague hypotheses | Unfalsifiable | Specific, falsifiable: "X causes Y when Z" |
| Jump to fix before confirming | Wrong fix wastes time | Confirm root cause with evidence first |

---

## Change Impact Analysis

### If gsd-debugger Changes:

**Upstream Impact:**
- `debug` command — May need to update spawning context

**Downstream Impact:**
- Debug files — Schema changes break file parsing on resume
- User interaction — Checkpoint format changes break orchestrator handling

**Breaking Changes to Watch:**
- Frontmatter schema (status values, timestamp format)
- File paths (debug dir location)
- Checkpoint return format
- Resolution section structure

---

## Section Index

| Section | Lines (approx) | Purpose |
|---------|----------------|---------|
| `<role>` | 1-30 | Identity, spawners, core responsibilities |
| `<philosophy>` | 31-120 | User=reporter, meta-debugging, cognitive biases |
| `<research_vs_reasoning>` | 121-200 | Decision tree for when to research vs reason |
| `<debug_file_protocol>` | 201-300 | File structure, update rules, resume behavior |
| `<execution_flow>` | 301-500 | Step-by-step execution with decision points |
| `<investigation_techniques>` | 501-700 | All 7+ debugging techniques with examples |
| `<checkpoint_behavior>` | 701-800 | 3 checkpoint types with templates |
| `<structured_returns>` | 801-900 | All return message formats |
| `<modes>` | 901-950 | Mode flags and behaviors |
| `<success_criteria>` | 951-990 | Completion checklist |

---

## Quick Reference

```
WHAT:     Scientific debugging with persistent state
MODES:    find_and_fix (default), find_root_cause_only, symptoms_prefilled
OUTPUT:   .planning/debug/{slug}.md (moves to resolved/ only after verified fix)

CORE RULES:
• Create debug file IMMEDIATELY, update BEFORE actions
• Test ONE hypothesis at a time (falsifiable, specific)
• APPEND to Eliminated (never re-investigate disproven theories)
• User = reporter (what they saw), You = investigator (find cause)
• Meta-debugging: treat your own code as foreign

SPAWNED BY: /gsd:debug command
CONSUMED BY: User (session state persists across context resets)
```
