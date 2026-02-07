# Phase Context Template

Template for `.planning/phases/XX-name/{phase}-CONTEXT.md` - captures implementation decisions AND their reasoning for a phase.

**Purpose:** Document decisions and the reasoning behind them for downstream agents. Researcher uses this to know WHAT to investigate and WHY the user cares about it. Planner uses this to know WHAT choices are locked, WHY they were made, and what constraints exist.

**Key principle:** Categories are NOT predefined. They emerge from what was actually discussed for THIS phase. A CLI phase has CLI-relevant sections, a UI phase has UI-relevant sections.

**Quality principle:** Each decision must carry its reasoning. The planner reads this file ONCE in a fresh context window — they were not in the discussion. A decision without its WHY forces the planner to guess intent or ask the user again, which defeats the purpose of this file.

**Voice preservation:** When the user uses specific terminology, metaphors, or phrasing that carries design intent, preserve it in the context file. These are not decoration — they are constraints that downstream agents need to understand the spirit of the decision, not just the letter.

**Downstream consumers:**
- `gsd-phase-researcher` — Reads decisions + reasoning to focus research (e.g., "card layout because contained units" → researcher investigates card patterns with isolation in mind)
- `gsd-planner` — Reads decisions + reasoning + constraints to create specific tasks (e.g., "infinite scroll for uninterrupted flow" → planner includes virtualization + knows WHY)

---

## File Template

```markdown
# Phase [X]: [Name] - Context

**Gathered:** [date]
**Status:** Ready for planning

<domain>
## Phase Boundary

[Clear statement of what this phase delivers — the scope anchor. This comes from ROADMAP.md and is fixed. Discussion clarifies implementation within this boundary.]

</domain>

<decisions>
## Implementation Decisions

### [Area 1 that was discussed]

**[Core principle — the north star for this area, in user's own words if they expressed one]**

- **[Decision]:** [What was decided] — [Why, using user's reasoning. Include user's original phrasing when it carries design intent.]
- **[Decision]:** [What was decided] — [Reasoning that led to this choice]
- **Not:** [What was explicitly rejected] — [Why this was ruled out. If a scope discussion revealed why something doesn't belong here, capture the reasoning as a constraint.]

### [Area 2 that was discussed]

**[Core principle for this area]**

- **[Decision]:** [What + Why]
- **[Decision]:** [What + Why]

### [Area 3 that was discussed]
- **[Decision]:** [What + Why]

### Claude's Discretion
[Areas where user explicitly said "you decide" — Claude has flexibility here during planning/implementation]

</decisions>

<specifics>
## Specific Ideas

[Product references, anti-patterns, and "I want it like X" moments from discussion. Include enough context that the planner understands the reference without having been in the conversation.]

[If none: "No specific requirements — open to standard approaches"]

</specifics>

<deferred>
## Deferred Ideas

[Ideas that came up during discussion but belong in other phases. Captured here so they're not lost, but explicitly out of scope for this phase.]

[If none: "None — discussion stayed within phase scope"]

</deferred>

---

*Phase: XX-name*
*Context gathered: [date]*
```

<good_examples>

**Example 1: Visual feature (Post Feed) — showing decision + reasoning depth**

```markdown
# Phase 3: Post Feed - Context

**Gathered:** 2025-01-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Display posts from followed users in a scrollable feed. Users can view posts and see engagement counts. Creating posts and interactions are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Layout style

**Core principle: each post should feel like its own contained unit, not a stream of merged content.**

- **Card-based layout**, not timeline or list — the user wants visual containment per post. Each card is a self-contained thought with clear boundaries. Reference: "like Linear's issue cards — clean, not cluttered"
- Each card shows: author avatar, name, timestamp, full post content, reaction counts
- Cards have subtle shadows, rounded corners — modern feel but not heavy
- **Not:** Timeline layout (too dense, posts merge visually) or Grid layout (not enough content visible per item)

### Loading behavior

**Core principle: never interrupt the user's reading flow.**

- **Infinite scroll**, not pagination — the user wants uninterrupted browsing without clicking "next page"
- Pull-to-refresh on mobile
- **New posts indicator** at top ("3 new posts") rather than auto-inserting — the user specifically referenced Twitter's approach: "I like how Twitter shows the new posts indicator without disrupting your scroll position." This means: never jump the user's scroll position, always let them opt in to new content.
- **Not:** Auto-inserting new posts (disrupts reading position)

### Empty state
- Friendly illustration + "Follow people to see posts here"
- Suggest 3-5 accounts to follow based on interests

### Claude's Discretion
- Loading skeleton design
- Exact spacing and typography
- Error state handling

</decisions>

<specifics>
## Specific Ideas

- **Linear's issue cards** as visual reference — clean, contained, not cluttered. The user values whitespace and clear boundaries over information density.
- **Twitter's new-posts indicator** as interaction reference — non-disruptive, user-initiated content refresh. The scroll position is sacred.

</specifics>

<deferred>
## Deferred Ideas

- Commenting on posts — Phase 5
- Bookmarking posts — add to backlog

</deferred>

---

*Phase: 03-post-feed*
*Context gathered: 2025-01-20*
```

**Example 2: CLI tool (Database backup) — showing constraints and reasoning**

