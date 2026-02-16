---
phase: 04-knowledge-extraction-hooks
plan: 03
subsystem: knowledge-dedup, knowledge-evolution
tags: [deduplication, memory-evolution, vector-search, hash-comparison]
dependency_graph:
  requires: [04-01, 04-02, embeddings.js, knowledge-crud.js, knowledge-search.js]
  provides: [knowledge-dedup.js, knowledge-evolution.js]
  affects: [knowledge-insertion, extraction-hooks]
tech_stack:
  added: [crypto.SHA-256, canonical-normalization, three-stage-dedup]
  patterns: [similarity-thresholds, memory-merging, evolution-tracking]
key_files:
  created:
    - get-shit-done/bin/knowledge-dedup.js
    - get-shit-done/bin/knowledge-evolution.js
  modified: []
decisions:
  - Three-stage deduplication: content hash (1.0) → canonical hash (0.95) → embedding (0.88)
  - Similarity ranges: >0.88 skip, 0.65-0.88 evolve, <0.65 create
  - Memory evolution appends with timestamp, preserves original content
  - Evolution history limited to 10 entries to prevent unbounded growth
  - Canonical hash normalizes case/punctuation/whitespace for near-duplicate detection
  - Embedding updates disabled (vec0 limitation), existing embedding represents original concept
metrics:
  duration: 107 seconds
  completed: 2026-02-16
  tasks_completed: 2
  files_created: 2
  commits: 2
---

# Phase 04 Plan 03: Deduplication & Memory Evolution Summary

**One-liner:** Three-stage deduplication (hash/canonical/embedding) with intelligent memory evolution for similar content (0.65-0.88 similarity)

## What Was Built

Implemented intelligent knowledge deduplication and memory evolution system to prevent duplicate entries (KNOW-16) and evolve existing memories when similar content arrives (KNOW-17).

### Core Modules

**knowledge-dedup.js** - Three-stage duplicate detection:
- **Stage 1:** Exact content hash (SHA-256) - detects identical content
- **Stage 2:** Canonical hash - detects case/punctuation/whitespace variations
- **Stage 3:** Embedding similarity - detects semantic duplicates via vector search

**knowledge-evolution.js** - Similarity-based routing logic:
- **> 0.88 similarity:** Skip (exact duplicate)
- **0.65-0.88 similarity:** Evolve existing memory (append with timestamp)
- **< 0.65 similarity:** Create new entry

### Key Features

1. **Hash-based stages** (fast, deterministic):
   - Content hash catches exact matches
   - Canonical hash catches normalized variations ("Use SQLite" == "use sqlite!")

2. **Vector-based stage** (semantic, fuzzy):
   - sqlite-vec cosine distance converted to similarity score
   - Configurable threshold (default 0.88)
   - Graceful degradation if vectors unavailable

3. **Memory merging**:
   - Preserves original content
   - Appends updates with timestamp: `[2026-02-16] new content`
   - Tracks evolution count and history (last 10)
   - Stores similarity scores for analysis

4. **Batch processing**:
   - `processExtractionBatch` handles multiple entries
   - Auto-generates embeddings if not provided
   - Returns stats: `{ created, evolved, skipped, errors }`

## Implementation Details

### Deduplication Strategy

```javascript
async function checkDuplicate(conn, content, embedding) {
  // Stage 1: Exact hash
  const exact = checkExactDuplicate(db, content);
  if (exact.isDuplicate) return exact;

  // Stage 2: Canonical hash
  const canonical = checkCanonicalDuplicate(db, content);
  if (canonical.isDuplicate) return canonical;

  // Stage 3: Embedding similarity
  if (embedding && vectorEnabled) {
    const semantic = await checkEmbeddingDuplicate(conn, embedding);
    if (semantic.isDuplicate) return semantic;
  }

  return { isDuplicate: false, hashes: [...] };
}
```

### Evolution Logic

```javascript
async function insertOrEvolve(conn, entry) {
  const dupCheck = await checkDuplicate(conn, entry.content, entry.embedding);

  if (dupCheck.similarity > 0.88) {
    return { action: 'skipped', reason: 'duplicate' };
  }

  if (dupCheck.similarity >= 0.65 && dupCheck.similarity <= 0.88) {
    const merged = mergeMemories(existing, newContent);
    await updateKnowledge(db, existingId, { content: merged });
    return { action: 'evolved', evolutionCount };
  }

  const result = await insertKnowledge(db, entry);
  return { action: 'created', id: result.id };
}
```

### Canonical Normalization

Removes variations that shouldn't affect matching:
- Case: "Use" → "use"
- Whitespace: "Use  SQLite" → "use sqlite"
- Punctuation: "Use SQLite!" → "use sqlite"

Hash of normalized content catches near-duplicates that exact hash would miss.

## Deviations from Plan

None - plan executed exactly as written.

## Testing

