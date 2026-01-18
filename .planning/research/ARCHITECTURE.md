# Architecture Research: Constitutional Enforcement Systems

**Domain:** Policy-as-code validation and enforcement
**Researched:** 2026-01-18
**Confidence:** HIGH

## Standard Architecture

Constitutional enforcement systems follow a layered architecture pattern with clear separation between policy storage, rule evaluation, and enforcement mechanisms.

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Execution Layer                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │Command  │  │Workflow │  │ Agent   │  │ Tool    │        │
│  │Triggers │  │Executor │  │Subproc  │  │ Calls   │        │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘        │
│       │            │            │            │              │
├───────┴────────────┴────────────┴────────────┴──────────────┤
│                  Validation Hook Layer                       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Constitution Loader                     │    │
│  │    (Reads global + project, merges, caches)         │    │
│  └───────────────────────┬─────────────────────────────┘    │
│                          │                                   │
│  ┌───────────────────────┴─────────────────────────────┐    │
│  │              Rule Evaluator                          │    │
│  │    (Parses rules, runs validation checks)           │    │
│  └───────────────────────┬─────────────────────────────┘    │
│                          │                                   │
│  ┌───────────────────────┴─────────────────────────────┐    │
│  │          Enforcement Decision Engine                 │    │
│  │    (PASS → continue | ERROR → block + allow override)│    │
│  └─────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│                    Policy Storage Layer                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │  Global  │  │ Project  │  │  Cache   │                   │
│  │  Config  │  │ Override │  │ Resolved │                   │
│  └──────────┘  └──────────┘  └──────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Constitution Loader** | Read, parse, merge global + project constitutions | Bash script or agent function that reads both files, applies project overrides |
| **Rule Evaluator** | Execute validation checks against codebase/commits | Pattern matching (grep/git log analysis), AST checking, or specialized validators |
| **Enforcement Engine** | Make PASS/ERROR/FATAL decisions, handle overrides | Decision logic with severity levels, override flag checking |
| **Validation Hooks** | Integration points where validation runs | Pre-commit hooks, CI/CD steps, agent checkpoints |
| **Policy Cache** | Store merged constitution for session | In-memory or temp file to avoid re-parsing |

## GSD Integration Architecture

### Existing GSD Architecture Mapping

GSD's current layers and how constitution enforcement integrates:

```
Existing GSD:                   Constitution Addition:
┌──────────────────┐
│ Command Layer    │ ───────┐  No change (commands unchanged)
│ /gsd:execute     │        │
└──────────────────┘        │
         │                   │
         ↓                   │
┌──────────────────┐        │
│ Orchestration    │ ───────┼──► Add: Load constitution at workflow start
│ execute-phase.md │        │    Inject into verifier context
└──────────────────┘        │
         │                   │
         ↓                   │
┌──────────────────┐        │
│ Agent Layer      │ ───────┼──► Extend: Verifier adds constitution validation
│ gsd-verifier.md  │        │    New step: Check commit patterns vs NON-NEGOTIABLE rules
└──────────────────┘        │
         │                   │
         ↓                   │
┌──────────────────┐        │
│ State Layer      │ ───────┴──► Add: .planning/CONSTITUTION.md (project overrides)
│ .planning/*      │               ~/.claude/get-shit-done/CONSTITUTION.md (global)
└──────────────────┘
```

### Constitution Lifecycle in GSD

```
Phase Execution Start
    ↓
[Orchestrator: execute-phase workflow]
    ↓
Load Constitution (global + project merge)
    ↓
Execute Plans (gsd-executor)
    │
    ↓ (creates commits)
    │
[Verifier: gsd-verifier agent]
    │
    ├─→ Step 0-9: Existing verification (goals, artifacts, wiring)
    │
    ├─→ Step 10: NEW - Constitutional Validation
    │       ├─ Load cached constitution
    │       ├─ Run NON-NEGOTIABLE checks (e.g., TDD commit pattern)
    │       ├─ Record violations with severity
    │       └─ Determine enforcement action
    │
    ↓
Enforcement Decision
    ├─→ PASS: No violations → verification continues
    ├─→ WARN: Minor violations → log but continue
    └─→ ERROR: Major violations → block with override option
            ├─ User chooses: override → continue
            └─ User chooses: fix → return to executor
```