```markdown
# Phase 2: Backup Command - Context

**Gathered:** 2025-01-20
**Status:** Ready for planning

<domain>
## Phase Boundary

CLI command to backup database to local file or S3. Supports full and incremental backups. Restore command is a separate phase.

</domain>

<decisions>
## Implementation Decisions

### Output format

**Core principle: must work in both human-interactive and CI pipeline contexts without mode switching.**

- JSON for programmatic use, table format for humans — the user needs this for CI pipeline integration where machines parse output
- Default to table (human-first), --json flag for JSON — humans are the primary audience, machines opt in
- Verbose mode (-v) shows progress, silent by default — CI pipelines need clean stdout, humans can opt into verbosity
- "I want it to feel like pg_dump — familiar to database people" — the UX reference is pg_dump's straightforward, no-surprise interface

### Flag design
- Short flags for common options: -o (output), -v (verbose), -f (force)
- Long flags for clarity: --incremental, --compress, --encrypt
- Required: database connection string (positional or --db)

### Error recovery

**Core principle: no human intervention needed in CI — fail cleanly or retry autonomously.**

- Retry 3 times on network failure, then fail with clear message — the user needs unattended backup jobs that handle transient failures
- --no-retry flag to fail fast — for debugging or when the user wants immediate failure
- Partial backups are deleted on failure — no corrupt files left behind. The user was emphatic: "Should work in CI pipelines (exit codes, no interactive prompts)"
- **Not:** Interactive prompts on failure (breaks CI), Silent failure (masks problems)

### Claude's Discretion
- Exact progress bar implementation
- Compression algorithm choice
- Temp file handling

</decisions>

<specifics>
## Specific Ideas

- **pg_dump as UX reference** — familiar, predictable, no surprises. The user values whitespace and clear boundaries over information density.
- **CI-first mentality** — exit codes matter, stdout must be parseable, no interactive prompts ever. The user sees this as equally important as the backup functionality itself.

</specifics>

<deferred>
## Deferred Ideas

- Scheduled backups — separate phase
- Backup rotation/retention — add to backlog

</deferred>

---

*Phase: 02-backup-command*
*Context gathered: 2025-01-20*
```

**Example 3: Organization task (Photo library) — showing user philosophy**

```markdown
# Phase 1: Photo Organization - Context

**Gathered:** 2025-01-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Organize existing photo library into structured folders. Handle duplicates and apply consistent naming. Tagging and search are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Grouping criteria

**Core principle: findability by approximate time — "I want to be able to find photos by roughly when they were taken."**

- Primary grouping by year, then by month — the user thinks in calendar time, not events or people
- Events detected by time clustering (photos within 2 hours = same event) — within a month, photos cluster naturally by activity
- Event folders named by date + location if available — combines temporal and spatial context for recognition

### Duplicate handling

**Core principle: never delete, always preserve the ability to review — "worst case, move to a review folder."**

- Keep highest resolution version as the primary copy
- Move duplicates to _duplicates folder (don't delete) — the user is risk-averse about data loss. Deletion is never automatic.
- Log all duplicate decisions for review — the user wants to be able to audit what the system decided and override if needed
- **Not:** Auto-delete duplicates (user doesn't trust automated deletion decisions on irreplaceable photos)

### Naming convention
- Format: YYYY-MM-DD_HH-MM-SS_originalname.ext
- Preserve original filename as suffix for searchability — the user may remember the original camera filename
- Handle name collisions with incrementing suffix

### Claude's Discretion
- Exact clustering algorithm for event detection
- How to handle photos with no EXIF data (likely move to "unsorted" folder)
- Folder emoji usage

</decisions>

<specifics>
## Specific Ideas

- **Safety-first philosophy** — the user repeatedly emphasized never deleting anything. Even duplicates get moved, not removed. The system should err on the side of preserving too much rather than too little.
- **Calendar-based mental model** — the user navigates their memory by time ("roughly when they were taken"), not by content, people, or events. The folder structure should mirror this.

</specifics>

<deferred>
## Deferred Ideas

- Face detection grouping — future phase
- Cloud sync — out of scope for now

</deferred>

---

*Phase: 01-photo-organization*
*Context gathered: 2025-01-20*
```

</good_examples>

<guidelines>
**This template captures DECISIONS + REASONING for downstream agents.**

The output should answer: "What does the researcher need to investigate? What choices are locked for the planner? WHY were they made this way?"

**Good content (decision + reasoning):**
- "Card-based layout, not timeline — user wants contained units, referenced Linear's cards"
- "Retry 3 times on network failure, then fail — must work in CI pipelines without human intervention"
- "Repetition allowed and valued — user called this a 'Hardening-Fact': re-retrieval IS the signal"
- "Group by year, then by month — user thinks in calendar time, wants to find photos by 'roughly when'"

**Bad content (too vague):**
- "Should feel modern and clean"
- "Good user experience"
- "Fast and responsive"
- "Easy to use"

**Also bad (decision without reasoning):**
- "Card-based layout" (WHY? planner doesn't know the intent behind the choice)
- "3-5 quotes per response" (WHY this density? what's the design goal?)
- "Graph boost for citations" (what's the user's mental model here?)

**Constraint vs Deferred — where reasoning lives:**
- If a scope discussion revealed WHY something should NOT be built in this phase, that reasoning is a CONSTRAINT and belongs in the Decisions section: "Not: tap-to-source UI — single-source view is misleading when responses synthesize from multiple segments (NotebookLM anti-pattern)"
- Deferred Ideas gets the slim backlog entry only: "Tap-to-source UI — future phase"
- The reasoning stays where the planner needs it (Decisions). The backlog item goes where it won't be lost (Deferred).

**After creation:**
- File lives in phase directory: `.planning/phases/XX-name/{phase}-CONTEXT.md`
- `gsd-phase-researcher` uses decisions + reasoning to focus investigation
- `gsd-planner` uses decisions + reasoning + constraints to create executable tasks
- Downstream agents should NOT need to ask the user again about captured decisions
</guidelines>
