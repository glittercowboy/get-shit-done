# MODEL SELECTION ANALYSIS

## Overview
The get-shit-done system uses a **three-tier model profile system** (quality, balanced, budget) that controls which Claude model each agent uses. Model selection is centralized and resolved once at orchestration startup, then passed to all subagent Task calls.

---

## 1. MODEL PROFILES TABLE

**Source:** `/Users/ollorin/get-shit-done/get-shit-done/bin/gsd-tools.js` (lines 125-137)

```javascript
const MODEL_PROFILES = {
  'gsd-planner':              { quality: 'opus', balanced: 'opus',   budget: 'sonnet' },
  'gsd-roadmapper':           { quality: 'opus', balanced: 'sonnet', budget: 'sonnet' },
  'gsd-executor':             { quality: 'opus', balanced: 'sonnet', budget: 'sonnet' },
  'gsd-phase-researcher':     { quality: 'opus', balanced: 'sonnet', budget: 'haiku' },
  'gsd-project-researcher':   { quality: 'opus', balanced: 'sonnet', budget: 'haiku' },
  'gsd-research-synthesizer': { quality: 'sonnet', balanced: 'sonnet', budget: 'haiku' },
  'gsd-debugger':             { quality: 'opus', balanced: 'sonnet', budget: 'sonnet' },
  'gsd-codebase-mapper':      { quality: 'sonnet', balanced: 'haiku', budget: 'haiku' },
  'gsd-verifier':             { quality: 'sonnet', balanced: 'sonnet', budget: 'haiku' },
  'gsd-plan-checker':         { quality: 'sonnet', balanced: 'sonnet', budget: 'haiku' },
  'gsd-integration-checker':  { quality: 'sonnet', balanced: 'sonnet', budget: 'haiku' },
};
```

**Profiles:**
| Profile | Purpose | Use Case |
|---------|---------|----------|
| `quality` | Maximum reasoning power | Quota available, critical architecture work |
| `balanced` | Smart allocation (default) | Normal development, good balance of quality and cost |
| `budget` | Minimal Opus usage | Conserving quota, high-volume work |

---

## 2. DEFAULT CONFIGURATION

**Source:** `/Users/ollorin/get-shit-done/get-shit-done/bin/gsd-tools.js` (lines 159-160)

```javascript
const defaults = {
  model_profile: 'balanced',
  // ... other settings
};
```

**Default model profile:** `balanced`

---

## 3. MODEL RESOLUTION LOGIC

### Main Resolution Function
**Source:** `/Users/ollorin/get-shit-done/get-shit-done/bin/gsd-tools.js` (lines 3477-3483)

```javascript
function resolveModelInternal(cwd, agentType) {
  const config = loadConfig(cwd);
  const profile = config.model_profile || 'balanced';
  const agentModels = MODEL_PROFILES[agentType];
  if (!agentModels) return 'sonnet';
  return agentModels[profile] || agentModels['balanced'] || 'sonnet';
}
```

**Resolution algorithm:**
1. Load `.planning/config.json` from project directory
2. Extract `model_profile` field (defaults to `balanced` if missing)
3. Look up agent type in `MODEL_PROFILES` table
4. Return model for the selected profile
5. Fallback chain: `profile > balanced > sonnet`

### CLI Command for Resolution
**Source:** `/Users/ollorin/get-shit-done/get-shit-done/bin/gsd-tools.js` (lines 1318-1334)

```bash
node ~/.claude/get-shit-done/bin/gsd-tools.js resolve-model <agent-type>
```

Usage:
```javascript
case 'resolve-model': {
  cmdResolveModel(cwd, args[1], raw);
  break;
}
```

---

## 4. CONFIGURATION FILE LOCATION

**Source:** `/Users/ollorin/get-shit-done/get-shit-done/bin/gsd-tools.js` (lines 157-205)

**Path:** `.planning/config.json`

**Structure:**
```json
{
  "model_profile": "quality|balanced|budget",
  "commit_docs": true,
  "search_gitignored": false,
  "branching_strategy": "none",
  "phase_branch_template": "gsd/phase-{phase}-{slug}",
  "milestone_branch_template": "gsd/{milestone}-{slug}",
  "research": true,
  "plan_checker": true,
  "verifier": true,
  "parallelization": true,
  "brave_search": false
}
```