### Data Flow

#### 1. Constitution Loading Flow

```
User invokes /gsd:execute-phase
    ↓
Orchestrator reads workflow
    ↓
Constitution loader script runs:
    ├─ Read ~/.claude/get-shit-done/CONSTITUTION.md
    ├─ Read .planning/CONSTITUTION.md (if exists)
    ├─ Merge: project rules override/extend global
    ├─ Write to /tmp/gsd-constitution-{session-id}.json
    └─ Export CONSTITUTION_PATH env var
    ↓
Pass constitution path to verifier via environment
```

#### 2. Validation Flow (TDD Example)

```
Verifier reaches constitutional validation step
    ↓
Load constitution from CONSTITUTION_PATH
    ↓
Extract NON-NEGOTIABLE section: "TDD-first"
    ↓
Run TDD validator:
    ├─ Get commit range for current phase
    │   git log --oneline origin/main..HEAD
    │
    ├─ For each feature commit:
    │   ├─ Check: Does test file exist?
    │   ├─ Check: Was test committed BEFORE implementation?
    │   │   (Compare timestamps or commit order)
    │   └─ Check: Does test cover the feature?
    │       (Pattern match: test file imports implementation)
    │
    └─ Aggregate violations
    ↓
If violations found:
    ├─ severity: "error" (from constitution)
    ├─ message: "Feature X committed without prior test"
    └─ enforcement: "ERROR" → blocks verification
    ↓
Verifier returns with constitutional_violations section
```

#### 3. Enforcement Flow

```
Verifier returns status: gaps_found
    ├─ reason: "Constitutional violation: TDD-first"
    └─ constitutional_violations:
          - rule: "NON-NEGOTIABLE: TDD-first"
            severity: "error"
            violations: ["src/feature.ts committed before test"]
    ↓
Orchestrator checks severity
    ├─ If "warn": Log warning, continue
    └─ If "error": Block with override prompt
            ↓
        User prompt:
            "Constitutional violation found. Override? (y/N)"
            ├─ y: Log override reason, continue
            │      (Record in STATE.md: constitutional_overrides)
            └─ N: Exit, user must fix violations
```

## Architectural Patterns

### Pattern 1: Hybrid Constitution Model

**What:** Two-tier configuration with global defaults and project-specific overrides.

**When to use:** When base rules apply to all projects but some projects need customization.

**Trade-offs:**
- **Pro:** Flexibility without sacrificing baseline standards
- **Pro:** Projects can be stricter than global (but not weaker on NON-NEGOTIABLE)
- **Con:** Merge logic adds complexity (which rule wins?)
- **Con:** Users may not know which file to edit

**Example:**
```bash
# Load and merge constitutions
load_constitution() {
  local global="$HOME/.claude/get-shit-done/CONSTITUTION.md"
  local project=".planning/CONSTITUTION.md"

  # Parse global NON-NEGOTIABLE section
  local global_rules=$(sed -n '/^## NON-NEGOTIABLE/,/^##/p' "$global" 2>/dev/null)

  # Parse project overrides
  if [ -f "$project" ]; then
    local project_rules=$(sed -n '/^## NON-NEGOTIABLE/,/^##/p' "$project" 2>/dev/null)
    # Project can ADD rules but not REMOVE global NON-NEGOTIABLE
  fi

  # Merge: global NON-NEGOTIABLE + project additions
  echo "$global_rules"
  echo "$project_rules"
}
```

**GSD Application:**
- Global: `~/.claude/get-shit-done/CONSTITUTION.md` contains TDD-first, agent conventions
- Project: `.planning/CONSTITUTION.md` adds domain-specific rules (e.g., "No external API calls without retry logic")
- Merge rule: Project cannot disable global NON-NEGOTIABLE rules

### Pattern 2: Checkpoint Validation

**What:** Validation runs at specific workflow checkpoints, not continuously.

**When to use:** When validation is expensive or only meaningful at certain stages.

