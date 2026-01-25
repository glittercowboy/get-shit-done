# Workflow Maintenance Guide

## execute-plan.md vs execute-plan-compact.md

### Purpose

These two files provide the same **logical execution flow** but with different verbosity:

- **execute-plan.md** (1844 lines): Full documentation with detailed explanations, examples, edge cases, and troubleshooting
- **execute-plan-compact.md** (305 lines): Streamlined version focusing on essential steps and logic

### Why Two Files?

**Context optimization:** The compact version saves ~12,500 tokens per executor agent, crucial when running multiple parallel agents.

**Selection logic** (in execute-phase.md):
```bash
if [ "$COMPACT_WORKFLOWS" = "true" ]; then
  WORKFLOW_FILE="execute-plan-compact.md"
else
  WORKFLOW_FILE="execute-plan.md"
fi
```

### Structural Differences

The files have **different step granularity** by design:

| execute-plan.md (24 steps) | execute-plan-compact.md (8 steps) | Purpose |
|----------------------------|-----------------------------------|---------|
| resolve_model_profile | load_context | Config loading |
| load_project_state | load_context | State initialization |
| identify_plan | identify_and_confirm_plan | Plan discovery |
| init_agent_tracking | (implicit) | Tracking setup |
| load_prompt | (implicit in parse_segments) | Prompt parsing |
| parse_segments | parse_segments | Checkpoint parsing |
| segment_execution | execute_tasks | Core execution |
| checkpoint_protocol | (implicit in execute_tasks) | Checkpoint handling |
| execute | execute_tasks | Task execution |
| extract_decisions_and_issues | create_summary | Decision extraction |
| create_summary | create_summary | Summary creation |
| git_commit_metadata | commit_and_update | Git operations |
| update_roadmap | commit_and_update | Roadmap updates |
| update_state | update_state | State updates |
| offer_next | offer_next | Next steps |

**Key difference:** Compact version merges related steps, full version breaks them down for clarity.

### Maintenance Strategy

#### When Modifying Logic

**If changing core logic (task execution, checkpoints, commits):**

1. Update **both files** with the same logical change
2. Full version: Add detailed explanation and examples
3. Compact version: Keep concise, focus on "what" not "why"
4. Run parity test: `./tests/test-workflow-parity.sh` (expected to fail - different step names)
5. Manually verify logic equivalence

**If adding a new step:**

1. Determine if it's core logic (required) or guidance (optional)
2. Core logic → add to both files
3. Guidance only → add only to execute-plan.md
4. Document the difference in this file

**If fixing a bug:**

1. Fix in execute-plan.md first (authoritative source)
2. Verify fix in context of full workflow
3. Port equivalent fix to execute-plan-compact.md
4. Test both workflows with real plans

#### Sections That Must Stay Synchronized

These **critical sections** must maintain logical equivalence:

- ✅ **task_commit_protocol** - Commit format and logic
- ✅ **checkpoint_protocol** - Checkpoint handling (full has details, compact has essentials)
- ✅ **deviation_rules** - When to deviate from plan
- ✅ **summary_creation** - SUMMARY.md format and content
- ✅ **authentication_gates** - Auth error handling
- ✅ **tdd_flow** - RED-GREEN-REFACTOR cycle

#### Sections That Can Differ

These sections intentionally differ in verbosity:

- 📝 **Examples** - Full has extensive examples, compact has minimal/none
- 📝 **Troubleshooting** - Full has detailed troubleshooting, compact omits
- 📝 **Edge cases** - Full documents edge cases, compact handles implicitly
- 📝 **Commentary** - Full explains "why", compact states "what"

### Testing Strategy

#### Automated Testing (Parity Test)

The parity test (`./tests/test-workflow-parity.sh`) verifies critical sections exist in both files.

**Note:** Step name parity will **always fail** because files have different granularity. This is intentional.

**What to check manually:**
1. Critical sections present in both files
2. Logic flow equivalence (not step-by-step match)
3. Same success criteria
4. Same deviation rules

#### Manual Testing Checklist

Before releasing changes to either workflow:

- [ ] Test with autonomous plan (no checkpoints)
- [ ] Test with non-autonomous plan (has checkpoints)
- [ ] Test with TDD tasks
- [ ] Test with authentication gates
- [ ] Verify SUMMARY.md creation
- [ ] Verify commit format matches protocol
- [ ] Test both COMPACT_WORKFLOWS=true and false

### Version History

| Date | Change | Files Affected | By |
|------|--------|----------------|-----|
| 2026-01-25 | Created maintenance guide | WORKFLOW_MAINTENANCE.md | System |
| 2026-01-24 | Delta context validation | execute-phase.md | System |
| 2026-01-24 | TDD + delta_context fix | execute-phase.md | System |

### Quick Reference

**When to edit execute-plan.md only:**
- Adding examples or clarifications
- Documenting edge cases
- Adding troubleshooting guidance
- Expanding explanations

**When to edit both files:**
- Changing task commit format
- Modifying checkpoint protocol
- Updating deviation rules
- Fixing execution bugs
- Changing success criteria

**After any edit:**
1. Test locally with a real plan
2. Update this maintenance guide if adding new divergence
3. Document changes in version history above

### Future Improvements

Considered but not implemented:

- ❌ **Full templating system** - Too complex, files structurally different
- ❌ **Auto-generation** - Would lose compact's intentional simplification
- ✅ **Parity testing** - Implemented (checks critical sections)
- ✅ **Maintenance documentation** - This file

**Recommendation:** Keep current approach. The verbosity difference is a feature, not a bug. Manual sync is acceptable given low change frequency.
