# Requirements: v1.0 GSD-Jira Integration

## Overview

Enable collaborative multi-developer workflows by integrating GSD commands with Jira Scrum via `acli`.

---

## v1.0 Requirements

### SPEC: Mapping & Configuration

- [ ] **SPEC-01**: Define GSD → Jira entity mapping in `mapping.yaml`
  - Milestone → Initiative
  - Phase → Epic
  - Plan → Story
  - Task → Sub-task
- [ ] **SPEC-02**: Create Jira project configuration in `config.yaml`
  - Jira site URL, project key, board ID
  - Sprint settings (duration, auto vs planned)
- [ ] **SPEC-03**: Implement sync state tracking in `sync-state.json`
  - GSD↔Jira ID mapping
  - Last sync timestamps
  - Pending changes queue
- [ ] **SPEC-04**: Document multi-developer workflow
  - Pull before push pattern
  - Conflict resolution process
  - Branch-based sync strategies

### CLI: Manual Commands

- [ ] **CLI-01**: `gsd:jira-init` — Configure Jira connection
  - Verify acli auth state
  - Guide through setup if needed
  - Create `.planning/jira/` directory structure
- [ ] **CLI-02**: `gsd:jira-sync` — Sync GSD ↔ Jira
  - Bidirectional sync operation
  - Dry-run mode support
  - Progress reporting
- [ ] **CLI-03**: `gsd:jira-status` — Show sync state
  - Pending changes
  - Conflicts
  - Last sync time
- [ ] **CLI-04**: `gsd:jira-link` — Get Jira URL for GSD item
  - Phase → Epic URL
  - Plan → Story URL
- [ ] **CLI-05**: `gsd:jira-open` — Open Jira in browser
  - Open specific issue
  - Open board/backlog

### AUTO: Automatic Integration

- [ ] **AUTO-01**: Jira creation in `/gsd:new-milestone`
  - Create Initiative issue
  - Link to project
- [ ] **AUTO-02**: Jira creation in `/gsd:plan-phase`
  - Create Epic for phase
  - Create Stories for plans
  - Link to Initiative
- [ ] **AUTO-03**: Jira status updates in `/gsd:execute-plan`
  - Transition Story to In Progress
  - Update task completion status
- [ ] **AUTO-04**: Sub-task creation during plan execution
  - Create Sub-tasks for plan tasks
  - Auto-transition on completion
- [ ] **AUTO-05**: Jira sync in `/gsd:verify-phase`
  - Update Epic status on verification
  - Close completed Stories

### SYNC: Bidirectional Sync

- [ ] **SYNC-01**: GSD → Jira push
  - Create/update issues from GSD artifacts
  - Preserve hierarchy relationships
  - Handle field mapping
- [ ] **SYNC-02**: Jira → GSD pull
  - Sync status changes back to GSD
  - Import comments/blockers
  - Auto-import Jira-created issues
- [ ] **SYNC-03**: Conflict detection
  - Track modification timestamps
  - Identify diverged items
  - Generate conflict reports
- [ ] **SYNC-04**: Conflict resolution CLI
  - Interactive conflict picker
  - Choose GSD/Jira/merge options
  - Resolution history

### SPRINT: Sprint Management

- [ ] **SPRINT-01**: Configurable sprint mode (`auto` vs `planned`)
  - Auto mode: system manages sprints
  - Planned mode: user controls sprints
- [ ] **SPRINT-02**: Auto sprint mode implementation
  - Fixed duration (configurable, e.g., 2 weeks)
  - Auto-close on schedule
  - Auto-create next sprint
  - Assign completed items to current sprint
- [ ] **SPRINT-03**: Planned sprint mode implementation
  - `gsd:create-sprint` — Create new sprint
  - `gsd:plan-sprint` — Assign items to sprint
  - Manual sprint lifecycle
- [ ] **SPRINT-04**: `gsd:sprint-review` command
  - Sprint summary
  - Velocity tracking
  - Carried-over items

### REPORT: Reporting

- [ ] **REPORT-01**: `gsd:jira-report` — Sync status report
  - Sync health
  - Recent changes
  - Pending items
- [ ] **REPORT-02**: `gsd:jira-dashboard` — Visual dashboard
  - Sprint burndown (via Jira)
  - Team velocity (via Jira)
  - GSD↔Jira coverage

### DOCS: Documentation

- [ ] **DOCS-01**: Setup guide
  - acli installation
  - Authentication setup
  - Initial configuration
- [ ] **DOCS-02**: Multi-developer collaboration guide
  - Team workflow patterns
  - Conflict prevention
  - Best practices

---

## v2 Requirements (Deferred)

- Multi-project sync (one GSD project → multiple Jira projects)
- Jira Server/Data Center support
- Kanban board support
- Custom field mapping UI
- Webhook-based real-time sync

---

## Out of Scope

- **Custom Jira REST API client** — use `acli` only
- **Jira Server/Data Center** — Cloud only for v1
- **Kanban boards** — Scrum boards only
- **Real-time sync** — polling/manual sync only

---

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| SPEC-01 | 1 | Roadmapped |
| SPEC-02 | 1 | Roadmapped |
| SPEC-03 | 4 | Roadmapped |
| SPEC-04 | 6 | Roadmapped |
| CLI-01 | 1 | Roadmapped |
| CLI-02 | 2 | Roadmapped |
| CLI-03 | 2 | Roadmapped |
| CLI-04 | 3 | Roadmapped |
| CLI-05 | 3 | Roadmapped |
| AUTO-01 | 2 | Roadmapped |
| AUTO-02 | 2 | Roadmapped |
| AUTO-03 | 3 | Roadmapped |
| AUTO-04 | 3 | Roadmapped |
| AUTO-05 | 3 | Roadmapped |
| SYNC-01 | 2 | Roadmapped |
| SYNC-02 | 4 | Roadmapped |
| SYNC-03 | 4 | Roadmapped |
| SYNC-04 | 4 | Roadmapped |
| SPRINT-01 | 5 | Roadmapped |
| SPRINT-02 | 5 | Roadmapped |
| SPRINT-03 | 5 | Roadmapped |
| SPRINT-04 | 5 | Roadmapped |
| REPORT-01 | 6 | Roadmapped |
| REPORT-02 | 6 | Roadmapped |
| DOCS-01 | 6 | Roadmapped |
| DOCS-02 | 6 | Roadmapped |

---
*Requirements defined: 2026-01-31*
*Roadmapped: 2026-01-31 (26/26 mapped to 6 phases)*