**Trade-offs:**
- **Pro:** Performance - validation only when needed
- **Pro:** Clear error boundaries (failures at known points)
- **Con:** May catch violations late (after work done)
- **Con:** Requires good checkpoint placement

**Example:**
```markdown
## Verification Step (in gsd-verifier.md)

Step 10: Constitutional Validation

Before completing verification, validate against constitution:

1. Load constitution (cached from orchestrator)
2. Run all NON-NEGOTIABLE checks
3. Run SHOULD checks (warnings only)
4. Aggregate results
5. Block if ERROR-level violations found
```

**GSD Application:**
- Checkpoint: End of phase verification (in gsd-verifier)
- Why here: After executor finishes, before phase marked complete
- Catches: TDD violations, convention violations in committed code
- Alternative considered: Pre-commit hook (rejected - breaks executor autonomy)

### Pattern 3: Severity-Based Enforcement

**What:** Different rule severities trigger different enforcement actions.

**When to use:** When some rules are absolute (NON-NEGOTIABLE) and others are guidelines.

**Trade-offs:**
- **Pro:** Flexibility for experienced users (overridable errors)
- **Pro:** Warnings don't block progress but surface issues
- **Con:** Users may override too casually
- **Con:** Need clear severity definitions

**Example:**
```yaml
# In CONSTITUTION.md
rules:
  - name: "TDD-first"
    severity: error  # Blocks verification, allows override
    check: commit_pattern_tdd

  - name: "No relative paths in plans"
    severity: warn   # Logs warning, doesn't block
    check: plan_path_validation

  - name: "No emojis in code"
    severity: info   # Informational only
    check: emoji_scan
```

**GSD Application:**
- `error`: Blocks verification, prompts for override + reason
- `warn`: Logs to VERIFICATION.md, doesn't block
- `info`: Collected in verification report only
- `fatal`: Reserved for future (cannot override) - NOT USED in v1

### Pattern 4: Evidence-Based Validation

**What:** Validation checks concrete evidence (commits, files, patterns), not self-reported status.

**When to use:** When automated checking prevents subjective interpretation.

**Trade-offs:**
- **Pro:** Objective, reproducible results
- **Pro:** Catches "I forgot" errors automatically
- **Con:** May have false positives (need escape hatches)
- **Con:** Can't validate everything (some checks need human judgment)

**Example:**
```bash
# TDD commit pattern validator
validate_tdd_pattern() {
  local phase_start_commit="$1"
  local violations=()

  # Get all commits in phase
  local commits=$(git log --oneline "$phase_start_commit..HEAD")

  while IFS= read -r commit; do
    local hash=$(echo "$commit" | awk '{print $1}')
    local files=$(git diff-tree --no-commit-id --name-only -r "$hash")

    # Check if feature file added/modified
    local feature_files=$(echo "$files" | grep -v '__tests__\|\.test\.\|\.spec\.')

    if [ -n "$feature_files" ]; then
      # For each feature file, check if corresponding test exists in earlier commit
      for feature in $feature_files; do
        local test_file=$(echo "$feature" | sed 's/\.ts$/.test.ts/')
        local test_commit=$(git log --diff-filter=A --format='%H' -- "$test_file" 2>/dev/null | tail -1)

        if [ -z "$test_commit" ]; then
          violations+=("$feature: No test file found")
        elif ! git merge-base --is-ancestor "$test_commit" "$hash"; then
          violations+=("$feature: Test committed after implementation")
        fi
      done
    fi
  done <<< "$commits"

  if [ ${#violations[@]} -gt 0 ]; then
    echo "TDD violations found:"
    printf '  - %s\n' "${violations[@]}"
    return 1
  fi
  return 0
}
```

**GSD Application:**
- Verifier analyzes git history (evidence), not SUMMARY.md claims
- TDD check: Compare commit timestamps of tests vs implementation
- Convention check: Grep for anti-patterns in committed files
- Override mechanism: User provides reason, logged to STATE.md

## Integration Points

### Hook Points in GSD Workflows

