---
name: gsd:new-milestone
description: Start a new milestone cycle — update PROJECT.md and route to requirements
argument-hint: "[milestone name, e.g., 'v1.1 Notifications']"
allowed-tools:
  - Read
  - Write
  - Bash
  - Task
  - AskUserQuestion
  - Glob
---

<objective>

Start a new milestone through unified flow: questioning → research (optional) → requirements → roadmap.

This is the brownfield equivalent of new-project. The project exists, PROJECT.md has history. This command gathers "what's next" and takes you through the full cycle.

**Creates/Updates:**
- `.planning/PROJECT.md` — updated with new milestone goals
- `.planning/research/` — domain research (optional)
- `.planning/REQUIREMENTS.md` — scoped requirements
- `.planning/ROADMAP.md` — phase structure
- `.planning/STATE.md` — updated project memory

**After this command:** Run `/gsd:plan-phase [N]` to start execution.

</objective>

<execution_context>

@./get-shit-done/references/questioning.md
@./get-shit-done/references/ui-brand.md
@./get-shit-done/templates/project.md
@./get-shit-done/templates/requirements.md

</execution_context>

<context>

Milestone name: $ARGUMENTS (optional - will prompt if not provided)

**Load project context:**
@.planning/PROJECT.md
@.planning/STATE.md
@.planning/MILESTONES.md
@.planning/config.json

</context>

<process>

## Phase 1: Validate

**MANDATORY FIRST STEP — Execute these checks before ANY user interaction:**

1. **Verify project exists:**
   ```bash
   [ -f .planning/PROJECT.md ] || { echo "ERROR: No PROJECT.md. Run /gsd:new-project first."; exit 1; }
   ```

2. **Check for active milestone (ROADMAP.md exists):**
   ```bash
   [ -f .planning/ROADMAP.md ] && echo "ACTIVE_MILESTONE" || echo "READY_FOR_NEW"
   ```

   **If ACTIVE_MILESTONE:**
   Use AskUserQuestion:
   - header: "Active Milestone"
   - question: "A milestone is in progress. What would you like to do?"
   - options:
     - "Complete current first" — Run /gsd:complete-milestone
     - "Continue anyway" — Start new milestone (will archive current)

   If "Complete current first": Exit with routing to `/gsd:complete-milestone`
   If "Continue anyway": Continue to Phase 2

3. **Load previous milestone context:**
   ```bash
   cat .planning/MILESTONES.md 2>/dev/null || echo "NO_MILESTONES"
   cat .planning/STATE.md
   ```

## Phase 2: Present Context

**Display stage banner:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► NEW MILESTONE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Present what shipped:**

```
Last milestone: v[X.Y] [Name] (shipped [DATE])

Key accomplishments:
- [From MILESTONES.md]
- [From MILESTONES.md]
- [From MILESTONES.md]

Validated requirements:
- [From PROJECT.md Validated section]

Pending todos:
- [From STATE.md if any]
```

## Phase 3: Deep Questioning

**Display stage banner:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► QUESTIONING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Open the conversation:**

Ask inline (freeform, NOT AskUserQuestion):

"What do you want to build next?"

Wait for their response. This gives you the context needed to ask intelligent follow-up questions.

**Follow the thread:**

Based on what they said, ask follow-up questions that dig into their response. Use AskUserQuestion with options that probe what they mentioned — interpretations, clarifications, concrete examples.

Keep following threads. Each answer opens new threads to explore. Ask about:
- What excited them
- What problem sparked this
- What they mean by vague terms
- What it would actually look like
- What's already decided

Consult `questioning.md` for techniques:
- Challenge vagueness
- Make abstract concrete
- Surface assumptions
- Find edges
- Reveal motivation

**Decision gate:**

When you could update PROJECT.md with clear new goals, use AskUserQuestion:

- header: "Ready?"
- question: "I think I understand what you're after. Ready to update PROJECT.md?"
- options:
  - "Update PROJECT.md" — Let's move forward
  - "Keep exploring" — I want to share more / ask me more

If "Keep exploring" — ask what they want to add, or identify gaps and probe naturally.

Loop until "Update PROJECT.md" selected.

## Phase 4: Determine Milestone Version

Parse last version from MILESTONES.md and suggest next:

