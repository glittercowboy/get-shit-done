---
name: archive-session
description: Archive session transcripts + subagent logs to browsable HTML. Default output is .claude/session-archive/exported-on-<timestamp>/. User may override with --output=<path>. Ask user for destination preference before running.
user-invocable: true
allowed-tools:
  - Bash(bash .claude/skills/archive-session/scripts/archive.sh:*)
---

# Archive Session

Archives the current Claude Code session transcript and any subagent logs, generating a browsable HTML file.

## When to Use

- Context reaches ~90% capacity (per high-context protocol)
- End of work session for audit trail
- Debugging session or subagent execution

## Before Running

Ask user where to archive:

```
Archiving session. Default: .claude/session-archive/exported-on-<timestamp>/

Override? Provide a path, or press enter for default.
```

If user provides path, pass via `--output=<path>`. Otherwise use default.

## What It Does

1. Detects current session (most recently modified transcript)
2. Archives main session transcript (`session.jsonl`)
3. Archives subagent transcripts if present (`subagents/`)
4. Generates HTML file via `claude-code-log` dependency, or uvx
5. Opens file in browser

## Output Location

**Default:** in the project claude folder at `.claude/session-archive/exported-on-<timestamp>/`

**Override:** Set either `CLAUDE_ARCHIVE_DIR` env var or use `--output=<path>` argument.

**Location override:** Useful in scenarios where you want to archive to a different location to fit other frameworks and processes. 

For example, when using the [Get Shit Done](https://github.com/glittercowboy/get-shit-done) CC framework, a better location might be in `.planning/sessions/`, where that framework generates all of its other plans and records. 

## Default exported folder structure
```
.claude/session-archive/exported-on-2026-01-14_15-51-05/
├── session-info.txt      # Metadata
├── session.jsonl         # Main transcript
├── session.html          # Main file (if no subagents)
└── subagents/            # If subagents exist
    ├── agent-*.jsonl     # Raw transcripts
    ├── cache/            # Parsed JSON
    └── session-*.html    # Browsable file
```

## Usage

```bash
# Archive current session (auto-detected, to default location)
/archive-session

# Archive specific session by ID
/archive-session 602fca42-0159-466c-bdb7-00745e1939f1

# Archive to a custom location either with: 
/archive-session --output=./my-archives

# or
CLAUDE_ARCHIVE_DIR=~/some/other/path bash .claude/skills/archive-session/scripts/archive.sh

# Both: specific session to custom location
/archive-session 602fca42-0159-466c-bdb7-00745e1939f1 --output=./my-archives
```

## TUI for Richer Experience

For interactive session management, `claude-code-log` provides a TUI:

```bash
claude-code-log --tui
# or
uvx claude-code-log@latest --tui
```

Features: session list with timestamps/token counts, keyboard nav (`h` HTML, `m` Markdown, `v` view), cross-project traversal, `c` to resume sessions.

## Dependencies

[claude-code-log](https://github.com/daaain/claude-code-log) generates browsable HTML reports from transcript files. Primarily a TUI with CLI capabilities for batch export.

You can install it as a project dependency or run it on-demand:

**Project dependency** (recommended if using frequently):
```bash
uv add claude-code-log
```
Adds to `pyproject.toml` and installs via [uv package manager](https://docs.astral.sh/uv/).

**On-demand execution** (no install):
```bash
uvx claude-code-log@latest
```
`uvx` is uv's tool runner that fetches and runs packages without permanent installation.

The script checks for `claude-code-log` first, falls back to `uvx`. If neither available, transcripts are still archived but HTML generation is skipped.

Note: You can also use `pip install claude-code-log`, but we default to uv for convenience and speed.

## Script Location

```bash
.claude/skills/archive-session/scripts/archive.sh
```
