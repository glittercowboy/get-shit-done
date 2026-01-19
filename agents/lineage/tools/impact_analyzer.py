"""
Impact Analyzer tools for lineage graph traversal.

Provides upstream and downstream analysis via Supabase RPC calls
to the PostgreSQL graph traversal functions.
"""

import json
import os
from typing import Optional

# Supabase client - lazy import
_supabase_client = None


def _get_supabase_client():
    """Get or create Supabase client (lazy loading)."""
    global _supabase_client

    if _supabase_client is not None:
        return _supabase_client

    try:
        from supabase import create_client
    except ImportError:
        return None

    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")

    if not url or not key:
        return None

    _supabase_client = create_client(url, key)
    return _supabase_client


def get_downstream_impact(
    column_id: str,
    max_depth: int = 10
) -> str:
    """
    Find all downstream nodes affected by changes to a column.

    Performs forward traversal of the lineage graph to identify all nodes
    that depend on the specified column, ordered by depth.

    Args:
        column_id: UUID of the column node to analyze
        max_depth: Maximum traversal depth (default 10)

    Returns:
        JSON string containing:
        - root_node: The starting column node
        - affected_nodes: Array of affected nodes with depth
        - total_count: Number of affected nodes
        - max_depth_reached: Deepest level in the traversal
        - analysis_type: "downstream"

    Example:
        >>> result = get_downstream_impact(
        ...     column_id="550e8400-e29b-41d4-a716-446655440000",
        ...     max_depth=5
        ... )
    """
    client = _get_supabase_client()

    if client is None:
        return json.dumps({
            "error": "Supabase client not configured. Set SUPABASE_URL and SUPABASE_KEY environment variables.",
            "column_id": column_id,
            "analysis_type": "downstream"
        })

    try:
        # Call the get_downstream_nodes RPC function
        response = client.rpc(
            "get_downstream_nodes",
            {
                "start_node_id": column_id,
                "max_depth": max_depth
            }
        ).execute()

        if not response.data:
            return json.dumps({
                "root_node": {"id": column_id},
                "affected_nodes": [],
                "total_count": 0,
                "max_depth_reached": 0,
                "analysis_type": "downstream",
                "message": "No downstream dependencies found"
            })

        # Process results
        nodes = response.data
        root_node = None
        affected_nodes = []
        max_depth_found = 0

        for node in nodes:
            depth = node.get("depth", 0)
            if depth == 0:
                root_node = {
                    "id": node["id"],
                    "node_type": node["node_type"],
                    "namespace": node["namespace"],
                    "name": node["name"],
                    "parent_id": node.get("parent_id")
                }
            else:
                affected_nodes.append({
                    "id": node["id"],
                    "node_type": node["node_type"],
                    "namespace": node["namespace"],
                    "name": node["name"],
                    "parent_id": node.get("parent_id"),
                    "depth": depth
                })
                max_depth_found = max(max_depth_found, depth)

        # Sort by depth
        affected_nodes.sort(key=lambda x: x["depth"])

        return json.dumps({
            "root_node": root_node or {"id": column_id},
            "affected_nodes": affected_nodes,
            "total_count": len(affected_nodes),
            "max_depth_reached": max_depth_found,
            "analysis_type": "downstream"
        }, indent=2)

    except Exception as e:
        return json.dumps({
            "error": f"Impact analysis failed: {str(e)}",
            "column_id": column_id,
            "analysis_type": "downstream"
        })


