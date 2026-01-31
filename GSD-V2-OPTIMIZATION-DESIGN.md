# GSD v2.0 Token Optimization Design Document

> **Version:** 2.0.0-design
> **Date:** 2026-01-24
> **Status:** Design Phase
> **Compatibility:** Breaking with Safety Net

---

## Executive Summary

GSD v2.0 introduces a comprehensive token optimization layer that reduces consumption by **40-60%** without compromising workflow quality. The design follows a "Zero Degradation" principle: every optimization must maintain or improve output quality while reducing token overhead.

### Key Metrics (Projected)

| Metric | v1.9.13 | v2.0.0 | Improvement |
|--------|---------|--------|-------------|
| Avg tokens per phase | ~327,000 | ~150,000 | -54% |
| Project setup cost | $4.45 | $2.20 | -51% |
| Small project total | $12.49 | $5.50 | -56% |
| Context efficiency | ~35% | ~70% | +100% |

---

## 1. Design Philosophy

### 1.1 Core Principles

1. **Zero Degradation**: No optimization may reduce output quality. If an optimization creates uncertainty, it must not be implemented.

2. **Intelligent Loading**: Load what's needed, when it's needed. Defensive pre-loading is replaced by confident just-in-time loading.

3. **Fresh Context, Smart Content**: Maintain fresh context windows for every subagent while being surgical about what fills that context.

4. **Progressive Disclosure**: Instructions start minimal and expand only when the agent demonstrates need for additional guidance.

5. **Observable Efficiency**: Every optimization must be measurable and its impact trackable.

### 1.2 Anti-Patterns to Eliminate

| Anti-Pattern | Current Impact | Solution |
|--------------|----------------|----------|
| Blanket loading | ~16K tokens wasted per executor | Conditional loading |
| Identical context replication | ~72K tokens per project | Delta protocol |
| Defensive verbosity | ~65% of agent files | Tiered instructions |
| Always-on references | ~11K per checkpoint-less plan | Lazy loading |

---

## 2. Architecture Changes

### 2.1 New Config Schema (v2)

```json
{
  "gsd_version": "2.0.0",
  "mode": "interactive|yolo",
  "depth": "quick|standard|comprehensive",

  "workflow": {
    "research": true,
    "plan_check": true,
    "verifier": true
  },

  "optimization": {
    "level": "standard|aggressive|minimal",
    "context_budget": {
      "enabled": true,
      "warn_threshold": 40,
      "suggest_split_threshold": 60,
      "critical_threshold": 75
    },
    "tiered_instructions": true,
    "delta_context": true,
    "lazy_references": true,
    "compact_workflows": true
  },

  "parallelization": {
    "enabled": true,
    "plan_level": true,
    "task_level": false,
    "skip_checkpoints": true,
    "max_concurrent_agents": 3,
    "min_plans_for_parallel": 2
  },

  "gates": {
    "confirm_project": true,
    "confirm_phases": true,
    "confirm_roadmap": true,
    "confirm_breakdown": true,
    "confirm_plan": true,
    "execute_next_plan": true,
    "issues_review": true,
    "confirm_transition": true
  },

  "safety": {
    "always_confirm_destructive": true,
    "always_confirm_external_services": true
  },

  "model_profile": "balanced|quality|budget"
}
```

### 2.2 Migration Detection System

