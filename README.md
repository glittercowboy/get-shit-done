# GET SHIT DONE (Codex Port)

**Repository:** `https://github.com/ahmed118-glitch/get-shit-done-codex`

This repository is a **Codex-native port** of [glittercowboy/get-shit-done](https://github.com/glittercowboy/get-shit-done).

It preserves the upstream GSD engine and workflow logic while adding a Codex execution surface:

- `.codex/prompts/gsd-*.md` – Codex-native command entrypoints (one file per command)
- `.codex/skills/get-shit-done-codex/*` – Translation layer and role-to-subagent mapping
- `.claude/get-shit-done/` – Existing upstream engine and workflow definitions

## Scope and assumptions

- Upstream behavior is kept intact where possible.
- The Codex path remains: **spawn subagents via `spawn_agent` + `wait` + `close_agent`.**
- This fork replaces Claude-specific command glue and shell assumptions with Codex-compatible orchestration.
- Windows PowerShell and `ConvertFrom-Json` are used for structured output parsing.

## Quick start (Codex)

1. Open this repo in your Codex workspace.
2. Run prompts from `.codex/prompts/`.
3. Commands are named `gsd-<command>` and correspond to upstream slash commands:
   - `gsd-new-project` ↔ `/gsd:new-project`
   - `gsd-plan-phase` ↔ `/gsd:plan-phase`
   - `gsd-execute-phase` ↔ `/gsd:execute-phase`
   - etc.
4. Use normal Codex flow for user interaction and tool approvals.

### Starting a project

Run:

```text
gsd-new-project
```

This starts project initialization and generates `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, and `.planning/STATE.md`.

## Prompt parity (Codex)

These prompt files are shipped in this fork:

- `gsd-add-phase`
- `gsd-add-todo`
- `gsd-audit-milestone`
- `gsd-check-todos`
- `gsd-complete-milestone`
- `gsd-debug`
- `gsd-discuss-phase`
- `gsd-execute-phase`
- `gsd-help`
- `gsd-insert-phase`
- `gsd-list-phase-assumptions`
- `gsd-map-codebase`
- `gsd-new-milestone`
- `gsd-new-project`
- `gsd-pause-work`
- `gsd-plan-milestone-gaps`
- `gsd-plan-phase`
- `gsd-progress`
- `gsd-quick`
- `gsd-remove-phase`
- `gsd-research-phase`
- `gsd-resume-work`
- `gsd-set-profile`
- `gsd-settings`
- `gsd-update`
- `gsd-verify-work`

> The upstream command `join-discord` is out of scope for this fork.

## Core workflow (same logical stages)

1. **Initialize**: `gsd-new-project`
2. **Refine phase intent**: `gsd-discuss-phase <N>`
3. **Plan a phase**: `gsd-plan-phase <N>`
4. **Execute a phase**: `gsd-execute-phase <N>`
5. **Verify outcome**: `gsd-verify-work <N>`
6. **Milestone transitions**: `gsd-complete-milestone`, `gsd-new-milestone`

Phase execution creates the same upstream artifact family:

- `<phase>-PLAN.md`
- `<phase>-SUMMARY.md`
- `<phase>-VERIFICATION.md`
- `.planning/STATE.md`
- `.planning/ROADMAP.md`

## Repo structure (important files)

- `.codex/prompts/` – all Codex command prompts
- `.codex/skills/get-shit-done-codex/SKILL.md` – orchestration contract
- `.codex/skills/get-shit-done-codex/references/compat.md` – tool/subagent mappings
- `.codex/skills/get-shit-done-codex/references/windows.md` – PowerShell/JSON helpers
- `.claude/get-shit-done/bin/gsd-tools.js` – canonical engine
- `.claude/get-shit-done/workflows/*` – step-by-step behavior source
- `.claude/agents/gsd-*.md` – role instructions

## Development workflow

- Work in this repo directly; no npm package install is required for the Codex fork.
- Keep upstream engine files unchanged unless compatibility requires edits.
- Keep Codex prompts parity aligned with `.claude/commands/gsd/*` behavior.

### Git and atomic commits

- Use `node .claude/get-shit-done/bin/gsd-tools.js commit "<message>" --files <file...>` for engine-style commit behavior.
- Commits and validations are intended to remain atomic per plan/summary/document update.
- `git` safety checks remain enforced by the prompts before committing.

## Notes for contributors

- If you add new prompts, keep naming parity with command names above.
- Update skill docs whenever tool/subagent behavior changes.
- If you change workflow assumptions, ensure `state`, `roadmap`, and `.planning/*` semantics remain compatible.

## License

MIT License. See [LICENSE](LICENSE).

---

**Fork intent:** keep this repository usable as a clean Codex-native GSD surface while staying behavior-compatible with upstream.
