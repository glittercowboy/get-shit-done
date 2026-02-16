# Architecture Research: External AI Agent Co-Planning Integration

**Domain:** CLI-based AI agent co-planning for GSD workflow system
**Researched:** 2026-02-16
**Confidence:** HIGH (existing architecture well-understood, external CLI APIs verified via official docs)

## Executive Summary

External AI co-planners integrate as a **new invocation layer** between the orchestrator commands and the external environment. Unlike internal subagents (spawned via Task tool with markdown prompts), co-planners are invoked via Bash tool calls to external CLI processes and return text/JSON. The architecture adds a thin CLI abstraction in `gsd-tools.cjs` and extends the existing checkpoint pattern from the adversary system.

Key architectural insight: Co-planners are NOT subagents. They are **external process invocations** that return text. The orchestrator treats their output like any other data input -- read it, synthesize it, decide. This is fundamentally simpler than the adversary's debate loop because co-planners are single-shot: invoke once per checkpoint, no iterative rounds.

Second key insight: Co-planners and the adversary serve **different roles** at shared checkpoints. Co-planners provide additive perspective (blind spot detection), while the adversary provides structured adversarial challenge (stress testing). Co-planners run FIRST (improve the artifact), adversary runs SECOND (challenge the improved artifact).

## Where Co-Planners Fit in Existing Layers

### Layer Placement

```
┌─────────────────────────────────────────────────────────────────────┐
│                    USER-FACING LAYER (Commands)                      │
│   /gsd:new-project   /gsd:plan-phase   /gsd:execute-phase           │
│   /gsd:new-milestone  /gsd:verify-work  /gsd:settings               │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ spawns via Task() + invokes via Bash
                            v
┌─────────────────────────────────────────────────────────────────────┐
│                    ORCHESTRATION LAYER (Workflows)                    │
│   Manages agent spawning, co-planner invocation, synthesis           │
│   Reads config.json for checkpoint agent assignments                 │
│   Builds prompts, parses responses, merges feedback                  │
├───────────────────┬─────────────────────────────────────────────────┤
│                   │                                                  │
│   spawns via      │  invokes via Bash (gsd-tools.cjs abstraction)   │
│   Task()          │                                                  │
│                   │                                                  │
│        v          │           v                                      │
├───────────────────┴─────────────────────────────────────────────────┤
│  SUBAGENT LAYER        │    EXTERNAL PROCESS LAYER                   │
│  (Task tool)           │    (Bash tool -> CLI)                       │
│                        │                                             │
│  ┌──────────────┐      │    ┌─────────────┐  ┌───────────────┐      │
│  │ gsd-planner  │      │    │ codex exec  │  │ gemini -p     │      │
│  │ gsd-researcher│     │    │ (OpenAI)    │  │ (Google)      │      │
│  │ gsd-executor │      │    ├─────────────┤  ├───────────────┤      │
│  │ gsd-adversary│      │    │ opencode run│  │ claude -p     │      │
│  │ gsd-verifier │      │    │ (multi-LLM) │  │ (self-review) │      │
│  │ gsd-roadmapper│     │    └─────────────┘  └───────────────┘      │
│  └──────────────┘      │                                             │
│                        │    Invoked via gsd-tools.cjs                │
│  Creates/challenges    │    Returns normalized JSON                  │
│  artifacts             │    Advisory only, no file access            │
├────────────────────────┴─────────────────────────────────────────────┤
│                    NORMALIZATION LAYER (gsd-tools.cjs)                │
│   coplanner config | coplanner invoke | coplanner parse              │
│   Normalizes CLI-specific JSON to unified format                     │
└──────────────────────────────────────────────────────────────────────┘
```

### Relationship to Existing Agents