```
┌─────────────────────────────────────────────────────────────────┐
│ GSD STARTUP FLOW (v2.0)                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 1. Check .planning/config.json exists                          │
│    ├─ No → Fresh project, use v2 defaults                      │
│    └─ Yes → Check gsd_version field                            │
│                                                                 │
│ 2. Version detection                                           │
│    ├─ gsd_version: "2.x" → Proceed normally                    │
│    ├─ gsd_version: "1.x" → Trigger migration flow              │
│    └─ gsd_version: absent → Assume v1.x, trigger migration     │
│                                                                 │
│ 3. Migration flow                                              │
│    ├─ Display migration banner                                 │
│    ├─ Analyze project structure                                │
│    ├─ Present options:                                         │
│    │   A) Migrate now (recommended)                            │
│    │   B) Continue in compatibility mode                       │
│    │   C) Archive and restart                                  │
│    └─ Execute chosen path                                      │
│                                                                 │
│ 4. Migration actions                                           │
│    ├─ Add gsd_version to config.json                           │
│    ├─ Add optimization section with defaults                   │
│    ├─ Validate existing files parse correctly                  │
│    └─ Report migration status                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Optimization Implementations

### 3.1 Tiered Instructions System

**Concept:** Agent instructions split into Core (always loaded) and Extended (loaded on demand).

**Structure:**

```
agents/
├── gsd-planner.md           # Full file (legacy, kept for reference)
├── gsd-planner-core.md      # Core instructions (~35% of original)
└── gsd-planner-extended.md  # Extended guidance (~65% of original)
```

**Core Content (~35%):**
- Role definition
- Input/output specification
- Mandatory process steps
- Quality gates
- Output format

**Extended Content (~65%):**
- Philosophy/principles
- Detailed examples
- Edge case handling
- Anti-patterns
- Troubleshooting

**Loading Logic:**

```python
def load_agent_instructions(agent_name, context):
    core = read_file(f"agents/{agent_name}-core.md")

    # Always start with core
    instructions = core

    # Extended loading triggers:
    triggers = [
        context.get("retry_count", 0) > 0,        # Retrying = needs more guidance
        context.get("complexity") == "high",       # Complex task = preemptive guidance
        context.get("previous_errors", []),        # Had errors = needs examples
        config.optimization.level == "minimal"     # User wants full instructions
    ]

    if any(triggers):
        extended = read_file(f"agents/{agent_name}-extended.md")
        instructions += "\n\n" + extended

    return instructions
```

**Token Impact:**

| Agent | Full (v1) | Core (v2) | Savings |
|-------|-----------|-----------|---------|
| gsd-planner | 11,940 | 4,180 | -65% |
| gsd-executor | 6,224 | 2,178 | -65% |
| gsd-verifier | 6,225 | 2,179 | -65% |
| gsd-debugger | 10,247 | 3,586 | -65% |

### 3.2 Delta Context Protocol

**Concept:** Instead of loading full context files into every subagent, load only what changed or what's relevant.

**Implementation:**

```
┌─────────────────────────────────────────────────────────────────┐
│ CONTEXT LOADING - OLD vs NEW                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ OLD (v1.x):                                                    │
│ ┌──────────────────┐                                           │
│ │ Agent 1 Context  │ PROJECT.md (1500) + ROADMAP (2000)        │
│ │                  │ + STATE (1300) + REQUIREMENTS (2000)      │
│ │ Total: 6,800     │                                           │
│ └──────────────────┘                                           │
│ ┌──────────────────┐                                           │
│ │ Agent 2 Context  │ PROJECT.md (1500) + ROADMAP (2000)        │
│ │                  │ + STATE (1300) + REQUIREMENTS (2000)      │
│ │ Total: 6,800     │ (IDENTICAL to Agent 1!)                   │
│ └──────────────────┘                                           │
│                                                                 │
│ NEW (v2.0):                                                    │
│ ┌──────────────────┐                                           │
│ │ Agent 1 Context  │ PROJECT.md (1500) + ROADMAP (2000)        │
│ │                  │ + STATE (1300) + REQUIREMENTS (2000)      │
│ │ Total: 6,800     │                                           │
│ └──────────────────┘                                           │
│ ┌──────────────────┐                                           │
│ │ Agent 2 Context  │ STATE delta (300) + Relevant ROADMAP      │
│ │                  │ section (400) + Task-specific REQ (200)   │
│ │ Total: 900       │ (-87% reduction!)                         │
│ └──────────────────┘                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Selective Inlining Logic:**

```python
def build_agent_context(agent_type, phase_number, task_context):
    context = {}

    if agent_type == "gsd-executor":
        # Executor needs:
        # - Current phase from ROADMAP only
        # - Relevant decisions from STATE
        # - Task-mapped requirements from REQUIREMENTS
        context["roadmap"] = extract_phase_section(roadmap, phase_number)
        context["state"] = extract_relevant_decisions(state, phase_number)
        context["requirements"] = extract_mapped_reqs(requirements, task_context.req_ids)

    elif agent_type == "gsd-verifier":
        # Verifier needs:
        # - Phase goal from ROADMAP
        # - Success criteria from ROADMAP
        # - Full STATE (for decision context)
        context["roadmap"] = extract_phase_goal_and_criteria(roadmap, phase_number)
        context["state"] = state  # Full, verifier needs complete history

    elif agent_type == "gsd-planner":
        # Planner needs most context, but not all
        context["project"] = project  # Full, defines vision
        context["roadmap"] = roadmap  # Full, defines phases
        context["state"] = state  # Full, defines constraints
        context["requirements"] = extract_v1_requirements(requirements)  # Only v1 scope

    return context
```

