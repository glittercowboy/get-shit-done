# Phase 2: Configuration - Research

**Researched:** 2026-02-13
**Domain:** GSD config.json schema extension for adversary settings
**Confidence:** HIGH

## Summary

This phase adds adversary configuration to `.planning/config.json` — a global toggle, per-checkpoint toggles (with boolean/object polymorphism), and configurable max debate rounds. The research domain is the existing GSD configuration system: how config.json is structured, read, written, and documented across the codebase.

The core challenge is introducing a nested, polymorphic config section (adversary checkpoints accept both boolean shorthand and object form) into a system that currently uses flat grep-based config extraction. The existing pattern of `cat config.json | grep | grep` works for simple booleans and strings but cannot handle the boolean-to-object coercion needed for checkpoint values like `"plan": true` vs `"plan": { "enabled": true, "max_rounds": 4 }`.

**Primary recommendation:** Place `adversary` as a top-level key in config.json (alongside `workflow`, `parallelization`, `gates`). For config reading, provide a standard adversary config reading block using `node -e` for robust JSON parsing of polymorphic values. For config writing, extend `new-project` and `settings` commands with adversary options. Document the schema in `planning-config.md`.

## Standard Stack

This is a pure configuration/prompt engineering task. No external dependencies.

### Core
| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| config.json template | N/A | Default config shape | GSD standard config template |
| planning-config.md | N/A | Config documentation | GSD reference pattern |
| Bash config reading | N/A | Extract values at runtime | Established GSD pattern |
| Node.js JSON parsing | N/A | Polymorphic value handling | Available in all GSD environments (npm package) |

### Supporting
| Component | Version | Purpose | When to Use |
|-----------|---------|---------|-------------|
| `commands/gsd/settings.md` | N/A | User-facing config UI | Adding adversary toggles to settings |
| `commands/gsd/new-project.md` | N/A | Initial config creation | Adding adversary defaults at project init |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `node -e` for polymorphic parsing | Extended grep chains | grep cannot reliably distinguish `"plan": true` from `"plan": { "enabled": true }` — JSON structure matters |
| Top-level `adversary` key | Nested inside `workflow` | `workflow` only has simple boolean toggles; adversary has nested objects with polymorphic values — mixing would complicate both |
| Boolean/object polymorphism | Object-only format | User decided boolean shorthand must work (CONTEXT.md locked decision) |

## Architecture Patterns

### Recommended Config Structure

The adversary section lives at the top level of `.planning/config.json`, alongside existing top-level keys:

```json
{
  "mode": "yolo",
  "depth": "comprehensive",
  "parallelization": true,
  "commit_docs": true,
  "model_profile": "balanced",
  "workflow": {
    "research": true,
    "plan_check": true,
    "verifier": true
  },
  "adversary": {
    "enabled": true,
    "max_rounds": 3,
    "checkpoints": {
      "requirements": true,
      "roadmap": true,
      "plan": true,
      "verification": true
    }
  }
}
```

**Rationale for top-level placement:**
- `adversary` has its own nested structure (enabled, max_rounds, checkpoints) — not a simple boolean like `workflow` toggles
- Consistent with how `parallelization` (another feature with sub-config) is top-level
- Matches the example in CONTEXT.md
- Keeps `workflow` section clean (just agent spawning toggles)

### Pattern 1: Config Reading Block for Adversary

**What:** Standard bash snippet orchestrators copy to read adversary settings before spawning
**When to use:** Every orchestrator that spawns gsd-adversary at a checkpoint

