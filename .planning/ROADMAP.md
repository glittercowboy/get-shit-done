# Roadmap: GSD-Jira Integration

## Overview

This roadmap delivers bidirectional sync between GSD workflow artifacts and Jira Cloud Scrum boards. Starting with foundation configuration and CLI scaffold, we progressively build push sync, execution integration, bidirectional sync with conflict resolution, sprint management, and finally polish with documentation. The end result: developers think in GSD while teams coordinate in Jira — automatically.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: Foundation** - Configuration schema and CLI scaffold with acli integration
- [ ] **Phase 2: Push Sync** - GSD → Jira sync with auto-creation hooks
- [ ] **Phase 3: Execution Integration** - GSD commands trigger Jira updates
- [ ] **Phase 4: Bidirectional Sync** - Jira → GSD pull with conflict resolution
- [ ] **Phase 5: Sprint Management** - Auto and planned sprint lifecycle
- [ ] **Phase 6: Polish & Docs** - Reports, dashboards, and documentation

## Phase Details

### Phase 1: Foundation
**Goal**: Establish configuration schema, CLI scaffold, and acli wrapper patterns
**Depends on**: Nothing (first phase)
**Requirements**: SPEC-01, SPEC-02, CLI-01
**Success Criteria** (what must be TRUE):
  1. User can run `gsd:jira-init` to configure Jira connection
  2. Mapping configuration exists in `.planning/jira/mapping.yaml`
  3. Project configuration exists in `.planning/jira/config.yaml`
  4. acli authentication is verified during init
**Plans**: TBD

Plans:
- [ ] 01-01: Configuration schema and file structure
- [ ] 01-02: CLI scaffold with gsd:jira-init command
- [ ] 01-03: acli wrapper with error handling patterns

### Phase 2: Push Sync
**Goal**: Enable GSD → Jira push sync with automatic creation hooks and branch creation
**Depends on**: Phase 1
**Requirements**: CLI-02, CLI-03, AUTO-01, AUTO-02, SYNC-01, GIT-01
**Success Criteria** (what must be TRUE):
  1. User can run `gsd:jira-sync` to push GSD artifacts to Jira
  2. User can run `gsd:jira-status` to see pending changes and last sync time
  3. New milestones automatically create Jira Initiatives
  4. New phases automatically create Jira Epics with linked Stories
  5. Hierarchy relationships preserved (Initiative → Epic → Story)
  6. Feature branches auto-created with Jira issue key (e.g., `feature/PROJ-123-phase-name`)
**Plans**: TBD

Plans:
- [ ] 02-01: Sync engine core with GSD artifact parsing
- [ ] 02-02: gsd:jira-sync and gsd:jira-status commands
- [ ] 02-03: Auto-sync hooks for new-milestone and plan-phase
- [ ] 02-04: Git branch creation with Jira issue keys

