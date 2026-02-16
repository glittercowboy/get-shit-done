# Stack Research: External AI Agent Co-Planning Integration

**Domain:** CLI-based AI agent orchestration via bash invocation
**Researched:** 2026-02-16
**Confidence:** HIGH (CLI interfaces verified via official docs + npm registries)

## Executive Summary

GSD v2.2 integrates three external AI CLIs (Codex, Gemini CLI, OpenCode) as co-planners invoked via bash from the orchestrator layer. All three tools support non-interactive execution with structured JSON output, making them viable for programmatic invocation. The integration requires zero new npm dependencies -- Node.js `child_process.execSync` (already used extensively in `gsd-tools.cjs`) handles everything. The key design constraint is output parsing: each CLI has a different JSON schema, requiring a thin normalization layer in `gsd-tools.cjs`.

---

## Recommended Stack

### Core Technologies (External CLIs -- User-Installed Prerequisites)

| Technology | Package | Current Version | Purpose | Why Recommended |
|------------|---------|-----------------|---------|-----------------|
| **Codex CLI** | `@openai/codex` (npm) | Latest (Feb 2026) | Co-planning via `codex exec` | Best non-interactive mode: JSONL streaming, `--output-last-message`, `--output-schema` for structured responses. Rust binary distributed via npm. |
| **Gemini CLI** | `@google/gemini-cli` (npm) | 0.28.2 (stable) | Co-planning via `gemini -p` | Native JSON output (`--output-format json`), `--yolo` for auto-approval, stdin piping. Node.js/TypeScript. |
| **OpenCode** | `opencode-ai` (npm) | 1.2.5 | Co-planning via `opencode -p` | JSON output (`-f json`), auto-approved permissions in non-interactive mode, `--attach` for persistent server. TypeScript/Go hybrid. |

**Installation is the user's responsibility.** GSD does not install these CLIs. It detects which are available and uses them.

### GSD Internal Stack (No New Dependencies)

| Technology | Version | Purpose | Why No Additions Needed |
|------------|---------|---------|-------------------------|
| **Node.js `child_process`** | Built-in | Spawn CLI processes | `execSync` already used in `gsd-tools.cjs` for git, npm, and find operations. Same pattern for AI CLIs. |
| **`gsd-tools.cjs`** | Existing | CLI wrapper + normalization | Add new commands (`agent invoke`, `agent detect`) to existing tool. Consistent with GSD architecture. |
| **`config.json`** | Existing | Per-checkpoint agent config | Extend existing `adversary.checkpoints` pattern with `co_planners` section. |
| **Bash tool** | Existing | Orchestrator invocation | Commands/workflows already invoke bash for `gsd-tools.cjs`. Same pattern for agent invocation. |

### No SDKs Needed

| SDK | Why NOT to Use |
|-----|----------------|
| `@openai/codex-sdk` (v0.101.0) | For building Codex-like agents, not invoking Codex CLI. Wrong abstraction. |
| `@opencode-ai/sdk` (v1.2.5) | Starts a full server + client. Massive overkill for "run prompt, get response." |
| `@google/gemini-cli-core` | Internal package for Gemini CLI internals. Not a public API. |

**Rationale:** CLI invocation via `child_process` is simpler, more maintainable, and works identically across all three tools. SDKs add dependency management, API surface complexity, and version coupling for zero benefit in the "invoke and capture output" use case.

---

## CLI Invocation Patterns

### Codex CLI (`codex exec`)

**Non-interactive invocation:**
```bash
# Basic: prompt as argument, final response to stdout
codex exec "Review this plan and suggest improvements: $(cat .planning/phases/01-core/01-01-PLAN.md)"

# With JSON output (JSONL stream to stdout)
codex exec --json "Review this plan..." 2>/dev/null

# Capture final message to file
codex exec --output-last-message /tmp/codex-response.md "Review this plan..."

# Full auto mode (no approval prompts)
codex exec --full-auto "Review this plan..."

# Pipe prompt via stdin
cat .planning/phases/01-core/01-01-PLAN.md | codex exec -

# With structured output schema
codex exec --output-schema schema.json "Analyze and return structured review..."

# Ephemeral (don't persist session)
codex exec --ephemeral --full-auto "Review this plan..."
```

**Output behavior:**
- Default: Progress streams to `stderr`, final message to `stdout`
- `--json`: JSONL events to `stdout` (types: `thread.started`, `turn.started`, `turn.completed`, `item.started`, `item.completed`, `error`)
- `--output-last-message <path>`: Writes final message to file AND `stdout`

