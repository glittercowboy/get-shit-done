# Project Research Summary

**Project:** Constitutional Enforcement for GSD CLI
**Domain:** Policy-as-code validation in developer tooling
**Researched:** 2026-01-18
**Confidence:** HIGH

## Executive Summary

Constitutional enforcement for GSD should leverage **zero-dependency Node.js capabilities** (v20+ built-in test runner, util.parseArgs) combined with **checkpoint validation** at phase verification time. This approach maintains GSD's philosophy while preventing the false-positive death spiral that plagues traditional linter-based enforcement. The key insight: enforce through workflow gates and git commit evidence, not continuous linting.

The recommended approach uses a **hybrid constitution model** (global defaults + project overrides) with **severity-based enforcement** (error blocks with override option, not fatal blocking). Validation runs at phase verification checkpoints, analyzing git commit patterns to verify TDD practice rather than trusting self-reported status. This evidence-based approach prevents both under-enforcement (toothless rules) and over-enforcement (productivity killer) pitfalls.

Critical risk: retroactive application to existing GSD projects. Mitigation through constitution versioning (`constitution_version: 1`) with grandfather clause and opt-in migration. Start with <10 high-value rules (TDD-first, critical conventions) rather than comprehensive ruleset. Success depends on progressive enforcement (warn → error over sprints) and required override justification to prevent abuse.

## Key Findings

### Recommended Stack

GSD's zero-dependency philosophy aligns perfectly with constitutional enforcement needs. Node.js v20+ provides stable built-ins (test runner, parseArgs) that replace external dependencies. Bash git hooks handle commit-time gates. No npm packages needed.

**Core technologies:**
- **Node.js test runner (v20+)**: TDD pattern detection in commits — zero deps, stable API, sufficient for regex pattern matching
- **util.parseArgs()**: CLI flag parsing for `--override`, `--strict` — native alternative to Commander.js/yargs
- **Bash git hooks**: Validation at commit/push time — standard git mechanism, no installation overhead
- **Native RegExp**: Pattern matching for TDD tests, commit messages — built-in, performant, adequate for validation needs

**Critical version requirement:** Recommend Node.js v20+ for stable APIs. GSD currently requires v16.7+, but v20 stabilizes test runner and parseArgs. Flag as experimental if staying on v18.

### Expected Features

Constitutional enforcement systems are judged on ability to catch violations without destroying workflow.

**Must have (table stakes):**
- Rule violation detection with evidence (analyze git history, not self-reports)
- Clear violation messages with context ("why it fails" not just "what's wrong")
- Error-level enforcement with override mechanism (blocks but allows bypass with reason)
- Severity levels (NON-NEGOTIABLE/error/warning) mapping to enforcement actions

**Should have (competitive):**
- Multi-level constitution (global + project overrides) — differentiator vs single-config tools
- TDD commit pattern validation — unique to TDD-focused workflows, requires git history parsing
- Contextual explanations with anti-pattern docs — SpecKit-inspired, reduces repeat violations
- Override audit trail with justification — prevents abuse, enables compliance review

**Defer (v2+):**
- Automated fixes for common violations (need violation patterns first)
- Constitution versioning with migration tooling (defer until format stable)
- Real-time IDE integration (prove value in CLI first)
- Convention catalog/hub (needs multiple projects sharing constitutions)

**Anti-features to avoid:**
- Fatal enforcement without override (breaks emergencies, creates workaround culture)
- Real-time typing enforcement (interrupts flow, warning fatigue)
- GUI-based constitution editor (wrong abstraction, belongs in markdown/git)

### Architecture Approach

Constitutional enforcement follows layered architecture: Policy Storage → Rule Evaluation → Enforcement Decision. GSD integration adds checkpoint validation at phase verification time, not continuous enforcement.