| Workflow | Integration Point | Constitution Action |
|----------|-------------------|---------------------|
| `execute-phase` start | Before executor spawn | Load & cache constitution (global + project merge) |
| `verify-phase` | After goal verification, before complete | Run constitutional validation (NON-NEGOTIABLE checks) |
| `plan-phase` | During plan generation | Inject constitution constraints into planner context |
| Installation (`install.js`) | After copying files | Create default global CONSTITUTION.md if not exists |

### Agent Extension Points

**gsd-verifier.md extensions:**

```markdown
## Step 10: Constitutional Validation (NEW)

Load cached constitution and run all rule checks.

### TDD-First Validation

Check commit pattern ensures tests before implementation:

1. Get phase commit range: `git log --oneline {phase_start}..HEAD`
2. For each commit with feature files:
   - Identify feature file (not test file)
   - Find corresponding test file path
   - Check test file committed earlier (ancestor check)
   - Record violation if test missing or came later

### Convention Validation

Check committed files against anti-pattern rules:

1. Get files changed in phase
2. Run anti-pattern scans from CONSTITUTION.md
3. Categorize findings by severity
4. Add to violations list

### Enforcement Decision

Based on violations found:

- No violations → PASS
- INFO/WARN violations only → PASS with notes
- ERROR violations → BLOCK with override prompt
- FATAL violations → BLOCK without override (not used in v1)

### Override Handling

If ERROR-level violations and user chooses override:

1. Prompt: "Reason for constitutional override:"
2. Record in STATE.md:
   ```yaml
   constitutional_overrides:
     - phase: 01-foundation
       rule: TDD-first
       reason: "Integration tests cover implementation"
       timestamp: 2026-01-18T10:30:00Z
   ```
3. Continue verification
```

### State File Extensions

**.planning/STATE.md additions:**

```yaml
constitutional_overrides:  # NEW SECTION
  - phase: "01-foundation"
    rule: "TDD-first"
    reason: "Integration tests cover implementation"
    overridden_by: "Claude at user request"
    timestamp: "2026-01-18T10:30:00Z"
```

**.planning/phases/{phase}/VERIFICATION.md additions:**

```yaml
---
constitutional_violations:  # NEW SECTION
  - rule: "NON-NEGOTIABLE: TDD-first"
    severity: error
    violations:
      - file: "src/auth/login.ts"
        issue: "Committed before test file"
        commit: "a1b2c3d"
    enforcement: "blocked"
    overridden: true
    override_reason: "Integration tests cover implementation"
---

## Constitutional Compliance  # NEW SECTION

| Rule | Status | Notes |
|------|--------|-------|
| TDD-first | ⚠ OVERRIDDEN | User confirmed integration tests cover implementation |
| No relative paths | ✓ PASS | All paths absolute or @-referenced |
```

## Data Flow Diagrams

### Constitution Resolution Flow

```
Installation/Setup
    ↓
Create ~/.claude/get-shit-done/CONSTITUTION.md (if not exists)
    ↓
User creates project: /gsd:new-project
    ↓
Optionally create .planning/CONSTITUTION.md (project overrides)
    ↓
────────────────────────────────────────────────────
Execution Time
    ↓
User invokes /gsd:execute-phase
    ↓
Orchestrator workflow starts
    ↓
Constitution Loader:
    ├─ Read global: ~/.claude/get-shit-done/CONSTITUTION.md
    ├─ Read project: .planning/CONSTITUTION.md (if exists)
    ├─ Merge rules:
    │   ├─ All global NON-NEGOTIABLE rules (cannot be removed)
    │   ├─ Project additional NON-NEGOTIABLE rules
    │   ├─ Project SHOULD rules override global SHOULD
    │   └─ Project MUST-NOT rules extend global MUST-NOT
    ├─ Cache to /tmp/gsd-constitution-{session}.json
    └─ Export CONSTITUTION_PATH=/tmp/gsd-constitution-{session}.json
    ↓
Pass to executor (informational context)
    ↓
Pass to verifier (enforcement context)
    ↓
Verifier loads from CONSTITUTION_PATH
    ↓
Runs validation checks
    ↓
Enforcement decision
```

### Validation Check Execution

