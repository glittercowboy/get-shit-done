# Codebase Concerns

**Analysis Date:** 2026-01-24

## Tech Debt

**Duplicate Agent Instructions:**
- Issue: Full agent files (`gsd-planner.md`, `gsd-executor.md`, `gsd-verifier.md`) kept alongside tiered versions (core + extended)
- Files: `agents/gsd-planner.md`, `agents/gsd-executor.md`, `agents/gsd-verifier.md`, `agents/gsd-verifier-extended.md`, `agents/gsd-executor-extended.md`, `agents/gsd-planner-extended.md`
- Impact: Maintenance burden — changes must be duplicated across monolithic and tiered versions; 21K+ duplicate bytes per agent; loading logic must maintain backwards compatibility
- Fix approach: Post v2.0 GA, deprecate monolithic files in v2.1. Update orchestrators to load tiered versions exclusively. Remove full files after deprecation window (2 minor versions).

**Research Agent Duplication (Pre-v2.0):**
- Issue: 4 × identical `gsd-project-researcher.md` copies before consolidation to base + focus-specific model
- Files: `agents/gsd-project-researcher.md` (legacy), `agents/gsd-project-researcher-base.md` (refactored), focus files (stack/features/architecture/pitfalls)
- Impact: Legacy file creates confusion during new-project command; orchestrators must route to correct files; 21K overhead if legacy still used
- Fix approach: Remove `agents/gsd-project-researcher.md` after new-project verified using base architecture (v2.0.1)

**Outdated Agent References:**
- Issue: Multiple agents reference "/gsd:analyze-codebase" and "/gsd:query-intel" which were removed in v1.9.2
- Files: Search mentions in agent instructions where removed functionality referenced
- Impact: If agents execute these commands, they'll fail; users reading docs see dead commands
- Fix approach: Grep all agent files for "analyze-codebase" and "query-intel" references; remove or redirect to codebase-mapper instead

## Known Bugs

**Integration Checking Incomplete:**
- Symptoms: No integration checker called in standard workflows despite gsd-integration-checker.md existing
- Files: `agents/gsd-integration-checker.md` (complete but unused), no reference in `commands/gsd/` or `get-shit-done/workflows/`
- Trigger: Phases complete without verifying cross-phase wiring; orphaned exports/unused APIs slip through
- Workaround: Manual `/gsd:audit-milestone` can request integration check, but not automatic
- Fix approach: Add integration-checker invocation to complete-milestone workflow after all phases verify; make it mandatory for >3 phase projects

**Migration Detection May Fail on Edge Cases:**
- Symptoms: Projects with v1.x config but no gsd_version field might not trigger migration correctly
- Files: `GSD-V2-OPTIMIZATION-DESIGN.md` section 2.2 (migration detection logic), would be in orchestrator/startup code
- Trigger: Projects upgraded via git pull to v2.0 without explicit config migration
- Workaround: Manual `/gsd:migrate` command available
- Fix approach: Implement defensive detection — check not just for gsd_version but for absence of `optimization` section; treat as v1 if either missing

**Delta Context Protocol Incomplete Implementation:**
- Symptoms: Token savings of 40-55% projected but not yet verified in actual execution
- Files: `GSD-V2-OPTIMIZATION-DESIGN.md` sections 3.2 (design), would be in plan-phase and execute-phase commands
- Trigger: Delta context loading logic not fully implemented; orchestrators still load full files
- Impact: Projected token savings not realized; cost analysis misleading
- Fix approach: Implement selective inlining functions per section 3.2; add token tracking to verify claimed savings; test with 5 real projects before GA

## Security Considerations

**Installation Script Trust Model:**
- Risk: `bin/install.js` runs with elevated permissions, writes to global/local directories
- Files: `/bin/install.js` (1292 lines), uses fs.mkdirSync, fs.writeFileSync without sanitation
- Current mitigation: User explicitly runs installer; scripts don't execute without user confirmation
- Recommendations:
  - Validate all paths for directory traversal before writing
  - Add checksum verification of remote package contents if using package-based distribution
  - Log all file operations during installation for audit trail
  - Implement rollback mechanism if installation fails mid-execution

