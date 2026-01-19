"""
Lineage Store tools for persisting lineage data to Supabase.

Provides functions to:
- Upsert lineage nodes (datasets, columns, jobs)
- Create lineage edges with deduplication
- Store parsed SQL lineage results
- Store OpenLineage events from external tools
"""

import json
import os
import hashlib
from typing import Optional, Any

# Supabase client (lazy-loaded)
_supabase_client = None


def _get_supabase_client():
    """Get or create Supabase client."""
    global _supabase_client

    if _supabase_client is None:
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_KEY")

        if not supabase_url or not supabase_key:
            raise EnvironmentError(
                "SUPABASE_URL and SUPABASE_KEY environment variables must be set"
            )

        try:
            from supabase import create_client
            _supabase_client = create_client(supabase_url, supabase_key)
        except ImportError:
            raise ImportError("Supabase client not installed. Run: pip install supabase")

    return _supabase_client


def _compute_node_key(node_type: str, namespace: str, name: str, parent_id: Optional[str] = None) -> str:
    """Compute unique key for node deduplication."""
    key = f"{node_type}:{namespace}:{name}:{parent_id or ''}"
    return hashlib.sha256(key.encode()).hexdigest()[:16]


def upsert_lineage_node(
    node_type: str,
    namespace: str,
    name: str,
    parent_id: Optional[str] = None,
    data_type: Optional[str] = None,
    metadata: str = "{}"
) -> str:
    """
    Insert or update a lineage node in the graph.

    Uses ON CONFLICT to upsert based on (node_type, namespace, name, parent_id).
    Returns the node ID (new or existing).

    Args:
        node_type: Node type - "dataset", "column", or "job"
        namespace: Namespace URI (e.g., "redshift://analytics", "s3://bucket")
        name: Node name (table name for dataset, column name for column)
        parent_id: Parent node ID (columns reference their parent dataset)
        data_type: Data type for columns (INT, VARCHAR, etc.)
        metadata: JSON string with additional properties

    Returns:
        JSON string with result:
        {
            "node_id": "uuid",
            "created": true/false,
            "node_type": "dataset",
            "namespace": "redshift://analytics",
            "name": "orders"
        }
    """
    try:
        supabase = _get_supabase_client()
        metadata_dict = json.loads(metadata) if metadata else {}

        # Prepare node data
        node_data = {
            "node_type": node_type,
            "namespace": namespace,
            "name": name,
            "parent_id": parent_id,
            "data_type": data_type,
            "metadata": metadata_dict
        }

        # Check if node already exists
        query = supabase.table("lineage_nodes").select("id").eq(
            "node_type", node_type
        ).eq(
            "namespace", namespace
        ).eq(
            "name", name
        )

        # Handle null parent_id comparison
        if parent_id:
            query = query.eq("parent_id", parent_id)
        else:
            query = query.is_("parent_id", "null")

        result = query.execute()

        if result.data:
            # Node exists, update it
            node_id = result.data[0]["id"]
            supabase.table("lineage_nodes").update({
                "data_type": data_type,
                "metadata": metadata_dict,
                "updated_at": "now()"
            }).eq("id", node_id).execute()

            return json.dumps({
                "node_id": node_id,
                "created": False,
                "node_type": node_type,
                "namespace": namespace,
                "name": name
            })
        else:
            # Create new node
            result = supabase.table("lineage_nodes").insert(node_data).execute()
            node_id = result.data[0]["id"]

            return json.dumps({
                "node_id": node_id,
                "created": True,
                "node_type": node_type,
                "namespace": namespace,
                "name": name
            })

    except Exception as e:
        return json.dumps({
            "error": str(e),
            "node_id": None,
            "created": False
        })


