---
name: gsd:metrics
description: Show token efficiency metrics for the current project
allowed-tools:
  - Read
  - Bash
  - Grep
  - Glob
---
<objective>
Show token efficiency metrics from Claude Code session logs. Provides verifiable data on API calls, token usage, cache efficiency, and model mix — per phase, per milestone, or for the full project.
</objective>

<process>

1. **Detect scope:** Ask user what they want to see:
   - **Current phase** — metrics for the active phase
   - **Current milestone** — aggregate across all phases
   - **Full project** — lifetime totals
   - **Compare phases** — side-by-side efficiency trends

2. **Run the appropriate command:**

```bash
# For current phase (get phase number from STATE.md):
node ~/.claude/get-shit-done/bin/gsd-tools.cjs metrics phase "${PHASE_NUMBER}"

# For milestone:
node ~/.claude/get-shit-done/bin/gsd-tools.cjs metrics milestone

# For full project:
node ~/.claude/get-shit-done/bin/gsd-tools.cjs metrics project
```

3. **Present results with interpretation:**

Format the JSON output as readable tables. Include:

**Token Summary:**
- Total tokens, new work tokens, cache read tokens
- Cache efficiency ratio (higher = better context reuse)
- New work % (lower = less redundant processing)

**Model Mix:**
- Opus/Sonnet/Haiku call counts and percentages
- Interpretation: shifting toward sonnet/haiku = cost efficiency

**Efficiency Trends (if comparing phases):**
- Cache ratio trending up = good (more context reuse)
- New work % trending down = good
- Tokens per commit trending down = more efficient coding
- Model delegation % trending up = better cost optimization

4. **For comparison view**, read `.planning/metrics/phase-*.json` snapshots if they exist:

```bash
ls .planning/metrics/phase-*.json 2>/dev/null
```

Present a phase-over-phase comparison table:

```
| Phase | API Calls | New Work | Cache Ratio | Opus % | Sonnet % | Haiku % |
|-------|-----------|----------|-------------|--------|----------|---------|
```

5. **Note data source for verifiability:**

```
Data source: ~/.claude/projects/{slug}/ JSONL session logs
Phase boundaries: git commit timestamps matching ({phase}- pattern
Verifiable: run `node ~/.claude/get-shit-done/bin/gsd-tools.cjs metrics project`
```

</process>