| Component | Type | Mechanism | Role | Stateful? |
|-----------|------|-----------|------|-----------|
| `gsd-planner` | Internal subagent | Task tool | Creates plans | No (fresh context) |
| `gsd-adversary` | Internal subagent | Task tool | Challenges artifacts | No (round state in orchestrator) |
| `gsd-verifier` | Internal subagent | Task tool | Validates execution | No (fresh context) |
| `gsd-roadmapper` | Internal subagent | Task tool | Creates roadmap | No (fresh context) |
| **codex** | External process | Bash -> CLI | Reviews artifacts | No (`--ephemeral`) |
| **gemini** | External process | Bash -> CLI | Reviews artifacts | No (headless mode) |
| **opencode** | External process | Bash -> CLI | Reviews artifacts | No (`run` mode) |
| **claude** | External process | Bash -> CLI | Reviews artifacts | No (`-p` mode) |

**Critical distinctions:**
- Internal subagents receive markdown prompts, have access to GSD tools, operate within Claude's context ecosystem
- External co-planners receive text prompts via CLI stdin, have their own tool access, operate in isolated processes
- Both are advisory: Claude synthesizes all input and makes final decisions
- Co-planners are single-shot (no iterative rounds). Adversary has a debate loop.

### Key Design Decision: NOT a Separate Agent

External agent invocation should be **inline in orchestrator commands**, not a separate `gsd-external-agent.md` subagent. Rationale:

1. **Context preservation**: The orchestrator already has the artifact in context when it needs external review. Spawning a subagent to spawn a bash call adds indirection with no benefit.
2. **Pattern consistency**: The adversary is a subagent because it needs a fresh context window with its own system prompt for adversarial reasoning. External CLI tools already get a fresh context by nature of being separate processes.
3. **Simplicity**: Bash invocation from the orchestrator is simpler than Task (spawn subagent) -> Bash (invoke CLI).

## Component Boundaries

### 1. Normalization Layer (`gsd-tools.cjs` additions)

**Responsibility:** Detect available CLIs, invoke them with correct flags, normalize output.

**New commands:**
```
coplanner config <checkpoint>         -> { agents: [...], timeout, maxTokens }
coplanner invoke <agent>              -> { agent, status, feedback, error }
  --prompt-file <path> [--timeout N]
coplanner parse <agent>               -> { agent, status, feedback, error }
  --response <text>
```

**NOT responsible for:**
- Deciding when to invoke (orchestrator decides based on config)
- Synthesizing responses (orchestrator synthesizes)
- Managing config (config.json is source of truth)

**Boundaries:**
```
IN:  agent name, prompt file path, timeout, model override
OUT: normalized JSON response (same schema regardless of agent)
```

### 2. Config Extension (`config.json`)

**Responsibility:** Store user preferences for which agents run at which checkpoints.

**NOT responsible for:**
- Runtime detection (gsd-tools handles `command -v`)
- Invocation logic (orchestrator + gsd-tools handle this)

### 3. Orchestrator Integration (Commands/Workflows)

**Responsibility:** Read config, build prompts with artifact context, invoke co-planners via gsd-tools, synthesize feedback, revise artifacts.

**NOT responsible for:**
- CLI-specific flags (normalization layer handles this)
- JSON parsing of CLI output (normalization layer handles this)
- Tool availability detection (normalization layer checks this)

## Config Schema Design

### Proposed `co_planners` Section

```json
{
  "co_planners": {
    "enabled": false,
    "agents": {
      "codex": {
        "enabled": false,
        "command": "codex exec",
        "flags": "--json --ephemeral --full-auto --skip-git-repo-check",
        "model": null
      },
      "gemini": {
        "enabled": false,
        "command": "gemini -p",
        "flags": "--output-format json",
        "model": null
      },
      "opencode": {
        "enabled": false,
        "command": "opencode run",
        "flags": "--format json",
        "model": null
      },
      "claude": {
        "enabled": false,
        "command": "claude -p",
        "flags": "--output-format json --allowedTools Read",
        "model": null
      }
    },
    "checkpoints": {
      "research": [],
      "requirements": [],
      "roadmap": [],
      "plan": [],
      "execution_review": [],
      "verification": []
    },
    "timeout_seconds": 120,
    "max_artifact_tokens": 50000
  }
}
```

### Schema Design Rationale

**`enabled: false` default:** Co-planners are opt-in, not opt-out. Unlike the adversary (which defaults to enabled because it uses the same Claude model), co-planners require external CLI tools to be installed and authenticated. Defaulting to disabled avoids errors for users without these tools.