**Key flags for GSD integration:**
| Flag | Value | Purpose |
|------|-------|---------|
| `--ephemeral` | (none) | Don't persist session files |
| `--full-auto` | (none) | No approval prompts |
| `--output-last-message` | `<path>` | Capture final response to file |
| `--json` | (none) | JSONL event stream |
| `--output-schema` | `<path>` | Validate output against JSON schema |
| `-m` / `--model` | `<model>` | Override model |
| `-c` | `key=value` | Override config |

**Auth:** Requires `codex login` (stores credentials locally). No env var needed after login.

**Confidence:** HIGH -- verified via [official docs](https://developers.openai.com/codex/noninteractive/) and [CLI reference](https://developers.openai.com/codex/cli/reference/).

---

### Gemini CLI (`gemini -p`)

**Non-interactive invocation:**
```bash
# Basic: prompt via -p flag, text response to stdout
gemini -p "Review this plan and suggest improvements"

# JSON output (structured object)
gemini -p "Review this plan..." --output-format json

# Streaming JSON (NDJSON events)
gemini -p "Review this plan..." --output-format stream-json

# Auto-approve all tool use
gemini -p "Review this plan..." --yolo

# With model selection
gemini -p "Review this plan..." -m gemini-2.5-pro

# Pipe context via stdin
cat .planning/phases/01-core/01-01-PLAN.md | gemini -p "Review this plan"

# Include project directories in context
gemini -p "Review the architecture" --include-directories ./src,./lib
```

**JSON output structure:**
```json
{
  "response": "string (the actual response text)",
  "stats": {
    "models": {
      "gemini-2.5-pro": {
        "api": { "requestCount": 1, "errors": 0 },
        "tokens": { "prompt": 1234, "response": 567, "total": 1801 }
      }
    },
    "tools": {
      "totalCalls": 0,
      "totalSuccess": 0
    },
    "files": {
      "totalLinesAdded": 0,
      "totalLinesRemoved": 0
    }
  }
}
```

**Stream-JSON event types:** `init`, `message`, `tool_use`, `tool_result`, `error`, `result` (each with timestamp + type).

**Key flags for GSD integration:**
| Flag | Value | Purpose |
|------|-------|---------|
| `-p` / `--prompt` | `<text>` | Run in headless mode |
| `--output-format` | `json\|stream-json\|text` | Output format |
| `-y` / `--yolo` | (none) | Auto-approve all actions |
| `-m` / `--model` | `<model>` | Model selection |
| `--include-directories` | `<paths>` | Add directories to context |

**Auth:** `GEMINI_API_KEY` env var or `GOOGLE_CLOUD_PROJECT` for Code Assist license.

**Confidence:** HIGH -- verified via [official headless docs](https://geminicli.com/docs/cli/headless/) and [npm package](https://www.npmjs.com/package/@google/gemini-cli). Note: `--output-format` was preview-only in earlier versions but is confirmed in stable v0.28.x.

---

### OpenCode (`opencode -p`)

**Non-interactive invocation:**
```bash
# Basic: prompt via -p flag
opencode -p "Review this plan and suggest improvements"

# JSON output
opencode -p "Review this plan..." -f json

# Quiet mode (no spinner, for scripts)
opencode -p "Review this plan..." -f json -q

# With model selection
opencode -p "Review this plan..." -m anthropic/claude-sonnet-4

# Attach to persistent server (avoids cold start)
opencode serve  # run once
opencode run --attach http://localhost:4096 "Review this plan..."

# With file attachment
opencode -p "Review this plan" --file .planning/phases/01-core/01-01-PLAN.md
```

**Auto-approval:** In non-interactive mode (`-p`), all permissions are auto-approved for the session. No explicit `--yolo` flag needed.

**Key flags for GSD integration:**
| Flag | Value | Purpose |
|------|-------|---------|
| `-p` / `--prompt` | `<text>` | Non-interactive mode |
| `-f` / `--output-format` | `json\|text` | Output format |
| `-q` / `--quiet` | (none) | Suppress spinner |
| `-m` / `--model` | `<model>` | Model selection |
| `--file` | `<path>` | Attach file(s) |
| `--attach` | `<url>` | Connect to running server |

**Auth:** Configured in `~/.config/opencode/config.json` with provider API keys.

**Confidence:** MEDIUM -- CLI flags verified via [official docs](https://opencode.ai/docs/cli/) and [npm](https://www.npmjs.com/package/opencode-ai). Note: `opencode run` vs `opencode -p` syntax is inconsistent across docs. The `-p` flag is the confirmed working approach for non-interactive mode. The `opencode run` subcommand exists but may require `--non-interactive` flag which is still a feature request ([#10411](https://github.com/anomalyco/opencode/issues/10411)).

---

## Normalization Layer Design

### Why Normalize

Each CLI returns different JSON structures. GSD needs a consistent interface.

**Codex:** Final message as plain text to stdout (or JSONL events with `--json`)
**Gemini:** `{ "response": "...", "stats": {...} }` JSON object
**OpenCode:** JSON events with `-f json`

### Recommended Normalization (in `gsd-tools.cjs`)

```javascript
// Unified response format returned by `gsd-tools.cjs agent invoke`
{
  "agent": "codex|gemini|opencode",
  "response": "string",           // The actual text response
  "model": "string|null",         // Model used, if reported
  "tokens": {                     // Token usage, if reported
    "input": number|null,
    "output": number|null
  },
  "duration_ms": number,          // Wall-clock time
  "exit_code": number,            // Process exit code
  "error": "string|null"          // Error message if failed
}
```

### Extraction Logic Per CLI

```javascript
// Codex: stdout IS the response (when not using --json)
const response = stdout.trim();

// Gemini: parse JSON, extract .response field
const parsed = JSON.parse(stdout);
const response = parsed.response;
const tokens = {
  input: parsed.stats?.models?.[Object.keys(parsed.stats.models)[0]]?.tokens?.prompt,
  output: parsed.stats?.models?.[Object.keys(parsed.stats.models)[0]]?.tokens?.response
};

// OpenCode: parse JSON output
const parsed = JSON.parse(stdout);
const response = parsed.response || parsed.content;
```

---

## Config Schema Extension

### Proposed `config.json` Addition

```json
{
  "co_planners": {
    "enabled": false,
    "timeout_ms": 120000,
    "checkpoints": {
      "research": [],
      "requirements": [],
      "roadmap": [],
      "plan": [],
      "verification": []
    },
    "agents": {
      "codex": {
        "command": "codex",
        "available": null,
        "model": null,
        "extra_flags": []
      },
      "gemini": {
        "command": "gemini",
        "available": null,
        "model": null,
        "extra_flags": []
      },
      "opencode": {
        "command": "opencode",
        "available": null,
        "model": null,
        "extra_flags": []
      }
    }
  }
}
```

**Pattern notes:**
- `checkpoints` maps to workflow stages (mirrors `adversary.checkpoints`)
- Each checkpoint value is an array of agent names: `["codex", "gemini"]` means invoke both
- `available: null` means "detect at runtime" -- `gsd-tools.cjs agent detect` checks `which <command>`
- `model: null` means "use CLI default" -- override with `model: "gemini-2.5-pro"` etc.
- `timeout_ms` prevents hung processes (120s default, same as Bash tool timeout)

---

## `gsd-tools.cjs` New Commands

### `agent detect`

Checks which CLIs are available on PATH.

```bash
node gsd-tools.cjs agent detect
# Output: {"codex": true, "gemini": true, "opencode": false}
```

**Implementation:** `which codex`, `which gemini`, `which opencode` via `execSync`.

### `agent invoke <agent> --prompt <text> [--timeout <ms>] [--model <model>]`

Invokes an agent and returns normalized JSON.

```bash
node gsd-tools.cjs agent invoke gemini \
  --prompt "Review this plan for feasibility issues" \
  --timeout 120000 \
  --model gemini-2.5-pro
```

**Implementation:** Builds the CLI command, runs via `execSync` with timeout, parses output, normalizes to unified format.

### `agent invoke-all --checkpoint <name> --prompt <text>`

Invokes all agents configured for a checkpoint, returns array of responses.

```bash
node gsd-tools.cjs agent invoke-all \
  --checkpoint plan \
  --prompt "Review this plan for feasibility issues"
```

**Implementation:** Reads `config.json`, gets checkpoint agent list, invokes each, collects results.

---

## Installation Requirements

### User Prerequisites (NOT managed by GSD)

```bash
# Codex CLI
pnpm add -g @openai/codex
codex login

# Gemini CLI
pnpm add -g @google/gemini-cli
# Set GEMINI_API_KEY or authenticate via gcloud

# OpenCode
pnpm add -g opencode-ai
# Configure providers in ~/.config/opencode/config.json
```

### GSD Installation Changes

**None.** No new npm dependencies. No changes to `bin/install.js`. No new hooks. The integration lives entirely in:

1. New commands in `gsd-tools.cjs` (agent detect, invoke, invoke-all)
2. Config schema extension in `config.json` template
3. Workflow/command file updates to invoke agents at checkpoints

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| `execSync` for invocation | `spawn` with streaming | Co-planning is request/response, not streaming. `execSync` is simpler, blocks correctly, timeout is built-in. |
| Plain CLI invocation | OpenCode SDK (`@opencode-ai/sdk`) | SDK starts a full server. Massive overkill. CLI does the same thing in one command. |
| Plain CLI invocation | Codex SDK (`@openai/codex-sdk`) | SDK is for building agents, not invoking one. Wrong tool. |
| Normalize in `gsd-tools.cjs` | Normalize in each workflow file | Duplicated logic across 5+ workflow files. Single source of truth is better. |
| `--output-last-message` for Codex | `--json` + jq parsing | `--output-last-message` is cleaner for "just get the response" use case. |
| `--output-format json` for Gemini | Parse text output | JSON gives structure (response + stats). Text requires regex/heuristic parsing. |
| Config-driven checkpoint mapping | Hardcoded agent selection | Users want control over which agents run where. Config mirrors adversary pattern. |
| User installs CLIs | GSD auto-installs CLIs | Installing global npm packages is not GSD's job. Respect user's tool choices. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Any external npm dependency | Unnecessary. `child_process` handles everything. | `execSync` from Node.js built-in `child_process` |
| Codex `--json` JSONL for basic use | Complex to parse, designed for streaming UIs | `--output-last-message` for simple response capture |
| Gemini `--output-format stream-json` | Designed for real-time monitoring, not batch | `--output-format json` for single structured response |
| OpenCode `opencode run` subcommand | Non-interactive flag is still a feature request | `opencode -p` which is the working non-interactive mode |
| OpenCode `opencode serve` + `--attach` | Adds server lifecycle management complexity | Direct `opencode -p` invocation per request |
| Async `spawn` with event handlers | Co-planning is synchronous: invoke, wait, synthesize | `execSync` with timeout |
| API keys in config.json | Security risk. Each CLI manages its own auth. | Let each CLI use its own auth mechanism |

---

## Stack Patterns by Variant

**If user has only one CLI installed:**
- Use it at all checkpoints where co-planning is enabled
- Config: `"checkpoints": { "plan": ["codex"] }`

**If user has multiple CLIs:**
- Can configure different agents at different checkpoints
- Config: `"checkpoints": { "research": ["gemini"], "plan": ["codex", "gemini"] }`
- Multiple agents at same checkpoint = invoke all, synthesize responses

**If user has no CLIs installed:**
- Co-planning disabled (graceful degradation)
- `agent detect` returns all false, skip invocation
- Log informational message about available agents

**If CLI invocation times out:**
- `execSync` timeout kills the process
- Return error in normalized format: `{ "error": "timeout after 120000ms" }`
- Orchestrator proceeds without that agent's input (advisory, not blocking)

---

## Version Compatibility

| Package | Min Version | Why | Notes |
|---------|-------------|-----|-------|
| `@openai/codex` | Any with `exec` subcommand | `codex exec` is the core API | Rust binary, distributed via npm. Versions auto-update. |
| `@google/gemini-cli` | >= 0.28.0 | `--output-format json` in stable | Earlier versions had this in preview only. |
| `opencode-ai` | >= 1.0.0 | `-p` flag for non-interactive | Pre-1.0 had different CLI interface. |
| Node.js | >= 18 | Already GSD requirement | `execSync` timeout param, built-in `which` |

---

## Sources

### Primary Sources (HIGH confidence)
- [Codex CLI Reference](https://developers.openai.com/codex/cli/reference/) -- Full flag documentation
- [Codex Non-Interactive Mode](https://developers.openai.com/codex/noninteractive/) -- exec subcommand docs
- [Gemini CLI Headless Mode](https://geminicli.com/docs/cli/headless/) -- JSON output structure, flags
- [Gemini CLI npm](https://www.npmjs.com/package/@google/gemini-cli) -- Version 0.28.2 confirmed
- [OpenCode CLI Docs](https://opencode.ai/docs/cli/) -- Non-interactive mode, output formats
- [OpenCode npm](https://www.npmjs.com/package/opencode-ai) -- Version 1.2.5 confirmed

### Secondary Sources (MEDIUM confidence)
- [Codex GitHub](https://github.com/openai/codex) -- Repository structure, exec.md
- [Gemini CLI GitHub](https://github.com/google-gemini/gemini-cli) -- Issue tracker, release notes
- [OpenCode GitHub (anomalyco)](https://github.com/anomalyco/opencode) -- Current org, v1.2.6 release
- [Gemini JSON output issue #9009](https://github.com/google-gemini/gemini-cli/issues/9009) -- JSON output availability status
- [OpenCode non-interactive feature #10411](https://github.com/anomalyco/opencode/issues/10411) -- `opencode run --non-interactive` status

### Verification Notes
- Gemini `--output-format json` was initially preview-only but confirmed working in stable v0.28.x per release notes
- OpenCode repository moved from `sst/opencode` to `opencode-ai/opencode` to `anomalyco/opencode` (company rebrand, not archive)
- OpenCode npm package name remains `opencode-ai` despite GitHub org changes
- Codex CLI is a Rust binary distributed via npm (not a Node.js package)

---
*Stack research for: External AI Agent Co-Planning Integration*
*Researched: 2026-02-16*
