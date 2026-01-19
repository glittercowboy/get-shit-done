"""
OpenLineage Consumer Lambda for accepting lineage events from external tools.

Accepts OpenLineage RunEvent JSON at POST /api/openlineage and extracts
ColumnLineageDatasetFacet to store column-level lineage in the graph.

Supports integration with:
- Apache Airflow (via OpenLineage integration)
- Apache Spark (via OpenLineage integration)
- dbt (via OpenLineage integration)
- Any tool emitting OpenLineage events

Environment Variables:
    SUPABASE_URL: Supabase project URL
    SUPABASE_KEY: Supabase service role key

API:
    POST /api/openlineage
    Body: OpenLineage RunEvent JSON

    Returns:
        200: Success with lineage stats
        400: Invalid event structure
        422: Valid event but no column lineage facet
"""

import json
import os
import sys
from datetime import datetime, timezone
from typing import Any, Optional

# Add agents path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'agents'))

from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.event_handler import APIGatewayHttpResolver
from aws_lambda_powertools.event_handler.exceptions import BadRequestError
from aws_lambda_powertools.utilities.typing import LambdaContext

# Initialize Lambda Powertools
logger = Logger()
tracer = Tracer()
app = APIGatewayHttpResolver()


def get_supabase_client():
    """
    Create and return Supabase client.

    First tries environment variables, then falls back to Secrets Manager.
    """
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_KEY")

    # Try Secrets Manager if env vars not set
    if not supabase_url or not supabase_key:
        secret_name = os.environ.get("SUPABASE_SECRET_NAME", "profiler/supabase")
        try:
            import boto3
            secrets_client = boto3.client("secretsmanager")
            response = secrets_client.get_secret_value(SecretId=secret_name)
            secret = json.loads(response["SecretString"])
            supabase_url = secret.get("url") or secret.get("SUPABASE_URL")
            supabase_key = secret.get("key") or secret.get("SUPABASE_KEY")
        except Exception as e:
            logger.error(f"Failed to get Supabase credentials from Secrets Manager: {e}")

    if not supabase_url or not supabase_key:
        raise EnvironmentError(
            "SUPABASE_URL and SUPABASE_KEY must be set via environment or Secrets Manager"
        )

    try:
        from supabase import create_client
        return create_client(supabase_url, supabase_key)
    except ImportError:
        logger.error("Supabase client not available")
        return None


def validate_openlineage_event(event: dict) -> tuple[bool, Optional[str]]:
    """
    Validate OpenLineage RunEvent structure.

    Returns (is_valid, error_message).
    """
    # Required fields
    required_fields = ["eventType", "eventTime", "run", "job", "producer"]
    for field in required_fields:
        if field not in event:
            return False, f"Missing required field: {field}"

    # Validate run structure
    run = event.get("run", {})
    if not isinstance(run, dict) or "runId" not in run:
        return False, "run must contain runId"

    # Validate job structure
    job = event.get("job", {})
    if not isinstance(job, dict) or "namespace" not in job or "name" not in job:
        return False, "job must contain namespace and name"

    # Validate eventType
    valid_event_types = ["START", "RUNNING", "COMPLETE", "FAIL", "ABORT"]
    if event.get("eventType") not in valid_event_types:
        return False, f"eventType must be one of: {valid_event_types}"

    return True, None


def has_column_lineage(event: dict) -> bool:
    """Check if event contains column lineage facet."""
    outputs = event.get("outputs", [])
    for output in outputs:
        facets = output.get("facets", {})
        if "columnLineage" in facets:
            column_lineage = facets["columnLineage"]
            if "fields" in column_lineage and column_lineage["fields"]:
                return True
    return False


@app.post("/api/openlineage")
@tracer.capture_method
def handle_openlineage_event() -> dict[str, Any]:
    """
    Process incoming OpenLineage RunEvent.

    Extracts column lineage from ColumnLineageDatasetFacet and stores
    to the lineage graph.
    """
    try:
        event = app.current_event.json_body
    except Exception as e:
        logger.warning(f"Failed to parse request body: {e}")
        raise BadRequestError("Invalid JSON body")

    # Validate event structure
    is_valid, error_message = validate_openlineage_event(event)
    if not is_valid:
        logger.warning(f"Invalid OpenLineage event: {error_message}")
        raise BadRequestError(f"Invalid OpenLineage event: {error_message}")

    run_id = event.get("run", {}).get("runId", "unknown")
    job_namespace = event.get("job", {}).get("namespace", "unknown")
    job_name = event.get("job", {}).get("name", "unknown")
    event_type = event.get("eventType", "UNKNOWN")

    logger.info(f"Received OpenLineage event: type={event_type}, job={job_namespace}/{job_name}, run={run_id[:8]}...")

    # Check for column lineage
    if not has_column_lineage(event):
        logger.info(f"No column lineage facet in event, accepting but not storing")
        return {
            "run_id": run_id,
            "accepted": True,
            "lineage_stored": False,
            "message": "Event accepted but no column lineage facet present",
            "stats": {
                "datasets": 0,
                "columns": 0,
                "edges": 0
            }
        }

    # Initialize Supabase client
    try:
        # Set environment for lineage_store module
        supabase = get_supabase_client()
    except Exception as e:
        logger.error(f"Failed to initialize Supabase: {e}")
        return {
            "run_id": run_id,
            "accepted": True,
            "lineage_stored": False,
            "error": "Database client unavailable",
            "stats": {
                "datasets": 0,
                "columns": 0,
                "edges": 0
            }
        }

    # Store lineage
    try:
        from lineage.tools.lineage_store import store_openlineage_event

        result = json.loads(store_openlineage_event(event))

        if "error" in result:
            logger.error(f"Failed to store lineage: {result['error']}")
            return {
                "run_id": run_id,
                "accepted": True,
                "lineage_stored": False,
                "error": result["error"],
                "stats": {
                    "datasets": result.get("datasets_created", 0),
                    "columns": result.get("columns_created", 0),
                    "edges": result.get("edges_created", 0)
                }
            }

        logger.info(f"Stored lineage for run {run_id[:8]}: {result}")

        return {
            "run_id": run_id,
            "accepted": True,
            "lineage_stored": True,
            "stats": {
                "datasets": result.get("datasets_created", 0),
                "columns": result.get("columns_created", 0),
                "edges": result.get("edges_created", 0)
            }
        }

    except Exception as e:
        logger.exception(f"Failed to process lineage: {e}")
        return {
            "run_id": run_id,
            "accepted": True,
            "lineage_stored": False,
            "error": str(e),
            "stats": {
                "datasets": 0,
                "columns": 0,
                "edges": 0
            }
        }


@app.get("/api/openlineage/health")
@tracer.capture_method
def health_check() -> dict[str, Any]:
    """Health check endpoint for OpenLineage consumer."""
    return {
        "status": "healthy",
        "service": "openlineage-consumer",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@logger.inject_lambda_context
@tracer.capture_lambda_handler
def handler(event: dict, context: LambdaContext) -> dict[str, Any]:
    """
    Lambda handler entry point.

    Processes API Gateway HTTP events for OpenLineage consumption.
    """
    return app.resolve(event, context)