Use AskUserQuestion:
- header: "Version"
- question: "What version is this milestone?"
- options:
  - "v[X.Y+0.1] (patch)" — Minor update: [suggested name]
  - "v[X+1].0 (major)" — Major release
  - "Custom" — I'll specify

## Phase 5: Update PROJECT.md

Update `.planning/PROJECT.md` with new milestone section:

```markdown
## Current Milestone: v[X.Y] [Name]

**Goal:** [One sentence describing milestone focus]

**Target features:**
- [Feature 1]
- [Feature 2]
- [Feature 3]
```

Update Active requirements section with new goals (keep Validated section intact).

Update "Last updated" footer.

**Commit PROJECT.md:**

```bash
git add .planning/PROJECT.md
git commit -m "$(cat <<'EOF'
docs: start milestone v[X.Y] [Name]

[One-liner describing milestone focus]
EOF
)"
```

## Phase 6: Research Decision

Use AskUserQuestion:
- header: "Research"
- question: "Research the domain ecosystem before defining requirements?"
- options:
  - "Research first (Recommended)" — Discover patterns, expected features, architecture
  - "Skip research" — I know this domain well, go straight to requirements

**If "Research first":**

Display stage banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► RESEARCHING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Researching [domain] ecosystem...
```

Create research directory:
```bash
mkdir -p .planning/research
```

**Milestone context is "subsequent"** — Research focuses on new features, not re-researching validated requirements.

Display spawning indicator:
```
◆ Spawning 4 researchers in parallel...
  → Stack research
  → Features research
  → Architecture research
  → Pitfalls research