**`agents` section with `command` and `flags`:** Stores CLI invocation details per tool. This decouples the orchestrator from CLI-specific syntax -- if Codex changes a flag name, only the config needs updating. `model: null` means use the tool's default; override with e.g. `"gpt-5-codex"` or `"gemini-2.5-flash"`.

**`checkpoints` as arrays of agent names:** Unlike the adversary (single agent, boolean per checkpoint), co-planners support multiple agents at a single checkpoint. Arrays naturally express "which agents participate here." Empty array = no agents at that checkpoint.

**`timeout_seconds: 120`:** External CLI calls can hang due to network issues, authentication problems, or API rate limits. Default 120s prevents blocking the workflow indefinitely.

**`max_artifact_tokens: 50000`:** Caps content sent to external agents (characters, roughly 12.5K tokens). Prevents token limit issues with smaller context window models.

### Config Precedence Chain

```
co_planners.enabled === false          -> Skip all (global kill switch)
agents.{name}.enabled === false        -> Skip that agent even if listed in checkpoint
checkpoints.{name} is empty []        -> No external agents at that checkpoint
Tool not installed (command -v fails)  -> Skip with warning (graceful degradation)
Tool times out                         -> Skip with warning, continue workflow
```

### Config Reading Pattern

Follows the established `node -e` pattern from adversary config:

```bash
CHECKPOINT_NAME="requirements"
COPLANNER_CONFIG=$(node -e "
  try {
    const c = JSON.parse(require('fs').readFileSync('.planning/config.json', 'utf8'));
    const cp = c.co_planners || {};
    if (cp.enabled === false) { console.log(JSON.stringify({ agents: [], timeout: 120, maxTokens: 50000 })); process.exit(0); }
    const agentNames = cp.checkpoints?.[process.argv[1]] || [];
    const timeout = cp.timeout_seconds || 120;
    const maxTokens = cp.max_artifact_tokens || 50000;
    const agents = agentNames
      .filter(a => cp.agents?.[a]?.enabled !== false && cp.agents?.[a]?.command)
      .map(a => ({
        name: a,
        command: cp.agents[a].command,
        flags: cp.agents[a].flags || '',
        model: cp.agents[a].model || null
      }));
    console.log(JSON.stringify({ agents, timeout, maxTokens }));
  } catch(e) { console.log(JSON.stringify({ agents: [], timeout: 120, maxTokens: 50000 })); }
" "$CHECKPOINT_NAME" 2>/dev/null || echo '{"agents":[],"timeout":120,"maxTokens":50000}')
```

Or preferably via the gsd-tools abstraction:

```bash
COPLANNER_CONFIG=$(node ~/.claude/get-shit-done/bin/gsd-tools.cjs coplanner config "$CHECKPOINT_NAME")
```

## Data Flow

### Single Co-Planner at Checkpoint

```
Orchestrator                  gsd-tools.cjs              External CLI
     │                              │                         │
     │ coplanner invoke gemini      │                         │
     │   --prompt-file /tmp/xx.md   │                         │
     │----------------------------->│                         │
     │                              │ command -v gemini       │
     │                              │ (check availability)    │
     │                              │                         │
     │                              │ timeout 120s            │
     │                              │ cat /tmp/xx.md |        │
     │                              │   gemini -p \           │
     │                              │   --output-format json  │
     │                              │------------------------>│
     │                              │                         │
     │                              │ { response, stats }     │
     │                              │<------------------------|
     │                              │                         │
     │  { agent: "gemini",          │                         │
     │    status: "success",        │                         │
     │    feedback: "...",          │                         │
     │    error: null }             │                         │
     │<-----------------------------|                         │
     │                                                        │
     │ Claude synthesizes                                     │
     │ feedback into artifact revision                        │
     v
```

### Multiple Co-Planners at Checkpoint (Parallel)

