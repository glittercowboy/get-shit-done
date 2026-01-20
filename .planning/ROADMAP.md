# Roadmap: GSD Quick Mode

## Overview

Quick mode adds a fast-path command (`/gsd:quick`) that executes small tasks with full GSD guarantees (atomic commits, STATE.md tracking) but skips optional verification agents. Quick tasks live in `.planning/quick/` separate from planned phases.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Core Command** - Complete `/gsd:quick` command end-to-end
- [x] **Phase 2: Documentation** - Update help.md, README.md, and GSD-STYLE.md

## Phase Details

### Phase 1: Core Command
**Goal**: User can run `/gsd:quick` (with interactive prompt) and have it execute with full state tracking
**Depends on**: Nothing (first phase)
**Requirements**: CMD-01, CMD-02, CMD-03, CMD-04, EXEC-01, EXEC-02, EXEC-03, EXEC-04, STATE-01, STATE-02
**Plans:** 2 plans

Plans:
- [x] 01-01-PLAN.md — Quick command file with pre-flight validation and directory setup
- [x] 01-02-PLAN.md — Quick orchestration (planner spawn, executor spawn, state update)

### Phase 2: Documentation
**Goal**: Quick mode is documented in all relevant locations
**Depends on**: Phase 1
**Requirements**: DOCS-01, DOCS-02, DOCS-03
**Success Criteria** (what must be TRUE):
  1. help.md lists `/gsd:quick` with usage and description
  2. README.md includes quick mode section explaining when to use it
  3. GSD-STYLE.md documents quick mode patterns
**Plans:** 1 plan

Plans:
- [x] 02-01-PLAN.md — Document /gsd:quick in help.md, README.md, and GSD-STYLE.md

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Core Command | 2/2 | Complete | 2026-01-19 |
| 2. Documentation | 1/1 | Complete | 2026-01-19 |