### Phase 3: Execution Integration
**Goal**: Integrate Jira updates into GSD execution workflow with Git integration
**Depends on**: Phase 2
**Requirements**: CLI-04, CLI-05, AUTO-03, AUTO-04, AUTO-05, GIT-02, GIT-03, GIT-04
**Success Criteria** (what must be TRUE):
  1. User can get Jira URLs for any GSD item via `gsd:jira-link`
  2. User can open Jira board or specific issues via `gsd:jira-open`
  3. Plan execution transitions Jira Stories to In Progress
  4. Sub-tasks created and auto-transitioned during plan execution
  5. Phase verification updates Epic status and closes completed Stories
  6. Commit messages auto-include Jira issue key for linking
  7. Smart commit keywords (#done, #in-progress) transition Jira issues
  8. PR titles/descriptions auto-include Jira issue key and link
**Plans**: TBD

Plans:
- [ ] 03-01: gsd:jira-link and gsd:jira-open commands
- [ ] 03-02: Execute-plan Jira integration (status + sub-tasks)
- [ ] 03-03: Verify-phase Jira integration
- [ ] 03-04: Git commit message and smart commit integration
- [ ] 03-05: PR template with Jira linking

### Phase 4: Bidirectional Sync
**Goal**: Enable Jira → GSD sync with conflict detection and resolution
**Depends on**: Phase 3
**Requirements**: SPEC-03, SYNC-02, SYNC-03, SYNC-04
**Success Criteria** (what must be TRUE):
  1. Jira status changes sync back to GSD automatically
  2. Comments and blockers from Jira imported to GSD
  3. Issues created directly in Jira auto-import to GSD
  4. Conflicts detected with clear diff report
  5. User can resolve conflicts via interactive CLI (choose GSD/Jira/merge)
**Plans**: TBD

Plans:
- [ ] 04-01: Sync state persistence (sync-state.json)
- [ ] 04-02: Jira → GSD pull sync engine
- [ ] 04-03: Conflict detection and resolution CLI

### Phase 5: Sprint Management
**Goal**: Automate sprint lifecycle with configurable modes
**Depends on**: Phase 4
**Requirements**: SPRINT-01, SPRINT-02, SPRINT-03, SPRINT-04
**Success Criteria** (what must be TRUE):
  1. User can configure sprint mode (auto or planned) in config
  2. Auto mode: sprints close on schedule with items moved to next
  3. Auto mode: completed items assigned to current sprint
  4. Planned mode: user controls sprint creation and item assignment
  5. Sprint review shows velocity, burndown, and carried-over items
**Plans**: TBD

Plans:
- [ ] 05-01: Sprint configuration and mode switching
- [ ] 05-02: Auto sprint lifecycle implementation
- [ ] 05-03: Planned sprint commands and gsd:sprint-review

### Phase 6: Polish & Docs
**Goal**: Add reporting, dashboards, and comprehensive documentation
**Depends on**: Phase 5
**Requirements**: SPEC-04, REPORT-01, REPORT-02, DOCS-01, DOCS-02
**Success Criteria** (what must be TRUE):
  1. User can generate sync status report via `gsd:jira-report`
  2. User can view Jira-powered dashboards (burndown, velocity, coverage)
  3. Setup guide covers acli installation through first sync
  4. Multi-developer guide documents team workflows and conflict prevention
**Plans**: TBD

Plans:
- [ ] 06-01: Reporting commands (gsd:jira-report, gsd:jira-dashboard)
- [ ] 06-02: Setup guide and multi-developer documentation
- [ ] 06-03: Multi-developer workflow documentation (SPEC-04)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/3 | Not started | - |
| 2. Push Sync | 0/4 | Not started | - |
| 3. Execution Integration | 0/5 | Not started | - |
| 4. Bidirectional Sync | 0/3 | Not started | - |
| 5. Sprint Management | 0/3 | Not started | - |
| 6. Polish & Docs | 0/3 | Not started | - |

---

## Requirement Coverage

| REQ-ID | Phase | Description |
|--------|-------|-------------|
| SPEC-01 | 1 | GSD → Jira entity mapping |
| SPEC-02 | 1 | Project configuration |
| CLI-01 | 1 | gsd:jira-init command |
| CLI-02 | 2 | gsd:jira-sync command |
| CLI-03 | 2 | gsd:jira-status command |
| AUTO-01 | 2 | Auto-create Initiative on new-milestone |
| AUTO-02 | 2 | Auto-create Epic/Stories on plan-phase |
| SYNC-01 | 2 | GSD → Jira push sync engine |
| CLI-04 | 3 | gsd:jira-link command |
| CLI-05 | 3 | gsd:jira-open command |
| AUTO-03 | 3 | execute-plan Jira status updates |
| AUTO-04 | 3 | Sub-task creation during execution |
| AUTO-05 | 3 | verify-phase Jira sync |
| SPEC-03 | 4 | Sync state tracking |
| SYNC-02 | 4 | Jira → GSD pull sync |
| SYNC-03 | 4 | Conflict detection |
| SYNC-04 | 4 | Conflict resolution CLI |
| SPRINT-01 | 5 | Configurable sprint mode |
| SPRINT-02 | 5 | Auto sprint implementation |
| SPRINT-03 | 5 | Planned sprint implementation |
| SPRINT-04 | 5 | gsd:sprint-review command |
| SPEC-04 | 6 | Multi-developer workflow docs |
| REPORT-01 | 6 | gsd:jira-report command |
| REPORT-02 | 6 | gsd:jira-dashboard command |
| GIT-01 | 2 | Auto-create feature branches with Jira key |
| GIT-02 | 3 | Commit messages include Jira key |
| GIT-03 | 3 | Smart commit keywords for transitions |
| GIT-04 | 3 | PR titles/descriptions with Jira links |
| DOCS-01 | 6 | Setup guide |
| DOCS-02 | 6 | Multi-developer collaboration guide |

**Coverage:** 30/30 requirements mapped (100%)

---
*Roadmap created: 2026-01-31*
