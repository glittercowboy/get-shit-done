# Phase 3: Column-Level Lineage - Research

**Researched:** 2026-01-18
**Domain:** Data lineage tracking, graph traversal, SQL parsing, visualization
**Confidence:** HIGH

## Summary

Column-level lineage tracks how data flows from source columns through transformations to target columns. This phase requires four core capabilities: (1) extracting lineage from AWS data sources, (2) storing lineage as a traversable graph, (3) visualizing the lineage DAG with column-level detail, and (4) enabling impact analysis through graph traversal.

The recommended approach uses:
- **OpenLineage** as the standard event schema for lineage metadata
- **SQLGlot** for parsing SQL and extracting column-level dependencies
- **PostgreSQL with recursive CTEs** for graph storage (leverages existing Supabase)
- **React Flow with elkjs** for interactive lineage visualization

**Primary recommendation:** Implement OpenLineage-compatible lineage events stored in PostgreSQL, with SQLGlot for SQL parsing and React Flow for visualization. Avoid adding a separate graph database given the expected scale (internal team, 10-50 users).

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| openlineage-python | 1.25+ | Lineage event schema and client | Industry standard for lineage metadata, adopted by Airflow, dbt, Spark |
| sqlglot | 26.x | SQL parsing and column lineage extraction | 97-99% accuracy per DataHub benchmarks, supports 20+ dialects |
| @xyflow/react | 12.x | Graph visualization framework | De facto standard for React node-based UIs, highly customizable |
| elkjs | 0.11+ | Automatic graph layout | Best for data flow diagrams, handles complex port-based layouts |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-lineage-dag | 2.x | Column-level lineage visualization | If elkjs complexity is too high; provides out-of-box column lineage UI |
| dagre | 1.x | Simple DAG layout | For simpler table-level lineage only |
| @dagrejs/dagre | 1.x | Alternative to dagre | Modern fork, same API |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| PostgreSQL recursive CTEs | Neo4j | Neo4j faster for deep traversal but adds infrastructure complexity |
| PostgreSQL recursive CTEs | Apache AGE extension | Native Cypher queries but less mature, PostgreSQL 17+ required |
| React Flow | D3.js | More flexible but requires more custom code for interactivity |
| SQLGlot | sqllineage | SQLGlot has better multi-dialect support and higher accuracy |

**Installation:**

```bash
# Python dependencies
pip install openlineage-python sqlglot

# Frontend dependencies
npm install @xyflow/react elkjs
```

## Architecture Patterns

### Recommended Project Structure

```
agents/
  lineage/
    __init__.py
    agent.py              # Lineage agent (Strands SDK)
    schemas.py            # Pydantic models for lineage data
    tools/
      __init__.py
      sql_parser.py       # SQLGlot-based column lineage extraction
      aws_extractor.py    # Extract lineage from Redshift/Athena/Glue
      openlineage.py      # OpenLineage event producer
      impact_analyzer.py  # Forward/backward traversal

supabase/
  migrations/
    004_lineage_schema.sql  # Lineage tables (nodes, edges, runs)

frontend/
  src/
    components/
      lineage/
        LineageGraph.tsx      # React Flow wrapper
        TableNode.tsx         # Custom node with columns
        ColumnEdge.tsx        # Custom edge for column connections
        ImpactPanel.tsx       # Impact analysis sidebar
    hooks/
      useLineageLayout.ts     # elkjs layout hook
      useLineageData.ts       # TanStack Query for lineage API
```

### Pattern 1: OpenLineage Event Schema

**What:** Use OpenLineage ColumnLineageDatasetFacet for standardized lineage events
**When to use:** Always, for interoperability with external systems

```json
// Source: https://openlineage.io/spec/facets/1-2-0/ColumnLineageDatasetFacet.json
{
  "columnLineage": {
    "_producer": "https://data-foundations/lineage-agent",
    "_schemaURL": "https://openlineage.io/spec/facets/1-2-0/ColumnLineageDatasetFacet.json",
    "fields": {
      "customer_name": {
        "inputFields": [
          {
            "namespace": "redshift://analytics",
            "name": "raw.customers",
            "field": "first_name",
            "transformations": [
              {
                "type": "DIRECT",
                "subtype": "TRANSFORMATION",
                "description": "CONCAT with last_name"
              }
            ]
          },
          {
            "namespace": "redshift://analytics",
            "name": "raw.customers",
            "field": "last_name",
            "transformations": [
              {
                "type": "DIRECT",
                "subtype": "TRANSFORMATION",
                "description": "CONCAT with first_name"
              }
            ]
          }
        ]
      }
    }
  }
}
```