```
Orchestrator
     │
     │ Reads config: ["codex", "gemini"] for requirements checkpoint
     │
     │ Builds prompt file (shared)
     │
     ├── Bash call 1: coplanner invoke codex --prompt-file /tmp/xx.md
     │                    │
     │                    └──> codex exec - --json --ephemeral --full-auto
     │
     ├── Bash call 2: coplanner invoke gemini --prompt-file /tmp/xx.md
     │                    │
     │                    └──> gemini -p --output-format json
     │
     │ (Both run in parallel as separate Bash tool calls)
     │
     │ Collect responses:
     │   codex: { agent: "codex", feedback: "..." }
     │   gemini: { agent: "gemini", feedback: "..." }
     │
     │ Claude synthesizes both responses
     │   - Address valid HIGH concerns from either
     │   - Note suggestions from both
     │   - Reject incompatible recommendations
     │
     │ Revise artifact on disk
     v
```

### Co-Planner + Adversary at Same Checkpoint

```
Orchestrator
     │
     │-- 1. Create artifact (e.g., REQUIREMENTS.md)
     │
     │-- 2. Co-planner review (additive perspective)
     │       codex: "Consider adding session expiration requirement"
     │       gemini: "Missing non-functional performance requirements"
     │
     │-- 3. Claude synthesizes co-planner input
     │       - Adds AUTH-04 (session expiration) from codex
     │       - Adds PERF-01 (response time) from gemini
     │       - Revises REQUIREMENTS.md on disk
     │
     │-- 4. Adversary debate loop (stress test)
     │       adversary round 1: "MAJOR: Auth requirements assume
     │                           single-tenant but PROJECT.md says multi-tenant"
     │
     │-- 5. Claude defends/revises (existing pattern)
     │       - Addresses adversary challenge
     │       - Revises REQUIREMENTS.md on disk
     │
     │-- 6. [Optional] Adversary rounds 2-3
     │
     │-- 7. User approval of final artifact
     v
```

**Ordering rationale:** Co-planners run FIRST (refine the artifact with additional perspective), adversary runs SECOND (challenge the refined artifact). This way the adversary reviews the best version, not the raw draft.

## CLI Invocation Specifics

### Codex CLI (OpenAI)

**Invocation:**
```bash
timeout ${TIMEOUT}s cat "$PROMPT_FILE" | \
  codex exec - --json --ephemeral --full-auto --skip-git-repo-check 2>/dev/null
```

**Key flags:**
| Flag | Purpose | Required? |
|------|---------|-----------|
| `-` (stdin) | Read prompt from stdin | Yes (avoids shell escaping issues) |
| `--json` | JSON Lines output to stdout, progress to stderr | Yes (machine-readable) |
| `--ephemeral` | No session persistence | Yes (review-only, no state needed) |
| `--full-auto` | No approval prompts | Yes (non-interactive) |
| `--skip-git-repo-check` | Works outside git repos | Yes (review-only, no file changes) |
| `-m MODEL` | Model override | Optional |

**Output format:** JSON Lines on stdout. Each line is a JSON event. Parse for `turn.completed` events to extract the final assistant message.

**Authentication:** `CODEX_API_KEY` environment variable or `codex login`.

**Confidence:** HIGH -- verified via developers.openai.com/codex/noninteractive and developers.openai.com/codex/cli/reference

### Gemini CLI (Google)

**Invocation:**
```bash
timeout ${TIMEOUT}s cat "$PROMPT_FILE" | \
  gemini -p --output-format json 2>/dev/null
```

**Key flags:**
| Flag | Purpose | Required? |
|------|---------|-----------|
| `-p` / `--prompt` | Headless mode | Yes |
| `--output-format json` | Structured JSON output | Yes (machine-readable) |
| `-m MODEL` | Model selection | Optional (default: gemini-2.5-flash) |
| `-y` / `--yolo` | Auto-approve actions | Not needed for review-only |

**Output format:** Single JSON object with `response` field (text answer) and `stats` (token usage, latency).

**Authentication:** `gemini auth` or Google Cloud credentials.

**Confidence:** HIGH -- verified via google-gemini.github.io/gemini-cli/docs/cli/headless.html

### OpenCode CLI

**Invocation:**
```bash
timeout ${TIMEOUT}s cat "$PROMPT_FILE" | \
  opencode run --format json 2>/dev/null
```

