# Fork Manifest: deseltrus/get-shit-done

Tracks what this fork adds beyond upstream (glittercowboy/get-shit-done).
Used by `/gsd-update-safe` to know what needs re-syncing after GSD updates.

## Enhanced Files (our modifications)

### Wave 0: Context Fidelity (original 5)

| File | Enhancement | Source PR | Status |
|------|-------------|-----------|--------|
| `agents/gsd-planner.md` | context_fidelity items 4-6 + self-check + INTENT-MAP.md production | #459 | Custom |
| `agents/gsd-plan-checker.md` | Dimension 7: 7a/7b/7c + Dimension 8: intent map completeness | #459 | Custom |
| `commands/gsd/plan-phase.md` | Section Guides + INTENT-MAP pass-through to checker/revision | #459 | Custom |
| `get-shit-done/workflows/discuss-phase.md` | depth_protocol + verify_depth + handoff/seed consumption + intent_chain | #459 | Custom |
| `get-shit-done/templates/context.md` | Rich examples + enhanced guidelines | #459 | Custom |

### Wave 1: Intent Fidelity System — New Files (4)

| File | Purpose | Status |
|------|---------|--------|
| `get-shit-done/references/adaptive-depth.md` | Generalized depth protocol for any context-writing workflow | New |
| `get-shit-done/references/intent-fidelity.md` | Protocol definition: envelope tiers, chain model, accountability | New |
| `get-shit-done/templates/handoff.md` | Phase completion handoff template (intended vs actual delta) | New |
| `get-shit-done/templates/intent-seed.md` | Intent seed YAML format definition | New |

### Wave 2-5: Intent Fidelity System — Modified Files (5 additional)

| File | Enhancement | Status |
|------|-------------|--------|
| `commands/gsd/add-phase.md` | Intent seed capture (AskUserQuestion + YAML in ROADMAP) | Custom |
| `commands/gsd/insert-phase.md` | Lighter intent seed capture (urgent, 1 question) | Custom |
| `agents/gsd-verifier.md` | CONTEXT.md + INTENT-MAP.md loading, Step 5.5 intent verification | Custom |
| `commands/gsd/verify-work.md` | Dual-source UAT (plan-derived + intent-derived tests) | Custom |
| `get-shit-done/workflows/verify-work.md` | Dual-source test extraction + source breakdown in UAT.md | Custom |
| `get-shit-done/workflows/transition.md` | create_handoff step (HANDOFF.md with delta computation) | Custom |
| `get-shit-done/templates/state.md` | Intent Chain table + documentation + size constraint guidance | Custom |

## Cherry-Picked PRs

| PR | Feature | Files Touched | Cherry-Pick Date | Upstream Status |
|----|---------|---------------|------------------|-----------------|
| #439 | Agent Teams (research cross-pollination, adversarial debug, streaming plan verification) | 12 files (agents, commands, scripts) | 2026-02-07 | Open |

## Overlap Matrix

When upstream merges a PR we cherry-picked, this matrix shows which files need attention:

| If upstream merges... | Files that overlap with our custom changes | Action needed |
|----------------------|-------------------------------------------|---------------|
| #439 (Agent Teams) | `agents/gsd-planner.md`, `agents/gsd-plan-checker.md`, `commands/gsd/plan-phase.md` | Rebase fork on upstream/main, verify Section Guides + context_fidelity survive |
| #459 (our PR) | ALL 5 custom files | Custom changes become upstream. Re-sync becomes a no-op for these files. |

## Update Workflow

1. Run `/gsd-update-safe` (runs GSD update + re-syncs from this fork)
2. If upstream merged a cherry-picked PR: `cd ~/Projects/get-shit-done && git rebase upstream/main`
3. Resolve any conflicts (our Section Guides vs upstream changes)
4. Re-run `/gsd-update-safe` to sync resolved files

## Files to Sync (for /gsd-update-safe)

```bash
FORK="/Users/mikroverse/Projects/get-shit-done"
TARGET="/Users/mikroverse/.claude"

# Original 5 (Wave 0: Context Fidelity)
cp "$FORK/agents/gsd-planner.md" "$TARGET/agents/gsd-planner.md"
cp "$FORK/agents/gsd-plan-checker.md" "$TARGET/agents/gsd-plan-checker.md"
cp "$FORK/commands/gsd/plan-phase.md" "$TARGET/commands/gsd/plan-phase.md"
cp "$FORK/get-shit-done/templates/context.md" "$TARGET/get-shit-done/templates/context.md"
cp "$FORK/get-shit-done/workflows/discuss-phase.md" "$TARGET/get-shit-done/workflows/discuss-phase.md"

# New files (Wave 1: Intent Fidelity references + templates)
cp "$FORK/get-shit-done/references/adaptive-depth.md" "$TARGET/get-shit-done/references/adaptive-depth.md"
cp "$FORK/get-shit-done/references/intent-fidelity.md" "$TARGET/get-shit-done/references/intent-fidelity.md"
cp "$FORK/get-shit-done/templates/handoff.md" "$TARGET/get-shit-done/templates/handoff.md"
cp "$FORK/get-shit-done/templates/intent-seed.md" "$TARGET/get-shit-done/templates/intent-seed.md"

# Modified files (Waves 2-5: Intent Fidelity enhancements)
cp "$FORK/commands/gsd/add-phase.md" "$TARGET/commands/gsd/add-phase.md"
cp "$FORK/commands/gsd/insert-phase.md" "$TARGET/commands/gsd/insert-phase.md"
cp "$FORK/agents/gsd-verifier.md" "$TARGET/agents/gsd-verifier.md"
cp "$FORK/commands/gsd/verify-work.md" "$TARGET/commands/gsd/verify-work.md"
cp "$FORK/get-shit-done/workflows/verify-work.md" "$TARGET/get-shit-done/workflows/verify-work.md"
cp "$FORK/get-shit-done/workflows/transition.md" "$TARGET/get-shit-done/workflows/transition.md"
cp "$FORK/get-shit-done/templates/state.md" "$TARGET/get-shit-done/templates/state.md"
```
