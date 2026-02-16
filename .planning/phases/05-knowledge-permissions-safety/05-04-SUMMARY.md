---
phase: 05-knowledge-permissions-safety
plan: 04
subsystem: knowledge-permissions
tags: [conflict-resolution, priorities, security, allowlist]
dependency_graph:
  requires: [knowledge-api, knowledge-storage]
  provides: [principle-conflict-resolution, priority-matrix, allowlist-checking]
  affects: [autonomous-decisions, safety-gates]
tech_stack:
  added: [priority-weighted-scoring, config-caching]
  patterns: [ambiguity-detection, wildcard-matching]
key_files:
  created:
    - get-shit-done/bin/knowledge-conflicts.js
    - .planning/knowledge/permissions-config.json
  modified: []
decisions:
  - "20% gap threshold for ambiguity detection (< 20% escalates to user)"
  - "60-second config cache TTL to balance performance vs freshness"
  - "Default priority order: safety (1.0) > security (0.9) > reliability (0.85) > speed (0.6) > cost (0.5) > convenience (0.3)"
  - "Wildcard suffix pattern (:*) for allowlist matching"
metrics:
  duration_seconds: 101
  completed: 2026-02-16T05:56:02Z
  tasks_completed: 3
  commits: 2
---

# Phase 05 Plan 04: Principle Conflict Resolution Summary

Priority-based conflict resolution with ambiguity detection and configurable allowlist for safe actions.

## What Was Built

Implemented KNOW-25: When multiple principles apply to a decision, the system resolves conflicts using user-defined priority rules (safety > security > reliability > speed > cost > convenience). Includes ambiguity detection for close calls and allowlist for pre-approved safe actions.

### Core Components

1. **Conflict Resolution Module** (knowledge-conflicts.js)
   - Priority-weighted scoring: `score = confidence × priority_weight`
   - Ambiguity detection: < 20% gap between top choices escalates to user
   - Default priority matrix with 6 categories
   - Config caching (60s TTL) for performance

2. **Permissions Configuration** (permissions-config.json)
   - User-editable priority weights
   - Budget limits (daily: $5, weekly: $25)
   - Permission TTL and circuit breaker defaults
   - Safe action allowlist with wildcard patterns

3. **Allowlist System**
   - Pattern matching with exact and wildcard (:*) support
   - Pre-approved actions: read_file, run_test, format_code, lint, install_package:dev
   - Returns matching pattern for audit trails

## Implementation Notes

Task 3 (allowlist checking) was implemented as part of Task 1 for better code organization. All allowlist functions (loadAllowlist, isAllowlisted, matchesAllowlistPattern, loadConfig) were included in the initial module creation rather than added as a separate modification step. This is more efficient and maintains better module cohesion.

## Deviations from Plan

None - plan executed as written. Task 3 functions were included in Task 1 for better code organization, but all required functionality was implemented.

## Verification Results

All success criteria met:

- ✓ Principles scored by confidence × priority weight
- ✓ Conflicts resolved to highest-scoring principle (when gap > 20%)
- ✓ Ambiguous conflicts (< 20% gap) escalate to user with top choices
- ✓ Config file allows customizing priorities
- ✓ Allowlist enables pre-approved safe actions
- ✓ Module exports all required functions

### Test Results

```
Test 1: Clear winner (security 0.81 > speed 0.48, gap 40.7%)
  → Resolved: true, chosen security principle

Test 2: Ambiguous (security 0.765 = reliability 0.765, gap 0%)
  → Resolved: false, escalated to user

Test 3: User priorities loaded from config
  → safety: 1.0, security: 0.9 (matches config)

Test 4: Allowlist pattern matching
  → read_file:test.js: allowed (matches read_file:*)
  → run_test:unit: allowed (matches run_test:*)
  → delete_file:test: denied (not in allowlist)

Test 5: Config validation
  → All priorities in valid range (0-1)
  → No warnings generated
```

## Key Technical Decisions

1. **Ambiguity Threshold (20%)**
   - Gap = (top_score - second_score) / top_score
   - < 20% gap triggers user escalation
   - Prevents silent bias toward higher-priority categories when confidence is uncertain

2. **Config Caching (60s TTL)**
   - Balances I/O performance vs config reload latency
   - Module-level cache shared across all function calls
   - Timestamp-based invalidation (reloads every 60 seconds)

3. **Priority Scale (0-1)**
   - Normalized range simplifies score calculations
   - Default spacing allows clear differentiation (1.0, 0.9, 0.85, 0.6, 0.5, 0.3)
   - User can customize while maintaining 0-1 constraint

4. **Wildcard Pattern (:*)**
   - Simple suffix matching for action categories
   - Example: `read_file:*` matches `read_file:src/main.js`
   - Enables category-level allowlisting without enumerating all files

## Integration Points

**Inputs:**
- Principles array with metadata (category, confidence)
- Optional context object (reserved for future use)
- Config file (.planning/knowledge/permissions-config.json)

**Outputs:**
- Resolved conflict with chosen principle and reasoning
- Ambiguous conflict with top 2 choices for user decision
- Allowlist check result with matching pattern

**Dependencies:**
- knowledge-api (principle storage/retrieval)
- knowledge-storage (database for principles)

**Used by:**
- knowledge-synthesis (autonomous decision module)
- execute-plan workflow (safety gates)

## Files Created

- `/Users/ollorin/get-shit-done/get-shit-done/bin/knowledge-conflicts.js` (243 lines)
- `/Users/ollorin/get-shit-done/.planning/knowledge/permissions-config.json` (30 lines)

## Commits

1. `2f65f77` - feat(05-04): implement principle conflict resolution module
2. `9dca756` - feat(05-04): add default permissions configuration

## Self-Check: PASSED

**Created files exist:**
- ✓ FOUND: get-shit-done/bin/knowledge-conflicts.js
- ✓ FOUND: .planning/knowledge/permissions-config.json

**Commits exist:**
- ✓ FOUND: 2f65f77
- ✓ FOUND: 9dca756

**Functions exported:**
- ✓ DEFAULT_PRIORITIES
- ✓ loadUserPriorities
- ✓ scorePrinciple
- ✓ resolvePrincipleConflict
- ✓ validatePriorities
- ✓ loadAllowlist
- ✓ isAllowlisted
- ✓ loadConfig

All deliverables verified and functional.