**Transformation types:**
- DIRECT subtypes: `IDENTITY`, `TRANSFORMATION`, `AGGREGATION`
- INDIRECT subtypes: `JOIN`, `GROUP_BY`, `FILTER`, `SORT`, `WINDOW`, `CONDITIONAL`

### Pattern 2: PostgreSQL Graph Storage with Recursive CTEs

**What:** Store lineage as nodes (columns) and edges (dependencies) in PostgreSQL
**When to use:** When graph database is overkill (our scale is 10-50 users)

```sql
-- Source: Best practice for lineage in relational DB
-- Core lineage tables
CREATE TABLE lineage_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_type VARCHAR(20) NOT NULL,  -- 'dataset', 'column', 'job'
    namespace VARCHAR(500) NOT NULL,
    name VARCHAR(255) NOT NULL,
    parent_id UUID REFERENCES lineage_nodes(id),  -- column -> dataset
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(node_type, namespace, name)
);

CREATE TABLE lineage_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES lineage_nodes(id),
    target_id UUID NOT NULL REFERENCES lineage_nodes(id),
    edge_type VARCHAR(50) NOT NULL,  -- 'derives_from', 'transforms'
    transformation JSONB,  -- OpenLineage transformation object
    job_id UUID REFERENCES lineage_nodes(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recursive CTE for downstream impact analysis
WITH RECURSIVE downstream AS (
    -- Start from the changed column
    SELECT id, name, 0 as depth
    FROM lineage_nodes
    WHERE id = $1

    UNION ALL

    -- Find all nodes that depend on current nodes
    SELECT n.id, n.name, d.depth + 1
    FROM lineage_nodes n
    JOIN lineage_edges e ON e.target_id = n.id
    JOIN downstream d ON e.source_id = d.id
    WHERE d.depth < 10  -- Limit traversal depth
)
SELECT DISTINCT * FROM downstream ORDER BY depth;
```

### Pattern 3: SQLGlot Column Lineage Extraction

**What:** Parse SQL to extract column-level dependencies
**When to use:** Processing SQL from Redshift/Athena query logs

```python
# Source: https://sqlglot.com/sqlglot/lineage.html
from sqlglot import lineage, exp
from sqlglot.schema import MappingSchema

# Schema is REQUIRED for accurate column lineage
schema = MappingSchema({
    "raw.customers": {
        "id": "INT",
        "first_name": "VARCHAR",
        "last_name": "VARCHAR",
        "email": "VARCHAR"
    },
    "raw.orders": {
        "id": "INT",
        "customer_id": "INT",
        "total": "DECIMAL"
    }
})

sql = """
SELECT
    c.id,
    CONCAT(c.first_name, ' ', c.last_name) as customer_name,
    SUM(o.total) as lifetime_value
FROM raw.customers c
JOIN raw.orders o ON c.id = o.customer_id
GROUP BY c.id, c.first_name, c.last_name
"""

# Get lineage for specific output column
node = lineage(
    column="customer_name",
    sql=sql,
    schema=schema,
    dialect="redshift"
)

# Traverse lineage graph
for descendant in node.walk():
    print(f"{descendant.name} <- {descendant.source_name}")
```

### Pattern 4: React Flow with elkjs Layout

**What:** Interactive DAG visualization with automatic layout
**When to use:** All lineage visualization

```typescript
// Source: https://reactflow.dev/examples/layout/elkjs
import { useCallback, useLayoutEffect } from 'react';
import { ReactFlow, useNodesState, useEdgesState, useReactFlow } from '@xyflow/react';
import ELK from 'elkjs/lib/elk.bundled.js';

const elk = new ELK();

const elkOptions = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  'elk.layered.spacing.nodeNodeBetweenLayers': '100',
  'elk.spacing.nodeNode': '80',
  'elk.layered.nodePlacement.strategy': 'SIMPLE'
};

async function getLayoutedElements(nodes, edges) {
  const graph = {
    id: 'root',
    layoutOptions: elkOptions,
    children: nodes.map((node) => ({
      id: node.id,
      width: node.measured?.width ?? 200,
      height: node.measured?.height ?? 100,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  const layoutedGraph = await elk.layout(graph);

  return {
    nodes: nodes.map((node) => {
      const layoutedNode = layoutedGraph.children?.find((n) => n.id === node.id);
      return {
        ...node,
        position: { x: layoutedNode?.x ?? 0, y: layoutedNode?.y ?? 0 },
      };
    }),
    edges,
  };
}
```

### Anti-Patterns to Avoid

