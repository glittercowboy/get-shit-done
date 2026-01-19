"""
OpenLineage tools for creating and emitting lineage events.

Creates OpenLineage-compatible events with ColumnLineageDatasetFacet
for integration with lineage catalogs like Marquez, DataHub, and Atlan.
"""

import json
import os
import uuid
from datetime import datetime, timezone
from typing import Optional

# HTTP library for emitting events
try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False


def create_lineage_event(
    job_name: str,
    inputs: str,
    outputs: str,
    column_lineage: str
) -> str:
    """
    Create an OpenLineage RunEvent with column-level lineage.

    Generates a COMPLETE run event following the OpenLineage specification,
    including ColumnLineageDatasetFacet for detailed column tracking.

    Args:
        job_name: Name of the job/transformation (e.g., "etl_customer_daily")
        inputs: JSON array of input datasets with format:
                [{"namespace": "redshift://cluster", "name": "schema.table"}]
        outputs: JSON array of output datasets with format:
                [{"namespace": "redshift://cluster", "name": "schema.table"}]
        column_lineage: JSON object mapping output columns to input columns:
                {
                    "output_col": [
                        {
                            "namespace": "redshift://cluster",
                            "dataset": "schema.table",
                            "column": "source_col",
                            "type": "DIRECT",
                            "subtype": "TRANSFORMATION",
                            "description": "UPPER() applied"
                        }
                    ]
                }

    Returns:
        JSON string containing the OpenLineage RunEvent

    Example:
        >>> event = create_lineage_event(
        ...     job_name="customer_transform",
        ...     inputs='[{"namespace": "redshift://analytics", "name": "raw.customers"}]',
        ...     outputs='[{"namespace": "redshift://analytics", "name": "curated.customers"}]',
        ...     column_lineage='{"customer_name": [{"namespace": "redshift://analytics", "dataset": "raw.customers", "column": "first_name", "type": "DIRECT", "subtype": "TRANSFORMATION", "description": "CONCAT with last_name"}]}'
        ... )
    """
    try:
        # Parse inputs
        input_datasets = json.loads(inputs) if inputs else []
        output_datasets = json.loads(outputs) if outputs else []
        lineage_map = json.loads(column_lineage) if column_lineage else {}

        # Generate run ID
        run_id = str(uuid.uuid4())

        # Current timestamp in ISO 8601 format
        event_time = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')

        # Build column lineage facet
        column_lineage_facet = {
            "_producer": "https://data-foundations/lineage-agent",
            "_schemaURL": "https://openlineage.io/spec/facets/1-2-0/ColumnLineageDatasetFacet.json",
            "fields": {}
        }

        for output_col, input_cols in lineage_map.items():
            input_fields = []
            for col in input_cols:
                transformations = []
                if col.get("type") or col.get("subtype"):
                    transformations.append({
                        "type": col.get("type", "DIRECT"),
                        "subtype": col.get("subtype", "IDENTITY"),
                        "description": col.get("description", "")
                    })

                input_fields.append({
                    "namespace": col.get("namespace", "unknown"),
                    "name": col.get("dataset", "unknown"),
                    "field": col.get("column", "unknown"),
                    "transformations": transformations
                })

            column_lineage_facet["fields"][output_col] = {
                "inputFields": input_fields
            }

        # Build input datasets
        input_list = []
        for ds in input_datasets:
            input_list.append({
                "namespace": ds.get("namespace", "unknown"),
                "name": ds.get("name", "unknown"),
                "facets": {}
            })

        # Build output datasets with column lineage facet
        output_list = []
        for ds in output_datasets:
            output_list.append({
                "namespace": ds.get("namespace", "unknown"),
                "name": ds.get("name", "unknown"),
                "facets": {
                    "columnLineage": column_lineage_facet
                } if lineage_map else {}
            })

        # Build the OpenLineage RunEvent
        event = {
            "eventType": "COMPLETE",
            "eventTime": event_time,
            "producer": "https://data-foundations/lineage-agent",
            "schemaURL": "https://openlineage.io/spec/1-0-5/OpenLineage.json",
            "run": {
                "runId": run_id,
                "facets": {}
            },
            "job": {
                "namespace": "data-foundations",
                "name": job_name,
                "facets": {}
            },
            "inputs": input_list,
            "outputs": output_list
        }

        return json.dumps(event, indent=2)

    except json.JSONDecodeError as e:
        return json.dumps({
            "error": f"Invalid JSON input: {str(e)}",
            "inputs_received": inputs,
            "outputs_received": outputs,
            "column_lineage_received": column_lineage
        })
    except Exception as e:
        return json.dumps({
            "error": f"Failed to create lineage event: {str(e)}"
        })


def emit_openlineage_event(
    event_json: str,
    endpoint_url: Optional[str] = None
) -> str:
    """
    Send an OpenLineage event to a lineage backend.

    Emits the event to an OpenLineage-compatible endpoint (Marquez, DataHub, etc.).
    Uses the OPENLINEAGE_URL environment variable if no endpoint is specified.

    Args:
        event_json: JSON string containing the OpenLineage RunEvent
        endpoint_url: Optional URL of the OpenLineage backend.
                     Defaults to OPENLINEAGE_URL environment variable.

    Returns:
        JSON string containing:
        - status: "success" or "error"
        - run_id: The run ID from the event
        - endpoint: The endpoint URL used
        - error: Error message if failed

    Example:
        >>> result = emit_openlineage_event(
        ...     event_json=event,
        ...     endpoint_url="http://localhost:5000/api/v1/lineage"
        ... )
    """
    # Determine endpoint
    url = endpoint_url or os.environ.get("OPENLINEAGE_URL")

    if not url:
        return json.dumps({
            "status": "skipped",
            "message": "No endpoint configured. Set OPENLINEAGE_URL environment variable or provide endpoint_url.",
            "event_preview": json.loads(event_json) if event_json else None
        })

    if not REQUESTS_AVAILABLE:
        return json.dumps({
            "status": "error",
            "error": "requests library not installed. Run: pip install requests",
            "endpoint": url
        })

    try:
        # Parse the event to extract run_id
        event = json.loads(event_json)
        run_id = event.get("run", {}).get("runId", "unknown")

        # Send the event
        response = requests.post(
            url,
            json=event,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            timeout=30
        )

        if response.status_code in (200, 201, 202):
            return json.dumps({
                "status": "success",
                "run_id": run_id,
                "endpoint": url,
                "http_status": response.status_code
            })
        else:
            return json.dumps({
                "status": "error",
                "run_id": run_id,
                "endpoint": url,
                "http_status": response.status_code,
                "error": response.text[:500] if response.text else "Unknown error"
            })

    except requests.exceptions.Timeout:
        return json.dumps({
            "status": "error",
            "endpoint": url,
            "error": "Request timed out after 30 seconds"
        })
    except requests.exceptions.ConnectionError as e:
        return json.dumps({
            "status": "error",
            "endpoint": url,
            "error": f"Connection failed: {str(e)}"
        })
    except json.JSONDecodeError as e:
        return json.dumps({
            "status": "error",
            "error": f"Invalid event JSON: {str(e)}"
        })
    except Exception as e:
        return json.dumps({
            "status": "error",
            "endpoint": url,
            "error": f"Unexpected error: {str(e)}"
        })


# Export functions for agent registration
__all__ = ["create_lineage_event", "emit_openlineage_event"]
