---
name: gsd:add-gaps
description: Report bugs/gaps found during manual testing of a phase
argument-hint: <phase-number>
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

<objective>
Report bugs/gaps found during manual testing of a phase.
Updates VERIFICATION.md with user-reported gaps and changes phase status.
</objective>

<context>
Phase: $ARGUMENTS
@.planning/ROADMAP.md
@.planning/STATE.md
</context>

<process>

<step name="validate_phase">
Extract phase number from arguments.

If no phase number provided in $ARGUMENTS:
Ask: "Which phase number are you reporting gaps for?"
Wait for response and set PHASE.

If provided in $ARGUMENTS:
Set PHASE=$ARGUMENTS.

Normalize PHASE:
```bash
if [[ "$PHASE" =~ ^[0-9]+$ ]]; then
  PHASE=$(printf "%02d" "$PHASE")
elif [[ "$PHASE" =~ ^([0-9]+)\.([0-9]+)$ ]]; then
  PHASE=$(printf "%02d.%s" "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}")
fi
```
</step>

<step name="find_directories">
```bash
PHASE_DIR=$(ls -d .planning/phases/${PHASE}-* 2>/dev/null | head -1)
if [ -z "$PHASE_DIR" ]; then
  echo "ERROR: Phase ${PHASE} directory not found. Please check the phase number."
  exit 1
fi
echo "Found phase directory: ${PHASE_DIR}"
```
</step>

<step name="prompt_gaps">
Ask: "What gaps did you find? Describe the issues:"
Wait for user input.
</step>

<step name="update_verification">
Find verification file:
```bash
VERIFICATION_FILE=$(ls "${PHASE_DIR}"/*-VERIFICATION.md 2>/dev/null | head -1)
```

If file not found:
Error: "VERIFICATION.md not found in ${PHASE_DIR}. Please run /gsd:execute-phase ${PHASE} first to generate the base verification report."

Read existing content.

**Update Content:**
1. Update frontmatter status: `status: passed` -> `status: gaps_found` (or keep `gaps_found` if already set).
2. Find `## Gaps Summary` section.
3. Add new section under it:
   ```markdown
   ### Manual Testing (YYYY-MM-DD)
   [User's gap description]
   ```
   If `## Gaps Summary` doesn't exist, append `## Gaps Found` and the content to the end of file.

Write updated content back to `${VERIFICATION_FILE}`.
</step>

<step name="update_state">
Read `.planning/STATE.md`.

Check if `### Blockers/Concerns` has an entry for this phase.
If not, add:
`- Phase ${PHASE}: Unaddressed gaps from manual testing`

Write updated content back.
</step>

<step name="offer_next">
Use AskUserQuestion:
- header: "Gaps Added"
- question: "Added gaps to Phase ${PHASE} verification report. Plan gap closure now?"
- options:
  - "Plan gap closure" — Run /gsd:plan-phase ${PHASE} --gaps
  - "Done" — Exit

If "Plan gap closure" selected:
Run `/gsd:plan-phase ${PHASE} --gaps`
</step>

</process>

<success_criteria>
- [ ] Phase validated and directory found
- [ ] User prompt for gaps description
- [ ] VERIFICATION.md updated with "Manual Testing" section
- [ ] VERIFICATION.md status updated to gaps_found
- [ ] STATE.md updated with blocker
- [ ] User offered to run gap closure plan
</success_criteria>