- **Parsing SQL without schema context:** SQLGlot cannot determine column origins with `SELECT *` without schema. Always provide schema metadata.
- **Storing lineage only in application memory:** Lineage must persist; always write to database.
- **Deep recursive queries without limits:** Add depth limits and timeouts to recursive CTEs.
- **Rebuilding entire lineage graph on each query:** Cache and incrementally update lineage.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SQL parsing | Custom regex/string parsing | SQLGlot | SQL is complex; regex fails on CTEs, subqueries, joins |
| Graph layout | Manual position calculation | elkjs | Automatic edge routing, port handling, layered algorithms |
| Lineage schema | Custom JSON format | OpenLineage spec | Industry standard, interoperable with Airflow/dbt/Spark |
| Graph traversal | Manual recursive functions | PostgreSQL recursive CTEs | Database handles cycle detection, depth limits |
| Query history extraction | Custom log parsing | AWS system tables (STL_*, SVL_*) | Already structured, includes metadata |

**Key insight:** Column-level lineage looks simple until you handle CTEs, subqueries, window functions, UNION, and complex JOINs. SQLGlot handles all these cases.

## Common Pitfalls

### Pitfall 1: SELECT * Without Schema

**What goes wrong:** Cannot determine which columns flow through without knowing schema
**Why it happens:** Query logs don't include schema; developers assume parsing alone is sufficient
**How to avoid:** Always fetch schema from Glue Catalog before parsing SQL
**Warning signs:** Lineage shows entire table as dependency rather than specific columns

### Pitfall 2: Stale Lineage After Schema Changes

**What goes wrong:** Lineage becomes invalid when source tables change
**Why it happens:** Lineage extracted once and not updated
**How to avoid:** Store lineage extraction timestamp; re-extract when schema changes detected
**Warning signs:** Impact analysis shows columns that no longer exist

### Pitfall 3: Circular Dependencies in Recursive CTEs

**What goes wrong:** Query hangs or returns incorrect results
**Why it happens:** Data refresh jobs can create apparent cycles
**How to avoid:** Use `CYCLE` detection in PostgreSQL 14+ or add explicit depth limits
**Warning signs:** Queries timeout; same node appears multiple times in results

### Pitfall 4: Performance Degradation with Large Graphs

**What goes wrong:** Lineage queries slow down as graph grows
**Why it happens:** Recursive CTEs without proper indexing
**How to avoid:** Index `(source_id, target_id)` on edges; consider materialized views for common traversals
**Warning signs:** Impact analysis taking >5 seconds

### Pitfall 5: Missing Transformation Context

**What goes wrong:** Lineage shows "column A depends on column B" but not how
**Why it happens:** Only tracking dependency edges, not transformation type
**How to avoid:** Store OpenLineage transformation object with each edge
**Warning signs:** Users cannot understand why a column is affected by upstream changes

## Code Examples

### AWS Lineage Extraction

```python
# Extract query history from Redshift for lineage
# Source: https://docs.aws.amazon.com/redshift/latest/dg/r_SVL_STATEMENTTEXT.html

def extract_redshift_queries(connector, since_hours=24):
    """Extract recent DDL and DML statements from Redshift."""
    sql = f"""
    SELECT
        userid,
        xid,
        starttime,
        LISTAGG(text) WITHIN GROUP (ORDER BY sequence) as query_text
    FROM svl_statementtext
    WHERE starttime > DATEADD(hour, -{since_hours}, GETDATE())
    AND type IN ('DDL', 'QUERY')
    GROUP BY userid, xid, starttime
    ORDER BY starttime DESC
    """
    return connector._execute_query(sql)


def extract_athena_queries(region, since_hours=24):
    """Extract query history from Athena."""
    import boto3
    from datetime import datetime, timedelta

    client = boto3.client('athena', region_name=region)

    # List recent query executions
    response = client.list_query_executions(MaxResults=50)

    queries = []
    for execution_id in response['QueryExecutionIds']:
        execution = client.get_query_execution(QueryExecutionId=execution_id)
        if execution['QueryExecution']['Status']['State'] == 'SUCCEEDED':
            queries.append({
                'id': execution_id,
                'query': execution['QueryExecution']['Query'],
                'database': execution['QueryExecution']['QueryExecutionContext'].get('Database'),
                'timestamp': execution['QueryExecution']['Status']['CompletionDateTime']
            })

    return queries
```

### OpenLineage Event Emission