**Key flags:**
| Flag | Purpose | Required? |
|------|---------|-----------|
| `run` | Non-interactive mode | Yes |
| `--format json` | JSON output | Yes (machine-readable) |
| `-m PROVIDER/MODEL` | Model selection | Optional |

**Output format:** JSON event stream. Parse for assistant response content.

**Authentication:** Per-provider API keys (configured in OpenCode settings).

**Confidence:** MEDIUM -- verified via opencode.ai/docs/cli. Stdin piping in `run` mode has fewer documented examples than Codex/Gemini. May need integration testing.

### Claude Code Self-Review (`claude -p`)

**Invocation:**
```bash
timeout ${TIMEOUT}s cat "$PROMPT_FILE" | \
  claude -p --output-format json --allowedTools "Read" 2>/dev/null
```

**Key flags:**
| Flag | Purpose | Required? |
|------|---------|-----------|
| `-p` / `--print` | Headless mode | Yes |
| `--output-format json` | JSON output with `result` field | Yes |
| `--allowedTools "Read"` | Limit tool access (review-only) | Recommended |
| `--append-system-prompt` | Add review instructions | Optional |

**Output format:** JSON with `result` field (text response), `session_id`, usage metadata.

**Authentication:** Same Anthropic API key as parent Claude Code process.

**Confidence:** HIGH -- verified via code.claude.com/docs/en/headless

### Prompt Passing Strategy

**Challenge:** Large artifacts with special characters will break when passed as shell arguments.

**Solution: Temp file + stdin pipe (all CLI tools support this):**

```bash
# Build prompt file
PROMPT_FILE=$(mktemp)
cat > "$PROMPT_FILE" <<'REVIEW_HEADER'
You are reviewing a requirements document for a software project.

## Project Context
[project_summary]

## Artifact to Review
REVIEW_HEADER
cat .planning/REQUIREMENTS.md | head -c "$MAX_CHARS" >> "$PROMPT_FILE"
cat >> "$PROMPT_FILE" <<'REVIEW_FOOTER'

## Review Instructions
[checkpoint-specific instructions]
REVIEW_FOOTER

# Invoke
REVIEW=$(timeout ${TIMEOUT}s cat "$PROMPT_FILE" | $CLI_COMMAND $CLI_FLAGS 2>/dev/null)
rm -f "$PROMPT_FILE"
```

**Why not shell arguments:** Breaks with special characters, quotes, long content. Not portable.
**Why not file references:** Only works for tools with file access. Not all tools can read project files in review-only mode.

## Response Normalization

Each CLI tool returns a different JSON format. The normalization layer in `gsd-tools.cjs` standardizes to:

```json
{
  "agent": "codex",
  "status": "success",
  "feedback": "full text of review response...",
  "error": null
}
```

### Parsing per tool:

| CLI Tool | Raw Output | Extract Feedback From |
|----------|------------|----------------------|
| Codex | JSON Lines (multiple events) | Last `turn.completed` event -> message text |
| Gemini | `{ "response": "...", "stats": {...} }` | `.response` field |
| OpenCode | JSON event stream | Assistant message content |
| Claude | `{ "result": "...", "session_id": "..." }` | `.result` field |

### Error states:

| Condition | `status` | `feedback` | `error` |
|-----------|----------|------------|---------|
| Success | `"success"` | Review text | `null` |
| Tool not found | `"unavailable"` | `""` | `"codex not found"` |
| Timeout | `"timeout"` | `""` | `"exceeded 120s"` |
| Auth failure | `"auth_error"` | `""` | `"authentication required"` |
| Parse failure | `"parse_error"` | Raw stdout | `"failed to parse JSON"` |

## Integration Points by Command

### Checkpoint Map

| Checkpoint | Command | Insertion Point | Before Step |
|------------|---------|----------------|-------------|
| `research` | `new-project` | After Phase 6 (synthesis done) | Phase 7 (requirements) |
| `requirements` | `new-project` / `new-milestone` | After Phase 7 (REQUIREMENTS.md written) | Phase 7.5 (adversary) |
| `roadmap` | `new-project` / `new-milestone` | After Phase 8 (ROADMAP.md written) | Phase 8.5 (adversary) |
| `plan` | `plan-phase` | After Step 11 (checker passed) | Step 12.5 (adversary) |
| `execution_review` | `execute-phase` | After Step 5 (waves complete) | Step 7 (verifier) |
| `verification` | `execute-phase` | After Step 7 (verifier done) | Step 7.5 (adversary) |