**Configuration File Secrets:**
- Risk: `.planning/config.json` may contain sensitive data (API keys, tokens) but no encryption
- Files: Config stored in project root `.planning/config.json`
- Current mitigation: None detected — config is plain JSON
- Recommendations:
  - Document that secrets should NOT be stored in config.json
  - Create separate `.env` pattern for sensitive values
  - Add validation warning if config contains common secret patterns (key=, token=, password=)
  - Update installation guide to distinguish between public config and secret management

**Insufficient Input Validation in Commands:**
- Risk: If user provides malicious input (file paths, command args), could execute arbitrary code
- Files: Command files in `commands/gsd/` and workflows that take user input
- Current mitigation: Commands wrapped in structured prompts; user input limited to confirmations/selections
- Recommendations:
  - Document input validation approach for new commands
  - Sanitize all file paths in executor before passing to fs operations
  - Validate all URLs before using in fetch/curl operations
  - Add bash safety flags (-e, -u) to shell scripts that use variables

## Performance Bottlenecks

**Large Agent Files Loading Overhead:**
- Problem: gsd-planner.md (41KB), gsd-debugger.md (35KB), gsd-verifier.md (21KB) still loaded in full in some workflows
- Files: `agents/gsd-planner.md`, `agents/gsd-debugger.md`, `agents/gsd-verifier.md`
- Cause: Tiered loading not yet fully implemented; legacy/fallback code still references full versions
- Impact: Higher token consumption than v2.0 design projects (40-55% reduction not achieved)
- Improvement path: Complete tiered loading implementation; instrument all orchestrator calls to track which version loaded; verify 50%+ reduction on small projects before v2.0.0 GA

**Workflow Files Still Monolithic:**
- Problem: execute-plan.md (55,908 bytes / ~15,974 tokens) loaded even for simple 1-task plans
- Files: `get-shit-done/workflows/execute-plan.md` (no compact version yet despite design)
- Cause: Compact version designed but not implemented (execute-plan-compact.md mentioned in design, 18K bytes / 5,142 tokens target)
- Impact: Every plan execution loads 10K+ unnecessary tokens (examples, edge cases, verbose explanations)
- Improvement path: Create execute-plan-compact.md per section 3.3; implement conditional loading based on plan complexity; target >65% size reduction

