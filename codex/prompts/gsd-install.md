---
description: Install GSD assets into this repository for Codex
argument-hint: [FORCE=true]
---

Install the GSD repo assets into this project from the global Codex seed directory.

Targets:
- `.codex/skills/gsd`
- `commands/gsd`
- `get-shit-done`

If $FORCE is set to `true`, remove the target paths before copying.

Run shell commands to:
1) Set `CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"`.
2) Ensure the target directories exist.
3) Copy from `$CODEX_HOME/gsd/seed/` into the repository root.
4) Confirm the copied paths exist.
