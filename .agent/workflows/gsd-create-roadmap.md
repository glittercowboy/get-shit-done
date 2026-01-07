---
description: Create a roadmap and phase breakdown based on PROJECT.md
---

# GSD: Create Roadmap

This workflow generates a project roadmap, breaking the work down into logical phases.

## 1. Validation

// turbo
1. Check if `.planning/PROJECT.md` exists. If not, abort and tell user to run `gsd-new-project`.
2. Check if `.planning/ROADMAP.md` already exists.
   - If yes, ask user: "Roadmap exists. View, Replace, or Cancel?"
   - If "View", cat the file and exit.
   - If "Cancel", exit.
   - If "Replace", proceed.

## 2. Phase Identification

Analyze the `PROJECT.md` to identify the necessary phases.

1. **Read Context**: Read `.planning/PROJECT.md` and `.planning/config.json`.
2. **Propose Phases**: Based on the project goals and "Planning Depth" (Quick/Standard/Comprehensive), propose a list of phases.
   - **Format**: `1. [Name] - [Goal]`
   - **Pattern**: Foundation -> Core -> Enhancements -> Polish.
   - **Depth Guidance**:
     - Quick: 3-5 phases (Aggressive grouping).
     - Standard: 5-8 phases.
     - Comprehensive: 8-12 phases (Granular).

3. **Confirm**: Present the proposed phases to the user.
   - "Here is the proposed roadmap breakdown: ... Does this look right?"
   - Iterate if the user wants changes.

## 3. Research Detection

For each confirmed phase, determine if "Research" is likely needed.
- **Likely**: External APIs, new tech, complex architectural decisions (Auth, Payments, AI).
- **Unlikely**: Standard CRUD, UI work, existing patterns.

*Self-Correction*: You do not need to ask the user to confirm this, just use your best judgment to flag them in the roadmap.

## 4. Generate Artifacts

1. **Create Structure**: `mkdir -p .planning/phases`
2. **Write ROADMAP.md**: Use the template at `.agent/templates/gsd/roadmap.md`.
   - Fill in Phase List, Dependencies, and Research Flags.
   - Set status of all phases to "not started".
3. **Write STATE.md**: Use the template at `.agent/templates/gsd/state.md`.
   - Initialize with "Phase 1" as current focus (but status "Ready to plan").
   - Initialize metrics.

4. **Create Directories**:
   - Create directories for each phase: `.planning/phases/01-foundation`, `.planning/phases/02-auth`, etc.

## 5. git Commit

```bash
git add .planning/ROADMAP.md .planning/STATE.md .planning/phases/
git commit -m "docs: create roadmap with [N] phases"
```

## 6. Next Steps

Display the new roadmap summary.
Suggest: "Next, we should plan the first phase."
Command: `Run workflow: GSD Plan Phase 1` (Note: You will implement this next).
