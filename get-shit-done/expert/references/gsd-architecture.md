<purpose>
Guide to understanding GSD architecture by reading actual source files.
</purpose>

<where_to_find>

## System Overview

**README.md** - User-facing documentation
```bash
cat {GSD_ROOT}/README.md
```

**CLAUDE.md** - Developer guidance
```bash
cat {GSD_ROOT}/CLAUDE.md
```

## Component Locations

| Component | Path | Contains |
|-----------|------|----------|
| Slash commands | `commands/gsd/*.md` | Entry points with frontmatter |
| Workflows | `get-shit-done/workflows/*.md` | Execution logic |
| Agents | `agents/gsd-*.md` | Subagent definitions |
| Templates | `get-shit-done/templates/*.md` | Output formats |
| References | `get-shit-done/references/*.md` | Domain knowledge |

## Key Files to Read

**For command flow:**
```bash
cat {GSD_ROOT}/commands/gsd/execute-phase.md
cat {GSD_ROOT}/get-shit-done/workflows/execute-plan.md
```

**For agent system:**
```bash
ls {GSD_ROOT}/agents/gsd-*.md
cat {GSD_ROOT}/agents/gsd-executor.md
```

**For state management:**
```bash
cat {GSD_ROOT}/get-shit-done/templates/state.md
cat {GSD_ROOT}/get-shit-done/templates/project.md
```

**For plan format:**
```bash
cat {GSD_ROOT}/get-shit-done/templates/plan.md
```

</where_to_find>

<reading_strategy>
## How to Trace Architecture

1. Start with command: `commands/gsd/{name}.md`
2. Find @file references to workflows
3. Read workflow: `get-shit-done/workflows/{name}.md`
4. Find Task tool spawns for agents
5. Read agent: `agents/gsd-{name}.md`
6. Find output templates referenced

This traces the full data flow for any GSD feature.
</reading_strategy>
