# GSD (Get Shit Done) — Claude Code Concepts Analysis

This document analyzes the Claude Code concepts utilized in the GSD system, including how workflows, templates, and references are used.

---

## Table of Contents

1. [Overview](#overview)
2. [Core Claude Code Concepts Used](#core-claude-code-concepts-used)
3. [GSD-Specific Concepts](#gsd-specific-concepts)
   - [Workflows](#workflows)
   - [Templates](#templates)
   - [References](#references)
4. [Flow Diagrams](#flow-diagrams)
5. [Documentation Links](#documentation-links)

---

## Overview

**Get Shit Done (GSD)** is a sophisticated meta-prompting and context engineering system built on top of Claude Code. It addresses "context rot" — the quality degradation that occurs as Claude fills its context window — by using specialized subagents, wave-based parallel execution, and structured document flows.

**Key Philosophy:**
- Complexity lives in the system, not the workflow
- Plans are prompts, not documents-to-transform
- Context engineering through XML formatting
- Multi-agent orchestration with specialized roles

---

## Core Claude Code Concepts Used

### 1. Custom Slash Commands

| Aspect | Details |
|--------|---------|
| **What** | User-invocable commands like `/gsd:new-project`, `/gsd:plan-phase` |
| **Location** | `/commands/gsd/*.md` |
| **Count** | ~25 commands |
| **Claude Concept?** | **Yes** |
| **Docs** | https://docs.anthropic.com/en/docs/claude-code/slash-commands |

**How GSD Uses It:**
Commands are markdown files with YAML frontmatter defining metadata:

```yaml
---
name: gsd:plan-phase
description: Create detailed execution plan for a phase
argument-hint: "[phase] [--research] [--gaps]"
agent: gsd-planner
allowed-tools:
  - Read
  - Write
  - Bash
  - Task
---
```

The body contains `<objective>`, `<process>`, and `<execution_context>` XML sections that guide Claude's behavior when the command is invoked.

---

### 2. Subagents

| Aspect | Details |
|--------|---------|
| **What** | Specialized AI workers spawned via Task tool |
| **Location** | `/agents/*.md` |
| **Count** | 11 agents |
| **Claude Concept?** | **Yes** |
| **Docs** | https://docs.anthropic.com/en/docs/claude-code/sub-agents |

**GSD Subagents:**

| Agent | Purpose | Spawned By |
|-------|---------|------------|
| `gsd-planner` | Creates executable phase plans | `/gsd:plan-phase` |
| `gsd-executor` | Executes plans atomically with per-task commits | `/gsd:execute-phase` |
| `gsd-verifier` | Verifies phase goals achieved (goal-backward analysis) | `/gsd:execute-phase` |
| `gsd-project-researcher` | Domain ecosystem research before roadmap | `/gsd:new-project` |
| `gsd-codebase-mapper` | Analyzes existing codebase structure | `/gsd:map-codebase` |
| `gsd-phase-researcher` | Deep research for specific phases | `/gsd:plan-phase` |
| `gsd-roadmapper` | Creates phase structure from requirements | `/gsd:new-project` |
| `gsd-plan-checker` | Validates plans meet requirements | `/gsd:plan-phase` |
| `gsd-debugger` | Investigates bugs systematically | `/gsd:debug` |
| `gsd-integration-checker` | Verifies external integrations | Various |
| `gsd-research-synthesizer` | Synthesizes research findings | Various |

**Agent Structure:**
```yaml
---
name: gsd-planner
description: Creates executable phase plans
tools: Read, Write, Bash, Glob, Grep, WebFetch
color: green
---

<role>...</role>
<philosophy>...</philosophy>
<process>...</process>
```

**Key Design:** Each subagent spawns with a fresh 200k context window, preventing "context rot" from accumulated garbage.

---

### 3. Hooks

| Aspect | Details |
|--------|---------|
| **What** | Lifecycle event handlers |
| **Location** | `/hooks/*.js` |
| **Count** | 2 hooks |
| **Claude Concept?** | **Yes** |
| **Docs** | https://docs.anthropic.com/en/docs/claude-code/hooks |

**GSD Hooks:**

| Hook Type | File | Purpose |
|-----------|------|---------|
| **SessionStart** | `gsd-check-update.js` | Checks for GSD updates when Claude Code starts |
| **StatusLine** | `statusline.js` | Custom status display showing model, task, context % |

**Configuration in `settings.json`:**
```json
{
  "hooks": {
    "SessionStart": [{
      "hooks": [{
        "type": "command",
        "command": "node $HOME/.claude/hooks/gsd-check-update.js"
      }]
    }]
  },
  "statusLine": {
    "type": "command",
    "command": "node $HOME/.claude/hooks/statusline.js"
  }
}
```

---

### 4. MCP Server Integration

| Aspect | Details |
|--------|---------|
| **What** | External tool servers (Model Context Protocol) |
| **Integration** | Context7 for library documentation |
| **Claude Concept?** | **Yes** |
| **Docs** | https://docs.anthropic.com/en/docs/claude-code/mcp |

**How GSD Uses It:**
Agents reference MCP tools in their `tools` field:
```yaml
tools: Read, Write, Bash, mcp__context7__*
```

Used primarily for:
- Library documentation lookup (`mcp__context7__resolve-library-id`)
- Verifying library capabilities against official docs
- External API research

---

### 5. Task Tool (Parallel Orchestration)

| Aspect | Details |
|--------|---------|
| **What** | Spawns subagents with parallel execution |
| **Claude Concept?** | **Yes** |
| **Docs** | https://docs.anthropic.com/en/docs/claude-code/slash-commands#skill-tool |

**How GSD Uses It:**
```python
Task(
  prompt=filled_prompt,
  subagent_type="gsd-planner",
  description="Plan Phase 3"
)
```

**Wave-Based Parallelization:**
```
Wave 1: [Plan A] [Plan B] [Plan C]  (parallel)
            ↓        ↓        ↓
Wave 2: [Plan D] [Plan E]           (parallel)
            ↓        ↓
Wave 3: [Plan F]                    (sequential)
```

---

### 6. Settings Configuration

| Aspect | Details |
|--------|---------|
| **What** | Configuration via `settings.json` |
| **Claude Concept?** | **Yes** |
| **Docs** | https://docs.anthropic.com/en/docs/claude-code/settings |

GSD configures:
- Hook registration
- StatusLine configuration
- Tool permissions per command (`allowed-tools` in YAML)

---

### 7. File References (@-syntax)

| Aspect | Details |
|--------|---------|
| **What** | Loading files into context via `@path/to/file` |
| **Claude Concept?** | **Yes** |
| **Docs** | https://docs.anthropic.com/en/docs/claude-code/memory |

**How GSD Uses It:**
Commands and prompts reference files using `@` syntax:
```markdown
<execution_context>
@~/.claude/get-shit-done/workflows/execute-phase.md
@~/.claude/get-shit-done/templates/summary.md
@~/.claude/get-shit-done/references/checkpoints.md
</execution_context>

<context>
Plan: @{plan_path}
Project state: @.planning/STATE.md
</context>
```

This is how **workflows**, **templates**, and **references** get loaded into Claude's context.

---

## GSD-Specific Concepts

These are **NOT native Claude Code concepts** but are GSD's custom implementation patterns using the Claude concepts above.

### Workflows

| Aspect | Details |
|--------|---------|
| **What** | Multi-step orchestration scripts in markdown |
| **Location** | `/get-shit-done/workflows/*.md` |
| **Count** | 12 workflows |
| **Claude Concept?** | **No** — GSD-specific pattern using @ file references |

**What Workflows Are:**
Workflows are detailed step-by-step procedures that guide how commands and agents execute. They define:
- Process steps with bash commands
- Decision trees and branching logic
- Error handling protocols
- State management patterns

**GSD Workflows:**

| Workflow | Purpose | Used By |
|----------|---------|---------|
| `execute-phase.md` | Wave-based parallel plan execution | `/gsd:execute-phase` |
| `execute-plan.md` | Single plan execution with commits | Executor subagent |
| `verify-phase.md` | Goal-backward phase verification | `/gsd:execute-phase` |
| `verify-work.md` | Manual UAT testing with persistent state | `/gsd:verify-work` |
| `diagnose-issues.md` | Parallel debug investigation | `/gsd:verify-work` |
| `discovery-phase.md` | Project initialization questioning | `/gsd:new-project` |
| `discuss-phase.md` | Capture implementation decisions | `/gsd:discuss-phase` |
| `map-codebase.md` | Existing codebase analysis | `/gsd:map-codebase` |
| `resume-project.md` | Session restoration | `/gsd:resume-work` |
| `complete-milestone.md` | Archive and tag milestone | `/gsd:complete-milestone` |
| `transition.md` | Phase transition handling | Various |
| `list-phase-assumptions.md` | Extract assumptions from plans | Various |

**Example Workflow Structure (`execute-phase.md`):**
```xml
<purpose>
Execute all plans in a phase using wave-based parallel execution.
</purpose>

<core_principle>
The orchestrator's job is coordination, not execution.
</core_principle>

<process>
  <step name="load_project_state">...</step>
  <step name="validate_phase">...</step>
  <step name="discover_plans">...</step>
  <step name="group_by_wave">...</step>
  <step name="execute_waves">...</step>
  <step name="aggregate_results">...</step>
</process>
```

**How Workflows Are Loaded:**
Via `@` references in command prompts:
```markdown
<execution_context>
@~/.claude/get-shit-done/workflows/execute-phase.md
</execution_context>
```

---

### Templates

| Aspect | Details |
|--------|---------|
| **What** | Document format specifications |
| **Location** | `/get-shit-done/templates/*.md` |
| **Count** | 22 templates |
| **Claude Concept?** | **No** — GSD-specific pattern for structured output |

**What Templates Are:**
Templates define the exact format and structure for documents that GSD creates and maintains. They include:
- Required sections and fields
- Guidelines for content
- Evolution/lifecycle rules
- Examples

**GSD Templates:**

| Template | Purpose | Creates |
|----------|---------|---------|
| `project.md` | Project vision document | `.planning/PROJECT.md` |
| `requirements.md` | Scoped requirements | `.planning/REQUIREMENTS.md` |
| `roadmap.md` | Phase structure | `.planning/ROADMAP.md` |
| `state.md` | Project memory/position | `.planning/STATE.md` |
| `summary.md` | Plan execution summary | `*-SUMMARY.md` |
| `verification-report.md` | Phase verification | `*-VERIFICATION.md` |
| `UAT.md` | User acceptance testing | `*-UAT.md` |
| `DEBUG.md` | Debug investigation state | `*-DEBUG.md` |
| `planner-subagent-prompt.md` | Planner agent prompt | (runtime) |
| `debug-subagent-prompt.md` | Debug agent prompt | (runtime) |
| `continue-here.md` | Session handoff | `.continue-here-*.md` |
| `milestone.md` | Milestone metadata | `.planning/milestones/` |
| `research.md` | Phase research findings | `*-RESEARCH.md` |
| `context.md` | Phase context/decisions | `*-CONTEXT.md` |
| `discovery.md` | Project discovery notes | (runtime) |
| `phase-prompt.md` | Phase execution prompt | (runtime) |
| `user-setup.md` | User setup instructions | (runtime) |
| `milestone-archive.md` | Archived milestone | `.planning/milestones/` |
| `research-project/*.md` | Project research docs | `.planning/research/` |
| `codebase/*.md` | Codebase mapping docs | `.planning/codebase/` |

**Example Template Structure (`state.md`):**
```markdown
# State Template

Template for `.planning/STATE.md` — the project's living memory.

## File Template

```markdown
# Project State

## Current Position
Phase: [X] of [Y]
Plan: [A] of [B]
Status: [Ready to plan | In progress | Phase complete]

## Performance Metrics
...

## Accumulated Context
...
```

<purpose>
STATE.md is the project's short-term memory spanning all phases.
</purpose>

<lifecycle>
**Creation:** After ROADMAP.md is created
**Reading:** First step of every workflow
**Writing:** After every significant action
</lifecycle>

<size_constraint>
Keep STATE.md under 100 lines.
</size_constraint>
```

**How Templates Are Used:**
1. Agent reads template to understand output format
2. Agent creates document following template structure
3. Document is committed to `.planning/` directory

---

### References

| Aspect | Details |
|--------|---------|
| **What** | Knowledge/guideline documents |
| **Location** | `/get-shit-done/references/*.md` |
| **Count** | 7 references |
| **Claude Concept?** | **No** — GSD-specific pattern for prompt engineering |

**What References Are:**
References are deep-dive guides on specific topics that inform Claude's behavior. They contain:
- Detailed methodologies
- Best practices
- Anti-patterns to avoid
- Examples and patterns

**GSD References:**

| Reference | Purpose | Used By |
|-----------|---------|---------|
| `questioning.md` | How to conduct project discovery | `/gsd:new-project` |
| `verification-patterns.md` | How to verify implementations aren't stubs | `gsd-verifier` |
| `checkpoints.md` | Human-in-the-loop patterns | `gsd-executor` |
| `tdd.md` | Test-driven development patterns | `gsd-planner`, `gsd-executor` |
| `git-integration.md` | Git commit and branching patterns | All agents |
| `continuation-format.md` | Session continuation protocol | Checkpoint handling |
| `ui-brand.md` | UI formatting for GSD output | All commands |

**Example Reference Structure (`questioning.md`):**
```xml
<questioning_guide>

<philosophy>
You are a thinking partner, not an interviewer.
The user often has a fuzzy idea. Your job is to help them sharpen it.
</philosophy>

<the_goal>
By the end of questioning, you need enough clarity to write a PROJECT.md
that downstream phases can act on.
</the_goal>

<how_to_question>
**Start open.** Let them dump their mental model.
**Follow energy.** Dig into what excited them.
**Challenge vagueness.** Never accept fuzzy answers.
**Make the abstract concrete.** "Walk me through using this."
</how_to_question>

<anti_patterns>
- Checklist walking
- Canned questions
- Interrogation
- Rushing
</anti_patterns>

</questioning_guide>
```

**How References Are Loaded:**
Via `@` references, typically in `<execution_context>`:
```markdown
<execution_context>
@~/.claude/get-shit-done/references/questioning.md
@~/.claude/get-shit-done/references/verification-patterns.md
</execution_context>
```

---

## Flow Diagrams

### Complete System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              USER INTERFACE LAYER                                   │
│                          (Claude Code Slash Commands)                               │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  /gsd:new-project   /gsd:plan-phase   /gsd:execute-phase   /gsd:verify-work        │
│        │                  │                   │                   │                 │
│        ▼                  ▼                   ▼                   ▼                 │
│   ┌─────────────────────────────────────────────────────────────────────────┐      │
│   │                    SLASH COMMANDS (commands/gsd/*.md)                   │      │
│   │                                                                         │      │
│   │  • YAML frontmatter (name, description, allowed-tools, agent)          │      │
│   │  • <objective> — what command does                                      │      │
│   │  • <execution_context> — @references to workflows/templates/refs       │      │
│   │  • <process> — step-by-step execution                                   │      │
│   └─────────────────────────────────────────────────────────────────────────┘      │
│                                        │                                            │
└────────────────────────────────────────┼────────────────────────────────────────────┘
                                         │
                                         │ loads via @ references
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                            KNOWLEDGE LAYER (GSD-Specific)                           │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐         │
│  │      WORKFLOWS      │  │      TEMPLATES      │  │     REFERENCES      │         │
│  │   (workflows/*.md)  │  │   (templates/*.md)  │  │  (references/*.md)  │         │
│  ├─────────────────────┤  ├─────────────────────┤  ├─────────────────────┤         │
│  │                     │  │                     │  │                     │         │
│  │ • execute-phase     │  │ • project.md        │  │ • questioning       │         │
│  │ • execute-plan      │  │ • state.md          │  │ • verification-     │         │
│  │ • verify-phase      │  │ • roadmap.md        │  │   patterns          │         │
│  │ • verify-work       │  │ • requirements.md   │  │ • checkpoints       │         │
│  │ • diagnose-issues   │  │ • summary.md        │  │ • tdd               │         │
│  │ • discovery-phase   │  │ • UAT.md            │  │ • git-integration   │         │
│  │ • map-codebase      │  │ • DEBUG.md          │  │ • continuation-     │         │
│  │ • resume-project    │  │ • verification-     │  │   format            │         │
│  │ • complete-milestone│  │   report.md         │  │ • ui-brand          │         │
│  │ • discuss-phase     │  │ • planner-prompt    │  │                     │         │
│  │ • transition        │  │ • codebase/*.md     │  │                     │         │
│  │                     │  │ • research-         │  │                     │         │
│  │                     │  │   project/*.md      │  │                     │         │
│  ├─────────────────────┤  ├─────────────────────┤  ├─────────────────────┤         │
│  │ HOW: Multi-step     │  │ HOW: Output format  │  │ HOW: Deep-dive      │         │
│  │ orchestration       │  │ specifications      │  │ methodology guides  │         │
│  │ scripts             │  │                     │  │                     │         │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘         │
│                                                                                     │
│  CLAUDE CONCEPT: File References (@-syntax) — loads these into context             │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                         │
                                         │ spawns via Task tool
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              SUBAGENT LAYER                                         │
│                        (Claude Code Subagents)                                      │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│   ┌───────────────────────────────────────────────────────────────────────────┐    │
│   │                         TASK TOOL ORCHESTRATION                           │    │
│   │                                                                           │    │
│   │   Wave 1: [gsd-executor A] [gsd-executor B] [gsd-executor C]  (parallel) │    │
│   │                 ↓                ↓                ↓                       │    │
│   │   Wave 2: [gsd-executor D] [gsd-executor E]                   (parallel) │    │
│   │                 ↓                ↓                                        │    │
│   │   Wave 3: [gsd-executor F]                                    (sequential)│    │
│   │                 ↓                                                         │    │
│   │           [gsd-verifier]                                      (final)    │    │
│   └───────────────────────────────────────────────────────────────────────────┘    │
│                                                                                     │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                    │
│   │  RESEARCH       │  │  PLANNING       │  │  EXECUTION      │                    │
│   ├─────────────────┤  ├─────────────────┤  ├─────────────────┤                    │
│   │ gsd-project-    │  │ gsd-planner     │  │ gsd-executor    │                    │
│   │   researcher    │  │ gsd-plan-checker│  │ gsd-verifier    │                    │
│   │ gsd-phase-      │  │ gsd-roadmapper  │  │ gsd-debugger    │                    │
│   │   researcher    │  │                 │  │ gsd-integration-│                    │
│   │ gsd-codebase-   │  │                 │  │   checker       │                    │
│   │   mapper        │  │                 │  │                 │                    │
│   │ gsd-research-   │  │                 │  │                 │                    │
│   │   synthesizer   │  │                 │  │                 │                    │
│   └─────────────────┘  └─────────────────┘  └─────────────────┘                    │
│                                                                                     │
│   Each subagent has:                                                               │
│   • Fresh 200k context window (prevents "context rot")                             │
│   • Specialized <role> and <philosophy>                                            │
│   • Specific tool access                                                           │
│   • Loads workflows/templates/references via @ syntax                              │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                         │
                                         │ reads/writes
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                            INFRASTRUCTURE LAYER                                     │
│                          (Claude Code Features)                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                    │
│   │     HOOKS       │  │   MCP SERVERS   │  │    SETTINGS     │                    │
│   │  (hooks/*.js)   │  │                 │  │ (settings.json) │                    │
│   ├─────────────────┤  ├─────────────────┤  ├─────────────────┤                    │
│   │                 │  │                 │  │                 │                    │
│   │ SessionStart:   │  │  Context7       │  │ hooks:          │                    │
│   │  gsd-check-     │  │  ├─ resolve-    │  │   SessionStart  │                    │
│   │  update.js      │  │  │  library-id  │  │                 │                    │
│   │                 │  │  └─ get-docs    │  │ statusLine:     │                    │
│   │ StatusLine:     │  │                 │  │   command: node │                    │
│   │  statusline.js  │  │ Used for:       │  │   statusline.js │                    │
│   │  ├─ model       │  │  • Library docs │  │                 │                    │
│   │  ├─ task        │  │  • API research │  │                 │                    │
│   │  ├─ context %   │  │  • Verification │  │                 │                    │
│   │  └─ update      │  │                 │  │                 │                    │
│   └─────────────────┘  └─────────────────┘  └─────────────────┘                    │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                         │
                                         │ produces
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                            STATE & ARTIFACTS LAYER                                  │
│                          (Project Files)                                            │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│   .planning/                                                                        │
│   │                                                                                 │
│   ├── PROJECT.md         ◄── Template: project.md                                  │
│   │                          Vision, core value, requirements                       │
│   │                                                                                 │
│   ├── REQUIREMENTS.md    ◄── Template: requirements.md                             │
│   │                          Scoped requirements with phase traceability           │
│   │                                                                                 │
│   ├── ROADMAP.md         ◄── Template: roadmap.md                                  │
│   │                          Phase structure and goals                              │
│   │                                                                                 │
│   ├── STATE.md           ◄── Template: state.md                                    │
│   │                          Project memory (position, decisions, velocity)        │
│   │                                                                                 │
│   ├── research/                                                                     │
│   │   ├── SUMMARY.md     ◄── Template: research-project/SUMMARY.md                 │
│   │   ├── STACK.md       ◄── Template: research-project/STACK.md                   │
│   │   ├── FEATURES.md    ◄── Template: research-project/FEATURES.md                │
│   │   ├── ARCHITECTURE.md◄── Template: research-project/ARCHITECTURE.md            │
│   │   └── PITFALLS.md    ◄── Template: research-project/PITFALLS.md                │
│   │                                                                                 │
│   └── phases/                                                                       │
│       └── 01-phase-name/                                                            │
│           ├── 01-PLAN.md     ◄── Created by gsd-planner                            │
│           ├── 02-PLAN.md         (ARE the prompts for execution)                   │
│           ├── 01-SUMMARY.md  ◄── Template: summary.md                              │
│           ├── 02-SUMMARY.md      (Execution results)                               │
│           ├── 01-RESEARCH.md ◄── Template: research.md                             │
│           ├── 01-VERIFICATION.md ◄── Template: verification-report.md             │
│           ├── 01-UAT.md      ◄── Template: UAT.md                                  │
│           └── 01-CONTEXT.md  ◄── Template: context.md                              │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

### Workflow → Template → Reference Interaction

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                    HOW WORKFLOWS, TEMPLATES, AND REFERENCES INTERACT                │
└─────────────────────────────────────────────────────────────────────────────────────┘

                              USER INVOKES COMMAND
                                      │
                                      ▼
                        ┌─────────────────────────┐
                        │   /gsd:execute-phase 3  │
                        └─────────────────────────┘
                                      │
                                      │ Command loads
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              EXECUTION CONTEXT                                      │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  <execution_context>                                                                │
│    @~/.claude/get-shit-done/workflows/execute-phase.md    ◄── WORKFLOW             │
│    @~/.claude/get-shit-done/templates/summary.md          ◄── TEMPLATE             │
│    @~/.claude/get-shit-done/references/checkpoints.md     ◄── REFERENCE            │
│    @~/.claude/get-shit-done/references/tdd.md             ◄── REFERENCE            │
│  </execution_context>                                                               │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                      │
                 ┌────────────────────┼────────────────────┐
                 │                    │                    │
                 ▼                    ▼                    ▼
    ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
    │      WORKFLOW       │ │      TEMPLATE       │ │     REFERENCE       │
    │  execute-phase.md   │ │     summary.md      │ │   checkpoints.md    │
    ├─────────────────────┤ ├─────────────────────┤ ├─────────────────────┤
    │                     │ │                     │ │                     │
    │ TELLS CLAUDE:       │ │ TELLS CLAUDE:       │ │ TELLS CLAUDE:       │
    │                     │ │                     │ │                     │
    │ • Load state first  │ │ • What sections to  │ │ • When to pause     │
    │ • Validate phase    │ │   include           │ │ • How to format     │
    │ • Group by waves    │ │ • What format       │ │   checkpoints       │
    │ • Spawn executors   │ │ • What to capture   │ │ • Human-verify vs   │
    │   in parallel       │ │                     │ │   human-action      │
    │ • Handle checkpoints│ │ EXAMPLE:            │ │ • Authentication    │
    │ • Aggregate results │ │ ## Accomplishments  │ │   gate handling     │
    │ • Run verifier      │ │ - [what was built]  │ │                     │
    │                     │ │                     │ │ EXAMPLE:            │
    │ EXAMPLE STEP:       │ │ ## Files Modified   │ │ ╔═══════════════╗   │
    │ <step name="exec">  │ │ - path/to/file.ts   │ │ ║ CHECKPOINT    ║   │
    │   Spawn Task()      │ │                     │ │ ╚═══════════════╝   │
    │   with subagent     │ │ ## Issues           │ │ Built: [what]       │
    │ </step>             │ │ - [any issues]      │ │ Verify: [steps]     │
    │                     │ │                     │ │                     │
    └─────────────────────┘ └─────────────────────┘ └─────────────────────┘
           │                         │                        │
           │                         │                        │
           │    CLAUDE EXECUTES      │                        │
           │    WORKFLOW STEPS       │                        │
           ▼                         │                        │
    ┌─────────────────────┐          │                        │
    │  gsd-executor       │          │                        │
    │  subagent spawned   │          │                        │
    │                     │          │                        │
    │  Reads PLAN.md      │          │                        │
    │  Executes tasks     │          │                        │
    │  Hits checkpoint    │──────────┼────────────────────────┘
    │  (uses REFERENCE)   │          │
    │  Creates SUMMARY.md │◄─────────┘
    │  (uses TEMPLATE)    │
    └─────────────────────┘
           │
           │ produces
           ▼
    ┌─────────────────────┐
    │  01-SUMMARY.md      │
    │  (follows template) │
    └─────────────────────┘
```

---

### Command Execution Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         /gsd:plan-phase 3 EXECUTION FLOW                            │
└─────────────────────────────────────────────────────────────────────────────────────┘

  User: /gsd:plan-phase 3
              │
              ▼
  ┌───────────────────────────────────────────────────────────────┐
  │ COMMAND: commands/gsd/plan-phase.md                           │
  │                                                               │
  │ Loads:                                                        │
  │   @~/.claude/get-shit-done/references/ui-brand.md            │
  └───────────────────────────────────────────────────────────────┘
              │
              ▼
  ┌───────────────────────────────────────────────────────────────┐
  │ STEP 1: Validate Environment                                  │
  │   ls .planning/ 2>/dev/null                                   │
  └───────────────────────────────────────────────────────────────┘
              │
              ▼
  ┌───────────────────────────────────────────────────────────────┐
  │ STEP 2-4: Parse args, validate phase, ensure directory        │
  └───────────────────────────────────────────────────────────────┘
              │
              ▼
  ┌───────────────────────────────────────────────────────────────┐
  │ STEP 5: Research (unless --skip-research or exists)           │
  │                                                               │
  │   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━       │
  │    GSD ► RESEARCHING PHASE 3                                  │
  │   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━       │
  │                                                               │
  │   Task(                                                       │
  │     prompt = research_context,                                │
  │     subagent_type = "gsd-phase-researcher"                   │
  │   )                                                           │
  └───────────────────────────────────────────────────────────────┘
              │
              ▼
  ┌───────────────────────────────────────────────────────────────┐
  │ STEP 8: Spawn gsd-planner                                     │
  │                                                               │
  │   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━       │
  │    GSD ► PLANNING PHASE 3                                     │
  │   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━       │
  │                                                               │
  │   Task(                                                       │
  │     prompt = """                                              │
  │       <planning_context>                                      │
  │         @.planning/STATE.md                                   │
  │         @.planning/ROADMAP.md                                 │
  │         @.planning/REQUIREMENTS.md                            │
  │         @.planning/phases/03-*/03-RESEARCH.md                │
  │       </planning_context>                                     │
  │     """,                                                      │
  │     subagent_type = "gsd-planner"                            │
  │   )                                                           │
  │                                                               │
  │   Planner creates: 03-01-PLAN.md, 03-02-PLAN.md, etc.        │
  └───────────────────────────────────────────────────────────────┘
              │
              ▼
  ┌───────────────────────────────────────────────────────────────┐
  │ STEP 10: Spawn gsd-plan-checker                               │
  │                                                               │
  │   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━       │
  │    GSD ► VERIFYING PLANS                                      │
  │   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━       │
  │                                                               │
  │   Task(                                                       │
  │     prompt = verification_context,                            │
  │     subagent_type = "gsd-plan-checker"                       │
  │   )                                                           │
  └───────────────────────────────────────────────────────────────┘
              │
              ├─── ISSUES FOUND ───► Revision loop (max 3)
              │                            │
              │                            ▼
              │                      Spawn gsd-planner
              │                      with revision prompt
              │                            │
              │                            ▼
              │                      Spawn gsd-plan-checker
              │                            │
              │                      ◄─────┘
              │
              ▼ VERIFICATION PASSED
  ┌───────────────────────────────────────────────────────────────┐
  │ STEP 13: Present Final Status                                 │
  │                                                               │
  │   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━       │
  │    GSD ► PHASE 3 PLANNED ✓                                    │
  │   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━       │
  │                                                               │
  │   Phase 3: User Authentication — 3 plan(s) in 2 wave(s)       │
  │                                                               │
  │   | Wave | Plans  | What it builds        |                   │
  │   |------|--------|-----------------------|                   │
  │   | 1    | 01, 02 | Auth schema + API     |                   │
  │   | 2    | 03     | Login UI + flow       |                   │
  │                                                               │
  │   ▶ Next Up: /gsd:execute-phase 3                             │
  └───────────────────────────────────────────────────────────────┘
```

---

## Documentation Links

### Claude Code Concepts (Official)

| Concept | GSD Uses? | Documentation URL |
|---------|-----------|-------------------|
| **Slash Commands** | Yes | https://docs.anthropic.com/en/docs/claude-code/slash-commands |
| **Subagents** | Yes | https://docs.anthropic.com/en/docs/claude-code/sub-agents |
| **Hooks** | Yes | https://docs.anthropic.com/en/docs/claude-code/hooks |
| **StatusLine** | Yes | https://docs.anthropic.com/en/docs/claude-code/hooks#statusline |
| **MCP Servers** | Yes | https://docs.anthropic.com/en/docs/claude-code/mcp |
| **Settings** | Yes | https://docs.anthropic.com/en/docs/claude-code/settings |
| **Memory (CLAUDE.md)** | Yes | https://docs.anthropic.com/en/docs/claude-code/memory |
| **Task Tool** | Yes | https://docs.anthropic.com/en/docs/claude-code/slash-commands#skill-tool |

### GSD-Specific Patterns (Not Claude Concepts)

| Pattern | What It Is | Implemented Via |
|---------|------------|-----------------|
| **Workflows** | Multi-step orchestration scripts | @ file references |
| **Templates** | Output format specifications | @ file references |
| **References** | Knowledge/methodology guides | @ file references |
| **Wave Execution** | Parallel plan execution | Task tool + custom logic |
| **Context Engineering** | Fresh context per subagent | Task tool spawning |
| **Plans as Prompts** | PLAN.md files ARE prompts | Markdown files |

---

## Summary

GSD leverages these **core Claude Code concepts**:

1. **Slash Commands** — User-facing interface (`/gsd:*`)
2. **Subagents** — Specialized workers with fresh context
3. **Hooks** — SessionStart and StatusLine customization
4. **MCP Servers** — External tool integration (Context7)
5. **Task Tool** — Parallel orchestration
6. **Settings** — Configuration management
7. **@ File References** — Loading context into prompts

And adds these **GSD-specific patterns** (implemented using the above):

1. **Workflows** — Orchestration scripts loaded via @
2. **Templates** — Output format specs loaded via @
3. **References** — Methodology guides loaded via @
4. **Wave-based execution** — Custom parallel execution logic
5. **Context engineering** — Fresh 200k context per subagent
6. **Plans as prompts** — PLAN.md files are executable prompts

The key insight is that **workflows, templates, and references are NOT native Claude Code features** — they're GSD's custom implementation pattern that uses Claude's `@` file reference syntax to load structured markdown content into Claude's context at runtime.