### 3.3 Compact Workflow Files

**Concept:** Create optimized versions of workflow files that remove examples and edge cases.

**Current execute-plan.md:** 55,908 bytes (~15,974 tokens)

**New execute-plan-compact.md:** ~18,000 bytes (~5,142 tokens) - **68% reduction**

**Sections to Compact:**

| Section | Original | Compact | Reduction |
|---------|----------|---------|-----------|
| Execution flow | 8,000 | 3,000 | -63% |
| Deviation rules | 12,000 | 4,000 | -67% |
| TDD handling | 6,000 | 2,000 | -67% |
| Checkpoint protocol | 15,000 | 5,000 | -67% |
| Examples | 10,000 | 2,000 | -80% |
| Edge cases | 5,000 | 2,000 | -60% |

**Loading Strategy:**

```python
def get_workflow_file(workflow_name, context):
    if config.optimization.compact_workflows:
        compact_path = f"workflows/{workflow_name}-compact.md"
        if exists(compact_path):
            return compact_path
    return f"workflows/{workflow_name}.md"
```

### 3.4 Lazy Reference Loading

**Concept:** Don't load reference files until they're actually needed.

**Current Behavior:**
- checkpoints.md loaded in ALL executors
- tdd.md loaded if TDD mentioned anywhere
- verification-patterns.md loaded preemptively

**New Behavior:**

```python
def should_load_reference(ref_name, plan_context):
    rules = {
        "checkpoints.md": lambda ctx: ctx.plan.autonomous == False,
        "tdd.md": lambda ctx: ctx.plan.type == "tdd",
        "verification-patterns.md": lambda ctx: ctx.is_verification_phase,
    }
    return rules.get(ref_name, lambda _: True)(plan_context)
```

**Token Savings:**

| Reference | Tokens | Load Frequency (v1) | Load Frequency (v2) | Savings/Project |
|-----------|--------|---------------------|---------------------|-----------------|
| checkpoints.md | 11,192 | 100% of plans | ~20% of plans | ~134K tokens |
| tdd.md | 2,195 | ~50% of plans | ~10% of plans | ~13K tokens |
| verification-patterns.md | 4,728 | 100% of verifiers | 100% (no change) | 0 |

### 3.5 Shared Research Base

**Concept:** The 4 parallel researchers in /gsd:new-project share a common instruction base, with only focus-specific additions.

**Current:**
- 4 × gsd-project-researcher.md (21,728 bytes each)
- Total: 86,912 bytes (~24,832 tokens)

**New Structure:**

```
agents/
├── gsd-project-researcher-base.md   # Common instructions (~15,000 bytes)
├── gsd-project-researcher-stack.md  # Stack focus additions (~2,000 bytes)
├── gsd-project-researcher-features.md   # Features focus (~2,000 bytes)
├── gsd-project-researcher-architecture.md  # Architecture focus (~2,000 bytes)
└── gsd-project-researcher-pitfalls.md  # Pitfalls focus (~2,000 bytes)
```

**Loading:**

```python
def spawn_researcher(focus):
    base = read_file("agents/gsd-project-researcher-base.md")
    focus_specific = read_file(f"agents/gsd-project-researcher-{focus}.md")
    return base + "\n\n" + focus_specific

# Total per researcher: ~17,000 bytes vs 21,728
# Total for 4 researchers: ~68,000 bytes vs 86,912 (-22%)
```

### 3.6 Intelligent Checker Reload

**Concept:** When plan-checker iterates, subsequent runs receive only the delta (issues + minimal context).

**Current Flow:**

