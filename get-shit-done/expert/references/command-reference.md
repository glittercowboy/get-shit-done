<purpose>
Guide to finding current GSD commands by reading actual command files.
</purpose>

<get_current_commands>

## List All Commands

```bash
# Get command names
ls {GSD_ROOT}/commands/gsd/*.md | xargs -n1 basename | sed 's/.md$//' | sort

# Get names and descriptions
for f in {GSD_ROOT}/commands/gsd/*.md; do
  name=$(basename "$f" .md)
  desc=$(grep "^description:" "$f" | head -1 | sed 's/description: //')
  echo "$name: $desc"
done
```

## Read Specific Command

```bash
cat {GSD_ROOT}/commands/gsd/{name}.md
```

Look for:
- YAML frontmatter (name, description, allowed-tools)
- `<execution_context>` - workflow references
- `<context>` - runtime variables
- Main body - the prompt

</get_current_commands>

<command_categories>
## Typical Categories (Verify by Reading)

**Core workflow:**
- new-project, discuss-phase, plan-phase, execute-phase, verify-work
- complete-milestone, new-milestone

**Navigation:**
- progress, help, whats-new, resume-work, pause-work

**Phase management:**
- add-phase, insert-phase, remove-phase, list-phase-assumptions

**Utilities:**
- quick, debug, map-codebase, settings, set-profile
- add-todo, check-todos, update

**Milestone:**
- audit-milestone, plan-milestone-gaps

Run the list command to verify current set - commands may have changed.
</command_categories>

<reading_strategy>
For any command question:
1. List current commands
2. Read the specific command file
3. Read referenced workflows
4. Explain from actual source
</reading_strategy>
