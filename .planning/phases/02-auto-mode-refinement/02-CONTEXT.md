# Phase 2: Auto Mode Refinement - Context

**Gathered:** 2026-02-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Safety and learning mechanisms for autonomous model selection — ensuring Haiku doesn't produce low-quality work, preventing infinite loops/runaway execution, and learning from mistakes to improve future routing decisions.

This phase builds on Phase 1's routing infrastructure to add validation, circuit breakers, error escalation, and feedback-driven learning.

</domain>

<decisions>
## Implementation Decisions

### Validation Strategy
- Sonnet validates both output correctness AND reasoning quality (not just final result)
- Auto-retry with Sonnet when validation fails (no user confirmation needed)
- Display: Summary only ("Validated by Sonnet ✓") — silent on success, show summary on failure
- Tiered validation depth: Light checks for low-risk tasks, thorough review for critical tasks
- Validation checks: Does output match expectations? Was Haiku's approach sound? Any shortcuts or misunderstandings?

### Circuit Breaker Behavior
- **Iteration cap priority**: Iteration limits are primary safety net, time limits are secondary
- **Time limits**: Configurable per model (default: 20m Haiku, 40m Sonnet, 60m Opus)
- **Logging**: Track time per task + model for future threshold tuning
- **Recovery on trip**: Attempt to salvage work or escalate to stronger model before failing
- **Adaptive thresholds**: Task-based adjustment (complex tasks get higher limits) PLUS learning-based adjustment (system learns which task types need more iterations over time)

### Error Escalation
- **Weighted error scoring**:
  - Complete rejections (Sonnet says "redo from scratch") = 1.0
  - Validation fixes (partial corrections needed) = 0.5
  - Retries (transient failures) = 0.25
- **Error feedback**: Include explanation of what went wrong + review that rework fixed the issues
- **Escalation threshold**: Aggressive (1-2 errors trigger escalation to stronger model) — prefer quality over cost savings
- **User notification**: Summary at end only (silent during execution, show escalation history in final report)

### Learning Feedback
- **Feature flag**: Optional prompt after task completion ("Was this the right model?")
- **Modes**: Ask human OR ask Opus (configurable in GSD config)
- **On incorrect routing**: System must learn which model SHOULD have been used for that pattern
- **Multi-signal learning**: Extract patterns, task signatures, AND user preferences
  - Pattern-based rules (e.g., "validation tasks → Sonnet")
  - Task fingerprints (keywords, complexity signals)
  - User-specific quality/cost trade-offs
- **Rule merging**: Learned rules merge intelligently with built-in routing rules (conflict resolution)
- **Transparency**: Full visibility — users can view and edit learned routing rules

### Claude's Discretion
- Specific validation checks to run (within "output + reasoning quality" framework)
- Exact weighted scoring formula (within provided ranges)
- Conflict resolution strategy when learned rules clash with built-in rules
- UI/UX for reviewing and editing learned rules

</decisions>

<specifics>
## Specific Ideas

- "Iteration cap has higher priority than time limits — but we need both"
- "Time limits must be configurable — 20m/40m/60m defaults, but let users adjust"
- "Log everything so we can tune thresholds later based on real data"
- "If answer is 'no' to 'right model?' then Opus/human must say which model was appropriate"
- "Weighted scoring ensures we track severity, not just error count"

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-auto-mode-refinement*
*Context gathered: 2026-02-15*