```python
# Emit OpenLineage events for lineage tracking
# Source: https://openlineage.io/docs/client/python/

from openlineage.client import OpenLineageClient
from openlineage.client.run import RunEvent, RunState, Run, Job, Dataset
from openlineage.client.facet import (
    ColumnLineageDatasetFacet,
    ColumnLineageDatasetFacetFieldsAdditional,
    InputField,
    Transformation
)
import uuid
from datetime import datetime

def emit_lineage_event(
    job_name: str,
    inputs: list[dict],
    outputs: list[dict],
    column_lineage: dict
):
    """Emit an OpenLineage run event with column lineage."""

    client = OpenLineageClient()  # Uses OPENLINEAGE_URL env var

    # Build column lineage facet
    fields = {}
    for output_col, input_cols in column_lineage.items():
        fields[output_col] = ColumnLineageDatasetFacetFieldsAdditional(
            inputFields=[
                InputField(
                    namespace=col['namespace'],
                    name=col['dataset'],
                    field=col['column'],
                    transformations=[
                        Transformation(
                            type=col.get('type', 'DIRECT'),
                            subtype=col.get('subtype', 'TRANSFORMATION'),
                            description=col.get('description', '')
                        )
                    ]
                )
                for col in input_cols
            ]
        )

    column_lineage_facet = ColumnLineageDatasetFacet(fields=fields)

    # Create output datasets with lineage
    output_datasets = [
        Dataset(
            namespace=out['namespace'],
            name=out['name'],
            facets={'columnLineage': column_lineage_facet}
        )
        for out in outputs
    ]

    # Emit COMPLETE event
    event = RunEvent(
        eventType=RunState.COMPLETE,
        eventTime=datetime.utcnow().isoformat() + 'Z',
        run=Run(runId=str(uuid.uuid4())),
        job=Job(namespace='data-foundations', name=job_name),
        inputs=[Dataset(namespace=i['namespace'], name=i['name']) for i in inputs],
        outputs=output_datasets
    )

    client.emit(event)
```

### Impact Analysis Query

```python
# Downstream impact analysis using PostgreSQL
# Source: Best practice for graph traversal in relational DB

async def get_downstream_impact(
    supabase_client,
    column_id: str,
    max_depth: int = 10
) -> list[dict]:
    """Find all downstream dependencies of a column."""

    query = """
    WITH RECURSIVE downstream AS (
        SELECT
            n.id,
            n.node_type,
            n.namespace,
            n.name,
            n.parent_id,
            0 as depth,
            ARRAY[n.id] as path
        FROM lineage_nodes n
        WHERE n.id = $1

        UNION ALL

        SELECT
            n.id,
            n.node_type,
            n.namespace,
            n.name,
            n.parent_id,
            d.depth + 1,
            d.path || n.id
        FROM lineage_nodes n
        JOIN lineage_edges e ON e.target_id = n.id
        JOIN downstream d ON e.source_id = d.id
        WHERE d.depth < $2
        AND NOT n.id = ANY(d.path)  -- Cycle detection
    )
    SELECT DISTINCT ON (id)
        id,
        node_type,
        namespace,
        name,
        parent_id,
        depth
    FROM downstream
    ORDER BY id, depth
    """

    result = await supabase_client.rpc(
        'execute_sql',
        {'sql': query, 'params': [column_id, max_depth]}
    ).execute()

    return result.data
```

### React Flow Table Node Component