```
Iteration 1: Full planner context → plans
             Full checker context → issues found

Iteration 2: Full planner context (AGAIN) → revised plans
             Full checker context (AGAIN) → issues found

Iteration 3: Full planner context (AGAIN) → final plans
             Full checker context (AGAIN) → passed
```

**New Flow:**

```
Iteration 1: Full planner context → plans
             Full checker context → issues found

Iteration 2: Planner receives:
             - Previous plans (unchanged sections collapsed)
             - Specific issues to address
             - Relevant context sections only
             Total: ~40% of original

Iteration 3: Same pattern
             Total: ~40% of original
```

**Implementation:**

```python
def build_revision_context(iteration, previous_plans, issues, full_context):
    if iteration == 1:
        return full_context

    return {
        "issues_to_address": issues,
        "plans_requiring_revision": filter_affected_plans(previous_plans, issues),
        "relevant_decisions": extract_issue_related_decisions(full_context.state, issues),
        "phase_goal": full_context.phase_goal,  # Always needed
    }
```

### 3.7 Context Budget Warning System

**Concept:** Track estimated token usage and warn before problems occur.

**Implementation:**

```python
class ContextBudget:
    WARN = 0.40      # 40% - Yellow warning
    SUGGEST = 0.60   # 60% - Suggest splitting
    CRITICAL = 0.75  # 75% - Strong warning
    MAX = 200_000    # Context window size

    def __init__(self):
        self.usage = 0

    def add(self, content, category):
        tokens = estimate_tokens(content)
        self.usage += tokens
        self.log(category, tokens)
        self.check_thresholds()

    def check_thresholds(self):
        ratio = self.usage / self.MAX

        if ratio >= self.CRITICAL:
            emit_warning("CRITICAL", f"Context at {ratio*100:.0f}%")
        elif ratio >= self.SUGGEST:
            emit_suggestion("Consider splitting this task")
        elif ratio >= self.WARN:
            emit_info(f"Context usage: {ratio*100:.0f}%")
```

---

## 4. File Changes Required

### 4.1 New Files to Create

| File | Purpose | Size Est. |
|------|---------|-----------|
| `agents/gsd-planner-core.md` | Core planner instructions | ~15K |
| `agents/gsd-planner-extended.md` | Extended planner guidance | ~27K |
| `agents/gsd-executor-core.md` | Core executor instructions | ~8K |
| `agents/gsd-executor-extended.md` | Extended executor guidance | ~14K |
| `agents/gsd-verifier-core.md` | Core verifier instructions | ~8K |
| `agents/gsd-verifier-extended.md` | Extended verifier guidance | ~14K |
| `agents/gsd-project-researcher-base.md` | Shared researcher base | ~15K |
| `agents/gsd-project-researcher-stack.md` | Stack focus | ~2K |
| `agents/gsd-project-researcher-features.md` | Features focus | ~2K |
| `agents/gsd-project-researcher-architecture.md` | Architecture focus | ~2K |
| `agents/gsd-project-researcher-pitfalls.md` | Pitfalls focus | ~2K |
| `get-shit-done/workflows/execute-plan-compact.md` | Compact execution workflow | ~18K |
| `commands/gsd/migrate.md` | Migration command | ~8K |

### 4.2 Files to Modify

| File | Changes |
|------|---------|
| `get-shit-done/templates/config.json` | Add v2 schema with optimization section |
| `commands/gsd/new-project.md` | Add migration detection, use optimization config |
| `commands/gsd/plan-phase.md` | Implement tiered loading, delta context |
| `commands/gsd/execute-phase.md` | Implement lazy references, compact workflows |
| `commands/gsd/settings.md` | Add optimization settings UI |
| `bin/install.js` | Add version tracking |

### 4.3 Files to Keep (No Changes)

| File | Reason |
|------|--------|
| Original agent files (gsd-*.md) | Kept for reference/compatibility mode |
| Reference files | Structure unchanged, loading logic changes |
| Templates | Format unchanged |

---

## 5. Implementation Phases

### Phase 1: Foundation (Config + Migration)
1. Update config.json schema to v2
2. Implement migration detection in startup flow
3. Create /gsd:migrate command
4. Add gsd_version tracking

### Phase 2: Tiered Instructions
1. Split gsd-planner.md into core/extended
2. Split gsd-executor.md into core/extended
3. Split gsd-verifier.md into core/extended
4. Implement tiered loading logic in orchestrators