### Module Load Tests

```bash
# Dedup module
✓ DEDUP_THRESHOLDS loaded
✓ computeContentHash generates 64-char hex
✓ computeCanonicalHash normalizes correctly
✓ Module exports all functions

# Evolution module
✓ EVOLUTION_THRESHOLDS loaded
✓ mergeMemories preserves original + appends update
✓ Evolution count increments
✓ Evolution history tracked
✓ Module exports all functions
```

### Verification Results

All verification tests passed:
- Hash functions produce consistent output
- Canonical normalization works correctly ("Use SQLite" == "use sqlite!")
- Memory merge preserves original content
- Evolution metadata tracks count and history
- Module interfaces match specification

## Integration Points

### Upstream Dependencies

- **embeddings.js** - `generateEmbedding` for semantic comparison
- **knowledge-crud.js** - `insertKnowledge`, `updateKnowledge` for persistence
- **knowledge-search.js** - Vector search infrastructure (sqlite-vec)

### Downstream Consumers

- **Hook modules** (04-04+) - Will use `insertOrEvolve` for extraction results
- **CLI commands** - Batch processing for bulk imports
- **Auto-learning** - Deduplication before knowledge insertion

### API Surface

**knowledge-dedup.js:**
```javascript
checkDuplicate(conn, content, embedding?)
  -> { isDuplicate, stage?, existingId?, similarity?, hashes }

findSimilarByEmbedding(conn, embedding, options?)
  -> Array<{ id, content, similarity, distance }>

computeContentHash(content) -> string
computeCanonicalHash(content) -> string
```

**knowledge-evolution.js:**
```javascript
insertOrEvolve(conn, entry, options?)
  -> { action: 'created'|'evolved'|'skipped', id?, similarity?, evolutionCount? }

mergeMemories(existing, newContent, options?)
  -> { merged, metadata, evolutionCount }

processExtractionBatch(conn, extractions, options?)
  -> { created, evolved, skipped, errors }
```

## Performance Characteristics

### Complexity

- **Stage 1 (exact hash):** O(1) hash + O(log n) index lookup
- **Stage 2 (canonical):** O(m) normalization + O(log n) JSON extract
- **Stage 3 (embedding):** O(log n) vector search (ANN with sqlite-vec)

Fast-fail design: exact hash catches most duplicates before expensive operations.

### Memory

- Canonical hash computed on-demand (not stored redundantly)
- Evolution history capped at 10 entries per memory
- Embedding unchanged on evolution (represents original concept)

### Batch Performance

`processExtractionBatch` processes sequentially to avoid embedding API rate limits. For 100 entries with embedding generation:
- ~100 API calls (if not cached)
- ~100 dedup checks (fast hash + DB lookups)
- ~N updates/inserts (N = unique entries)

## Known Limitations

1. **Embedding updates disabled** - sqlite-vec 0.1.6 doesn't support updating vec0 entries. Evolved memories keep original embedding (acceptable since embedding represents core concept).

2. **No conflict resolution** - If canonical hash matches but content differs slightly, first entry wins. Future: add user prompt for ambiguous cases.

3. **Evolution merge is append-only** - No semantic merging or summary generation. Content grows linearly with evolutions (mitigated by 10-entry history cap).

4. **No cross-type dedup** - Lessons and decisions don't deduplicate against each other (by design - they have different semantics).

## Future Enhancements

1. **Smart merging** - Use LLM to summarize evolution history when it gets too long
2. **Cross-reference detection** - Link related memories with different types
3. **Staleness-aware evolution** - Higher evolution threshold for stale memories
4. **Embedding refresh** - Periodic re-embedding of evolved memories (when vec0 supports updates)
5. **User review queue** - Flag ambiguous near-duplicates for manual review

## Success Criteria

- [x] checkDuplicate implements three stages (hash, canonical, embedding)
- [x] Similarity > 0.88 detected as duplicate
- [x] Similarity 0.65-0.88 triggers evolution (update existing)
- [x] Similarity < 0.65 allows new creation
- [x] mergeMemories preserves original + appends update
- [x] Evolution metadata tracks count and history
- [x] processExtractionBatch handles multiple entries

## Commits

| Task | Name                                | Commit  | Files                               |
| ---- | ----------------------------------- | ------- | ----------------------------------- |
| 1    | Three-stage deduplication module    | 65eea43 | get-shit-done/bin/knowledge-dedup.js |
| 2    | Memory evolution module             | ab8cda2 | get-shit-done/bin/knowledge-evolution.js |

## Self-Check: PASSED

All files created:
- FOUND: get-shit-done/bin/knowledge-dedup.js
- FOUND: get-shit-done/bin/knowledge-evolution.js

All commits exist:
- FOUND: 65eea43 (feat(04-03): implement three-stage deduplication)
- FOUND: ab8cda2 (feat(04-03): implement memory evolution logic)
