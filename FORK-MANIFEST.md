# Fork Manifest: deseltrus/get-shit-done

Tracks what this fork adds beyond upstream (glittercowboy/get-shit-done).
Used by `/gsd-update-safe` to know what needs re-syncing after GSD updates.

## Enhanced Files (our modifications)

| File | Enhancement | Source PR | Status |
|------|-------------|-----------|--------|
| `agents/gsd-planner.md` | context_fidelity items 4-6 + self-check | #459 | Custom |
| `agents/gsd-plan-checker.md` | Dimension 7: 7a/7b/7c sub-dimensions | #459 | Custom |
| `commands/gsd/plan-phase.md` | Section Guides in all prompts + domain awareness | #459 | Custom |
| `get-shit-done/workflows/discuss-phase.md` | depth_protocol + verify_depth + quality criteria | #459 | Custom |
| `get-shit-done/templates/context.md` | Rich examples + enhanced guidelines | #459 | Custom |

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

cp "$FORK/agents/gsd-planner.md" "$TARGET/agents/gsd-planner.md"
cp "$FORK/agents/gsd-plan-checker.md" "$TARGET/agents/gsd-plan-checker.md"
cp "$FORK/commands/gsd/plan-phase.md" "$TARGET/commands/gsd/plan-phase.md"
cp "$FORK/get-shit-done/templates/context.md" "$TARGET/get-shit-done/templates/context.md"
cp "$FORK/get-shit-done/workflows/discuss-phase.md" "$TARGET/get-shit-done/workflows/discuss-phase.md"
```
