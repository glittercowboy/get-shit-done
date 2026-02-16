---
phase: "02"
plan: "01"
subsystem: configuration
tags: [adversary, config, schema, template]
dependency-graph:
  requires: ["01-01"]
  provides: ["adversary-config-schema", "adversary-reading-block", "config-template-adversary"]
  affects: ["02-02", "03", "04", "05"]
tech-stack:
  added: []
  patterns: ["node-e config parsing", "polymorphic config values", "precedence chain defaults"]
key-files:
  created: []
  modified:
    - get-shit-done/templates/config.json
    - get-shit-done/references/planning-config.md
decisions:
  - id: "adversary-opt-out"
    choice: "Adversary enabled by default, opt-out via config"
    rationale: "Missing config = system defaults ensures adversary always runs unless explicitly disabled"
  - id: "node-e-parsing"
    choice: "Use node -e for adversary config reading instead of grep"
    rationale: "Polymorphic checkpoint values (boolean or object) cannot be reliably parsed with grep"
  - id: "three-tier-precedence"
    choice: "checkpoint max_rounds > adversary max_rounds > system default (3)"
    rationale: "Allows global defaults with per-checkpoint overrides, falling back gracefully"
metrics:
  duration: "1 min"
  completed: "2026-02-13"
---

# Phase 02 Plan 01: Adversary Config Schema Summary

**One-liner:** Adversary config template with boolean/object polymorphic checkpoints, three-tier precedence chain, and node-based reading block for orchestrators.

## What Was Done

### Task 1: Add adversary section to config.json template
- Added `adversary` top-level key to `get-shit-done/templates/config.json`
- Positioned after `parallelization`, before `gates`
- Default shape: `enabled: true`, `max_rounds: 3`, all 4 checkpoints enabled as boolean shorthand
- Verified valid JSON with no modifications to existing sections
- **Commit:** `616ab83`

### Task 2: Document adversary config schema in planning-config.md
- Added `<adversary_config>` section inside `<planning_config>` in `get-shit-done/references/planning-config.md`
- `<config_schema>` documents full JSON shape, boolean shorthand vs object form, options table, precedence chain, and missing config behavior
- `<reading_config>` provides the canonical bash/node reading block that orchestrators copy before spawning gsd-adversary
- Reading block handles: global kill switch, boolean checkpoint, object checkpoint, missing values, parse errors, node failures
- No modifications to existing planning_config sections
- **Commit:** `672b59a`

## Decisions Made

| Decision | Options Considered | Choice | Rationale |
|----------|--------------------|--------|-----------|
| Default state | Opt-in vs opt-out | Opt-out (enabled by default) | Missing config = system defaults ensures adversary always runs unless explicitly disabled |
| Config parsing | grep vs node -e | node -e | Polymorphic checkpoint values (boolean or object) cannot be reliably parsed with grep |
| Precedence | Flat vs tiered | Three-tier chain | checkpoint > adversary > system default allows global defaults with per-checkpoint overrides |

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

- [x] `config.json` is valid JSON with adversary section
- [x] `planning-config.md` has `<adversary_config>` inside `<planning_config>`
- [x] Reading block handles: missing config, enabled=false kill switch, boolean checkpoint, object checkpoint, missing max_rounds at each level
- [x] Precedence chain documented: checkpoint max_rounds > adversary max_rounds > system default (3)
- [x] No existing content modified (only additions)
- [x] Template and documentation are consistent (same schema, same defaults)

## Next Phase Readiness

Plan 02-02 (orchestrator integration points) can proceed. The config schema and reading block established here are the foundation that orchestrators will reference when integrating adversary challenges at each checkpoint.

Key artifacts for downstream consumption:
- **Config template:** `get-shit-done/templates/config.json` -- new projects get adversary section automatically
- **Reading block:** `get-shit-done/references/planning-config.md` `<reading_config>` section -- orchestrators copy this block
- **Schema docs:** Same file `<config_schema>` section -- reference for understanding config options