```bash
# Read adversary config (defaults: enabled=true, max_rounds=3, all checkpoints on)
ADVERSARY_ENABLED=$(node -e "
  try {
    const c = JSON.parse(require('fs').readFileSync('.planning/config.json', 'utf8'));
    console.log(c.adversary?.enabled ?? true);
  } catch(e) { console.log('true'); }
" 2>/dev/null || echo "true")

# Read checkpoint-specific config (replace CHECKPOINT_NAME)
CHECKPOINT_NAME="plan"
CHECKPOINT_CONFIG=$(node -e "
  try {
    const c = JSON.parse(require('fs').readFileSync('.planning/config.json', 'utf8'));
    const adv = c.adversary || {};
    if (adv.enabled === false) { console.log('false|3'); process.exit(0); }
    const cp = adv.checkpoints?.[process.argv[1]];
    let enabled, rounds;
    if (typeof cp === 'boolean') { enabled = cp; rounds = adv.max_rounds ?? 3; }
    else if (typeof cp === 'object' && cp !== null) { enabled = cp.enabled ?? true; rounds = cp.max_rounds ?? adv.max_rounds ?? 3; }
    else { enabled = true; rounds = adv.max_rounds ?? 3; }
    console.log(enabled + '|' + rounds);
  } catch(e) { console.log('true|3'); }
" "$CHECKPOINT_NAME" 2>/dev/null || echo "true|3")

CHECKPOINT_ENABLED=$(echo "$CHECKPOINT_CONFIG" | cut -d'|' -f1)
MAX_ROUNDS=$(echo "$CHECKPOINT_CONFIG" | cut -d'|' -f2)
```

**Why node -e over grep:** The polymorphic checkpoint values (boolean vs object) require JSON structure awareness. Grep treats `"plan": true` and `"plan": { ... }` as text, making reliable extraction fragile. Node.js is guaranteed available (GSD is an npm package).

### Pattern 2: Config Writing (new-project / settings)

**What:** How commands write adversary config to config.json
**When to use:** `new-project` Phase 5 (workflow preferences) and `settings` command

The adversary section is written as part of the full config.json object using the Write tool:

```json
{
  ...existing_config,
  "adversary": {
    "enabled": true,
    "max_rounds": 3,
    "checkpoints": {
      "requirements": true,
      "roadmap": true,
      "plan": true,
      "verification": true
    }
  }
}
```

When the user toggles a checkpoint off, only the specific value changes. When the user globally disables, `enabled` becomes `false` but checkpoint values are preserved.

### Pattern 3: Default Behavior (Missing Config)

**What:** System defaults when adversary section is absent from config.json
**When to use:** Existing projects without adversary config

| Missing Value | Default | Behavior |
|---------------|---------|----------|
| Entire `adversary` section | System defaults | Adversary runs at all checkpoints, max 3 rounds |
| `adversary.enabled` | `true` | Adversary is on |
| `adversary.max_rounds` | `3` | Three rounds (challenge, defense, final assessment) |
| `adversary.checkpoints` | All enabled | All four checkpoints active |
| Individual checkpoint | `true` | That checkpoint is active |
| Checkpoint `max_rounds` | Falls through to `adversary.max_rounds` | Uses global setting |

**Backwards compatibility:** Existing config.json files without an `adversary` section get adversary behavior automatically. This is a non-breaking addition — the adversary runs with system defaults.

### Pattern 4: Precedence Chain for max_rounds

**What:** Three-tier precedence for determining max_rounds at a checkpoint
**When to use:** Config reading block (Pattern 1)

```
checkpoint-level max_rounds  →  adversary-level max_rounds  →  system default (3)
         ↓ (if missing)              ↓ (if missing)              ↓ (always available)
```

Example:
```json
{
  "adversary": {
    "max_rounds": 2,
    "checkpoints": {
      "plan": { "enabled": true, "max_rounds": 4 },
      "requirements": true,
      "roadmap": { "enabled": true },
      "verification": true
    }
  }
}
```

| Checkpoint | Effective max_rounds | Source |
|------------|---------------------|--------|
| plan | 4 | Checkpoint-level override |
| requirements | 2 | Boolean shorthand, falls through to adversary-level |
| roadmap | 2 | Object without max_rounds, falls through to adversary-level |
| verification | 2 | Boolean shorthand, falls through to adversary-level |

### Anti-Patterns to Avoid
- **Putting adversary inside `workflow`:** The `workflow` object is for simple boolean agent spawning toggles. Adversary config is structurally different (nested objects, polymorphic values). Mixing creates parsing complexity.
- **Object-only format (no boolean shorthand):** Users want `"plan": true` not `"plan": { "enabled": true }` for the common case. Both must work per CONTEXT.md.
- **Runtime validation that blocks workflows:** Invalid config should warn and use defaults, not prevent work. Match the existing GSD pattern of silent fallback.
- **Separate adversary config file:** Keep all config in one file. GSD already established `.planning/config.json` as the single config location.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON parsing in bash | Multi-grep chain for nested objects | `node -e` with optional chaining | JSON structure matters for polymorphic values; grep is text-only |
| Config file format | New YAML/TOML config format | Existing config.json | GSD standard; all tooling expects JSON |
| Schema validation library | JSON Schema validator package | Inline defaults with `??` operator | No runtime deps; validation is just "use defaults for bad values" |
| Config migration tool | Script to upgrade old configs | Missing-means-default pattern | Backwards compatible by design; old configs just get system defaults |