```
Verifier Step 10: Constitutional Validation
    ↓
Load constitution from $CONSTITUTION_PATH
    ↓
Parse rule sections:
    ├─ NON-NEGOTIABLE (error severity)
    ├─ SHOULD (warn severity)
    └─ MUST-NOT (error severity)
    ↓
For each NON-NEGOTIABLE rule:
    ├─ Identify validator function (e.g., validate_tdd_pattern)
    ├─ Run validator against codebase/commits
    ├─ Collect violations
    └─ Record severity
    ↓
For each SHOULD rule:
    ├─ Run validator
    └─ Collect as warnings (not blocking)
    ↓
Aggregate all violations by severity:
    ├─ errors: []
    ├─ warnings: []
    └─ info: []
    ↓
Determine enforcement action:
    ├─ errors.length > 0 → BLOCK (allow override)
    ├─ warnings.length > 0 → PASS (log warnings)
    └─ errors.length == 0 → PASS
    ↓
If BLOCK:
    ├─ Return to orchestrator with violations
    └─ Orchestrator prompts user: override? (y/N)
        ├─ y → Collect reason, log override, continue
        └─ N → Exit, user fixes violations
    ↓
If PASS:
    └─ Continue verification, include notes in VERIFICATION.md
```

## Anti-Patterns

### Anti-Pattern 1: Constitution in Code

**What people do:** Hardcode validation rules in agent definitions instead of external constitution file.

**Why it's wrong:**
- Rules can't be customized per-project
- Changing rules requires editing agent files (complex)
- Users can't see what rules apply without reading agent code
- No clear "source of truth" for project standards

**Do this instead:**
- Store rules in `CONSTITUTION.md` (both global and project)
- Agent reads constitution file at runtime
- Constitution is markdown (human-readable, editable)
- Clear hierarchy: global < project override

### Anti-Pattern 2: Fatal Enforcement by Default

**What people do:** Make all constitutional violations fatal (cannot override).

**Why it's wrong:**
- Blocks legitimate edge cases where rule doesn't apply
- Frustrates experienced users who know what they're doing
- Creates pressure to disable validation entirely
- False positives become blockers

**Do this instead:**
- ERROR severity: Blocks but allows override with reason
- FATAL severity: Reserved for truly unacceptable patterns (not used in v1)
- User provides override reason (logged for audit)
- Escape hatch preserves enforcement culture while allowing exceptions

### Anti-Pattern 3: Validation Without Evidence

**What people do:** Trust self-reported status (SUMMARY.md says "wrote tests").

**Why it's wrong:**
- Agents can claim completion without actual implementation
- Easy to forget (human error)
- No audit trail of compliance
- Subjective interpretation of "done"

**Do this instead:**
- Evidence-based validation: Check git commits, file contents, patterns
- TDD check: Compare test commit timestamp to implementation commit
- Convention check: Grep files for anti-patterns
- Objective, reproducible results

### Anti-Pattern 4: Single Validation Point

**What people do:** Check constitution only at project end or in CI/CD.

**Why it's wrong:**
- Violations discovered too late (wasted work)
- Hard to fix retroactively (many commits to untangle)
- No incremental feedback

**Do this instead:**
- Checkpoint validation: At end of each phase (in verifier)
- Early feedback: Constitutional violations found before phase marked complete
- Incremental fixes: Small scope, easier to correct
- GSD rationale: Phase-end verification is natural checkpoint

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Single project | Global constitution sufficient, no project overrides needed |
| 2-5 projects | Project constitutions for domain-specific rules (API projects stricter on error handling) |
| 5+ projects | Consider constitution templates by project type (web-app, CLI, library) |
| Organization | Shared global constitution in git repo, teams customize project constitutions |

### Scaling Priorities

1. **First bottleneck:** Validator performance (many commits to check)
   - **Solution:** Cache git log results, check only phase commits (not entire history)
   - **Solution:** Parallel validation of independent rules

2. **Second bottleneck:** Constitution file becomes too large
   - **Solution:** Split into modules: `CONSTITUTION-TDD.md`, `CONSTITUTION-STYLE.md`
   - **Solution:** Include mechanism: `@include CONSTITUTION-TDD.md` in main file