---

## 5. MODEL SELECTION IN ORCHESTRATORS

All model resolution happens in `init` commands that orchestrators call at startup. Models are resolved once and passed to Task calls.

### 5.1 Plan-Phase Orchestrator
**Source:** `/Users/ollorin/get-shit-done/get-shit-done/bin/gsd-tools.js` (lines 3640-3673)

```bash
INIT=$(node ~/.claude/get-shit-done/bin/gsd-tools.js init plan-phase "$PHASE")
```

**Models resolved:**
- `researcher_model` → `gsd-phase-researcher` (line 3647)
- `planner_model` → `gsd-planner` (line 3648)
- `checker_model` → `gsd-plan-checker` (line 3649)

**Used in workflow:** `/Users/ollorin/get-shit-done/get-shit-done/workflows/plan-phase.md` (lines 21, 115, 204, 307)

### 5.2 Execute-Phase Orchestrator
**Source:** `/Users/ollorin/get-shit-done/get-shit-done/bin/gsd-tools.js` (lines 3570-3600)

```bash
INIT=$(node ~/.claude/get-shit-done/bin/gsd-tools.js init execute-phase "${PHASE}")
```

**Models resolved:**
- `executor_model` → `gsd-executor` (line 3576)
- `verifier_model` → `gsd-verifier` (line 3577)

**Used in workflow:** `/Users/ollorin/get-shit-done/get-shit-done/workflows/execute-phase.md` (lines 22, 105, 239)

### 5.3 Execute-Plan Orchestrator
**Source:** `/Users/ollorin/get-shit-done/get-shit-done/bin/gsd-tools.js` (no explicit init, reads from execute-phase)

**Models used from parent execute-phase:**
- `executor_model` (line 3576)

**Used in workflow:** `/Users/ollorin/get-shit-done/get-shit-done/workflows/execute-plan.md` (line 21)

### 5.4 New-Project Orchestrator
**Source:** `/Users/ollorin/get-shit-done/get-shit-done/bin/gsd-tools.js` (lines 3759-3787)

```bash
INIT=$(node ~/.claude/get-shit-done/bin/gsd-tools.js init new-project)
```

**Models resolved:**
- `researcher_model` → `gsd-project-researcher` (line 3761)
- `synthesizer_model` → `gsd-research-synthesizer` (line 3762)
- `roadmapper_model` → `gsd-roadmapper` (line 3763)

**Used in workflow:** `/Users/ollorin/get-shit-done/get-shit-done/workflows/new-project.md` (lines 46, 437, 477, 517, 557)

### 5.5 New-Milestone Orchestrator
**Source:** `/Users/ollorin/get-shit-done/get-shit-done/bin/gsd-tools.js` (lines 3789-3814)

```bash
INIT=$(node ~/.claude/get-shit-done/bin/gsd-tools.js init new-milestone)
```

**Models resolved:**
- `researcher_model` → `gsd-project-researcher` (line 3795)
- `synthesizer_model` → `gsd-research-synthesizer` (line 3796)
- `roadmapper_model` → `gsd-roadmapper` (line 3797)

**Used in workflow:** `/Users/ollorin/get-shit-done/get-shit-done/workflows/new-milestone.md` (lines 83, 141, 165)

### 5.6 Research-Phase Orchestrator
**Source:** `/Users/ollorin/get-shit-done/get-shit-done/workflows/research-phase.md` (lines 9-14)

No explicit init in this workflow. Model resolution done inline:
- `gsd-phase-researcher` model resolved inline (line 64)

**Used in workflow:** `/Users/ollorin/get-shit-done/get-shit-done/workflows/research-phase.md` (lines 64)

### 5.7 Quick-Task Orchestrator
**Source:** `/Users/ollorin/get-shit-done/get-shit-done/bin/gsd-tools.js` (lines 3834-3860)

```bash
INIT=$(node ~/.claude/get-shit-done/bin/gsd-tools.js init quick <description>)
```

**Models resolved:**
- `planner_model` → `gsd-planner` (line 3836)
- `executor_model` → `gsd-executor` (line 3837)

**Used in workflow:** `/Users/ollorin/get-shit-done/get-shit-done/workflows/quick.md` (lines 34, 100, 134)

