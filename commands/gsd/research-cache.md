---
name: gsd:research-cache
description: View and manage the global research cache
argument-hint: "[list|clear|stats]"
---

<objective>
View and manage the global research cache that stores findings from previous research phases.

The research cache speeds up future research by reusing verified findings for recurring technology stacks and problem domains.
</objective>

<process>

<step name="parse_subcommand">
Parse the user's intent from the argument:

- **No argument or "list"**: Show all cached entries
- **"stats"**: Show cache statistics
- **"clear"**: Clear expired or all entries (with confirmation)
- **"query"**: Search for specific research (rare - usually automatic)
</step>

<step name="list_entries">
**If list requested:**

```bash
node ~/.claude/hooks/gsd-research-cache.js list
```

Format output as a table:

```markdown
## Research Cache

| Topic | Technologies | Confidence | Expires | Status |
|-------|--------------|------------|---------|--------|
| vehicle physics | rapier, r3f | HIGH | 2026-04-20 | Active |
| auth patterns | next-auth, prisma | MEDIUM | 2026-02-15 | Active |
| old topic | library | LOW | 2026-01-01 | Expired |

**Total:** 3 entries (1 expired)

Use `/gsd:research-cache clear` to remove expired entries.
```
</step>

<step name="show_stats">
**If stats requested:**

```bash
node ~/.claude/hooks/gsd-research-cache.js stats
```

Format output:

```markdown
## Research Cache Statistics

**Entries:** 15 total (12 active, 3 expired)
**Size:** 42 KB

### By Confidence
- HIGH: 5 entries (90-day TTL)
- MEDIUM: 7 entries (30-day TTL)
- LOW: 3 entries (7-day TTL)

### Top Technologies
1. react-three-fiber (4 entries)
2. rapier (3 entries)
3. next.js (3 entries)

### Top Tags
1. 3d (5 entries)
2. physics (3 entries)
3. auth (2 entries)

**Last updated:** 2026-01-24
```
</step>

<step name="clear_cache">
**If clear requested:**

First ask what to clear:

```markdown
## Clear Research Cache

What would you like to clear?
```

Use AskUserQuestion:
- Question: "What entries should be cleared?"
- Options:
  - "Expired entries only (safe)"
  - "All entries (start fresh)"
  - "Cancel"

**If expired:**
```bash
node ~/.claude/hooks/gsd-research-cache.js clear --expired
```

**If all:**
```bash
node ~/.claude/hooks/gsd-research-cache.js clear --all
```

Report result:

```markdown
Cleared 3 expired entries from research cache.
```
</step>

</process>

<cache_location>
The research cache is stored at:
```
~/.claude/cache/research/
├── index.json          # Fast lookup index
└── entries/
    └── {hash}.json     # Individual research entries
```

Each entry contains:
- Topic and technologies researched
- Confidence level (HIGH/MEDIUM/LOW)
- Extracted findings (stack, patterns, pitfalls)
- Source URLs for verification
- Expiration date based on confidence
</cache_location>

<ttl_policy>
Entries expire based on confidence level:
- **HIGH confidence:** 90 days (verified with official docs)
- **MEDIUM confidence:** 30 days (cross-referenced sources)
- **LOW confidence:** 7 days (single source, needs validation)

Expired entries are excluded from queries but remain until cleared.
</ttl_policy>

<success_criteria>
- [ ] Subcommand parsed correctly
- [ ] Cache operations executed
- [ ] Results formatted clearly
- [ ] Clear operation confirmed before execution
</success_criteria>
