<trigger>
Use this workflow when:
- Starting a new session on an existing project
- User says "continue", "what's next", "where were we", "resume"
- Any planning operation when .planning/ already exists
- User returns after time away from project
</trigger>

<purpose>
Instantly restore full project context so "Where were we?" has an immediate, complete answer.
</purpose>

<required_reading>
@~/.claude/get-shit-done/references/continuation-format.md
@~/.claude/get-shit-done/references/feature-discussion-guard.md
</required_reading>

<process>

<step name="detect_existing_project">
Check if this is an existing project:

```bash
ls .planning/STATE.md 2>/dev/null && echo "Project exists"
ls .planning/ROADMAP.md 2>/dev/null && echo "Roadmap exists"
ls .planning/PROJECT.md 2>/dev/null && echo "Project file exists"
```

**If STATE.md exists:** Proceed to load_state
**If only ROADMAP.md/PROJECT.md exist:** Offer to reconstruct STATE.md
**If .planning/ doesn't exist:** This is a new project - route to /gsd:new-project
</step>

<step name="load_state">

Read and parse STATE.md, PROJECT.md, and REQUIREMENTS.md:

```bash
# CRITICAL: Check for corrupted STATE.md (multiple Session Continuity sections)
CONTINUITY_COUNT=$(grep -c "^## Session Continuity" .planning/STATE.md 2>/dev/null || echo "0")
if [ "$CONTINUITY_COUNT" -gt 1 ]; then
  echo "⚠️ WARNING: STATE.md is corrupted - found $CONTINUITY_COUNT Session Continuity sections!"
  echo "This causes resume-work to read stale data. Fixing automatically..."

  # Keep only the LAST Session Continuity section
  FIRST_LINE=$(grep -n "^## Session Continuity" .planning/STATE.md | head -1 | cut -d: -f1)
  LAST_LINE=$(grep -n "^## Session Continuity" .planning/STATE.md | tail -1 | cut -d: -f1)

  if [ "$FIRST_LINE" != "$LAST_LINE" ]; then
    # Delete from first occurrence to line before last occurrence
    BEFORE_LAST=$((LAST_LINE - 1))
    sed -i "${FIRST_LINE},${BEFORE_LAST}d" .planning/STATE.md
    echo "✓ Fixed: Removed duplicate Session Continuity sections"
  fi
fi

cat .planning/STATE.md
cat .planning/PROJECT.md
cat .planning/REQUIREMENTS.md 2>/dev/null
```

**From STATE.md extract:**

- **Project Reference**: Core value and current focus
- **Current Position**: Phase X of Y, Plan A of B, Status
- **Progress**: Visual progress bar
- **Recent Decisions**: Key decisions affecting current work
- **Pending Todos**: Ideas captured during sessions
- **Blockers/Concerns**: Issues carried forward
- **Session Continuity**: Where we left off, any resume files

**From PROJECT.md extract:**

- **What This Is**: Current accurate description
- **Requirements**: Validated, Active, Out of Scope
- **Key Decisions**: Full decision log with outcomes
- **Constraints**: Hard limits on implementation

**From REQUIREMENTS.md extract (if exists):**

- **Planned Features**: All features already scoped for future phases
- **Feature IDs**: Reference codes (e.g., PSY-01, AUTH-03) for tracking
- **Dependencies**: Which features depend on others

**Why this matters:** Before suggesting new features in conversation, you MUST check REQUIREMENTS.md to avoid proposing features that are already planned. This prevents duplicate work and maintains consistency with the established roadmap.

</step>

<step name="check_incomplete_work">
Look for incomplete work that needs attention:

```bash
# Check for continue-here files (mid-plan resumption)
ls .planning/phases/*/.continue-here*.md 2>/dev/null

# Check for plans without summaries (incomplete execution)
for plan in .planning/phases/*/*-PLAN.md; do
  summary="${plan/PLAN/SUMMARY}"
  [ ! -f "$summary" ] && echo "Incomplete: $plan"
done 2>/dev/null

# Check for interrupted agents
if [ -f .planning/current-agent-id.txt ] && [ -s .planning/current-agent-id.txt ]; then
  AGENT_ID=$(cat .planning/current-agent-id.txt | tr -d '\n')
  echo "Interrupted agent: $AGENT_ID"
fi

# CRITICAL: Check for UAT gaps (diagnosed status = BLOCKER!)
for uat in .planning/phases/*/*-UAT.md; do
  if [ -f "$uat" ]; then
    UAT_STATUS=$(grep "^status:" "$uat" 2>/dev/null | head -1 | cut -d: -f2 | tr -d ' ')
    if [ "$UAT_STATUS" = "diagnosed" ]; then
      echo "UAT-BLOCKER: $uat (status: diagnosed)"
      # Extract the gap details
      grep -A 5 "^## Gaps" "$uat" 2>/dev/null | head -10
    fi
  fi
done 2>/dev/null
```

