"""
Lineage Extractor Lambda for batch lineage extraction from AWS data sources.

Extracts query history from Redshift and Athena, parses SQL for column lineage,
and stores results to the lineage graph. Runs on a schedule via EventBridge.

Environment Variables:
    SUPABASE_URL: Supabase project URL
    SUPABASE_KEY: Supabase service role key
    REDSHIFT_WORKGROUP: Default Redshift Serverless workgroup
    REDSHIFT_DATABASE: Default Redshift database (default: dev)

Event:
    {
        "source_type": "redshift" | "athena" | "all",
        "since_hours": 24,
        "workgroup": "optional-workgroup-override",
        "region": "us-east-1"
    }
"""

import json
import os
import sys
import hashlib
from datetime import datetime, timezone
from typing import Any, Optional

# Add agents path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'agents'))

from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.utilities.typing import LambdaContext

# Initialize Lambda Powertools
logger = Logger()
tracer = Tracer()


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


def create_lineage_run(supabase, source_type: str) -> Optional[str]:
    """Create a lineage run record with status 'running'."""
    try:
        result = supabase.table("lineage_runs").insert({
            "source_type": source_type,
            "status": "running",
            "started_at": datetime.now(timezone.utc).isoformat(),
            "metadata": {}
        }).execute()

        return result.data[0]["id"] if result.data else None
    except Exception as e:
        logger.warning(f"Failed to create lineage run record: {e}")
        return None


def update_lineage_run(
    supabase,
    run_id: str,
    status: str,
    queries_processed: int = 0,
    edges_created: int = 0,
    error_message: Optional[str] = None
) -> None:
    """Update lineage run record with final status."""
    try:
        update_data = {
            "status": status,
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "queries_processed": queries_processed,
            "edges_created": edges_created
        }
        if error_message:
            update_data["error_message"] = error_message

        supabase.table("lineage_runs").update(update_data).eq("id", run_id).execute()
    except Exception as e:
        logger.warning(f"Failed to update lineage run record: {e}")


def compute_sql_hash(sql: str) -> str:
    """Compute SHA-256 hash of normalized SQL."""
    normalized = " ".join(sql.split()).strip()
    return hashlib.sha256(normalized.encode()).hexdigest()


def check_sql_processed(supabase, sql_hash: str) -> bool:
    """Check if SQL has already been processed."""
    try:
        result = supabase.table("lineage_edges").select(
            "id", count="exact"
        ).eq("sql_hash", sql_hash).limit(1).execute()

        return (result.count or 0) > 0
    except Exception as e:
        logger.warning(f"Failed to check if SQL processed: {e}")
        return False


def extract_and_store_lineage(
    source_type: str,
    workgroup: Optional[str],
    database: str,
    region: str,
    since_hours: int,
    supabase
) -> dict:
    """
    Extract queries and store lineage.

    Returns counts of queries processed and edges created.
    """
    from lineage.tools.aws_extractor import (
        extract_redshift_queries,
        extract_athena_queries,
        get_glue_catalog_schema
    )
    from lineage.tools.sql_parser import parse_sql_lineage
    from lineage.tools.lineage_store import store_lineage_result

    counts = {
        "queries_extracted": 0,
        "queries_processed": 0,
        "queries_skipped": 0,
        "edges_created": 0,
        "errors": []
    }

    # Extract queries based on source type
    queries = []

    if source_type in ("redshift", "all"):
        if workgroup:
            logger.info(f"Extracting Redshift queries from workgroup: {workgroup}")
            result = json.loads(extract_redshift_queries(
                workgroup=workgroup,
                database=database,
                region=region,
                since_hours=since_hours
            ))

            if "error" in result:
                logger.error(f"Redshift extraction error: {result['error']}")
                counts["errors"].append(f"Redshift: {result['error']}")
            else:
                queries.extend([
                    {"source": "redshift", "namespace": f"redshift://{workgroup}", **q}
                    for q in result.get("queries", [])
                ])
                logger.info(f"Extracted {result.get('count', 0)} Redshift queries")
        else:
            logger.warning("Skipping Redshift: no workgroup specified")

    if source_type in ("athena", "all"):
        logger.info("Extracting Athena queries")
        result = json.loads(extract_athena_queries(
            region=region,
            since_hours=since_hours
        ))

        if "error" in result:
            logger.error(f"Athena extraction error: {result['error']}")
            counts["errors"].append(f"Athena: {result['error']}")
        else:
            queries.extend([
                {"source": "athena", "namespace": f"athena://{region}", **q}
                for q in result.get("queries", [])
            ])
            logger.info(f"Extracted {result.get('count', 0)} Athena queries")

    counts["queries_extracted"] = len(queries)

    # Process each query
    for query in queries:
        query_text = query.get("query_text", "")
        query_id = query.get("id", "unknown")
        namespace = query.get("namespace", "unknown")
        database_name = query.get("database", database)

        try:
            # Check if already processed
            sql_hash = compute_sql_hash(query_text)
            if check_sql_processed(supabase, sql_hash):
                logger.debug(f"Skipping already processed query: {query_id[:8]}...")
                counts["queries_skipped"] += 1
                continue

            # Determine dialect
            dialect = "redshift" if query.get("source") == "redshift" else "presto"

            # Parse SQL for lineage
            lineage_result = parse_sql_lineage(
                sql=query_text,
                dialect=dialect
            )

            # Store lineage
            store_result = json.loads(store_lineage_result(
                lineage_result=lineage_result,
                namespace=namespace
            ))

            if "error" in store_result:
                logger.warning(f"Store error for query {query_id[:8]}: {store_result['error']}")
                counts["errors"].append(f"Query {query_id[:8]}: {store_result['error']}")
            else:
                counts["queries_processed"] += 1
                counts["edges_created"] += store_result.get("edges_created", 0)

        except Exception as e:
            logger.warning(f"Failed to process query {query_id[:8]}: {e}")
            counts["errors"].append(f"Query {query_id[:8]}: {str(e)}")

    return counts


