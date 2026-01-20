# Requirements: GSD Quick Mode

**Defined:** 2025-01-19
**Core Value:** Same guarantees, 50-70% fewer tokens for simple tasks

## v1 Requirements

### Command

- [x] **CMD-01**: `/gsd:quick "description"` parses description from arguments
- [x] **CMD-02**: Command errors if .planning/ROADMAP.md doesn't exist
- [x] **CMD-03**: Command calculates next decimal phase from current phase in STATE.md
- [x] **CMD-04**: Command creates phase directory `.planning/phases/{decimal}-{slug}/`
- [x] **CMD-05**: Command inserts decimal phase entry in ROADMAP.md

### Execution

- [x] **EXEC-01**: Command spawns gsd-planner (no researcher, no checker)
- [x] **EXEC-02**: Command spawns gsd-executor for each plan created
- [x] **EXEC-03**: Multiple plans execute in parallel waves (same as execute-phase)
- [x] **EXEC-04**: Executor commits only files it edits/creates

### State

- [x] **STATE-01**: STATE.md "Last activity" updated after completion
- [x] **STATE-02**: STATE.md "Quick Tasks Completed" table created/updated
- [x] **STATE-03**: ROADMAP.md decimal phase marked complete with date

### Resume

- [ ] **RESUME-01**: `/gsd:resume-work` parses decimal phase numbers (3.1, 3.2)
- [ ] **RESUME-02**: `/gsd:resume-work` finds decimal phase directories

### Docs

- [x] **DOCS-01**: help.md lists `/gsd:quick` command
- [x] **DOCS-02**: README.md includes quick mode section
- [x] **DOCS-03**: GSD-STYLE.md documents quick mode patterns

## v2 Requirements

(None identified)

## Out of Scope

| Feature | Reason |
|---------|--------|
| `--plan-only` flag | MVP always executes |
| `--after N` flag | Always uses current phase |
| `--standalone` flag | Requires active project for state integrity |
| Node.js helper scripts | Claude handles decimal parsing inline |
| Git status warnings | Commits only its own files |
| Planner modifications | Orchestrator skips agents, planner unchanged |
| gsd-verifier | Verification skipped by design |
| Requirements mapping | Quick tasks are ad-hoc |
| `/gsd:squash-quick` | Future enhancement |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CMD-01 | Phase 1 | Complete |
| CMD-02 | Phase 1 | Complete |
| CMD-03 | Phase 1 | Complete |
| CMD-04 | Phase 1 | Complete |
| CMD-05 | Phase 1 | Complete |
| EXEC-01 | Phase 1 | Complete |
| EXEC-02 | Phase 1 | Complete |
| EXEC-03 | Phase 1 | Complete |
| EXEC-04 | Phase 1 | Complete |
| STATE-01 | Phase 1 | Complete |
| STATE-02 | Phase 1 | Complete |
| STATE-03 | Phase 1 | Complete |
| RESUME-01 | Phase 2 | Pending |
| RESUME-02 | Phase 2 | Pending |
| DOCS-01 | Phase 2 | Complete |
| DOCS-02 | Phase 2 | Complete |
| DOCS-03 | Phase 2 | Complete |

**Coverage:**
- v1 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0

---
*Requirements defined: 2025-01-19*
*Last updated: 2025-01-19 after roadmap creation*