**Key insight:** The existing config system has no formal validation — it uses defaults for missing values. The adversary config should follow this same pattern. Invalid values get defaults, not errors.

## Common Pitfalls

### Pitfall 1: Grep Parsing of Polymorphic JSON Values
**What goes wrong:** Using the existing `cat config.json | grep` pattern for adversary checkpoint values fails because `"plan": true` and `"plan": { "enabled": true }` have different JSON structures that grep cannot distinguish reliably.
**Why it happens:** Existing config values are all simple (string, boolean, flat object). Natural tendency is to copy existing patterns.
**How to avoid:** Use `node -e` with JSON.parse for the adversary config section specifically. The reading block (Pattern 1) handles all cases.
**Warning signs:** Config reading works in testing with boolean values but breaks when user switches to object form (or vice versa).

### Pitfall 2: Kill Switch Not Actually Killing
**What goes wrong:** `adversary.enabled: false` doesn't prevent adversary spawning because checkpoint-level checks run first.
**Why it happens:** Checking checkpoint before checking global toggle.
**How to avoid:** Config reading block checks `adversary.enabled` FIRST. If false, short-circuit to `false|3` immediately, regardless of checkpoint values.
**Warning signs:** User sets `enabled: false` but still sees adversary challenges at some checkpoints.

### Pitfall 3: Forgetting to Preserve Checkpoint Preferences on Disable
**What goes wrong:** When user toggles `enabled: false`, the settings command also resets checkpoint values to defaults.
**Why it happens:** Settings command overwrites the entire adversary object instead of merging.
**How to avoid:** Settings command should read existing config, merge only the changed values, and write back. Never replace the entire adversary section when only toggling enabled.
**Warning signs:** User disables adversary globally, then re-enables and finds all checkpoints reset to defaults.

### Pitfall 4: Missing Config Treated as Error Instead of Default
**What goes wrong:** Orchestrator errors or skips adversary when config.json has no adversary section.
**Why it happens:** Checking for existence instead of defaulting.
**How to avoid:** Every config read has a default fallback. Pattern 1 demonstrates: `?? true`, `?? 3`, etc. Missing config = system defaults = adversary runs.
**Warning signs:** Existing projects that worked fine suddenly have no adversary behavior, or throw errors after the config feature is added.

### Pitfall 5: Settings UI Exposing Raw Config Complexity
**What goes wrong:** Settings command tries to expose boolean/object polymorphism to users, creating confusing UI.
**Why it happens:** Mapping internal config flexibility to user-facing options 1:1.
**How to avoid:** Settings UI uses simple toggles. Under the hood, write boolean for "on with defaults" and object for "on with custom rounds". User never sees the polymorphism. Only users editing config.json manually encounter both forms.
**Warning signs:** Settings command asks about "boolean mode or object mode" — this is an implementation detail, not a user choice.

## Code Examples

### Complete Config Template (Updated)
```json
{
  "mode": "interactive",
  "depth": "standard",
  "workflow": {
    "research": true,
    "plan_check": true,
    "verifier": true
  },
  "planning": {
    "commit_docs": true,
    "search_gitignored": false
  },
  "parallelization": {
    "enabled": true,
    "plan_level": true,
    "task_level": false,
    "skip_checkpoints": true,
    "max_concurrent_agents": 3,
    "min_plans_for_parallel": 2
  },
  "adversary": {
    "enabled": true,
    "max_rounds": 3,
    "checkpoints": {
      "requirements": true,
      "roadmap": true,
      "plan": true,
      "verification": true
    }
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
  }
}
```

### Settings Command — Adversary Section
```
questions: [
  {
    header: "Adversary",
    question: "Enable adversarial review? (challenges artifacts before execution)",
    multiSelect: false,
    options: [
      { label: "Yes (Recommended)", description: "Challenge requirements, roadmaps, plans, and verification" },
      { label: "No", description: "Skip adversarial review at all checkpoints" }
    ]
  }
]
```