@logger.inject_lambda_context
@tracer.capture_lambda_handler
def handler(event: dict, context: LambdaContext) -> dict[str, Any]:
    """
    Lambda handler for batch lineage extraction.

    Processes query history from Redshift and/or Athena, parses for
    column lineage, and stores to the graph.
    """
    # Parse event configuration
    source_type = event.get("source_type", "all")
    since_hours = event.get("since_hours", 24)
    workgroup = event.get("workgroup") or os.environ.get("REDSHIFT_WORKGROUP")
    database = event.get("database") or os.environ.get("REDSHIFT_DATABASE", "dev")
    region = event.get("region") or os.environ.get("AWS_REGION", "us-east-1")

    logger.info(f"Starting lineage extraction: source={source_type}, since_hours={since_hours}")

    # Get Supabase client
    try:
        supabase = get_supabase_client()
    except Exception as e:
        logger.error(f"Failed to initialize Supabase: {e}")
        return {
            "statusCode": 500,
            "body": json.dumps({
                "error": "Failed to initialize database client",
                "details": str(e)
            })
        }

    # Create lineage run record
    run_id = create_lineage_run(supabase, source_type) if supabase else None

    try:
        # Extract and store lineage
        counts = extract_and_store_lineage(
            source_type=source_type,
            workgroup=workgroup,
            database=database,
            region=region,
            since_hours=since_hours,
            supabase=supabase
        )

        # Update run record
        if run_id and supabase:
            status = "completed" if not counts["errors"] else "completed_with_errors"
            update_lineage_run(
                supabase=supabase,
                run_id=run_id,
                status=status,
                queries_processed=counts["queries_processed"],
                edges_created=counts["edges_created"],
                error_message="; ".join(counts["errors"][:5]) if counts["errors"] else None
            )

        logger.info(f"Extraction complete: {counts}")

        return {
            "statusCode": 200,
            "body": json.dumps({
                "run_id": run_id,
                "source_type": source_type,
                "since_hours": since_hours,
                "queries_extracted": counts["queries_extracted"],
                "queries_processed": counts["queries_processed"],
                "queries_skipped": counts["queries_skipped"],
                "edges_created": counts["edges_created"],
                "errors": counts["errors"][:5] if counts["errors"] else []
            })
        }

    except Exception as e:
        logger.exception(f"Extraction failed: {e}")

        # Update run record with failure
        if run_id and supabase:
            update_lineage_run(
                supabase=supabase,
                run_id=run_id,
                status="failed",
                error_message=str(e)
            )

        return {
            "statusCode": 500,
            "body": json.dumps({
                "error": "Extraction failed",
                "details": str(e),
                "run_id": run_id
            })
        }