**Major components:**
1. **Constitution Loader** — reads global (`~/.claude/get-shit-done/CONSTITUTION.md`) + project (`.planning/CONSTITUTION.md`), merges with project override precedence, caches for session
2. **Rule Evaluator** — executes validation checks (TDD commit pattern analysis via git log, anti-pattern grep), collects violations by severity
3. **Enforcement Engine** — makes PASS/BLOCK decisions based on severity, handles override prompts with reason capture, logs to STATE.md
4. **Validation Hook** — integrates as Step 10 in gsd-verifier agent, runs after goal verification before phase completion

**Key pattern:** Evidence-based validation. Check git commits for test-before-implementation, not SUMMARY.md claims. Objective, reproducible, prevents "I forgot" errors.

**Integration point:** Phase verification checkpoint (gsd-verifier), NOT pre-commit hooks. Reasoning: pre-commit breaks TDD rapid-commit workflow, CI/CD gate is mandatory enforcement point, local hooks are DX helpers only.

### Critical Pitfalls

Top 5 pitfalls ranked by impact and likelihood:

1. **False Positive Death Spiral** — High false positive rates (>25%) erode trust, developers disable enforcement wholesale. **Avoid:** Start with <10 high-confidence rules, progressive warn→error enforcement, monitor disable directive usage as quality metric.

2. **Pre-Commit Breaking TDD Workflows** — Enforcement at pre-commit blocks rapid iteration (commits every 5-10min), breaks flow state. **Avoid:** Use phase verification checkpoints instead, make local hooks optional, enforce in CI as required gate.

3. **Retroactive Application Breaking Existing Projects** — Applying rules to 50+ existing GSD projects overnight generates thousands of violations, trust collapse. **Avoid:** Constitution versioning with grandfather clause, opt-in migration, warn-only mode for 1 sprint before errors.

4. **Override Mechanism Abuse** — Easy overrides lead to 40%+ violations disabled within months, enforcement meaningless. **Avoid:** Require justification with override, track metrics (% overridden by rule), alert if override % exceeds 20%, retire rules with high override rate.

5. **Zero-Dependency Philosophy Conflict** — Constitutional enforcement typically needs complex parsing (AST, YAML), adding deps breaks GSD philosophy. **Avoid:** Enforce through structure/convention not parsing, use bash regex for simple checks, delegate complex validation to CI where deps acceptable.

## Implications for Roadmap

Based on research, constitutional enforcement should build in 4 phases emphasizing progressive rollout over comprehensive coverage.

### Phase 1: Foundation (Constitution Files + Loading)
**Rationale:** Cheapest to create, enables experimentation before committing to enforcement logic. Zero-dependency foundation prevents backtracking.

**Delivers:**
- Global constitution at `~/.claude/get-shit-done/CONSTITUTION.md` with NON-NEGOTIABLE/ERROR/WARNING structure
- Project override support at `.planning/CONSTITUTION.md`
- Constitution loader (bash/Node.js) that merges global + project, caches to temp file
- Constitution versioning system to prevent retroactive breaks
- Severity classification system (error blocks with override, warn logs only)

**Addresses:**
- Multi-level constitution feature (global + project hierarchy)
- Retroactive application pitfall (versioning with grandfather clause)
- Zero-dependency conflict (loader uses only bash/Node.js built-ins)

**Avoids:**
- Configuration scope blindness (multi-level from start)
- False positive death spiral (severity system enables progressive enforcement)

**Research flag:** SKIP — Constitution file format is well-established (markdown with frontmatter), merge logic is standard configuration pattern.

---

### Phase 2: TDD Commit Validation (Evidence-Based Checking)
**Rationale:** TDD enforcement is core value proposition. Git history analysis is objective evidence vs self-reports. Single validator proves architecture before expanding.

**Delivers:**
- TDD commit pattern validator (bash/Node.js) that analyzes git history
- Test-before-implementation detection (compare commit timestamps/ancestry)
- Validation infrastructure: run validator, collect violations, categorize by severity
- Override mechanism with required justification
- False positive monitoring (track developer feedback on violations)

**Uses:**
- `git log --oneline {phase_start}..HEAD` for commit range
- `git diff-tree` for file detection
- Native RegExp for test file patterns (*.test.js, *.spec.js)

**Implements:**
- Rule Evaluator component (from architecture)
- Evidence-based validation pattern