**🔴 PRIORITY 1 - If UAT with status: diagnosed exists:**

- This is a **BLOCKER** - phase cannot proceed until fixed!
- Read the UAT file's "Gaps" section for specific issues
- Flag: "UAT gaps require fixing before proceeding"
- **Action:** Fix the diagnosed issues first, then re-verify

**If .continue-here file exists:**

- This is a mid-plan resumption point
- **CRITICAL: Read and display the file's `<next_action>` and `<blockers>` sections!**
- Flag: "Found mid-plan checkpoint"

**If PLAN without SUMMARY exists:**

- Execution was started but not completed
- Flag: "Found incomplete plan execution"

**If interrupted agent found:**

- Subagent was spawned but session ended before completion
- Read agent-history.json for task details
- Flag: "Found interrupted agent"
  </step>

<step name="present_status">
Present complete project status to user:

```
╔══════════════════════════════════════════════════════════════╗
║  PROJECT STATUS                                               ║
╠══════════════════════════════════════════════════════════════╣
║  Building: [one-liner from PROJECT.md "What This Is"]         ║
║                                                               ║
║  Phase: [X] of [Y] - [Phase name]                            ║
║  Plan:  [A] of [B] - [Status]                                ║
║  Progress: [██████░░░░] XX%                                  ║
║                                                               ║
║  Last activity: [date] - [what happened]                     ║
╚══════════════════════════════════════════════════════════════╝

[If UAT-BLOCKER found - SHOW FIRST!]
🔴 UAT BLOCKER - Must fix before proceeding:
    File: [UAT file path]
    Status: diagnosed

    Gap details:
    - [truth]: [status: failed]
    - [reason]: [why it failed]
    - [severity]: [blocker/high/medium]

    ⚠️ Fix this issue FIRST, then /gsd:verify-work to re-test

[If .continue-here file found - SHOW CONTENT!]
📌 Mid-plan checkpoint found:
    File: [.continue-here file path]

    ┌─ BLOCKERS ─────────────────────────────────────┐
    │ [Read and display <blockers> section content]  │
    └────────────────────────────────────────────────┘

    ┌─ NEXT ACTION ──────────────────────────────────┐
    │ [Read and display <next_action> section]       │
    └────────────────────────────────────────────────┘

    Resume from this checkpoint? (recommended)

[If interrupted agent found:]
⚠️  Interrupted agent detected:
    Agent ID: [id]
    Task: [task description from agent-history.json]
    Interrupted: [timestamp]

    Resume with: Task tool (resume parameter with agent ID)

[If incomplete plan (PLAN without SUMMARY):]
⚠️  Incomplete plan execution:
    - [plan file] has no SUMMARY

    Complete this plan or use /gsd:recover-summary

[If pending todos exist:]
📋 [N] pending todos — /gsd:check-todos to review

[If blockers exist:]
⚠️  Carried concerns:
    - [blocker 1]
    - [blocker 2]

[If alignment is not ✓:]
⚠️  Brief alignment: [status] - [assessment]
```

**CRITICAL: Read .continue-here file content!**

If a .continue-here file exists, you MUST:
1. Read the entire file with `cat [path]`
2. Extract and display the `<blockers>` section
3. Extract and display the `<next_action>` section
4. This is the PRIMARY context for resumption!

</step>

<step name="determine_next_action">
Based on project state, determine the most logical next action.

**⚠️ PRIORITY HIERARCHY (follow this order!):**

```
┌─────────────────────────────────────────────────────────────┐
│  PRIORITY ORDER FOR RESUMPTION                              │
├─────────────────────────────────────────────────────────────┤
│  1. 🔴 UAT-BLOCKER (diagnosed)  →  MUST FIX FIRST          │
│  2. 🟡 Interrupted agent         →  Resume agent            │
│  3. 🟡 .continue-here checkpoint →  Resume from checkpoint  │
│  4. 🟡 Incomplete plan           →  Complete plan           │
│  5. 🟢 Phase complete            →  Transition to next      │
│  6. 🟢 Ready to plan/execute     →  Normal workflow         │
└─────────────────────────────────────────────────────────────┘
```

**🔴 PRIORITY 1 - If UAT with status: diagnosed exists:**
→ **BLOCKER** - Cannot proceed to next phase!
→ Primary: Fix the diagnosed issues (show specific gaps)
→ After fix: Re-run /gsd:verify-work
→ ⚠️ Do NOT offer "skip" or "proceed anyway" - this is a hard blocker

