# Phase 1: Auto Mode Foundation - Context

**Gathered:** 2026-02-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Intelligent model selection system that routes tasks to appropriate model tiers (Haiku/Sonnet/Opus) based on task patterns, with token tracking and quota management. Tasks come from plans (predefined) and sub-coordinators (dynamic). A routing skill provides model recommendations plus relevant context (docs/guides/skills/instructions) per task.

</domain>

<decisions>
## Implementation Decisions

### Core Architecture
- **Task Context Skill** — Single skill that returns: model recommendation, relevant guides (top 3), relevant skills, project-specific instructions
- **Sub-coordinator spawns agents** — Skill decides, sub-coordinator executes via Task tool with model parameter
- **No explicit tags on tasks** — Skill infers model from task description/keywords only

### Complexity Detection
- **Hybrid multi-signal** — Combine keyword patterns from task description + explicit annotations from docs
- **Pattern → Model table** — Simple lookup format in the skill, easy to scan and edit
- **Tie-breaking** — When multiple patterns match different models, stronger model wins (safety over savings)
- **Output** — Skill returns model name only (no confidence scores)

### Rule Generation (Phase 1 Scope)
- **Session scanning** — Haiku scans last 5-7 days of sessions from igaming-platform project
- **Sources** — Both Claude Code conversation logs and GSD execution logs
- **Output** — Markdown table: Pattern | Suggested Model | Evidence
- **User review** — Present suggestions, user corrects before finalizing

### Context Matching
- **Indexing strategy** — Hybrid: index once per session, refresh on file changes
- **Matching method** — Keyword extraction + explicit front-matter tags (existing YAML format)
- **Match limit** — Top 3 most relevant docs/guides injected per task
- **CLAUDE.md handling** — Keyword extraction from instruction blocks

### Tag System (Phase 1 Scope)
- **Use existing front-matter** — Docs already have YAML tags, parse directly
- **Tag review** — Haiku reviews all docs, suggests tag updates for task-matching use case
- **Find validators** — Search for existing doc/tag validators (GitHub workflows, git hooks)
- **Update flows** — Ensure tag standards support routing needs
- **Changes presented for review** — User approves before applying

### Model Tiers
- **Three tiers** — Haiku, Sonnet, Opus
- **Symbolic names** — Skill outputs "haiku"/"sonnet"/"opus", mapping to model IDs in GSD settings
- **No hard locks** — All routing via pattern matching, no model forced for specific task types
- **Rule scope** — Global rules in ~/.claude/, project rules in .planning/, project overrides global

### Cost/Quota Display
- **Display timing** — Real-time running total + on-request command
- **Status bar format** — `Tokens: 32K → Haiku | +15 min | H:60% S:35% O:5%`
- **Metrics shown:**
  - Tokens delegated to smaller models
  - Session extension estimate (token-to-time conversion)
  - Model distribution percentage
- **On-request command** — Session total + per-model breakdown in table format

### Quota Management
- **Soft warning** — At 80% of session quota
- **Auto-wait** — At 98-99%: pause, calculate refresh time, sleep until quota restores, verify, resume
- **Same logic for weekly quota**
- **Quota logic location** — In sub-coordinator (checks before spawning, handles wait/resume)

### Fallback Behavior
- **Default model** — Sonnet when no patterns match
- **Unmatched logging** — Track tasks that fell back to default for periodic rule improvement
- **Escalation ladder** — Haiku → Sonnet → Opus (full ladder before failing)
- **Failure criteria:**
  - Task error/exception
  - Validation rejection (Phase 2)
  - Duration timeout: Haiku 20min, Sonnet 40min, Opus 1hr (configurable)
- **Timeout logging** — Task details, duration, model assigned, reason for delay

### Claude's Discretion
- Exact keyword extraction algorithm
- Pattern matching implementation details
- Status bar rendering approach
- Log file format and rotation

</decisions>

<specifics>
## Specific Ideas

- "I want the routing skill to also inject relevant docs/guides/skills — not just model. This solves Claude ignoring CLAUDE.md instructions."
- "Haiku should scan my igaming-platform project sessions to bootstrap initial routing rules from real usage."
- "For supabase commands — Claude keeps ignoring project-specific instructions. Active injection per-task should fix this."
- "Quota hitting should auto-sleep and wait for refresh, not stop and ask user. Keeps autonomous execution going."

</specifics>

<deferred>
## Deferred Ideas

- Semantic embedding for context matching — keep for later, start with keyword + tags
- Haiku task validation by Sonnet — Phase 2 (AUTO-05)
- Learning from user feedback on incorrect model choices — Phase 2

</deferred>

---

*Phase: 01-auto-mode-foundation*
*Context gathered: 2026-02-15*