**Checkpoint Loading for All Plans:**
- Problem: checkpoints.md (~11,192 tokens) loaded for all plans regardless of autonomous setting
- Files: `get-shit-done/references/checkpoints.md`, loaded in all executor contexts
- Cause: Lazy reference loading not yet implemented (designed in section 3.4 but not deployed)
- Impact: 11K+ wasted tokens per plan when autonomous=true (plan doesn't need checkpoints)
- Improvement path: Implement conditional loading gate `should_load_reference("checkpoints.md", plan_context) && plan.autonomous == false`; test with autonomous plans

**Research Synthesis Redundancy:**
- Problem: 4 parallel researchers all load the entire base instructions even when they differ in focus
- Files: `agents/gsd-project-researcher-base.md` (517 lines) loaded 4×
- Cause: Shared base + focus-specific additions design implemented but orchestrator still creates 4 full context loads
- Impact: ~15K tokens duplicated across 4 parallel researchers
- Improvement path: Refactor new-project spawn logic to create base once, add focus-specific additions per researcher; pre-compute merged instructions

## Fragile Areas

**Integration Between v1.x and v2.0 Configs:**
- Files: `GSD-V2-OPTIMIZATION-DESIGN.md` (design), would involve config loading logic
- Why fragile: Projects with hybrid v1/v2 config might break; feature flags in optimization section require careful parsing
- Safe modification: When adding new optimization flags, create migration script that adds to existing config.json; test with real v1 projects before release
- Test coverage: Need integration tests for v1→v2 migration covering: config parsing, feature flag defaults, backward compatibility mode

**Multi-Stage Planning with Checker Iterations:**
- Files: `agents/gsd-plan-checker.md` (745 lines), `agents/gsd-planner.md`, orchestrator loop logic (in commands/gsd/plan-phase)
- Why fragile: Checker iterations must not regress; iteration 2+ must receive correct delta context (issues + minimal context) per section 3.6; context loss causes quality degradation
- Safe modification: When modifying checker logic, add checkpoint after iteration 1 to verify issues detected correctly before attempting fixes
- Test coverage: Need tests showing n iterations improve plan quality without regression; test with naturally complex projects (>10 phases)

**Context Budget Thresholds:**
- Files: `GSD-V2-OPTIMIZATION-DESIGN.md` section 3.7, would be in orchestrator code
- Why fragile: Threshold values (40% warn, 60% suggest, 75% critical) are empirically tuned; changing without testing could cause either false alarms or missed problems
- Safe modification: Any threshold change requires parallel A/B testing with 10+ projects; measure: warning accuracy, false positive rate, token actually consumed vs estimate
- Test coverage: Need tests for budget warning system showing: correct estimates, accurate thresholds, proper escalation from warn→suggest→critical

**Stub/Placeholder Detection in Verification:**
- Files: `agents/gsd-verifier.md`, `agents/gsd-verifier-extended.md`, verification patterns in `get-shit-done/references/verification-patterns.md`
- Why fragile: Regex patterns to detect stubs can produce false positives (legitimate comments matching placeholder patterns) or miss obfuscated stubs
- Safe modification: When adding stub patterns, test on real codebases to avoid false positives; document all patterns with examples of false positives
- Test coverage: Need verification tests covering: common stub patterns, false positive cases, legitimate code that shouldn't trigger, edge cases like comments containing "placeholder"

## Scaling Limits

**Project Size and Token Consumption:**
- Current capacity: Tested up to ~20 phase projects (~3.94M tokens with v2.0 optimizations)
- Limit: Beyond 25+ phases, token consumption per phase stays high; diminishing returns on optimization (delta context less effective as system size grows)
- Scaling path: For large projects, implement multi-milestone batching; split 50-phase project into 3 milestones of 15-17 phases each; share state across milestones; test with real 30+ phase project

**Parallel Agent Execution:**
- Current capacity: max_concurrent_agents set to 3 in v2.0 config (4 researchers in new-project, but executed sequentially in reality)
- Limit: 4 parallel researchers + orchestrator context overhead = ~200K token window usage for new-project; marginal benefit of >4 parallel agents
- Scaling path: Implement researcher result streaming; process findings as they arrive instead of waiting for all 4; reduces peak memory/token requirement

**Orchestrator Context Reuse:**
- Current capacity: Single orchestrator instance handles 1 project lifecycle; all phases, all research, all plans
- Limit: Post-100 phase projects, single orchestrator context approaches natural boundaries; no ability to "close" and archive old phase context
- Scaling path: Implement context segmentation per milestone; archive old milestone context to files; reload on-demand if phase needs to reference earlier work

## Dependencies at Risk

**Feature Flags and Backwards Compatibility:**
- Risk: v2.0 introduces `optimization` config section with multiple toggles; if orchestrators not carefully written, incompatible combinations could break
- Impact: Users enabling `delta_context: true` but `tiered_instructions: false` might get unexpected behavior
- Migration plan:
  - Document all valid flag combinations
  - Implement validation logic that prevents incompatible combinations
  - Default values must work for all combinations
  - Test every combination on real projects before GA

**Agent Instruction Version Mismatches:**
- Risk: If orchestrator loads gsd-planner-core.md but references content from gsd-planner-extended.md (e.g., specific example), agent will fail
- Impact: Extended loading triggers don't fire → agent gets incomplete instructions → task execution fails
- Migration plan:
  - Document all cross-references between core and extended files
  - Implement version checks: core version must match extended version
  - Test core-only execution paths (extended never loads) to verify completeness

## Missing Critical Features

**No Automated Regression Testing:**
- Problem: v2.0 claims 40-55% token reduction but no automated test suite verifies this
- Blocks: Can't confidently release v2.0 without proof savings are real
- Approach: Create benchmark suite comparing v1.9.13 vs v2.0 on 5-10 real projects; measure actual token consumption; verify quality metrics same/better

**No Integration Test Coverage:**
- Problem: gsd-integration-checker exists but not called; cross-phase integration breaks not caught
- Blocks: Multi-phase projects can have orphaned code, broken APIs, unprotected routes without detection
- Approach: Add integration-checker step to complete-milestone; require passing before milestone can be shipped; document minimum integration checks

**No Budget Tracking/Reporting:**
- Problem: ContextBudget system designed but not implemented; users don't know token costs
- Blocks: Can't make informed decisions about project scope; might hit context limits unexpectedly
- Approach: Implement context budget tracking per phase; report cumulative costs; warn before reaching 50% of total budget for project

**No Telemetry/Instrumentation:**
- Problem: Can't verify v2.0 optimizations working in the wild
- Blocks: Migration success rate unknown; feature adoption unknown; which optimizations actually help unknown
- Approach: Add optional telemetry collection (opt-in via config); track: tokens per operation, optimization feature usage, migration completion rates

## Test Coverage Gaps

**Tiered Loading Behavior:**
- What's not tested: Whether agents actually behave identically with core-only vs core+extended instructions
- Files: `agents/gsd-planner-core.md`, `agents/gsd-executor-core.md`, `agents/gsd-verifier-core.md` (core files); extended versions
- Risk: Core files might lack critical examples or edge cases; agents retry more often than expected with core-only
- Priority: HIGH — blocks v2.0 GA
- Approach: Create execution tests comparing core-only vs full instruction versions on same tasks; measure retry rate, quality scores

**Migration Path for v1→v2:**
- What's not tested: Real v1.x projects migrating to v2.0
- Files: Migration detection logic (in startup code), `/gsd:migrate` command
- Risk: Real projects with unexpected config variations might fail migration silently
- Priority: HIGH — users have existing projects
- Approach: Set up 5-10 real v1.x projects; run migration; verify config changes correctly; verify subsequent commands work

**Delta Context Protocol Correctness:**
- What's not tested: Whether selective context loading reduces tokens without breaking agent execution
- Files: Context building logic (would be in plan-phase, execute-phase orchestrators)
- Risk: Selectively loading context might miss information agents need; quality degrades silently
- Priority: HIGH — foundation of v2.0 savings claims
- Approach: Execute identical plans with full context vs delta context; compare token usage and output quality; verify claims

**Lazy Reference Loading Edge Cases:**
- What's not tested: Whether references load at the right time; whether optional references skip correctly
- Files: `get-shit-done/references/checkpoints.md`, `get-shit-done/references/tdd.md`
- Risk: Reference loading logic might load too aggressively (waits loading references that aren't needed) or too conservatively (skips needed references)
- Priority: MEDIUM — affects optimization but not correctness
- Approach: Test plans with autonomous=true (skip checkpoints), autonomous=false (load checkpoints); test TDD and non-TDD plans

**Stub Detection False Positives/Negatives:**
- What's not tested: Regex patterns used to detect stubs against real codebases
- Files: `agents/gsd-verifier.md` (stub detection patterns), `get-shit-done/references/verification-patterns.md`
- Risk: Too many false positives = noise; too few = real stubs missed
- Priority: MEDIUM — affects verification quality
- Approach: Run stub detector against 10 real projects; manually verify each flagged stub; adjust patterns to minimize false positives

---

*Concerns audit: 2026-01-24*