### Modified vs New Files

| File | Action | Scope of Change |
|------|--------|----------------|
| `commands/gsd/new-project.md` | **MODIFY** | Add co-planner blocks at 3 insertion points |
| `commands/gsd/new-milestone.md` | **MODIFY** | Add co-planner blocks (same pattern as new-project) |
| `commands/gsd/plan-phase.md` | **MODIFY** | Add co-planner block at 1 insertion point |
| `commands/gsd/execute-phase.md` | **MODIFY** | Add co-planner blocks at 2 insertion points |
| `commands/gsd/settings.md` | **MODIFY** | Add co-planner settings questions (3 new AskUserQuestion blocks) |
| `get-shit-done/references/co-planners.md` | **NEW** | Reference doc: invocation patterns, config reading, prompt templates, response parsing |
| `get-shit-done/templates/config.json` | **MODIFY** | Add `co_planners` section with defaults |
| `get-shit-done/bin/gsd-tools.cjs` | **MODIFY** | Add `coplanner config`, `coplanner invoke`, `coplanner parse` commands |
| `docs/concepts/co-planning.md` | **NEW** | User-facing concept doc |
| `docs/reference/commands.md` | **MODIFY** | Document co-planner integration in relevant commands |

**No new agent files needed.** External agents are invoked via Bash inline in orchestrator commands.

### Workflow Pattern at Each Checkpoint

