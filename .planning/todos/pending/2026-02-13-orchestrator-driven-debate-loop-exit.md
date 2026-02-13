---
created: 2026-02-13T16:36
title: Orchestrator-driven debate loop exit
area: commands
files:
  - commands/gsd/execute-phase.md
  - commands/gsd/new-project.md
  - commands/gsd/plan-phase.md
---

## Problem

The adversary debate loop currently defers to the adversary's CONTINUE/CONVERGE recommendation for loop control. This means rounds continue even when only MAJOR/MINOR challenges exist and no verifier/planner re-spawn is triggered — burning tokens on back-and-forth over methodology nitpicks rather than substantive code issues.

Observed in Phase 5 verification: 3 rounds of debate with zero verifier re-spawns. Round 1 had 3 MAJOR methodology complaints (evidence format, artifact type confusion, error handling scope). Rounds 2-3 added diminishing value. The orchestrator had enough information after round 1 to decide the challenges didn't warrant continuation.

## Solution

Change debate loop logic in all three command files so the orchestrator decides continuation based on challenge severity:

- **BLOCKING** — always continue (re-spawn defender agent)
- **MAJOR** — orchestrator evaluates: substantive concern? continue. Methodology nitpick? exit with notes.
- **MINOR only** — exit loop, note challenges in summary

The adversary agent itself stays unchanged — it still always challenges and recommends CONTINUE/CONVERGE. The orchestrator just exercises its existing authority ("adversary informs, orchestrator decides") to short-circuit when the evidence doesn't warrant another round.

Key insight: aligns with the "advisory role" decision from Phase 1 (01-01). The orchestrator already has decision authority; the debate loop just needs explicit instructions to exercise it on severity.
