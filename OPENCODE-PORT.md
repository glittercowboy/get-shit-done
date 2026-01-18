# Porting to OpenCode

## Goal
Document how OpenCode (https://opencode.ai) is structured so we can replicate the Claude Code workflow. This note links the install/config surfaces, explains where to plug in our prompts, and lists the first steps for the GSD repo.

## Environment & workflow
- Install OpenCode once per machine via the official script (`curl -fsSL https://opencode.ai/install | bash`) or a package manager (`npm install -g opencode-ai`, `brew install anomalyco/tap/opencode`, etc.). The CLI entrypoint is `opencode`, and `opencode run "<text>"` lets you skip the TUI (CLI docs: https://opencode.ai/docs/cli/).
- OpenCode creates an `AGENTS.md` in your repo on `/init` and stores per-project artefacts under `.opencode/`. The slash commands you type in the TUI (e.g., `/init`, `/undo`, `/help`) live inside the `.opencode/command/` tree or the JSON config (Intro docs: https://opencode.ai/docs/).

## Mapping GSD to OpenCode
1. **Commands** — each Claude Code `/gsd:*` command becomes a Markdown prompt file in `.opencode/command/` or a JSON `command` entry. The frontmatter supports `template`, `description`, `agent`, `model`, and `subtask` so we can keep plan-style prompts, askuser flows, or verification steps exactly as we have them today (Docs: https://opencode.ai/docs/commands/ and the upstream docs under `packages/web/src/content/docs/commands.mdx`). Use `$ARGUMENTS`, `$1`, `@path/to/file`, and ``!`cmd` `` to pull state, workflows, and CLI output into the template.
2. **Agents** — OpenCode lets you configure primary/subagents via `opencode.json` or `.opencode/agent/*.md`. The upstream repo ships additional guidance inside `packages/web/src/content/docs/agents.mdx` showing how to set `mode`, `tools`, `prompt`, `permission`, and `model` per agent. Mirror Build/Plan/Verifier personas by copying `opencode/agents` patterns and exposing `subtask: true` on commands where you need a Claude-like fresh execution context.
3. **Config** — set defaults in `opencode.json` for models, tools, permissions, and server/TUI options; commands, agents, skills, and plugins inherit or override those settings (see `packages/web/src/content/docs/config.mdx`). The project config merges with global `~/.config/opencode` and `.opencode/` folders (`packages/opencode/test/config/config.test.ts` demonstrates how the loader merges multiple layers), so keep `.opencode/` checked in for reproducible behavior.
4. **Extensions** — beyond commands/agents, the upstream repo documents `.opencode/plugin/`, `.opencode/tool/`, `.opencode/mode/`, `.opencode/themes/`, and `.opencode/skill/` (see `packages/web/src/content/docs/plugins.mdx`, `custom-tools.mdx`, `modes.mdx`, `themes.mdx`, `skills.mdx`). Note how the loader (`packages/opencode/src/config/config.ts`) scans these directories; we can reuse the same directories for any custom capabilities we discover while porting GSD.

## OpenCode plugin install
- Run `npx get-shit-done-cc --opencode` once to install the GSD OpenCode plugin and seed into the global OpenCode config (`~/.config/opencode` or `$OPENCODE_CONFIG_DIR`).
- In any project, run `/gsd-install` to scaffold local GSD OpenCode assets (`.opencode/`, `opencode.json`, `commands/gsd`, `get-shit-done`).

## Action plan for GSD
1. Mirror `commands/gsd/*.md` as `.opencode/command/gsd-*.md` with `template` sections that load `GET-SHIT-DONE` workflows via `@get-shit-done/...` references, `!` commands to surface git status or tests, and the same `objective/process/verification` flavor as the original prompts.
2. Create `.opencode/agent/` files (or `opencode.json` entries) for Build/Plan/Research/Verifier agents, tuning `tools` and `permission` to mimic Claude Code’s restrictions plus any `subtask` needs so we keep context isolation.
3. Add a project `opencode.json` that captures your preferred defaults. Commands stay model-agnostic so they inherit the active `agent.model` or global `model` entry in this config—our example config points at `openai/gpt-5.2`, but you can switch providers without editing the prompt files or agent metadata.
4. Consider capturing reusable logic in `.opencode/skill/`, `.opencode/plugin/`, or `.opencode/tool/` (OpenCode docs and loader tests show these directories are picked up automatically) if we ever need shared helpers or verification checkers.
5. Keep terminal instructions on how to bootstrap the OpenCode CLI from source handy: `bun install` followed by `bun run index.ts` inside the upstream `packages/opencode/` package (per `packages/opencode/README.md`). This allows experimenting with custom builds before releasing `opencode-ai` via npm/brew.

## References
- https://opencode.ai/docs/intro/
- https://opencode.ai/docs/cli/
- https://opencode.ai/docs/commands/
- https://opencode.ai/docs/agents/
- https://opencode.ai/docs/config/
