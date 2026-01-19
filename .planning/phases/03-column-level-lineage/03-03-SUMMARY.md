---
phase: 03-column-level-lineage
plan: 03
subsystem: ui
tags: [react-flow, elkjs, lineage, visualization, graph, typescript]

# Dependency graph
requires:
  - phase: 03-column-level-lineage
    provides: Lineage graph schema with nodes/edges and recursive traversal functions
  - phase: 01-foundation-data-profiling
    provides: TanStack Query patterns, UI components, Supabase client
provides:
  - React Flow lineage visualization with elkjs automatic layout
  - TableNode component with expandable columns
  - ColumnEdge component with transformation type color coding
  - ImpactPanel for downstream dependency analysis
  - RootCausePanel for upstream source tracing
  - Lineage explorer page with search and filtering
  - Node detail page with metadata display
  - 8 TanStack Query hooks for lineage data
affects: [phase-04, lineage-documentation, quality-tracing]

# Tech tracking
tech-stack:
  added:
    - "@xyflow/react@^12.0.0 (React Flow graph visualization)"
    - "elkjs@^0.11.0 (automatic graph layout)"
  patterns:
    - React Flow with custom node/edge types
    - elkjs layered layout algorithm (RIGHT direction)
    - Transformation type color coding (DIRECT/INDIRECT)
    - Context menu for column analysis actions

key-files:
  created:
    - frontend/src/lib/lineage-types.ts
    - frontend/src/hooks/use-lineage.ts
    - frontend/src/components/features/lineage/LineageGraph.tsx
    - frontend/src/components/features/lineage/TableNode.tsx
    - frontend/src/components/features/lineage/ColumnEdge.tsx
    - frontend/src/components/features/lineage/ImpactPanel.tsx
    - frontend/src/components/features/lineage/RootCausePanel.tsx
    - frontend/src/app/(dashboard)/lineage/page.tsx
    - frontend/src/app/(dashboard)/lineage/[nodeId]/page.tsx
  modified:
    - frontend/package.json

key-decisions:
  - "Index signatures added to TableNodeData and ColumnEdgeData for React Flow type compatibility"
  - "Type assertions (as const) for node/edge type literals in useLineageToReactFlow hook"
  - "elkjs layered layout with RIGHT direction, 120px layer spacing, 60px node spacing"
  - "Context menu for column analysis (impact, root cause, details) vs separate buttons"
  - "URL state for selected nodes (?selected=nodeId) enabling deep linking"

patterns-established:
  - "Custom React Flow node: memo component with Handle per column"
  - "elkjs layout: getLayoutedElements async function pattern"
  - "Transformation color coding: DIRECT=blue/gray, INDIRECT=green/orange/purple"
  - "Analysis panels: slide-in sidebars with depth grouping"
  - "Debounced search: 300ms delay for lineage node search"

# Metrics
duration: 18min
completed: 2026-01-19
---

# Phase 03 Plan 03: Lineage Visualization Frontend Summary

**React Flow lineage graph with elkjs layout, expandable table nodes, transformation edges, and impact/root cause analysis panels**

## Performance

- **Duration:** 18 min
- **Started:** 2026-01-19T01:25:25Z
- **Completed:** 2026-01-19T01:43:28Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments

- Interactive lineage graph with React Flow and automatic elkjs layout
- TableNode component showing datasets with expandable column lists and connection handles
- ColumnEdge component with transformation type color coding (IDENTITY, JOIN, AGGREGATION, etc.)
- ImpactPanel showing downstream dependencies grouped by depth
- RootCausePanel tracing upstream sources with root cause highlighting
- Full-page lineage explorer with search, namespace filtering, and context menus
- Node detail page with metadata, connections, and quick action links

## Task Commits

Each task was committed atomically:

1. **Task 1: Lineage Types and Hooks** - `2d7d739` (feat)
2. **Task 2: Lineage Graph Components** - `5d96797` (feat)
3. **Task 3: Lineage Pages** - `eb581fa` (feat)

## Files Created/Modified

- `frontend/src/lib/lineage-types.ts` - Node, edge, and analysis type definitions with React Flow compatibility
- `frontend/src/hooks/use-lineage.ts` - 8 TanStack Query hooks for graph data, traversal, search, and mutations
- `frontend/src/components/features/lineage/LineageGraph.tsx` - React Flow wrapper with elkjs layout
- `frontend/src/components/features/lineage/TableNode.tsx` - Custom node with expandable columns and handles
- `frontend/src/components/features/lineage/ColumnEdge.tsx` - Custom edge with transformation labels
- `frontend/src/components/features/lineage/ImpactPanel.tsx` - Downstream impact analysis sidebar
- `frontend/src/components/features/lineage/RootCausePanel.tsx` - Upstream root cause tracing sidebar
- `frontend/src/app/(dashboard)/lineage/page.tsx` - Lineage explorer page
- `frontend/src/app/(dashboard)/lineage/[nodeId]/page.tsx` - Node detail page
- `frontend/package.json` - Added @xyflow/react and elkjs dependencies

## Decisions Made

1. **Index signatures for React Flow compatibility** - Added `[key: string]: unknown` to TableNodeData and ColumnEdgeData interfaces to satisfy React Flow's generic type constraints.

2. **Type assertions for literal types** - Used `as const` for node type ('table') and edge type ('column') to ensure proper type inference in useLineageToReactFlow hook.

3. **elkjs layout configuration** - RIGHT direction with 120px layer spacing and 60px node spacing provides good readability for data pipeline flows.

4. **Context menu pattern** - Right-click on columns shows context menu with Impact Analysis, Root Cause Analysis, and View Details options - more discoverable than separate buttons.

5. **URL state for selections** - Using query params (?selected=nodeId) enables deep linking to specific nodes in the lineage graph.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] React Flow type compatibility**
- **Found during:** Task 2 (Lineage Graph Components)
- **Issue:** React Flow's strict generic typing required index signatures on custom node/edge data types
- **Fix:** Added `[key: string]: unknown` to TableNodeData and ColumnEdgeData interfaces
- **Files modified:** frontend/src/lib/lineage-types.ts
- **Verification:** npm run build succeeds
- **Committed in:** 5d96797 (Task 2 commit)

**2. [Rule 3 - Blocking] Literal type inference in hooks**
- **Found during:** Task 3 (Lineage Pages)
- **Issue:** TypeScript inferred node.type as 'string' instead of literal 'table', causing type mismatch
- **Fix:** Added `as const` assertions to type properties in useLineageToReactFlow
- **Files modified:** frontend/src/hooks/use-lineage.ts
- **Verification:** npm run build succeeds
- **Committed in:** eb581fa (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes necessary for TypeScript compilation. No scope creep.

## Issues Encountered

- React Flow v12 has strict type requirements for custom nodes/edges - resolved with index signatures and type assertions
- elkjs bundled import path requires specific `elkjs/lib/elk.bundled.js` path for browser usage

## User Setup Required

None - no external service configuration required. All dependencies are npm packages.

## Next Phase Readiness

**Ready for Phase 04:**
- Lineage visualization complete with impact and root cause analysis
- Graph traversal hooks available for quality-lineage integration
- Search and filtering enable discovery of affected columns

**Integration points available:**
- Quality alerts can link to root cause analysis via column ID
- Rule failures can show downstream impact
- Profiles can link to lineage for data flow context

---
*Phase: 03-column-level-lineage*
*Completed: 2026-01-19*