If adversary enabled, follow up with checkpoint selection:
```
questions: [
  {
    header: "Adversary Checkpoints",
    question: "Which checkpoints should trigger adversarial review?",
    multiSelect: true,
    options: [
      { label: "Requirements", description: "Challenge REQUIREMENTS.md after creation" },
      { label: "Roadmap", description: "Challenge ROADMAP.md after creation" },
      { label: "Plan", description: "Challenge PLAN.md after creation" },
      { label: "Verification", description: "Challenge verification conclusions" }
    ]
  }
]
```

### New-Project Command — Adversary Preferences
Add to Phase 5 (Workflow Preferences), Round 2:
```
questions: [
  ...existing workflow agent questions...,
  {
    header: "Adversary",
    question: "Enable adversarial review? (challenges artifacts at key checkpoints)",
    multiSelect: false,
    options: [
      { label: "Yes (Recommended)", description: "Catch assumptions before they cause problems" },
      { label: "No", description: "Skip adversarial review" }
    ]
  }
]
```

### Planning-Config Reference — Adversary Schema Documentation
```markdown
<adversary_config>

## Adversary Configuration

Controls the adversarial review agent that challenges artifacts at workflow checkpoints.

<config_schema>
```json
"adversary": {
  "enabled": true,
  "max_rounds": 3,
  "checkpoints": {
    "requirements": true,
    "roadmap": true,
    "plan": true,
    "verification": true
  }
}
```

| Option | Default | Description |
|--------|---------|-------------|
| `enabled` | `true` | Global kill switch. `false` disables adversary at all checkpoints. |
| `max_rounds` | `3` | Default max debate rounds for all checkpoints. |
| `checkpoints.{name}` | `true` | Per-checkpoint toggle. Boolean or object form. |
| `checkpoints.{name}.enabled` | `true` | Enable/disable specific checkpoint (object form). |
| `checkpoints.{name}.max_rounds` | inherits | Override max_rounds for this checkpoint (object form). |

**Checkpoint values** accept two forms:
- Boolean shorthand: `"plan": true` — uses global `max_rounds`
- Object form: `"plan": { "enabled": true, "max_rounds": 4 }` — overrides `max_rounds`

**Precedence:** checkpoint max_rounds > adversary max_rounds > system default (3)

**Missing config:** If `adversary` section is absent, system defaults apply (enabled, all checkpoints on, 3 rounds).
</config_schema>

<reading_config>

**Standard adversary config reading block:**

```bash
# Read adversary config for a specific checkpoint
CHECKPOINT_NAME="plan"
CHECKPOINT_CONFIG=$(node -e "
  try {
    const c = JSON.parse(require('fs').readFileSync('.planning/config.json', 'utf8'));
    const adv = c.adversary || {};
    if (adv.enabled === false) { console.log('false|3'); process.exit(0); }
    const cp = adv.checkpoints?.[process.argv[1]];
    let enabled, rounds;
    if (typeof cp === 'boolean') { enabled = cp; rounds = adv.max_rounds ?? 3; }
    else if (typeof cp === 'object' && cp !== null) { enabled = cp.enabled ?? true; rounds = cp.max_rounds ?? adv.max_rounds ?? 3; }
    else { enabled = true; rounds = adv.max_rounds ?? 3; }
    console.log(enabled + '|' + rounds);
  } catch(e) { console.log('true|3'); }
" "$CHECKPOINT_NAME" 2>/dev/null || echo "true|3")

CHECKPOINT_ENABLED=$(echo "$CHECKPOINT_CONFIG" | cut -d'|' -f1)
MAX_ROUNDS=$(echo "$CHECKPOINT_CONFIG" | cut -d'|' -f2)
```

Use this block in any orchestrator before spawning gsd-adversary.
</reading_config>

</adversary_config>
```

### Error Handling for Invalid Config Values

```bash
# node -e handles all error cases via try-catch + defaults:
# - config.json doesn't exist → catch → "true|3"
# - adversary section missing → ?? operators → defaults
# - invalid JSON → catch → "true|3"
# - unexpected value types → typeof checks → defaults
# - node not available → || echo "true|3"
```

No explicit error messages needed. Invalid config silently falls back to system defaults. This matches the GSD convention where config is best-effort, not strict.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Simple grep for all config | node -e for nested/polymorphic values | Phase 2 (this work) | Enables boolean/object polymorphism in config |
| workflow-only toggles | Dedicated adversary config section | Phase 2 (this work) | Clean separation of concerns |

**Existing config reading pattern (retained for simple values):**
```bash
MODEL_PROFILE=$(cat .planning/config.json 2>/dev/null | grep -o '"model_profile"[[:space:]]*:[[:space:]]*"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"' || echo "balanced")
```

**New pattern for adversary (node -e):** Only used for adversary config. Existing grep patterns for simple values remain unchanged. The two patterns coexist.

## Open Questions

### 1. Max Rounds UI in Settings
- **What we know:** Users can configure max_rounds globally and per-checkpoint. The settings command should expose this.
- **What's unclear:** Should settings expose per-checkpoint max_rounds, or only global? Object form is for power users editing config.json manually.
- **Recommendation:** Settings command exposes only global max_rounds (as a number input or preset options like 1/2/3/5). Per-checkpoint overrides are power-user territory — documented in planning-config.md but not in the UI. This keeps the settings UI simple.

### 2. Adversary Toggle in Settings vs Separate Command
- **What we know:** Settings command currently handles workflow toggles and model profile.
- **What's unclear:** Should adversary settings be a subsection of `/gsd:settings` or a separate command?
- **Recommendation:** Integrate into `/gsd:settings`. The adversary toggle is a workflow preference, not a separate feature requiring its own command. Add 1-2 questions after existing workflow agent questions.

### 3. DOCS Updates
- **What we know:** docs/reference/commands.md and docs/reference/templates.md exist and document GSD features.
- **What's unclear:** How much docs updating is needed for the adversary config.
- **Recommendation:** Update `docs/reference/templates.md` to document the adversary section in config.json. This is a documentation task that should be included in the plan.

## Files That Need Modification

| File | Change | Priority |
|------|--------|----------|
| `get-shit-done/templates/config.json` | Add `adversary` section to template | HIGH — defines the schema |
| `get-shit-done/references/planning-config.md` | Document adversary config schema and reading block | HIGH — consumed by orchestrators |
| `commands/gsd/new-project.md` | Add adversary toggle to Phase 5 workflow preferences | HIGH — new projects get adversary config |
| `commands/gsd/settings.md` | Add adversary toggle and checkpoint selection | HIGH — existing projects can configure |
| `docs/reference/templates.md` | Document adversary config section | MEDIUM — user-facing documentation |

**Files NOT modified in this phase (Phase 3-5 work):**
- `commands/gsd/plan-phase.md` — Will use the config reading block but integration is Phase 4
- `commands/gsd/new-project.md` (orchestration logic) — Spawning adversary at checkpoints is Phase 3
- `get-shit-done/workflows/execute-phase.md` — Adversary spawning is Phase 3-5

## Sources

### Primary (HIGH confidence)
- `get-shit-done/templates/config.json` — Current config template structure
- `get-shit-done/references/planning-config.md` — Config documentation patterns
- `commands/gsd/settings.md` — Settings command UI patterns
- `commands/gsd/new-project.md` — Config creation during project init
- `.planning/phases/02-configuration/02-CONTEXT.md` — User decisions for this phase

### Secondary (HIGH confidence)
- `commands/gsd/plan-phase.md` — Config reading patterns in orchestrators
- `commands/gsd/execute-phase.md` — Config reading patterns in orchestrators
- `agents/gsd-adversary.md` — The agent that will consume this config
- `.planning/phases/01-core-agent/01-RESEARCH.md` — Prior phase research

### Tertiary (HIGH confidence)
- `.planning/codebase/CONVENTIONS.md` — Codebase coding conventions
- `.planning/codebase/STRUCTURE.md` — Directory structure and patterns
- `.planning/REQUIREMENTS.md` — CONF-01, CONF-02, CONF-03 requirement definitions

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Pure config extension, no external dependencies
- Architecture: HIGH — Existing config patterns thoroughly documented in codebase; decisions locked in CONTEXT.md
- Pitfalls: HIGH — Derived from direct analysis of existing config parsing patterns and polymorphic value challenges

**Research date:** 2026-02-13
**Valid until:** 30 days (stable domain, internal codebase patterns)
