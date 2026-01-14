# GSD Command Validation Results

Cross-platform validation testing for all GSD commands on Claude Code and OpenCode.

**Test Date:** 2026-01-14
**GSD Version:** 1.0.0 (pre-release)
**Platforms Tested:** Claude Code, OpenCode

## Executive Summary

Status: Initial validation - test matrix created
Coverage: All 26 commands mapped for testing

## Command Testing

| Command | Claude Code Status | OpenCode Status | Notes |
|---------|-------------------|-----------------|-------|
| add-phase | Pending | Pending | |
| add-todo | Pending | Pending | |
| check-todos | Pending | Pending | |
| complete-milestone | Pending | Pending | |
| consider-issues | Pending | Pending | |
| create-roadmap | Pending | Pending | |
| debug | Pending | Pending | |
| discuss-milestone | Pending | Pending | |
| discuss-phase | Pending | Pending | |
| execute-phase | Pending | Pending | |
| execute-plan | Pending | Pending | |
| help | Pending | Pending | |
| insert-phase | Pending | Pending | |
| list-phase-assumptions | Pending | Pending | |
| map-codebase | Pending | Pending | |
| new-milestone | Pending | Pending | |
| new-project | Pending | Pending | |
| pause-work | Pending | Pending | |
| plan-fix | Pending | Pending | |
| plan-phase | Pending | Pending | |
| progress | Pending | Pending | |
| remove-phase | Pending | Pending | |
| research-phase | Pending | Pending | |
| resume-work | Pending | Pending | |
| status | Pending | Pending | |
| verify-work | Pending | Pending | |

**Legend:**
- ✓ Pass: Works as expected
- ⚠ Partial: Works with minor issues
- ✗ Fail: Broken or major issues
- Pending: Not yet tested

## Frontmatter Compatibility

### Claude Code Format

Claude Code commands use these frontmatter fields:
```yaml
---
name: gsd:command-name
argument-hint: Description of arguments
allowed-tools:
  - Read
  - Write
  - Bash
---
```

### OpenCode Format

OpenCode commands strip Claude-specific fields:
```yaml
---
description: GSD command for OpenCode
---
```

Fields removed during transformation:
- `name:` - OpenCode doesn't use explicit command names
- `argument-hint:` - Not supported in OpenCode
- `allowed-tools:` - OpenCode uses permission model in agent definitions

### Transformation Validation

Installer transformation logic validated:
- ✓ `name:` line removed correctly
- ✓ `argument-hint:` line removed correctly
- ✓ `allowed-tools:` block removed correctly (multiline YAML array)
- ✓ Empty frontmatter replaced with minimal description
- ✓ $ARGUMENTS syntax preserved (same on both platforms)
- ✓ @-references preserved (same syntax)
- ✓ XML structure intact after transformation
- ✓ Path substitution works correctly:
  - `~/.claude/get-shit-done/` → `~/.config/opencode/gsd/`
  - `./.claude/get-shit-done/` → `.opencode/gsd/`
  - `~/.claude/commands/` → `~/.config/opencode/command/`

## Parallel Execution Testing

### Wave-Based Execution Pattern

GSD uses wave-based parallel execution defined in execute-phase.md workflow. Plans in same wave with no mutual dependencies can run in parallel.

**Pattern Equivalence:**

| Aspect | Claude Code | OpenCode | Status |
|--------|-------------|----------|--------|
| Wave grouping | frontmatter `wave:` field | frontmatter `wave:` field | ✓ Same |
| Dependencies | `depends_on:` array | `depends_on:` array | ✓ Same |
| Spawn mechanism | Task tool with `subagent_type` | Agent definitions in `.opencode/agent/` | ✓ Equivalent |
| Agent tracking | `.planning/agent-history.json` | `.planning/agent-history.json` | ✓ Same |
| Parallel limit | `config.json` `max_concurrent_agents` | `config.json` `max_concurrent_agents` | ✓ Same |

### OpenCode Agent Definitions

Three core agents created for parallel execution:

1. **execute-plan** - Execute single plans with full context
   - Mode: subagent
   - Permissions: edit=allow, bash=allow, webfetch=deny
   - Body: @~/.config/opencode/gsd/workflows/execute-plan.md

2. **explore** - Fast codebase exploration
   - Mode: subagent
   - Permissions: edit=deny, bash=allow, webfetch=deny
   - Body: @~/.config/opencode/gsd/workflows/explore.md

3. **plan** - Design implementation plans
   - Mode: subagent
   - Permissions: edit=deny, bash=allow, webfetch=allow
   - Body: @~/.config/opencode/gsd/workflows/plan.md

### Spawn Pattern Comparison

**Claude Code:**
```
Use Task tool with subagent_type="execute-plan"
→ Spawns fresh agent with 200k context
→ Agent executes plan, creates SUMMARY, commits
→ Returns completion report to orchestrator
```

**OpenCode:**
```
Reference agent @execute-plan in command
→ OpenCode spawns agent with model/permissions from definition
→ Agent body reads @~/.config/opencode/gsd/workflows/execute-plan.md
→ Same execution logic as Claude Code
→ Returns completion report to orchestrator
```

**Verification Status:**
- ✓ Wave-based execution logic identical in both platforms
- ✓ Dependency tracking uses same frontmatter fields
- ✓ Agent definitions have correct permissions for subagent patterns
- ✓ Spawn patterns are functionally equivalent
- ⚠ End-to-end parallel test requires multi-plan test project (deferred)

## Platform-Specific Issues Found

### Known Platform Bugs

**OpenCode:**
- Custom agent visibility issue - agents in `.opencode/agent/` may not appear in Tab-cycle for command selection
- YAML parsing crashes with unquoted values in command frontmatter

**Claude Code:**
- None identified during validation prep

### Compatibility Concerns

**Path Handling:**
- ✓ Installer correctly transforms all path references
- ✓ @-references work identically on both platforms
- ✓ No hard-coded platform-specific paths found in workflows

**Tool Names:**
- ✓ All tool names match between platforms (Read, Write, Edit, Bash, Glob, Grep, etc.)
- ✓ No tool name translation needed

**Syntax:**
- ✓ $ARGUMENTS syntax identical
- ✓ XML tags for execution context supported on both
- ✓ YAML frontmatter compatible (after transformation)

## Test Coverage Status

**Commands:** 0/26 tested (0%)
**Workflows:** Pattern validation only (not end-to-end)
**Parallel Execution:** Pattern equivalence confirmed, end-to-end test pending

## Next Steps

1. Manual testing of all 26 commands on both platforms
2. End-to-end parallel execution test with multi-plan phase
3. Document any discovered issues in this file
4. Update platform-specific troubleshooting in README

## Notes

This initial validation focused on verifying transformation correctness, pattern equivalence, and architectural compatibility. Full manual testing of each command requires actual usage on both platforms with test projects.

The installer's transformation logic has been validated to correctly handle:
- Frontmatter field removal
- Path substitution
- Content preservation
- Agent definition generation

Pattern-level analysis confirms that Claude Code's Task tool and OpenCode's agent system are functionally equivalent for GSD's parallel execution model.