def create_lineage_edge(
    source_id: str,
    target_id: str,
    edge_type: str,
    transformation_type: str,
    transformation_subtype: str,
    description: Optional[str] = None,
    job_id: Optional[str] = None,
    sql_hash: Optional[str] = None
) -> str:
    """
    Create a lineage edge connecting source to target nodes.

    Skips if duplicate edge already exists (source_id, target_id, job_id).
    Returns edge ID or existing edge ID if duplicate.

    Args:
        source_id: Source node UUID
        target_id: Target node UUID
        edge_type: Edge type - "derives_from" or "transforms_to"
        transformation_type: OpenLineage type - "DIRECT" or "INDIRECT"
        transformation_subtype: Subtype - "IDENTITY", "TRANSFORMATION", etc.
        description: Human-readable transformation description
        job_id: Job node that performed this transformation
        sql_hash: SHA-256 hash of SQL for deduplication

    Returns:
        JSON string with result:
        {
            "edge_id": "uuid",
            "created": true/false,
            "duplicate": false/true
        }
    """
    try:
        supabase = _get_supabase_client()

        # Check for duplicate edge
        query = supabase.table("lineage_edges").select("id").eq(
            "source_id", source_id
        ).eq(
            "target_id", target_id
        )

        # Add sql_hash check if provided
        if sql_hash:
            query = query.eq("sql_hash", sql_hash)

        result = query.execute()

        if result.data:
            # Edge already exists
            return json.dumps({
                "edge_id": result.data[0]["id"],
                "created": False,
                "duplicate": True
            })

        # Create new edge
        edge_data = {
            "source_id": source_id,
            "target_id": target_id,
            "edge_type": edge_type,
            "transformation_type": transformation_type,
            "transformation_subtype": transformation_subtype,
            "transformation_description": description,
            "job_id": job_id,
            "sql_hash": sql_hash
        }

        result = supabase.table("lineage_edges").insert(edge_data).execute()
        edge_id = result.data[0]["id"]

        return json.dumps({
            "edge_id": edge_id,
            "created": True,
            "duplicate": False
        })

    except Exception as e:
        return json.dumps({
            "error": str(e),
            "edge_id": None,
            "created": False
        })


def store_lineage_result(
    lineage_result: str,
    namespace: str = "unknown",
    job_id: Optional[str] = None
) -> str:
    """
    Store parsed SQL lineage result to the graph.

    Parses SQLLineageResult JSON and creates:
    - Source table nodes and column nodes
    - Target table node and column nodes
    - Edges between source and target columns

    Args:
        lineage_result: JSON string from parse_sql_lineage()
        namespace: Namespace for nodes (e.g., "redshift://analytics")
        job_id: Optional job node ID that produced this lineage

    Returns:
        JSON string with counts:
        {
            "nodes_created": 5,
            "nodes_updated": 2,
            "edges_created": 8,
            "duplicates_skipped": 3,
            "sql_hash": "abc123..."
        }
    """
    try:
        result_data = json.loads(lineage_result)

        # Check for parse errors
        if "error" in result_data:
            return json.dumps({
                "error": result_data["error"],
                "nodes_created": 0,
                "nodes_updated": 0,
                "edges_created": 0,
                "duplicates_skipped": 0
            })

        sql_hash = result_data.get("sql_hash", "")
        source_tables = result_data.get("source_tables", [])
        target_table = result_data.get("target_table")
        column_lineages = result_data.get("column_lineages", [])

        counts = {
            "nodes_created": 0,
            "nodes_updated": 0,
            "edges_created": 0,
            "duplicates_skipped": 0,
            "sql_hash": sql_hash
        }

        # Track node IDs by name for edge creation
        table_node_ids = {}
        column_node_ids = {}

        # Create source table nodes
        for table_name in source_tables:
            node_result = json.loads(upsert_lineage_node(
                node_type="dataset",
                namespace=namespace,
                name=table_name
            ))

            if node_result.get("created"):
                counts["nodes_created"] += 1
            elif node_result.get("node_id"):
                counts["nodes_updated"] += 1

            if node_result.get("node_id"):
                table_node_ids[table_name] = node_result["node_id"]

        # Create target table node if present
        target_node_id = None
        if target_table:
            node_result = json.loads(upsert_lineage_node(
                node_type="dataset",
                namespace=namespace,
                name=target_table
            ))

            if node_result.get("created"):
                counts["nodes_created"] += 1
            elif node_result.get("node_id"):
                counts["nodes_updated"] += 1

            target_node_id = node_result.get("node_id")
            table_node_ids[target_table] = target_node_id

        # Process column lineages
        for col_lineage in column_lineages:
            output_col = col_lineage.get("column", "")
            source_columns = col_lineage.get("source_columns", [])

            # Create target column node if we have a target table
            target_col_node_id = None
            if target_node_id and output_col:
                col_key = f"{target_table}.{output_col}"
                node_result = json.loads(upsert_lineage_node(
                    node_type="column",
                    namespace=namespace,
                    name=output_col,
                    parent_id=target_node_id
                ))

                if node_result.get("created"):
                    counts["nodes_created"] += 1
                elif node_result.get("node_id"):
                    counts["nodes_updated"] += 1

                target_col_node_id = node_result.get("node_id")
                column_node_ids[col_key] = target_col_node_id

            # Create source column nodes and edges
            for src_col in source_columns:
                src_table = src_col.get("table", "unknown")
                src_col_name = src_col.get("column", "")
                trans_type = src_col.get("transformation_type", "DIRECT")
                trans_subtype = src_col.get("transformation_subtype", "IDENTITY")
                description = src_col.get("description", "")

                # Get or create source table node
                src_table_node_id = table_node_ids.get(src_table)
                if not src_table_node_id and src_table != "unknown" and src_table != "*":
                    node_result = json.loads(upsert_lineage_node(
                        node_type="dataset",
                        namespace=namespace,
                        name=src_table
                    ))
                    src_table_node_id = node_result.get("node_id")
                    if src_table_node_id:
                        table_node_ids[src_table] = src_table_node_id
                        if node_result.get("created"):
                            counts["nodes_created"] += 1

                # Create source column node
                if src_table_node_id and src_col_name and src_col_name != "*":
                    col_key = f"{src_table}.{src_col_name}"
                    if col_key not in column_node_ids:
                        node_result = json.loads(upsert_lineage_node(
                            node_type="column",
                            namespace=namespace,
                            name=src_col_name,
                            parent_id=src_table_node_id
                        ))

                        if node_result.get("created"):
                            counts["nodes_created"] += 1
                        elif node_result.get("node_id"):
                            counts["nodes_updated"] += 1

                        column_node_ids[col_key] = node_result.get("node_id")

                    src_col_node_id = column_node_ids.get(col_key)

                    # Create edge from source column to target column
                    if src_col_node_id and target_col_node_id:
                        edge_result = json.loads(create_lineage_edge(
                            source_id=src_col_node_id,
                            target_id=target_col_node_id,
                            edge_type="transforms_to",
                            transformation_type=trans_type,
                            transformation_subtype=trans_subtype,
                            description=description,
                            job_id=job_id,
                            sql_hash=sql_hash
                        ))

                        if edge_result.get("created"):
                            counts["edges_created"] += 1
                        elif edge_result.get("duplicate"):
                            counts["duplicates_skipped"] += 1

        return json.dumps(counts, indent=2)

    except Exception as e:
        return json.dumps({
            "error": str(e),
            "nodes_created": 0,
            "nodes_updated": 0,
            "edges_created": 0,
            "duplicates_skipped": 0
        })