**Addresses:**
- TDD commit pattern validation feature (differentiator)
- Override mechanism with audit trail

**Avoids:**
- Validation without evidence (checks git, not claims)
- Under-enforcement (objective violations harder to ignore)

**Research flag:** MEDIUM — Git history analysis patterns well-documented, but TDD-specific commit ordering may need experimentation on test repos.

---

### Phase 3: Verifier Integration (Checkpoint Enforcement)
**Rationale:** Validation proven in isolation, now integrate at natural checkpoint (phase verification). Phase-end timing avoids pre-commit TDD workflow disruption.

**Delivers:**
- gsd-verifier Step 10: Constitutional Validation
- Load cached constitution from orchestrator
- Run TDD validator (from Phase 2)
- Enforcement decision engine (PASS/BLOCK based on severity)
- Override prompt with reason capture
- STATE.md extension for constitutional_overrides
- VERIFICATION.md extension for violations report

**Implements:**
- Enforcement Engine component
- Validation Hook integration point
- Checkpoint validation pattern (not continuous)

**Addresses:**
- Enforcement point feature (when rules run)
- Severity levels feature (error vs warning)

**Avoids:**
- Pre-commit breaking TDD (validates at phase end, not commit time)
- No escape hatch (override mechanism with reason)
- Single validation point (checkpoint per phase, not project end)

**Research flag:** SKIP — GSD agent integration patterns well-documented in codebase, verification workflow is established.

---

### Phase 4: Progressive Enforcement & Migration
**Rationale:** Initial rollout needs migration path for existing projects and graduated enforcement timeline. Prevents adoption resistance.

**Delivers:**
- Migration tooling for existing GSD projects (constitution version upgrade)
- Warn-only mode with graduation timeline (2 sprints warn → error enforcement)
- Override metrics dashboard (% violations overridden per rule)
- Rule effectiveness review process (sunset rules with >30% override rate)
- Documentation: rationale for each rule, fix guides, examples
- Emergency override mechanism for incident response

**Addresses:**
- Retroactive breaks mitigation (migration tool, grandfather clause)
- Progressive enforcement (graduated timeline, not big-bang)
- Override abuse prevention (metrics, review process)

**Avoids:**
- Retroactive application breaking existing projects (migration path provided)
- Over-enforcement (start with 3-5 rules, graduated rollout)
- Enforcement without education (docs with rationale and fix guides)
- No emergency escape hatch (documented emergency override)

**Research flag:** LOW — Migration patterns standard (version negotiation, warn-before-error), but may need user research on override justification UX.

---

### Phase Ordering Rationale

**Critical path:** Constitution files → Validator logic → Verifier integration → Progressive rollout

- **Phase 1 first:** Cannot validate without constitution defined. Cheapest to experiment with file format before enforcement logic locks it in.
- **Phase 2 before 3:** Cannot integrate validator into verifier until validation logic proven. Single TDD validator tests architecture before expanding.
- **Phase 4 last:** Cannot migrate until enforcement works. Progressive rollout needs working system to graduate.

**Dependency chain:**
- Constitution loader ← TDD validator (validator reads constitution)
- TDD validator ← Verifier integration (verifier calls validator)
- Verifier integration ← Migration tooling (migration upgrades constitution version, triggers new enforcement)

**Parallel work opportunities:**
- Phase 1 constitution files can be drafted during architecture design
- Phase 4 documentation can be written during Phase 2-3 implementation
- Override metrics schema can be defined anytime before Phase 4 integration