**🟡 PRIORITY 2 - If interrupted agent exists:**
→ Primary: Resume interrupted agent (Task tool with resume parameter)
→ Option: Start fresh (abandon agent work)

**🟡 PRIORITY 3 - If .continue-here file exists:**
→ Primary: Resume from checkpoint (show `<next_action>` content!)
→ Option: Start fresh on current plan
→ **CRITICAL:** The .continue-here file contains the exact context needed!

**🟡 PRIORITY 4 - If incomplete plan (PLAN without SUMMARY):**
→ Primary: Complete the incomplete plan
→ Option: Abandon and move on

**🟢 PRIORITY 5 - If phase in progress, all plans complete:**
→ Primary: Transition to next phase
→ Option: Review completed work

**🟢 PRIORITY 6 - If phase ready to plan:**
→ Check if CONTEXT.md exists for this phase:

- If CONTEXT.md missing:
  → Primary: Discuss phase vision (how user imagines it working)
  → Secondary: Plan directly (skip context gathering)
- If CONTEXT.md exists:
  → Primary: Plan the phase
  → Option: Review roadmap

**🟢 PRIORITY 7 - If phase ready to execute:**
→ Primary: Execute next plan
→ Option: Review the plan first
</step>

<step name="offer_options">
Present contextual options based on project state:

```
What would you like to do?

[Primary action based on state - e.g.:]
1. Resume interrupted agent [if interrupted agent found]
   OR
1. Execute phase (/gsd:execute-phase {phase})
   OR
1. Discuss Phase 3 context (/gsd:discuss-phase 3) [if CONTEXT.md missing]
   OR
1. Plan Phase 3 (/gsd:plan-phase 3) [if CONTEXT.md exists or discuss option declined]

[Secondary options:]
2. Review current phase status
3. Check pending todos ([N] pending)
4. Review brief alignment
5. Something else
```

**Note:** When offering phase planning, check for CONTEXT.md existence first:

```bash
ls .planning/phases/XX-name/CONTEXT.md 2>/dev/null
```

If missing, suggest discuss-phase before plan. If exists, offer plan directly.

Wait for user selection.
</step>

<step name="route_to_workflow">
Based on user selection, route to appropriate workflow:

- **Execute plan** → Show command for user to run after clearing:
  ```
  ---

  ## ▶ Next Up

  **{phase}-{plan}: [Plan Name]** — [objective from PLAN.md]

  `/gsd:execute-phase {phase}`

  <sub>`/clear` first → fresh context window</sub>

  ---
  ```
- **Plan phase** → Show command for user to run after clearing:
  ```
  ---

  ## ▶ Next Up

  **Phase [N]: [Name]** — [Goal from ROADMAP.md]

  `/gsd:plan-phase [phase-number]`

  <sub>`/clear` first → fresh context window</sub>

  ---

  **Also available:**
  - `/gsd:discuss-phase [N]` — gather context first
  - `/gsd:research-phase [N]` — investigate unknowns

  ---
  ```
- **Transition** → ./transition.md
- **Check todos** → Read .planning/todos/pending/, present summary
- **Review alignment** → Read PROJECT.md, compare to current state
- **Something else** → Ask what they need
</step>

<step name="update_session">
Before proceeding to routed workflow, update session continuity:

Update STATE.md:

```markdown
## Session Continuity

Last session: [now]
Stopped at: Session resumed, proceeding to [action]
Resume file: [updated if applicable]
```

This ensures if session ends unexpectedly, next resume knows the state.
</step>

</process>

<reconstruction>
If STATE.md is missing but other artifacts exist:

"STATE.md missing. Reconstructing from artifacts..."

1. Read PROJECT.md → Extract "What This Is" and Core Value
2. Read ROADMAP.md → Determine phases, find current position
3. Scan \*-SUMMARY.md files → Extract decisions, concerns
4. Count pending todos in .planning/todos/pending/
5. Check for .continue-here files → Session continuity

Reconstruct and write STATE.md, then proceed normally.

This handles cases where:

- Project predates STATE.md introduction
- File was accidentally deleted
- Cloning repo without full .planning/ state
  </reconstruction>

<quick_resume>
If user says "continue" or "go":
- Load state silently
- Determine primary action
- Execute immediately without presenting options

"Continuing from [state]... [action]"
</quick_resume>

<success_criteria>
Resume is complete when:

- [ ] STATE.md loaded (or reconstructed)
- [ ] Incomplete work detected and flagged
- [ ] Clear status presented to user
- [ ] Contextual next actions offered
- [ ] User knows exactly where project stands
- [ ] Session continuity updated
      </success_criteria>