```

Spawn 4 parallel gsd-project-researcher agents with context:

```
Task(prompt="
<research_type>
Project Research — Stack dimension for [domain].
</research_type>

<milestone_context>
Subsequent milestone (v[X.Y]).

Research what's needed to add [target features] to an existing [domain] app. Don't re-research the existing system.
</milestone_context>

<question>
What's needed to add [target features] to [domain]?
</question>

<project_context>
[PROJECT.md summary - core value, validated requirements, new goals]
</project_context>

<downstream_consumer>
Your STACK.md feeds into roadmap creation. Be prescriptive:
- Specific libraries with versions
- Clear rationale for each choice
- What NOT to use and why
</downstream_consumer>

<output>
Write to: .planning/research/STACK.md
Use template: ./get-shit-done/templates/research-project/STACK.md
</output>
", subagent_type="gsd-project-researcher", description="Stack research")

Task(prompt="
<research_type>
Project Research — Features dimension for [domain].
</research_type>

<milestone_context>
Subsequent milestone (v[X.Y]).

How do [target features] typically work? What's expected behavior?
</milestone_context>

<question>
What features are expected for [target features]?
</question>

<project_context>
[PROJECT.md summary]
</project_context>

<downstream_consumer>
Your FEATURES.md feeds into requirements definition. Categorize clearly:
- Table stakes (must have)
- Differentiators (competitive advantage)
- Anti-features (things to deliberately NOT build)
</downstream_consumer>

<output>
Write to: .planning/research/FEATURES.md
Use template: ./get-shit-done/templates/research-project/FEATURES.md
</output>
", subagent_type="gsd-project-researcher", description="Features research")

Task(prompt="
<research_type>
Project Research — Architecture dimension for [domain].
</research_type>

<milestone_context>
Subsequent milestone (v[X.Y]).

How do [target features] integrate with existing [domain] architecture?
</milestone_context>

<question>
How should [target features] integrate with the existing system?
</question>

<project_context>
[PROJECT.md summary]
</project_context>

<downstream_consumer>
Your ARCHITECTURE.md informs phase structure in roadmap. Include:
- Component boundaries (what talks to what)
- Data flow (how information moves)
- Suggested build order (dependencies between components)
</downstream_consumer>

<output>
Write to: .planning/research/ARCHITECTURE.md
Use template: ./get-shit-done/templates/research-project/ARCHITECTURE.md
</output>
", subagent_type="gsd-project-researcher", description="Architecture research")

Task(prompt="
<research_type>
Project Research — Pitfalls dimension for [domain].
</research_type>

<milestone_context>
Subsequent milestone (v[X.Y]).

What are common mistakes when adding [target features] to [domain]?
</milestone_context>

<question>
What pitfalls should we avoid when adding [target features]?
</question>

<project_context>
[PROJECT.md summary]
</project_context>

<downstream_consumer>
Your PITFALLS.md prevents mistakes in roadmap/planning. For each pitfall:
- Warning signs (how to detect early)
- Prevention strategy (how to avoid)
- Which phase should address it
</downstream_consumer>

<output>
Write to: .planning/research/PITFALLS.md
Use template: ./get-shit-done/templates/research-project/PITFALLS.md
</output>
", subagent_type="gsd-project-researcher", description="Pitfalls research")
```

After all 4 agents complete, spawn synthesizer:

```
Task(prompt="
<task>
Synthesize research outputs into SUMMARY.md.
</task>

<research_files>
Read these files:
- .planning/research/STACK.md
- .planning/research/FEATURES.md
- .planning/research/ARCHITECTURE.md
- .planning/research/PITFALLS.md
</research_files>

<output>
Write to: .planning/research/SUMMARY.md
Use template: ./get-shit-done/templates/research-project/SUMMARY.md
Commit after writing.
</output>
", subagent_type="gsd-research-synthesizer", description="Synthesize research")
```

Display research complete:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► RESEARCH COMPLETE ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Key Findings

**Stack:** [from SUMMARY.md]
**Table Stakes:** [from SUMMARY.md]
**Watch Out For:** [from SUMMARY.md]

Files: `.planning/research/`
```

**If "Skip research":** Continue to Phase 7.

## Phase 7: Define Requirements

Display stage banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► DEFINING REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Load context:**

Read PROJECT.md and extract:
- Core value (the ONE thing that must work)
- New milestone goals
- Validated requirements (what already works)
- Stated constraints

**If research exists:** Read research/FEATURES.md and extract feature categories.

**Present features by category:**

```
Here are the features for [milestone focus]:

## [Category 1]
**Table stakes:**
- [Feature]
- [Feature]

**Differentiators:**
- [Feature]

**Research notes:** [any relevant notes]

---

## [Next Category]
...
```

**If no research:** Gather requirements through conversation instead.

Ask: "What are the main things users need to be able to do in this milestone?"

For each capability mentioned:
- Ask clarifying questions to make it specific
- Probe for related capabilities
- Group into categories

**Scope each category:**

For each category, use AskUserQuestion:

- header: "[Category name]"
- question: "Which [category] features are in this milestone?"
- multiSelect: true
- options:
  - "[Feature 1]" — [brief description]
  - "[Feature 2]" — [brief description]
  - "None for this milestone" — Defer

Track responses:
- Selected features → v1 requirements
- Unselected table stakes → v2 (users expect these)
- Unselected differentiators → out of scope

**Identify gaps:**

Use AskUserQuestion:
- header: "Additions"
- question: "Any requirements research missed? (Features specific to your vision)"
- options:
  - "No, research covered it" — Proceed
  - "Yes, let me add some" — Capture additions

**Validate core value:**

Cross-check requirements against Core Value from PROJECT.md. If gaps detected, surface them.

**Generate REQUIREMENTS.md:**

Create `.planning/REQUIREMENTS.md` with:
- v1 Requirements grouped by category (checkboxes, REQ-IDs)
- v2 Requirements (deferred)
- Out of Scope (explicit exclusions with reasoning)
- Traceability section (empty, filled by roadmap)

**REQ-ID format:** `[CATEGORY]-[NUMBER]` (AUTH-01, CONTENT-02)

**Requirement quality criteria:**

Good requirements are:
- **Specific and testable:** "User can reset password via email link" (not "Handle password reset")
- **User-centric:** "User can X" (not "System does Y")
- **Atomic:** One capability per requirement
- **Independent:** Minimal dependencies on other requirements

**Present full requirements list for confirmation:**

Show every requirement (not counts) for user confirmation:

```
## v1 Requirements

### [Category]
- [ ] **[CAT]-01**: [Requirement description]
- [ ] **[CAT]-02**: [Requirement description]

[... full list ...]

---

Does this capture what you're building? (yes / adjust)
```

If "adjust": Return to scoping.

**Commit requirements:**

```bash
git add .planning/REQUIREMENTS.md
git commit -m "$(cat <<'EOF'
docs: define v[X.Y] requirements

[X] requirements across [N] categories
[Y] requirements deferred to v2
EOF
)"
```

## Phase 8: Create Roadmap

Display stage banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► CREATING ROADMAP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ Spawning roadmapper...
```

**Calculate starting phase number:**

```bash
# Find highest existing phase number
ls -d .planning/phases/[0-9]*-* 2>/dev/null | sort -V | tail -1 | grep -oE '[0-9]+' | head -1
```

If phases exist: New phases start at last + 1
If no phases: Start at Phase 1

Spawn gsd-roadmapper agent with context:

```
Task(prompt="
<planning_context>

**Project:**
@.planning/PROJECT.md

**Requirements:**
@.planning/REQUIREMENTS.md

**Research (if exists):**
@.planning/research/SUMMARY.md

**Config:**
@.planning/config.json

**Starting phase number:** [N]

</planning_context>

<instructions>
Create roadmap:
1. Derive phases from requirements (don't impose structure)
2. Map every v1 requirement to exactly one phase
3. Derive 2-5 success criteria per phase (observable user behaviors)
4. Validate 100% coverage
5. Write files immediately (ROADMAP.md, STATE.md, update REQUIREMENTS.md traceability)
6. Return ROADMAP CREATED with summary

Write files first, then return.
</instructions>
", subagent_type="gsd-roadmapper", description="Create roadmap")
```

**Handle roadmapper return:**

**If `## ROADMAP BLOCKED`:**
- Present blocker information
- Work with user to resolve
- Re-spawn when resolved

**If `## ROADMAP CREATED`:**

Read the created ROADMAP.md and present it inline.

**Ask for approval:**

Use AskUserQuestion:
- header: "Roadmap"
- question: "Does this roadmap structure work for you?"
- options:
  - "Approve" — Commit and continue
  - "Adjust phases" — Tell me what to change
  - "Review full file" — Show raw ROADMAP.md

**If "Approve":** Continue to commit.

**If "Adjust phases":**
- Get user's adjustment notes
- Re-spawn roadmapper with revision context
- Loop until approved

**Commit roadmap:**

```bash
git add .planning/ROADMAP.md .planning/STATE.md .planning/REQUIREMENTS.md
git commit -m "$(cat <<'EOF'
docs: create v[X.Y] roadmap ([N] phases)

Phases:
1. [phase-name]: [requirements covered]
2. [phase-name]: [requirements covered]
...

All v1 requirements mapped to phases.
EOF
)"
```

## Phase 9: Done

Present completion with next steps:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► MILESTONE INITIALIZED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**v[X.Y] [Name]**

| Artifact       | Location                    |
|----------------|-----------------------------
| Project        | `.planning/PROJECT.md`      |
| Research       | `.planning/research/`       |
| Requirements   | `.planning/REQUIREMENTS.md` |
| Roadmap        | `.planning/ROADMAP.md`      |

**[N] phases** | **[X] requirements** | Ready to build ✓

───────────────────────────────────────────────────────────────

## ▶ Next Up

**Phase [N]: [Phase Name]** — [Goal from ROADMAP.md]

`/gsd:discuss-phase [N]` — gather context and clarify approach

<sub>`/clear` first → fresh context window</sub>

---

**Also available:**
- `/gsd:plan-phase [N]` — skip discussion, plan directly

───────────────────────────────────────────────────────────────
```

</process>

<output>

- `.planning/PROJECT.md` (updated)
- `.planning/research/` (if research selected)
  - `STACK.md`
  - `FEATURES.md`
  - `ARCHITECTURE.md`
  - `PITFALLS.md`
  - `SUMMARY.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`

</output>

<success_criteria>

- [ ] Project validated (PROJECT.md exists)
- [ ] Previous milestone context presented
- [ ] Deep questioning completed (threads followed)
- [ ] Milestone version determined
- [ ] PROJECT.md updated with new milestone goals → **committed**
- [ ] Research completed (if selected) → **committed**
- [ ] Requirements gathered and scoped
- [ ] REQUIREMENTS.md created with REQ-IDs → **committed**
- [ ] gsd-roadmapper spawned with context
- [ ] Roadmap files written immediately
- [ ] User feedback incorporated (if any)
- [ ] ROADMAP.md, STATE.md → **committed**
- [ ] User knows next step is `/gsd:plan-phase [N]`

</success_criteria>
