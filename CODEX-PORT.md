# Codex Support

## Goal
Install GSD assets for Codex CLI without mixing them with other runtimes, and keep per-project assets isolated in each repo.

## What Codex expects
- Custom prompts live in the Codex home directory (for example, `~/.codex/prompts`) and are invoked as `/prompts:<name>`.
- Repo-scoped skills live in `$CWD/.codex/skills` and apply only to the current working directory.

## Install flow
1. Run `npx get-shit-done-cc --codex` to install the global Codex assets:
   - `~/.codex/prompts/gsd-install.md`
   - `~/.codex/gsd/seed/`
2. In each project, run `/prompts:gsd-install` to copy the seed into that repository:
   - `.codex/skills/gsd`
   - `commands/gsd`
   - `get-shit-done`
3. Repeat step 2 for every repo that should use GSD.

## Verification
- Confirm `.codex/skills/gsd/SKILL.md` exists in the project.
- Confirm `commands/gsd` and `get-shit-done` are present in the project root.