### 5.8 Map-Codebase Orchestrator
**Source:** `/Users/ollorin/get-shit-done/get-shit-done/bin/gsd-tools.js` (lines 4075-4102)

```bash
INIT=$(node ~/.claude/get-shit-done/bin/gsd-tools.js init map-codebase)
```

**Models resolved:**
- `mapper_model` → `gsd-codebase-mapper` (line 4083)

**Used in workflow:** (referenced but not shown in available excerpts)

### 5.9 Verify-Work Orchestrator
**Source:** `/Users/ollorin/get-shit-done/get-shit-done/bin/gsd-tools.js` (lines 3890-3917)

```bash
INIT=$(node ~/.claude/get-shit-done/bin/gsd-tools.js init verify-work "${PHASE}")
```

**Models resolved:**
- `planner_model` → `gsd-planner` (line 3900)
- `checker_model` → `gsd-plan-checker` (line 3901)

**Used in workflow:** `/Users/ollorin/get-shit-done/get-shit-done/workflows/verify-work.md` (lines 30, 385, 472)

---

## 6. USER-FACING CONFIGURATION COMMANDS

### 6.1 Set Profile Command
**Command file:** `/Users/ollorin/get-shit-done/commands/gsd/set-profile.md`

**Workflow:** `/Users/ollorin/get-shit-done/get-shit-done/workflows/set-profile.md`

**Usage:**
```bash
/gsd:set-profile <quality|balanced|budget>
```

**Steps:**
1. Validate profile argument (must be one of: quality, balanced, budget)
2. Ensure `.planning/config.json` exists
3. Update `model_profile` field
4. Display confirmation with model table for selected profile

**Line reference:** Workflow lines 11-71

### 6.2 Settings Command (Interactive)
**Command file:** `/Users/ollorin/get-shit-done/commands/gsd/settings.md`

**Workflow:** `/Users/ollorin/get-shit-done/get-shit-done/workflows/settings.md`

**Usage:**
```bash
/gsd:settings
```

**Interactive Questions:**
1. Model profile selection (Quality/Balanced/Budget)
2. Research enabled (Yes/No)
3. Plan checker enabled (Yes/No)
4. Verifier enabled (Yes/No)
5. Git branching strategy (None/Per Phase/Per Milestone)

**Line reference:** Workflow lines 39-87

---

## 7. MODEL ASSIGNMENT PHILOSOPHY

**Source:** `/Users/ollorin/get-shit-done/get-shit-done/references/model-profiles.md`

### Quality Profile
- **Agents:** Opus for decision-making, Sonnet for verification
- **Rationale:** Maximum reasoning power for architecture decisions
- **When to use:** Quota available, critical architecture work

### Balanced Profile (Default)
- **Allocation Strategy:**
  - **Opus:** `gsd-planner` (where architecture decisions happen)
  - **Sonnet:** Execution agents, research agents, verification (follows explicit instructions)
  - **Haiku:** Read-only exploration (codebase-mapper)

- **Rationale:** Opus for planning (high reasoning needed), Sonnet for execution (instructions are clear)
- **When to use:** Normal development workflow

### Budget Profile
- **Allocation Strategy:**
  - **Sonnet:** Anything that writes code
  - **Haiku:** Research and verification agents

- **Rationale:** Minimize Opus usage for token conservation
- **When to use:** High-volume work, less critical phases

---

## 8. AGENT-BY-AGENT MODEL ASSIGNMENT

| Agent | Quality | Balanced | Budget | Use Case |
|-------|---------|----------|--------|----------|
| gsd-planner | opus | opus | sonnet | Creates executable phase plans |
| gsd-phase-researcher | opus | sonnet | haiku | Researches phase implementation |
| gsd-project-researcher | opus | sonnet | haiku | Researches new project/features |
| gsd-planner | opus | opus | sonnet | Decomoses phases into tasks |
| gsd-plan-checker | sonnet | sonnet | haiku | Verifies plans meet goals |
| gsd-executor | opus | sonnet | sonnet | Executes plans atomically |
| gsd-verifier | sonnet | sonnet | haiku | Verifies phase completion |
| gsd-research-synthesizer | sonnet | sonnet | haiku | Synthesizes research outputs |
| gsd-roadmapper | opus | sonnet | sonnet | Creates project roadmaps |
| gsd-debugger | opus | sonnet | sonnet | Debug agent for issue resolution |
| gsd-codebase-mapper | sonnet | haiku | haiku | Explores and maps codebase |
| gsd-integration-checker | sonnet | sonnet | haiku | Verifies integration completeness |

