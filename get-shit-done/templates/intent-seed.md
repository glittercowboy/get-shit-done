# Intent Seed Template

Format definition for the intent seed YAML block that gets written into ROADMAP.md phase entries, PROJECT.md frontmatter, or PLAN.md frontmatter.

**Purpose:** Capture the earliest form of user intent in a structured, machine-readable format. The seed is the accountability anchor for the entire intent chain -- downstream agents trace back to it to verify they are building what the user asked for.

**Consumers:**
- `discuss-phase` -- reads seed to calibrate probing depth (via `references/adaptive-depth.md`)
- `plan-phase` -- reads seed to verify plan tasks map to user motivation and success criteria
- `verify-phase` / handoff creation -- reads seed.success_looks_like to compare against actual results

---

## YAML Format

```yaml
intent:
  motivation: "[from user input -- why this phase/project exists]"
  success_looks_like: "[from user answer or inferred -- observable outcome]"
  constraints: "[if mentioned, else 'none stated']"
  richness: seed | seed-urgent | context | handoff
```

<field_definitions>

### motivation

**What it captures:** The user's stated reason for wanting this built. Not the feature description -- the WHY behind it.

**When populated:** Always. If the user did not state motivation explicitly, infer from context and mark with `[inferred]`.

**Good:** "Backup jobs fail silently in CI and nobody notices until data is needed"
**Good:** "Current photo organization is by camera filename -- impossible to find anything by date"
**Bad:** "User wants a backup command" (this is a feature description, not motivation)
**Bad:** "Improve the system" (too vague to anchor intent)

**Source:** User's initial input, answer to "what prompted this?", or project-level vision statement.

### success_looks_like

**What it captures:** Observable outcome that means the phase succeeded. Not implementation details -- what the user would see, experience, or be able to do.

**When populated:** Always. Infer from motivation if user did not state explicitly. Mark with `[inferred]` if inferred.

**Good:** "Backup command runs in CI, exits 0 on success, exits 1 on failure with clear error message"
**Good:** "Photos organized into year/month folders, duplicates moved to review folder, no data loss"
**Bad:** "Backup works" (not observable -- what does "works" mean?)
**Bad:** "Implementation complete" (process milestone, not user outcome)

**Source:** User's answer to "how will you know this is working?" or ROADMAP.md success criteria.

### constraints

**What it captures:** Boundaries the user placed on HOW this gets built. Technical constraints, philosophical constraints, scope boundaries.

**When populated:** When the user stated constraints. Use `"none stated"` if they did not -- do NOT invent constraints.

**Good:** "Must work without interactive prompts -- CI pipeline context"
**Good:** "EU data residency required -- no US-based services"
**Good:** "Never auto-delete photos -- worst case move to review folder"
**Bad:** "Should be fast" (this is a quality aspiration, not a constraint)

**Source:** User's explicit statements, especially strong emotion markers ("must", "never", "always", "I hate when").

### richness

**What it captures:** The depth of intent information available at seed creation time. This tells downstream agents how much confidence to place in the seed and whether further probing is warranted.

**When populated:** Always. Set by the agent that creates the seed.

**Richness levels:**

| Level | Meaning | Downstream Implication |
|-------|---------|----------------------|
| `seed` | Minimal intent captured. User gave brief input, motivation and success inferred. | discuss-phase MUST probe before writing context. Plan-phase should flag low-confidence areas. |
| `seed-urgent` | Minimal intent but user signaled urgency. Skip deep probing, act on what is available. | discuss-phase uses quick-probe at most. Plan-phase proceeds with inferred intent, marks assumptions. |
| `context` | Rich intent captured. User gave detailed input or answered probing questions. Motivation and success explicitly stated. | discuss-phase can pass-through or quick-probe. Plan-phase has high confidence in intent mapping. |
| `handoff` | Intent inherited from prior phase handoff. Includes delta analysis and carrying decisions. | discuss-phase focuses on NEW intent for this phase, not re-establishing inherited context. |

</field_definitions>

<placement>

## Seed Placement

### In ROADMAP.md (phase-level seed)

Written into the phase detail section when the phase is first defined or when discuss-phase gathers initial context.

```markdown
### Phase 3: Post Feed
**Goal**: Display posts from followed users in a scrollable feed
**Depends on**: Phase 2

intent:
  motivation: "Users have no way to see what people they follow are posting"
  success_looks_like: "Scrollable feed shows posts from followed users with author, timestamp, and content"
  constraints: "none stated"
  richness: seed

**Success Criteria** (what must be TRUE):
  1. Feed displays posts from followed users
  2. Posts show author, timestamp, and content
  3. Feed scrolls with infinite loading
```

### In PLAN.md (plan-level seed)

Written into frontmatter when the plan is created. Inherits from ROADMAP.md seed but may be more specific if discuss-phase enriched it.

```yaml
---
phase: 03-post-feed
plan: 01
intent:
  motivation: "Users have no way to see what people they follow are posting"
  success_looks_like: "Card-based feed with infinite scroll, pull-to-refresh, and new-posts indicator"
  constraints: "Never jump scroll position when new posts arrive -- user referenced Twitter's approach"
  richness: context
---
```

### In PROJECT.md (project-level seed)

Written into frontmatter during project initialization. Captures the highest-level intent.

```yaml
---
project: photo-organizer
intent:
  motivation: "Current photo library is chaos -- thousands of files with camera filenames, no way to find anything"
  success_looks_like: "Photos organized by date, duplicates handled safely, findable by approximate time"
  constraints: "Never delete anything -- worst case move to review folder"
  richness: context
---
```

</placement>

<lifecycle>

## Seed Lifecycle

1. **Creation:** Seed is written when a phase/project is first defined. Can be `seed` richness (minimal) or `context` richness (if user provided detail upfront).

2. **Read by discuss-phase:** The `richness` field tells discuss-phase how much probing to do (see `references/adaptive-depth.md`). A `seed` richness triggers deep-probe. A `context` richness may allow pass-through.

3. **Read by plan-phase:** The `motivation` and `success_looks_like` fields anchor the plan's intent mapping. Every task in the plan should trace to something in the seed or its enriched context.

4. **Read by handoff creation:** The `success_looks_like` field is compared against VERIFICATION.md results to produce the delta in the handoff document.

5. **Never modified after creation.** If intent evolves, write a new seed (e.g., in the context document or plan frontmatter) that references the original. The chain of seeds is the audit trail.

</lifecycle>

<downstream_consumption>

## How Downstream Agents Consume the Seed

| Agent | Reads | Uses For |
|-------|-------|----------|
| discuss-phase | `richness` | Depth calibration (adaptive-depth.md) |
| discuss-phase | `motivation`, `constraints` | Anchoring probing questions to user intent |
| plan-phase | `motivation`, `success_looks_like` | Intent mapping (every task traces to intent) |
| plan-phase | `constraints` | Hard boundaries on implementation choices |
| verify-phase | `success_looks_like` | Verification criteria |
| handoff creation | `success_looks_like` | Delta analysis (intended vs actual) |

</downstream_consumption>