### Phase 3: Context Optimization
1. Implement delta context protocol
2. Create selective inlining functions
3. Update plan-phase.md to use delta context
4. Update execute-phase.md to use delta context

### Phase 4: Workflow Optimization
1. Create execute-plan-compact.md
2. Implement lazy reference loading
3. Add conditional checkpoints.md loading
4. Add conditional tdd.md loading

### Phase 5: Research Optimization
1. Create shared researcher base
2. Create focus-specific researcher files
3. Update new-project.md to use split researchers

### Phase 6: Checker Optimization
1. Implement revision context builder
2. Update plan-phase.md checker loop
3. Test iteration reduction

### Phase 7: Budget System
1. Implement ContextBudget class
2. Add threshold warnings
3. Integrate into orchestrators
4. Add budget reporting

---

## 6. Testing Strategy

### 6.1 Quality Preservation Tests

For each optimization, verify output quality matches v1.9.13:

```
Test Suite: Output Quality
├── test_planner_output_matches_v1
├── test_executor_output_matches_v1
├── test_verifier_catches_same_issues
├── test_researcher_coverage_matches
└── test_end_to_end_project_quality
```

### 6.2 Token Reduction Verification

```
Test Suite: Token Metrics
├── test_plan_phase_token_reduction
├── test_execute_phase_token_reduction
├── test_new_project_token_reduction
├── test_full_project_token_reduction
└── test_no_regression_under_load
```

### 6.3 Migration Tests

```
Test Suite: Migration
├── test_v1_project_detected
├── test_migration_preserves_state
├── test_compatibility_mode_works
├── test_post_migration_commands_work
└── test_fresh_project_uses_v2
```

---

## 7. Rollout Strategy

### 7.1 Release Phases

1. **Alpha (internal)**: Test with sample projects
2. **Beta (opt-in)**: Users can enable via flag
3. **RC**: Default on for new projects, opt-in for existing
4. **GA**: Full release as v2.0.0

### 7.2 Feature Flags

During beta, optimizations can be individually toggled:

```json
{
  "optimization": {
    "tiered_instructions": true,  // Can disable individually
    "delta_context": false,       // Can enable individually
    "lazy_references": true,
    "compact_workflows": true
  }
}
```

---

## 8. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Token reduction | >40% | Automated benchmark |
| Quality preservation | 100% | Regression tests |
| Migration success rate | >95% | User telemetry |
| User satisfaction | Same or better | Feedback survey |

---

## Appendix A: Detailed Token Projections

### A.1 Per-Operation Comparison

| Operation | v1.9.13 Tokens | v2.0.0 Tokens | Reduction |
|-----------|----------------|---------------|-----------|
| /gsd:new-project | 146,912 | 78,000 | -47% |
| /gsd:plan-phase | 91,117 | 42,000 | -54% |
| /gsd:execute-phase (3 plans) | 211,324 | 95,000 | -55% |
| /gsd:verify-work | 25,000 | 15,000 | -40% |
| Full phase cycle | 327,441 | 152,000 | -54% |

### A.2 Project-Level Comparison

| Project Size | v1.9.13 | v2.0.0 | Savings |
|--------------|---------|--------|---------|
| Small (5 phases) | 1.85M tokens | 0.84M tokens | $6.99 |
| Medium (10 phases) | 3.66M tokens | 1.67M tokens | $13.82 |
| Large (20 phases) | 7.88M tokens | 3.60M tokens | $29.74 |

---

## Appendix B: Migration Command Specification

### /gsd:migrate

**Purpose:** Upgrade v1.x project to v2.0 format

**Flow:**

1. Detect current version
2. Analyze project structure
3. Present migration plan
4. Execute migration:
   - Add gsd_version to config.json
   - Add optimization section with sensible defaults
   - Validate all files parse correctly
5. Report success/issues

**Compatibility Mode:**

If user chooses compatibility mode instead of migration:
- Set `optimization.level: "minimal"`
- All v1.x behavior preserved
- No token optimizations applied
- Warning shown on each command

---

*Document created: 2026-01-24*
*Author: GSD Optimization Team*
*Status: Ready for Implementation*
