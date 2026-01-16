---
phase: 01-plugin-format
plan: 02
subsystem: plugin-system
tags: [plugin, folder-structure, conventions, documentation]

# Dependency graph
requires: ["01-01"]
provides:
  - plugin README template with folder structure
  - folder structure documentation in plugin-format.md
  - installation mapping for Phase 2
  - minimal and complex plugin examples
affects: [01-03, 02-plugin-installation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - plugin README template with placeholders
    - directory layout mirroring GSD structure
    - installation path mapping conventions

key-files:
  created:
    - get-shit-done/templates/plugin/README.md
  modified:
    - get-shit-done/references/plugin-format.md

key-decisions:
  - "Commands install to commands/{plugin-name}/ subdirectory for namespacing"
  - "Other files install under ~/.claude/{plugin-name}/ namespace"
  - "Minimal example uses single command to demonstrate essentials"
  - "Complex example (neo4j-knowledge-graph) shows full feature set"

patterns-established:
  - "Plugin README template with [PLACEHOLDER] markers"
  - "Installation mapping table: Plugin Path -> Installed To"
  - "Directory purposes table with required/optional status"

issues-created: []

# Metrics
duration: 4min
completed: 2026-01-16
---

# Phase 1 Plan 02: Plugin Folder Structure Summary

**Plugin folder structure definition with README template, directory purposes, installation mapping, and examples**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-16T12:48:00Z
- **Completed:** 2026-01-16T12:52:00Z
- **Tasks:** 2/2
- **Files modified:** 2

## Accomplishments

- Created plugin README template with [PLACEHOLDER] markers for authors
- Documented complete folder structure with directory purposes
- Established installation mapping (plugin path -> installed location)
- Added minimal plugin example (hello-world) demonstrating essentials
- Added complex plugin example (neo4j-knowledge-graph) showing services, hooks, agents

## Task Commits

Each task was committed atomically:

1. **Task 1: Define plugin folder structure README template** - `07fbb5a` (feat)
2. **Task 2: Add folder structure to reference docs** - `59ad30a` (feat)

## Files Created/Modified

- `get-shit-done/templates/plugin/README.md` - Template for plugin READMEs (107 lines)
- `get-shit-done/references/plugin-format.md` - Added 4 new sections (317 lines)

## Sections Added to plugin-format.md

1. **Folder Structure** - Directory layout, purposes, installation mapping table
2. **File Conventions** - Naming patterns, namespacing rules, path references
3. **Minimal Plugin Example** - hello-world with complete file contents
4. **Complex Plugin Example** - neo4j-knowledge-graph with docker, hooks, agents

## Decisions Made

- Commands install to `~/.claude/commands/{plugin-name}/` to enable namespacing
- Other plugin files install under `~/.claude/{plugin-name}/` directory
- README template uses `[PLACEHOLDER]` markers for easy find/replace
- Examples include complete file contents for copy-paste development

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

- Folder structure fully documented for Phase 2 (installation) to implement
- Installation mapping table provides clear file copying logic
- Hook lifecycle events ready for 01-03 to elaborate
- Plugin authors have complete README template to follow

---
*Phase: 01-plugin-format*
*Completed: 2026-01-16*