## Build Order Implications

Based on architecture patterns, suggested implementation order:

**Phase 1: Constitution Foundation**
1. Create global constitution file structure
2. Document NON-NEGOTIABLE: TDD-first rule
3. Create project constitution template
4. Implement constitution loader (merge global + project)

**Phase 2: Validation Infrastructure**
5. Add verifier Step 10 (constitutional validation)
6. Implement TDD commit pattern validator
7. Add severity-based enforcement logic
8. Implement override mechanism with reason capture

**Phase 3: Integration & Audit**
9. Extend STATE.md schema for overrides
10. Extend VERIFICATION.md schema for violations
11. Update installer to create default constitution
12. Add constitution documentation to references

**Rationale for order:**
- Constitution files first (cheapest to create, enables experimentation)
- Validation logic second (can test manually before hooking into verifier)
- Integration last (requires constitution + validation working)

**Critical path:**
- Constitution loader ← TDD validator ← Verifier integration
- Cannot run validators without constitution loaded
- Cannot enforce without verifier integration

**Parallel work opportunities:**
- Constitution file creation (global + project) can happen simultaneously
- Documentation can be written during validator implementation
- State file schema extension can happen anytime before integration

## Sources

**Policy-as-Code Architecture:**
- [Top 12 Policy as Code Tools](https://spacelift.io/blog/policy-as-code-tools) - Modern PaC patterns and tool survey (2026)
- [AWS Policy as Code Guide](https://aws.amazon.com/blogs/infrastructure-and-automation/a-practical-guide-to-getting-started-with-policy-as-code/) - Practical implementation patterns
- [Cloudflare Shift-Left Security](https://www.infoq.com/news/2026/01/cloudflare-security-shift-left/) - Real-world enforcement architecture (2026)
- [Open Policy Agent Documentation](https://www.openpolicyagent.org/docs/latest/) - OPA architecture and integration patterns
- [OPA Management APIs](https://www.openpolicyagent.org/docs/management-introduction) - Policy loading and evaluation architecture

**Validation Architectures:**
- [ESLint Architecture](https://eslint.org/docs/developer-guide/architecture) - Rule-based validation with event-driven model (HIGH confidence)
- [Data Validation Rules Engine](https://www.nected.ai/us/blog-us/data-validation-using-rules-engine) - Validation engine components and data flow (2026)
- [Rules Engine Design Pattern](https://www.nected.ai/blog/rules-engine-design-pattern) - Architecture and best practices (2025)
- [High-Level Design of Validation Engines](https://www.flexrule.com/archives/design-validation-engine/) - Component architecture patterns

**Enforcement Patterns:**
- [Cybersecurity Compliance 2026](https://www.compunnel.com/blogs/cybersecurity-compliance-services-in-2026-from-checklists-to-continuous-assurance/) - Continuous validation vs point-in-time checks
- [Policy as Code for Platform Engineering](https://petronellatech.com/blog/compliance-by-design-policy-as-code-for-platform-engineering/) - Shift-left enforcement patterns
- [Pre-commit Hooks and Linting](https://shashank-saxena.medium.com/conventional-commit-messages-code-linting-with-git-hooks-c4c8dd83b916) - Git hook integration patterns (2026)
- [Bandit Security Linting](https://johal.in/bandit-security-linting-github-codespace-pre-commit-enforcement-2026/) - Pre-commit enforcement blocking vulnerabilities (2026)

**GSD-Specific Context:**
- `.planning/codebase/ARCHITECTURE.md` - Existing GSD architecture patterns (HIGH confidence)
- `.planning/codebase/CONVENTIONS.md` - Current convention documentation (HIGH confidence)
- `agents/gsd-verifier.md` - Existing verification workflow (HIGH confidence)
- `.planning/PROJECT.md` - Constitutional enforcement requirements (HIGH confidence)

---
*Architecture research for: GSD Constitutional Enforcement*
*Researched: 2026-01-18*
*Confidence: HIGH (authoritative sources + existing codebase analysis)*