```markdown
## N.5. Co-Planner Review (Optional)

**Read co-planner config:**

```bash
COPLANNER_CONFIG=$(node ~/.claude/get-shit-done/bin/gsd-tools.cjs coplanner config "$CHECKPOINT_NAME")
AGENTS=$(echo "$COPLANNER_CONFIG" | node -e "
  const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
  d.agents.forEach(a=>console.log(a.name));
")
```

**If no agents configured:** Skip to next step.

**If agents configured:**

Display banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD > CO-PLANNER REVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Reviewing {artifact_type} with: {agent_names}
```

1. Build prompt file with artifact + review instructions
2. For each agent (parallel Bash calls if multiple):
   ```bash
   REVIEW=$(node gsd-tools.cjs coplanner invoke {agent} --prompt-file "$PROMPT_FILE")
   ```
3. Collect all responses
4. Synthesize: Claude evaluates each piece of feedback
   - Address valid HIGH concerns (revise artifact on disk)
   - Note MEDIUM/LOW suggestions
   - Reject incompatible recommendations with rationale
5. Display summary:
   ```
   {agent}: {N} concerns addressed, {M} noted
   ```
6. If artifact revised: set `COPLANNER_REVISED=true`

**Proceed to adversary review or user approval.**
```

## Prompt Architecture

### Review Prompt Template

```markdown
You are reviewing a {artifact_type} for a software project.

## Project Context
{project_name}: {one_paragraph_summary}

## Artifact to Review
---
{artifact_content}
---

## Review Instructions
Analyze this {artifact_type} and provide:

1. **Concerns**: Issues that should be addressed, each with:
   - Severity: HIGH (must address) / MEDIUM (should address) / LOW (nice to address)
   - What: The specific issue
   - Where: Which section/requirement/phase
   - Suggestion: How to address it

2. **Missing Elements**: What was overlooked

3. **Overall Assessment**: APPROVE (no significant concerns) or REVISE (concerns need attention)

Be constructive and specific. Focus on actionable feedback.
```

**Design decisions:**
- Includes project context but NOT full project history (targeted prompts produce better reviews)
- Does NOT include adversary challenges (prevents echo chamber)
- Does NOT include other co-planner responses (independent perspectives)
- Severity levels match adversary vocabulary (HIGH/MEDIUM/LOW maps to BLOCKING/MAJOR/MINOR)
- Overall assessment provides quick signal for orchestrator

### Prompt Size Constraints

Keep prompts under 32K tokens to be safe across all providers. For large artifacts:
- Truncate artifact at `max_artifact_tokens` (default 50K characters)
- Prepend a summary header so external agent has context even for truncated content
- Include only the target artifact + brief project summary (1 paragraph)

## Settings Integration

### New Questions in `settings.md`

Insert after adversary settings block as a new round:

```javascript
// Round 3 - Co-planner settings

// Auto-detect tools first:
// DETECTED_TOOLS=$(command -v codex && echo codex; command -v gemini && echo gemini; ...)

{
  question: "Enable external AI co-planning?",
  header: "Co-Planners",
  multiSelect: false,
  options: [
    { label: "No (Default)", description: "Use only Claude for planning and review" },
    { label: "Yes", description: "Send artifacts to external AI CLIs for review" }
  ]
}

// ONLY show if co-planners = "Yes":
{
  question: "Which AI tools? (detected: {detected_tools})",
  header: "Tools",
  multiSelect: true,
  options: [
    { label: "Codex CLI", description: "OpenAI codex exec" },
    { label: "Gemini CLI", description: "Google gemini -p" },
    { label: "OpenCode CLI", description: "opencode run" },
    { label: "Claude Code", description: "claude -p (self-review, fresh context)" }
  ]
  // Pre-select detected tools
}

// ONLY show if co-planners = "Yes":
{
  question: "Which checkpoints should get external review?",
  header: "Checkpoints",
  multiSelect: true,
  options: [
    { label: "Research", description: "Review research findings" },
    { label: "Requirements", description: "Review requirements document" },
    { label: "Roadmap", description: "Review roadmap phases" },
    { label: "Plan", description: "Review execution plans" },
    { label: "Execution Review", description: "Review completed work" },
    { label: "Verification", description: "Review verification conclusions" }
  ]
}
```

### Display in Settings Summary

```
| Setting              | Value |
|----------------------|-------|
| Co-Planners          | {On/Off} |
| Co-Planner Tools     | {codex, gemini, ...} |
| Co-Planner Checkpoints | {requirements, roadmap, ...} |
```

## Display Format

Follows existing GSD UI patterns:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD > CO-PLANNER REVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Reviewing requirements with: codex, gemini

codex:
  + AUTH-04 (session expiration) -- HIGH, addressed
  ~ Rate limiting on login endpoints -- MEDIUM, noted
  - Remove mobile support -- rejected (contradicts project scope)

gemini:
  + PERF-01 (response time target) -- MEDIUM, addressed
  ~ Accessibility requirements section -- LOW, noted

Artifact revised with 2 additions.
```

Key: `+` = concern addressed (artifact revised), `~` = noted for consideration, `-` = rejected with rationale.

## Anti-Patterns

### Anti-Pattern 1: External Agent as File Writer
**What:** Giving external agents write access to modify project artifacts directly.
**Why it is wrong:** Violates Claude-as-orchestrator principle. Creates merge conflicts. Loses audit trail.
**Do this instead:** External agents provide feedback text. Claude synthesizes and applies changes.

### Anti-Pattern 2: Blocking on External Agent Failure
**What:** Erroring out when an external CLI tool is unavailable or times out.
**Why it is wrong:** External tools are optional enhancements. Workflow should never depend on them.
**Do this instead:** Graceful degradation. Log the warning, continue without that agent's input.

### Anti-Pattern 3: Replacing Adversary with External Agents
**What:** Disabling adversary and using external agents for challenge-style reviews.
**Why it is wrong:** External agents provide general feedback. Adversary provides structured, severity-classified challenges with debate loops. Different roles.
**Do this instead:** Use both. External agents add perspective first. Adversary stress-tests the result after.

### Anti-Pattern 4: Sharing Responses Between Co-Planners
**What:** Passing one co-planner's response to another co-planner.
**Why it is wrong:** Creates echo chamber. Second reviewer anchored by first reviewer's opinions.
**Do this instead:** Each co-planner receives only the original artifact. Claude synthesizes independently.

### Anti-Pattern 5: Passing Full Project Context
**What:** Sending PROJECT.md + REQUIREMENTS.md + ROADMAP.md + all research to every external call.
**Why it is wrong:** Exceeds token limits. Most context is irrelevant. Dilutes review focus.
**Do this instead:** Send the target artifact + 1-paragraph project summary.

### Anti-Pattern 6: Co-Planning During Execution
**What:** Invoking co-planners while executor agent is running.
**Why it is wrong:** Disrupts atomic commit flow, creates inconsistent feedback on in-progress work.
**Do this instead:** Co-plan during planning and verification only, never during execution.

## Scaling Considerations

| Concern | 1 agent | 2-3 agents | 4 agents all checkpoints |
|---------|---------|------------|--------------------------|
| Latency per checkpoint | ~30-60s | ~30-60s (parallel) | ~30-60s (parallel) |
| Token cost | 1x | ~2-3x | ~4x per checkpoint |
| Synthesis complexity | Simple | Medium (merge and compare) | Needs structured comparison |
| Config complexity | Simple | Manageable | Needs validation |

### Scaling Priorities

1. **First bottleneck: Latency.** External CLI tools take 15-60 seconds. Parallel invocation mitigates when multiple agents configured. Default 120s timeout prevents blocking.
2. **Second bottleneck: Token cost.** Each call consumes tokens on that provider. Per-checkpoint agent selection controls cost.
3. **Third bottleneck: Synthesis complexity.** Conflicting feedback from multiple agents requires orchestrator judgment. Structured prompts and standardized review format mitigate this.

## Suggested Build Order

| Phase | Component | Depends On | Rationale |
|-------|-----------|------------|-----------|
| 1 | Config schema (`co_planners` in config.json template) | Nothing | Everything reads config. Must exist first. |
| 2 | `gsd-tools.cjs` extensions (`coplanner config/invoke/parse`) | Config schema | Provides the CLI abstraction layer. |
| 3 | Reference doc (`co-planners.md`) | Config + tools | Documents patterns used by all command modifications. |
| 4 | Settings integration (`settings.md`) | Config schema | Allows users to configure before workflow runs. |
| 5 | Single checkpoint: `requirements` in `new-project.md` | Config + tools + reference | **Critical proof point.** Proves the full pattern end-to-end. |
| 6 | Remaining 5 checkpoints across commands | Proven pattern from phase 5 | Mechanical replication of proven pattern. |
| 7 | Documentation (`co-planning.md`, command docs) | All above | User-facing docs. |

**Build order rationale:** Phase 5 is the critical proof point. If the pattern works for requirements co-planning in new-project, the same pattern applies mechanically to all other checkpoints. Front-load infrastructure (1-4), prove with one integration (5), replicate (6), document (7).

## Sources

- [Codex CLI Non-Interactive Mode](https://developers.openai.com/codex/noninteractive/) -- Official OpenAI docs (HIGH confidence)
- [Codex CLI Reference](https://developers.openai.com/codex/cli/reference/) -- Complete flag reference (HIGH confidence)
- [Gemini CLI Headless Mode](https://google-gemini.github.io/gemini-cli/docs/cli/headless.html) -- Official Google docs (HIGH confidence)
- [Gemini CLI Configuration](https://google-gemini.github.io/gemini-cli/docs/get-started/configuration.html) -- Config reference (HIGH confidence)
- [OpenCode CLI Docs](https://opencode.ai/docs/cli/) -- Official OpenCode docs (MEDIUM confidence -- less headless documentation)
- [Claude Code Headless Mode](https://code.claude.com/docs/en/headless) -- Official Anthropic docs (HIGH confidence)
- Existing GSD codebase: `commands/gsd/new-project.md`, `commands/gsd/plan-phase.md`, `commands/gsd/execute-phase.md`, `commands/gsd/settings.md`, `agents/gsd-adversary.md`, `get-shit-done/references/planning-config.md`, `get-shit-done/templates/config.json`, `get-shit-done/bin/gsd-tools.cjs`

---
*Architecture research for: External AI Agent Co-Planning Integration (v2.2)*
*Researched: 2026-02-16*