def store_openlineage_event(event: dict) -> str:
    """
    Store column lineage from an OpenLineage RunEvent.

    Parses ColumnLineageDatasetFacet from outputs[].facets.columnLineage
    and creates nodes/edges in the lineage graph.

    Args:
        event: OpenLineage RunEvent dictionary with structure:
            {
                "eventType": "COMPLETE",
                "eventTime": "2024-01-15T10:00:00Z",
                "run": {"runId": "uuid"},
                "job": {"namespace": "airflow", "name": "etl_pipeline"},
                "producer": "https://airflow.example.com",
                "outputs": [{
                    "namespace": "redshift://analytics",
                    "name": "fact_orders",
                    "facets": {
                        "columnLineage": {
                            "fields": {
                                "total_amount": {
                                    "inputFields": [
                                        {"namespace": "...", "name": "orders", "field": "amount"}
                                    ],
                                    "transformationType": "DIRECT"
                                }
                            }
                        }
                    }
                }]
            }

    Returns:
        JSON string with counts:
        {
            "run_id": "uuid",
            "datasets_created": 2,
            "columns_created": 5,
            "edges_created": 8,
            "event_type": "COMPLETE"
        }
    """
    try:
        run_info = event.get("run", {})
        run_id = run_info.get("runId", "unknown")

        job_info = event.get("job", {})
        job_namespace = job_info.get("namespace", "unknown")
        job_name = job_info.get("name", "unknown")

        event_type = event.get("eventType", "UNKNOWN")
        outputs = event.get("outputs", [])

        counts = {
            "run_id": run_id,
            "datasets_created": 0,
            "columns_created": 0,
            "edges_created": 0,
            "event_type": event_type
        }

        # Create job node
        job_result = json.loads(upsert_lineage_node(
            node_type="job",
            namespace=job_namespace,
            name=job_name,
            metadata=json.dumps({"run_id": run_id, "producer": event.get("producer", "")})
        ))
        job_node_id = job_result.get("node_id")

        # Process each output dataset with column lineage
        for output in outputs:
            output_namespace = output.get("namespace", "unknown")
            output_name = output.get("name", "unknown")
            facets = output.get("facets", {})

            # Get column lineage facet
            column_lineage_facet = facets.get("columnLineage", {})
            fields = column_lineage_facet.get("fields", {})

            if not fields:
                continue

            # Create output dataset node
            output_result = json.loads(upsert_lineage_node(
                node_type="dataset",
                namespace=output_namespace,
                name=output_name
            ))
            output_dataset_id = output_result.get("node_id")
            if output_result.get("created"):
                counts["datasets_created"] += 1

            # Track created nodes for edge creation
            input_column_ids = {}

            # Process each output field
            for field_name, field_info in fields.items():
                # Create output column node
                output_col_result = json.loads(upsert_lineage_node(
                    node_type="column",
                    namespace=output_namespace,
                    name=field_name,
                    parent_id=output_dataset_id
                ))
                output_col_id = output_col_result.get("node_id")
                if output_col_result.get("created"):
                    counts["columns_created"] += 1

                # Get transformation info
                transformations = field_info.get("transformations", [])
                trans_type = "DIRECT"
                trans_subtype = "TRANSFORMATION"
                trans_desc = field_info.get("transformationDescription", "")

                if transformations:
                    trans_type = transformations[0].get("type", "DIRECT")
                    trans_subtype = transformations[0].get("subtype", "TRANSFORMATION")
                    trans_desc = transformations[0].get("description", trans_desc)

                # Also check top-level transformationType
                if "transformationType" in field_info:
                    trans_type = field_info["transformationType"]

                # Process each input field
                input_fields = field_info.get("inputFields", [])
                for input_field in input_fields:
                    input_namespace = input_field.get("namespace", "unknown")
                    input_dataset = input_field.get("name", "unknown")
                    input_column = input_field.get("field", "unknown")

                    # Create input dataset node
                    input_ds_key = f"{input_namespace}:{input_dataset}"
                    if input_ds_key not in input_column_ids:
                        input_ds_result = json.loads(upsert_lineage_node(
                            node_type="dataset",
                            namespace=input_namespace,
                            name=input_dataset
                        ))
                        input_column_ids[input_ds_key] = {
                            "dataset_id": input_ds_result.get("node_id"),
                            "columns": {}
                        }
                        if input_ds_result.get("created"):
                            counts["datasets_created"] += 1

                    input_dataset_id = input_column_ids[input_ds_key]["dataset_id"]

                    # Create input column node
                    input_col_key = f"{input_ds_key}:{input_column}"
                    if input_column not in input_column_ids[input_ds_key]["columns"]:
                        input_col_result = json.loads(upsert_lineage_node(
                            node_type="column",
                            namespace=input_namespace,
                            name=input_column,
                            parent_id=input_dataset_id
                        ))
                        input_column_ids[input_ds_key]["columns"][input_column] = input_col_result.get("node_id")
                        if input_col_result.get("created"):
                            counts["columns_created"] += 1

                    input_col_id = input_column_ids[input_ds_key]["columns"][input_column]

                    # Create edge from input column to output column
                    if input_col_id and output_col_id:
                        edge_result = json.loads(create_lineage_edge(
                            source_id=input_col_id,
                            target_id=output_col_id,
                            edge_type="transforms_to",
                            transformation_type=trans_type,
                            transformation_subtype=trans_subtype,
                            description=trans_desc,
                            job_id=job_node_id
                        ))

                        if edge_result.get("created"):
                            counts["edges_created"] += 1

        return json.dumps(counts, indent=2)

    except Exception as e:
        return json.dumps({
            "error": str(e),
            "run_id": event.get("run", {}).get("runId", "unknown"),
            "datasets_created": 0,
            "columns_created": 0,
            "edges_created": 0
        })


def check_sql_processed(sql_hash: str) -> str:
    """
    Check if SQL has already been processed for lineage.

    Looks for edges with matching sql_hash to avoid duplicate processing.

    Args:
        sql_hash: SHA-256 hash of the SQL statement

    Returns:
        JSON string with result:
        {
            "processed": true/false,
            "edge_count": 5
        }
    """
    try:
        supabase = _get_supabase_client()

        result = supabase.table("lineage_edges").select(
            "id", count="exact"
        ).eq("sql_hash", sql_hash).execute()

        edge_count = result.count if result.count else 0

        return json.dumps({
            "processed": edge_count > 0,
            "edge_count": edge_count,
            "sql_hash": sql_hash
        })

    except Exception as e:
        return json.dumps({
            "error": str(e),
            "processed": False,
            "edge_count": 0
        })


# Export functions for agent registration
__all__ = [
    "upsert_lineage_node",
    "create_lineage_edge",
    "store_lineage_result",
    "store_openlineage_event",
    "check_sql_processed"
]