def get_upstream_sources(
    column_id: str,
    max_depth: int = 10
) -> str:
    """
    Find all upstream source nodes that a column depends on.

    Performs backward traversal of the lineage graph to identify the
    root sources of data for the specified column.

    Args:
        column_id: UUID of the column node to analyze
        max_depth: Maximum traversal depth (default 10)

    Returns:
        JSON string containing:
        - root_node: The starting column node
        - source_nodes: Array of source nodes with depth
        - total_count: Number of source nodes
        - max_depth_reached: Deepest level in the traversal
        - analysis_type: "upstream"

    Example:
        >>> result = get_upstream_sources(
        ...     column_id="550e8400-e29b-41d4-a716-446655440000",
        ...     max_depth=5
        ... )
    """
    client = _get_supabase_client()

    if client is None:
        return json.dumps({
            "error": "Supabase client not configured. Set SUPABASE_URL and SUPABASE_KEY environment variables.",
            "column_id": column_id,
            "analysis_type": "upstream"
        })

    try:
        # Call the get_upstream_nodes RPC function
        response = client.rpc(
            "get_upstream_nodes",
            {
                "start_node_id": column_id,
                "max_depth": max_depth
            }
        ).execute()

        if not response.data:
            return json.dumps({
                "root_node": {"id": column_id},
                "source_nodes": [],
                "total_count": 0,
                "max_depth_reached": 0,
                "analysis_type": "upstream",
                "message": "No upstream sources found (this may be a root source)"
            })

        # Process results
        nodes = response.data
        root_node = None
        source_nodes = []
        max_depth_found = 0

        for node in nodes:
            depth = node.get("depth", 0)
            if depth == 0:
                root_node = {
                    "id": node["id"],
                    "node_type": node["node_type"],
                    "namespace": node["namespace"],
                    "name": node["name"],
                    "parent_id": node.get("parent_id")
                }
            else:
                source_nodes.append({
                    "id": node["id"],
                    "node_type": node["node_type"],
                    "namespace": node["namespace"],
                    "name": node["name"],
                    "parent_id": node.get("parent_id"),
                    "depth": depth
                })
                max_depth_found = max(max_depth_found, depth)

        # Sort by depth
        source_nodes.sort(key=lambda x: x["depth"])

        return json.dumps({
            "root_node": root_node or {"id": column_id},
            "source_nodes": source_nodes,
            "total_count": len(source_nodes),
            "max_depth_reached": max_depth_found,
            "analysis_type": "upstream"
        }, indent=2)

    except Exception as e:
        return json.dumps({
            "error": f"Upstream analysis failed: {str(e)}",
            "column_id": column_id,
            "analysis_type": "upstream"
        })


def find_column_by_name(
    namespace: str,
    table_name: str,
    column_name: str
) -> str:
    """
    Look up a column node ID by namespace, table, and column name.

    Used to find the node ID before running impact or upstream analysis.

    Args:
        namespace: Namespace URI (e.g., "redshift://analytics")
        table_name: Name of the table/dataset
        column_name: Name of the column

    Returns:
        JSON string containing:
        - found: Boolean indicating if column was found
        - node: Column node details if found
        - error: Error message if not found or failed

    Example:
        >>> result = find_column_by_name(
        ...     namespace="redshift://analytics",
        ...     table_name="curated.customers",
        ...     column_name="customer_id"
        ... )
    """
    client = _get_supabase_client()

    if client is None:
        return json.dumps({
            "found": False,
            "error": "Supabase client not configured. Set SUPABASE_URL and SUPABASE_KEY environment variables.",
            "search": {
                "namespace": namespace,
                "table_name": table_name,
                "column_name": column_name
            }
        })

    try:
        # First find the dataset node
        dataset_response = client.table("lineage_nodes").select("*").match({
            "node_type": "dataset",
            "namespace": namespace,
            "name": table_name
        }).execute()

        if not dataset_response.data:
            return json.dumps({
                "found": False,
                "error": f"Dataset '{table_name}' not found in namespace '{namespace}'",
                "search": {
                    "namespace": namespace,
                    "table_name": table_name,
                    "column_name": column_name
                }
            })

        dataset_id = dataset_response.data[0]["id"]

        # Now find the column node
        column_response = client.table("lineage_nodes").select("*").match({
            "node_type": "column",
            "name": column_name,
            "parent_id": dataset_id
        }).execute()

        if not column_response.data:
            return json.dumps({
                "found": False,
                "error": f"Column '{column_name}' not found in table '{table_name}'",
                "search": {
                    "namespace": namespace,
                    "table_name": table_name,
                    "column_name": column_name
                },
                "dataset_found": True,
                "dataset_id": dataset_id
            })

        column = column_response.data[0]
        return json.dumps({
            "found": True,
            "node": {
                "id": column["id"],
                "node_type": column["node_type"],
                "namespace": column["namespace"],
                "name": column["name"],
                "parent_id": column["parent_id"],
                "data_type": column.get("data_type"),
                "metadata": column.get("metadata", {})
            }
        }, indent=2)

    except Exception as e:
        return json.dumps({
            "found": False,
            "error": f"Lookup failed: {str(e)}",
            "search": {
                "namespace": namespace,
                "table_name": table_name,
                "column_name": column_name
            }
        })


# Export functions for agent registration
__all__ = ["get_downstream_impact", "get_upstream_sources", "find_column_by_name"]