---

## 9. CONFIG LOADING AND FALLBACK

**Source:** `/Users/ollorin/get-shit-done/get-shit-done/bin/gsd-tools.js` (lines 157-205)

```javascript
function loadConfig(cwd) {
  const configPath = path.join(cwd, '.planning', 'config.json');
  const defaults = {
    model_profile: 'balanced',
    // ... other defaults
  };

  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      model_profile: get('model_profile') ?? defaults.model_profile,
      // ... other fields
    };
  } catch {
    // If config missing or invalid, all defaults apply
    return defaults;
  }
}
```

**Fallback behavior:**
1. Try to read `.planning/config.json`
2. If missing or invalid JSON: use defaults
3. For each field: if not in config, use default value
4. Default model_profile: `balanced`

---

## 10. ENV VARIABLES AND OVERRIDES

**No environment variables for model selection found in the codebase.**

Model selection is entirely configuration-driven via `.planning/config.json`.

---

## 11. COMMAND PATTERNS IN WORKFLOWS

All workflows follow a consistent pattern for using resolved models:

**Step 1: Initialize and resolve models**
```bash
INIT=$(node ~/.claude/get-shit-done/bin/gsd-tools.js init <command> [args])
```

**Step 2: Extract from JSON**
```
Parse JSON for: model_name, other config values
```

**Step 3: Pass to Task calls**
```
Task(
  prompt="...",
  subagent_type="gsd-agent-name",
  model="{model_name}"
)
```

**Example from plan-phase workflow (line 204):**
```
Task(prompt="...", subagent_type="gsd-planner", model="{planner_model}")
```

---

## 12. SUMMARY TABLE: WHERE MODELS ARE SELECTED

| Location | Resolution Type | File | Lines |
|----------|-----------------|------|-------|
| Default config | Static default | gsd-tools.js | 160 |
| MODEL_PROFILES table | Static table | gsd-tools.js | 125-137 |
| resolveModelInternal() | Function | gsd-tools.js | 3477-3483 |
| cmdResolveModel() | CLI command | gsd-tools.js | 1318-1334 |
| cmdInitPlanPhase() | Orchestrator | gsd-tools.js | 3645-3673 |
| cmdInitExecutePhase() | Orchestrator | gsd-tools.js | 3570-3600 |
| cmdInitNewProject() | Orchestrator | gsd-tools.js | 3759-3787 |
| cmdInitNewMilestone() | Orchestrator | gsd-tools.js | 3789-3814 |
| cmdInitQuick() | Orchestrator | gsd-tools.js | 3834-3860 |
| cmdInitMapCodebase() | Orchestrator | gsd-tools.js | 4075-4102 |
| cmdInitVerifyWork() | Orchestrator | gsd-tools.js | 3890-3917 |
| loadConfig() | Config loader | gsd-tools.js | 157-205 |
| /gsd:set-profile | User command | set-profile.md | entire file |
| /gsd:settings | User command | settings.md | entire file |

---

## CONFIGURATION EXAMPLES

**Setting model profile to quality:**
```bash
/gsd:set-profile quality
```

**Or manually in `.planning/config.json`:**
```json
{
  "model_profile": "quality"
}
```

**Checking which model will be used for an agent:**
```bash
node ~/.claude/get-shit-done/bin/gsd-tools.js resolve-model gsd-planner
```

Output example:
```json
{
  "model": "opus",
  "profile": "balanced"
}
```

---

## KEY INSIGHTS

1. **Centralized:** All model selection logic is in `gsd-tools.js`, not scattered across multiple files
2. **Profile-based:** Uses profiles (quality/balanced/budget) rather than per-agent overrides
3. **Config-driven:** Single source of truth is `.planning/config.json`
4. **Early resolution:** Models resolved once at orchestrator startup, passed to all Task calls
5. **Intelligent defaults:** "balanced" is default; falls back to sonnet if agent unknown
6. **User-friendly:** Two commands for configuration: `set-profile` (quick) and `settings` (interactive)
