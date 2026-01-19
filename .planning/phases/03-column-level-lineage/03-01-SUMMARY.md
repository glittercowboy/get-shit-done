---
phase: 03-column-level-lineage
plan: 01
subsystem: agents
tags: [sqlglot, openlineage, postgresql, lineage, graph, recursive-cte]

# Dependency graph
requires:
  - phase: 01-foundation-data-profiling
    provides: Strands agent pattern with BedrockModel and lazy-loading proxy
provides:
  - Lineage graph schema with nodes/edges/runs tables
  - Recursive CTE functions for graph traversal
  - Lineage agent with 7 tools for SQL parsing and impact analysis
  - OpenLineage-compatible event creation
affects: [03-02-PLAN, 03-03-PLAN, future lineage visualization]

# Tech tracking
tech-stack:
  added:
    - sqlglot@26.0.0+ (SQL parsing for column lineage)
    - openlineage-python@1.25.0+ (lineage event schema)
  patterns:
    - Graph storage with nodes/edges in PostgreSQL
    - Recursive CTEs with cycle detection for traversal
    - OpenLineage ColumnLineageDatasetFacet format
    - LineageAgentProxy lazy loading (matches profiler pattern)

key-files:
  created:
    - supabase/migrations/004_lineage_schema.sql
    - agents/lineage/agent.py
    - agents/lineage/schemas.py
    - agents/lineage/prompts.py
    - agents/lineage/tools/sql_parser.py
    - agents/lineage/tools/openlineage.py
    - agents/lineage/tools/impact_analyzer.py
    - agents/lineage/tools/__init__.py
    - agents/lineage/__init__.py
    - agents/lineage/requirements.txt
  modified: []

key-decisions:
  - "Graph storage in PostgreSQL with recursive CTEs (vs Neo4j) - simpler for expected scale"
  - "OpenLineage transformation types: DIRECT (IDENTITY, TRANSFORMATION, AGGREGATION), INDIRECT (JOIN, GROUP_BY, FILTER, etc.)"
  - "sql_hash field for edge deduplication when same SQL re-processed"
  - "LineageAgentProxy pattern for lazy loading (consistent with profiler/dq_recommender)"
  - "Temperature 0.3 for lineage agent (balance consistency and flexibility)"

patterns-established:
  - "NodeType enum: dataset, column, job"
  - "EdgeType enum: derives_from, transforms_to"
  - "TransformationType/Subtype following OpenLineage spec"
  - "Supabase RPC calls for graph traversal functions"
  - "Graceful degradation when SQLGlot not installed"

# Metrics
duration: 5min
completed: 2026-01-19
---

# Phase 03 Plan 01: Lineage Agent Core Summary

**Lineage graph schema with recursive traversal functions, Strands agent with SQLGlot SQL parsing and OpenLineage event creation**

## Performance

- **Duration:** 5 min
- **Started:** 2026-01-19T01:17:22Z
- **Completed:** 2026-01-19T01:22:35Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- PostgreSQL schema for lineage graph with nodes, edges, and run tracking tables
- Recursive CTE functions (get_downstream_nodes, get_upstream_nodes) with cycle detection
- Lineage agent with 7 tools: SQL parsing, OpenLineage events, impact analysis
- SQLGlot-based column lineage extraction supporting multiple SQL dialects

## Task Commits

Each task was committed atomically:

1. **Task 1: Lineage Database Schema** - `2aa44fd` (feat)
2. **Task 2: Lineage Agent with SQL Parser and Impact Analyzer** - `c49b012` (feat)

## Files Created/Modified

- `supabase/migrations/004_lineage_schema.sql` - 3 tables, 2 traversal functions, RLS policies
- `agents/lineage/agent.py` - Strands agent with LineageAgentProxy lazy loading
- `agents/lineage/schemas.py` - 15+ Pydantic models for lineage data
- `agents/lineage/prompts.py` - System prompt with OpenLineage transformation reference
- `agents/lineage/tools/sql_parser.py` - SQLGlot-based parse_sql_lineage, extract_column_dependencies
- `agents/lineage/tools/openlineage.py` - create_lineage_event, emit_openlineage_event
- `agents/lineage/tools/impact_analyzer.py` - get_downstream_impact, get_upstream_sources, find_column_by_name
- `agents/lineage/tools/__init__.py` - Tool exports
- `agents/lineage/__init__.py` - Package exports
- `agents/lineage/requirements.txt` - Dependencies (sqlglot, openlineage-python)

## Decisions Made

1. **PostgreSQL with recursive CTEs over Neo4j** - Simpler infrastructure, sufficient for expected scale (10-50 users). Recursive CTEs handle cycle detection with depth limits.

2. **OpenLineage transformation taxonomy** - Using DIRECT types (IDENTITY, TRANSFORMATION, AGGREGATION) and INDIRECT types (JOIN, GROUP_BY, FILTER, SORT, WINDOW, CONDITIONAL) for standardized lineage.

3. **sql_hash for edge deduplication** - SHA-256 hash of normalized SQL prevents duplicate edges when same query is processed multiple times.

4. **LineageAgentProxy lazy loading** - Consistent with profiler and dq_recommender patterns, allows module import without strands dependency.

5. **Temperature 0.3 for analysis** - Higher than rule generator (0.2) for more flexible lineage interpretation while maintaining consistency.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **Import path handling** - Agent module uses try/except for both relative and absolute imports to support both package and direct execution modes. This is consistent with existing profiler pattern.

## User Setup Required

None - no external service configuration required. SQLGlot and openlineage-python are runtime dependencies installed via requirements.txt.

## Next Phase Readiness

**Ready for Plan 03-02:**
- Lineage schema deployed for graph storage
- SQL parsing tools ready for query extraction
- Impact analysis functions available via Supabase RPC

**Dependencies for future plans:**
- Plan 03-02: Lineage extraction from AWS query logs
- Plan 03-03: Lineage visualization with React Flow
- Integration: OpenLineage events can be emitted to external catalogs

---
*Phase: 03-column-level-lineage*
*Completed: 2026-01-19*