```typescript
// Custom node for displaying table with expandable columns
// Source: React Flow custom nodes documentation

import { memo, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

interface ColumnData {
  name: string;
  type: string;
  isHighlighted?: boolean;
}

interface TableNodeData {
  label: string;
  namespace: string;
  columns: ColumnData[];
}

export const TableNode = memo(({ data, selected }: NodeProps<TableNodeData>) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className={`
      bg-white rounded-lg shadow-md border-2 min-w-[200px]
      ${selected ? 'border-blue-500' : 'border-gray-200'}
    `}>
      {/* Table header */}
      <div
        className="px-3 py-2 bg-gray-50 rounded-t-lg border-b cursor-pointer flex justify-between items-center"
        onClick={() => setExpanded(!expanded)}
      >
        <div>
          <div className="font-semibold text-sm">{data.label}</div>
          <div className="text-xs text-gray-500">{data.namespace}</div>
        </div>
        <span className="text-gray-400">{expanded ? '-' : '+'}</span>
      </div>

      {/* Column list */}
      {expanded && (
        <div className="p-1">
          {data.columns.map((col, i) => (
            <div
              key={col.name}
              className={`
                relative px-2 py-1 text-xs flex justify-between
                ${col.isHighlighted ? 'bg-yellow-100' : ''}
              `}
            >
              {/* Source handle for this column */}
              <Handle
                type="source"
                position={Position.Right}
                id={`${col.name}-source`}
                className="w-2 h-2"
                style={{ top: `${32 + 28 + i * 24 + 12}px` }}
              />
              {/* Target handle for this column */}
              <Handle
                type="target"
                position={Position.Left}
                id={`${col.name}-target`}
                className="w-2 h-2"
                style={{ top: `${32 + 28 + i * 24 + 12}px` }}
              />
              <span>{col.name}</span>
              <span className="text-gray-400">{col.type}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

TableNode.displayName = 'TableNode';
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Table-level lineage only | Column-level lineage standard | OpenLineage 1.0 (2023) | Fine-grained impact analysis possible |
| Custom lineage schemas | OpenLineage standard | 2022-2023 | Interoperability with Airflow, dbt, Spark |
| D3.js manual graphs | React Flow with elkjs | 2023-2024 | Reduced development time, better UX |
| Neo4j for all lineage | PostgreSQL recursive CTEs | 2024-2025 | Reduced complexity for smaller scale |
| Parse SQL with regex | SQLGlot AST parsing | 2023 | 97%+ accuracy vs ~60% for regex |

**Deprecated/outdated:**
- **dagre alone for complex layouts:** Use elkjs for port-based layouts (column connections)
- **OpenLineageClient.from_environment():** Deprecated, use `OpenLineageClient()` directly
- **Spark DynamicFrames for lineage:** OpenLineage cannot extract lineage; use DataFrames

## Open Questions

Things that could not be fully resolved:

1. **Apache AGE vs Recursive CTEs for large-scale lineage**
   - What we know: Apache AGE provides Cypher queries in PostgreSQL, potentially faster for deep traversals
   - What's unclear: Maturity on PostgreSQL 15 (our likely version via Supabase)
   - Recommendation: Start with recursive CTEs; evaluate AGE if traversal becomes a bottleneck

2. **Real-time lineage updates vs batch extraction**
   - What we know: OpenLineage supports real-time event emission; Redshift/Athena query logs are near-real-time
   - What's unclear: Best strategy for handling high-volume query logs without overwhelming storage
   - Recommendation: Start with hourly batch extraction; add real-time for critical pipelines later

3. **AWS DataZone integration**
   - What we know: Amazon DataZone has OpenLineage-compatible lineage (preview)
   - What's unclear: Whether it provides API access or is UI-only
   - Recommendation: Build custom extraction first; evaluate DataZone API when GA

## Sources

### Primary (HIGH confidence)
- [OpenLineage Column Lineage Facet Spec](https://openlineage.io/docs/spec/facets/dataset-facets/column_lineage_facet/) - Official specification
- [SQLGlot Lineage API](https://sqlglot.com/sqlglot/lineage.html) - Official documentation
- [React Flow Elkjs Example](https://reactflow.dev/examples/layout/elkjs) - Official example
- [Redshift STL_QUERYTEXT](https://docs.aws.amazon.com/redshift/latest/dg/r_STL_QUERYTEXT.html) - AWS documentation
- [OpenLineage Python Client](https://openlineage.io/docs/client/python/) - Official documentation

### Secondary (MEDIUM confidence)
- [DataHub SQL Parser Benchmarks](https://medium.com/datahub-project/extracting-column-level-lineage-from-sql-779b8ce17567) - 97-99% accuracy claim for SQLGlot
- [react-lineage-dag](https://github.com/aliyun/react-lineage-dag) - Alibaba Cloud library for column lineage visualization
- [AWS DataZone Lineage](https://aws.amazon.com/blogs/big-data/amazon-datazone-introduces-openlineage-compatible-data-lineage-visualization-in-preview/) - Preview feature documentation
- [Memgraph Data Lineage Blog](https://memgraph.com/blog/better-data-management-get-solutions-by-analyzing-the-data-lineage-graph) - Graph algorithms for lineage

### Tertiary (LOW confidence)
- Various Medium articles on PostgreSQL vs Neo4j for graphs - Community opinions, not benchmarked
- Apache AGE maturity claims - Project is relatively new, production usage unclear

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - OpenLineage and SQLGlot are well-documented, widely adopted
- Architecture: HIGH - PostgreSQL recursive CTEs well-understood; React Flow extensively documented
- Pitfalls: MEDIUM - Based on community experience and documentation warnings
- AWS extraction: MEDIUM - System tables documented but column-level extraction requires SQL parsing

**Research date:** 2026-01-18
**Valid until:** 2026-02-18 (30 days - stable domain)
