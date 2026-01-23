<purpose>
Guide to understanding GSD state management by reading actual state files and templates.
</purpose>

<state_files>

## Project State Location

All state in `.planning/`:
```bash
ls -la .planning/
```

## Key Files

| File | Purpose | Template |
|------|---------|----------|
| PROJECT.md | Vision, requirements | `templates/project.md` |
| REQUIREMENTS.md | Scoped requirements | `templates/requirements.md` |
| ROADMAP.md | Phases and progress | `templates/roadmap.md` |
| STATE.md | Session memory | `templates/state.md` |
| config.json | Workflow settings | (in workflows) |

## Read Templates for Format

```bash
cat {GSD_ROOT}/get-shit-done/templates/state.md
cat {GSD_ROOT}/get-shit-done/templates/project.md
cat {GSD_ROOT}/get-shit-done/templates/roadmap.md
```

## Read User's Current State

```bash
cat .planning/STATE.md
cat .planning/config.json
cat .planning/ROADMAP.md
cat .planning/PROJECT.md
```

</state_files>

<phase_files>

## Per-Phase Files

Location: `.planning/phases/XX-name/`

| File | Created By | Purpose |
|------|------------|---------|
| XX-CONTEXT.md | discuss-phase | User's vision |
| XX-RESEARCH.md | plan-phase | Implementation research |
| XX-NN-PLAN.md | plan-phase | Execution prompt |
| XX-NN-SUMMARY.md | execute-phase | What happened |
| XX-VERIFICATION.md | execute-phase | Automated verification |
| XX-UAT.md | verify-work | User acceptance testing |

## Read Templates

```bash
cat {GSD_ROOT}/get-shit-done/templates/plan.md
cat {GSD_ROOT}/get-shit-done/templates/summary.md
```

</phase_files>

<config_schema>

## Config Options

Read from workflows:
```bash
grep -A30 "config.json" {GSD_ROOT}/get-shit-done/workflows/*.md | head -50
```

Typical structure (verify from source):
```json
{
  "mode": "interactive|yolo",
  "depth": "quick|standard|comprehensive",
  "model_profile": "quality|balanced|budget",
  "workflow": {
    "research": true|false,
    "plan_check": true|false,
    "verifier": true|false
  }
}
```

</config_schema>

<reading_strategy>
For state questions:
1. Read the template to understand format
2. Read user's actual file to see current state
3. Read workflows to understand when it's updated
</reading_strategy>