**Pitfall prevention:**
- Starting with validation logic (skipping Phase 1) risks zero-dependency conflict if complex parsing assumed
- Pre-commit integration (skipping Phase 3 checkpoint pattern) triggers TDD workflow disruption
- Skipping Phase 4 migration causes retroactive breaks on existing projects

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (TDD Validation):** Git history analysis for commit ordering is well-documented, but applying to TDD red-green-refactor cycle may need experimentation. Suggest `/gsd:research-phase` if test file ancestry detection proves complex.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Configuration file merging is standard pattern (ESLint, Prettier all do global+project override). Markdown parsing via regex is proven.
- **Phase 3 (Integration):** GSD agent extension patterns documented in codebase. Verification workflow modifications follow established convention.
- **Phase 4 (Migration):** Progressive enforcement (warn→error) and versioning are standard in linter ecosystem (ESLint flat config migration). No novel patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Official Node.js docs verify v20 stability for test runner and parseArgs. Git hooks are standard mechanism with extensive documentation. |
| Features | HIGH | Multiple sources (SpecKit, ESLint, OPA, pre-commit) converge on same feature set. Table stakes vs differentiators clear from competitive analysis. |
| Architecture | HIGH | Policy-as-code architecture patterns well-established (OPA, AWS PaC). GSD codebase provides concrete integration points. Checkpoint validation proven in CI/CD systems. |
| Pitfalls | HIGH | Authoritative sources document false positive impact (linter trust research), pre-commit workflow issues (jyn.dev analysis), retroactive breaks (ESLint flat config migration). |

**Overall confidence:** HIGH

### Gaps to Address

Research was comprehensive, but two areas need validation during implementation:

- **TDD commit ordering heuristics:** Git history analysis is proven, but mapping to red-green-refactor cycle may need tuning. What counts as "test before implementation" when commits are squashed? How to handle test-only commits vs implementation-only commits vs mixed? **Handle:** Prototype validator in Phase 2, iterate on edge cases with real commit histories.

- **Override justification UX:** Required justification prevents abuse, but prompt UX affects compliance. Too restrictive = developers skip enforcement entirely, too lenient = meaningless reasons. **Handle:** User research in Phase 4 on justification friction vs audit value. Start with free-form text, analyze patterns, consider structured reasons later.

- **False positive rate baseline:** <25% target from research, but baseline for TDD pattern detection unknown. Test file naming conventions vary (*.test.js, *.spec.js, __tests__/, *_test.js). **Handle:** Phase 2 pilot with GSD's own codebase to calibrate detection patterns before wider rollout.

## Sources

### Primary (HIGH confidence)
- **Official Node.js Documentation** — util.parseArgs() and test runner stability verified in v20 release notes
- **Git Hooks Documentation** — pre-commit, commit-msg, pre-push specifications and scripting patterns
- **GSD Codebase** — `.planning/codebase/ARCHITECTURE.md`, `agents/gsd-verifier.md` provide concrete integration points
- **ESLint Architecture Documentation** — rule-based validation patterns, severity levels, override mechanisms

### Secondary (MEDIUM confidence)
- **SpecKit Constitution Command (DeepWiki)** — NON-NEGOTIABLE principle marking, constitutional enforcement patterns
- **Open Policy Agent Documentation** — policy-as-code architecture (loader, evaluator, enforcement engine)
- **Pre-commit Framework** — git hook integration patterns, tool-agnostic validation
- **Git Diff/Log for Script Automation** — commit parsing patterns for evidence-based validation

### Tertiary (LOW confidence, used for pitfall identification)
- **"Why You Don't Trust Your Linter" (GOTO 2022)** — false positive impact on developer trust
- **"Pre-commit hooks are fundamentally broken" (jyn.dev)** — TDD workflow disruption analysis
- **"Why the Policy-as-Code revolution didn't happen" (GRC Engineer)** — under-enforcement patterns
- **ESLint flat config migration** — retroactive application lessons, progressive enforcement

### Research File Sources
- **STACK.md** — 9 HIGH confidence sources (official docs), 5 MEDIUM (verified community)
- **FEATURES.md** — 19 sources covering constitutional enforcement (SpecKit), policy-as-code (OPA), git hooks, ESLint patterns
- **ARCHITECTURE.md** — 15 sources including AWS PaC guide, OPA architecture, ESLint internals, GSD codebase
- **PITFALLS.md** — 29 sources documenting linter trust issues, hook problems, enforcement failures, backward compatibility

---
*Research completed: 2026-01-18*
*Ready for roadmap: yes*
