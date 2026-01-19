"""
AWS Query Extractor tools for lineage extraction.

Provides functions to extract query history from AWS data services:
- Redshift SVL_STATEMENTTEXT via Data API (serverless-friendly)
- Athena query history via boto3 API
- Glue Catalog schema lookup for SQLGlot context
"""

import json
from datetime import datetime, timezone, timedelta
from typing import Optional

import boto3
import time


def _get_redshift_client(region: str = "us-east-1"):
    """Create Redshift Data API client."""
    return boto3.client("redshift-data", region_name=region)


def _get_athena_client(region: str = "us-east-1"):
    """Create Athena client."""
    return boto3.client("athena", region_name=region)


def _get_glue_client(region: str = "us-east-1"):
    """Create Glue client."""
    return boto3.client("glue", region_name=region)


def _is_utility_query(query_text: str) -> bool:
    """Check if query is a utility/system query that should be skipped."""
    query_upper = query_text.strip().upper()

    # Skip utility commands
    utility_prefixes = [
        "SHOW", "DESCRIBE", "SET", "RESET", "BEGIN", "COMMIT", "ROLLBACK",
        "VACUUM", "ANALYZE", "GRANT", "REVOKE", "ALTER USER", "CREATE USER",
        "DROP USER", "EXPLAIN", "LOCK", "UNLOCK", "FETCH", "CLOSE", "DECLARE",
        "DEALLOCATE", "PREPARE", "EXECUTE", "COPY", "UNLOAD"
    ]

    for prefix in utility_prefixes:
        if query_upper.startswith(prefix):
            return True

    # Skip system table queries
    if "PG_CATALOG" in query_upper or "INFORMATION_SCHEMA" in query_upper:
        return True

    # Skip cursor operations
    if query_upper.startswith("CURSOR"):
        return True

    return False


def extract_redshift_queries(
    workgroup: str,
    database: str = "dev",
    region: str = "us-east-1",
    since_hours: int = 24,
    max_results: int = 1000
) -> str:
    """
    Extract recent queries from Redshift SVL_STATEMENTTEXT.

    Uses the Redshift Data API (serverless-friendly, no VPC required) to
    query SVL_STATEMENTTEXT for recent DDL/DML queries.

    Args:
        workgroup: Redshift Serverless workgroup name
        database: Database name (default: dev)
        region: AWS region (default: us-east-1)
        since_hours: Look back window in hours (default: 24)
        max_results: Maximum queries to return (default: 1000)

    Returns:
        JSON string with list of extracted queries:
        {
            "queries": [
                {
                    "id": "xid-starttime",
                    "query_text": "SELECT ...",
                    "executed_at": "2024-01-15T10:00:00Z",
                    "database": "analytics",
                    "user_id": 100
                }
            ],
            "count": 42,
            "source": "redshift",
            "workgroup": "analytics-workgroup",
            "since_hours": 24
        }
    """
    client = _get_redshift_client(region)

    # Query SVL_STATEMENTTEXT for recent queries
    # Using LISTAGG to reconstruct queries split across rows
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
        LIMIT {max_results}
    """

    try:
        # Execute the query
        response = client.execute_statement(
            WorkgroupName=workgroup,
            Database=database,
            Sql=sql,
        )
        query_id = response["Id"]

        # Poll for completion (max 5 minutes)
        timeout = 300
        start_time = time.time()
        while time.time() - start_time < timeout:
            status = client.describe_statement(Id=query_id)
            state = status["Status"]

            if state == "FINISHED":
                break
            elif state == "FAILED":
                error_msg = status.get("Error", "Unknown error")
                return json.dumps({
                    "error": f"Query failed: {error_msg}",
                    "queries": [],
                    "count": 0,
                    "source": "redshift",
                    "workgroup": workgroup,
                    "since_hours": since_hours
                })
            elif state == "ABORTED":
                return json.dumps({
                    "error": "Query was aborted",
                    "queries": [],
                    "count": 0,
                    "source": "redshift",
                    "workgroup": workgroup,
                    "since_hours": since_hours
                })

            time.sleep(2)
        else:
            return json.dumps({
                "error": "Query timed out",
                "queries": [],
                "count": 0,
                "source": "redshift",
                "workgroup": workgroup,
                "since_hours": since_hours
            })

        # Fetch results
        result = client.get_statement_result(Id=query_id)
        records = result.get("Records", [])

        queries = []
        for record in records:
            user_id = record[0].get("longValue", 0)
            xid = record[1].get("longValue", 0)
            starttime = record[2].get("stringValue", "")
            query_text = record[3].get("stringValue", "")

            # Skip utility queries
            if _is_utility_query(query_text):
                continue

            # Skip empty queries
            if not query_text.strip():
                continue

            queries.append({
                "id": f"{xid}-{starttime}",
                "query_text": query_text.strip(),
                "executed_at": starttime,
                "database": database,
                "user_id": user_id
            })

        return json.dumps({
            "queries": queries,
            "count": len(queries),
            "source": "redshift",
            "workgroup": workgroup,
            "since_hours": since_hours
        }, indent=2)

    except Exception as e:
        return json.dumps({
            "error": str(e),
            "queries": [],
            "count": 0,
            "source": "redshift",
            "workgroup": workgroup,
            "since_hours": since_hours
        })


def extract_athena_queries(
    region: str = "us-east-1",
    since_hours: int = 24,
    max_results: int = 50
) -> str:
    """
    Extract recent queries from Athena.

    Uses boto3 athena client to list and get query executions,
    filtering for successful queries within the time window.

    Args:
        region: AWS region (default: us-east-1)
        since_hours: Look back window in hours (default: 24)
        max_results: Maximum queries to return (default: 50)

    Returns:
        JSON string with list of extracted queries:
        {
            "queries": [
                {
                    "id": "query-execution-id",
                    "query_text": "SELECT ...",
                    "executed_at": "2024-01-15T10:00:00Z",
                    "database": "analytics"
                }
            ],
            "count": 15,
            "source": "athena",
            "since_hours": 24
        }
    """
    client = _get_athena_client(region)

    # Calculate cutoff time
    cutoff_time = datetime.now(timezone.utc) - timedelta(hours=since_hours)

    try:
        # List recent query executions
        # Athena returns most recent first
        paginator = client.get_paginator("list_query_executions")

        query_ids = []
        for page in paginator.paginate(MaxResults=max_results):
            query_ids.extend(page.get("QueryExecutionIds", []))
            if len(query_ids) >= max_results:
                break

        # Limit to max_results
        query_ids = query_ids[:max_results]

        if not query_ids:
            return json.dumps({
                "queries": [],
                "count": 0,
                "source": "athena",
                "since_hours": since_hours
            })

        # Batch get query executions (max 50 per call)
        queries = []
        for i in range(0, len(query_ids), 50):
            batch = query_ids[i:i+50]
            response = client.batch_get_query_execution(QueryExecutionIds=batch)

            for execution in response.get("QueryExecutions", []):
                status = execution.get("Status", {})
                state = status.get("State", "")

                # Only process succeeded queries
                if state != "SUCCEEDED":
                    continue

                # Check time window
                completion_time = status.get("CompletionDateTime")
                if completion_time and completion_time < cutoff_time:
                    continue

                query_text = execution.get("Query", "")

                # Skip utility queries
                if _is_utility_query(query_text):
                    continue

                # Skip empty queries
                if not query_text.strip():
                    continue

                # Get database from query context
                query_context = execution.get("QueryExecutionContext", {})
                database = query_context.get("Database", "default")

                queries.append({
                    "id": execution["QueryExecutionId"],
                    "query_text": query_text.strip(),
                    "executed_at": completion_time.isoformat() if completion_time else "",
                    "database": database
                })

        return json.dumps({
            "queries": queries,
            "count": len(queries),
            "source": "athena",
            "since_hours": since_hours
        }, indent=2)

    except Exception as e:
        return json.dumps({
            "error": str(e),
            "queries": [],
            "count": 0,
            "source": "athena",
            "since_hours": since_hours
        })


def get_glue_catalog_schema(
    database: str,
    table: str,
    region: str = "us-east-1"
) -> str:
    """
    Get table schema from AWS Glue Data Catalog.

    Retrieves column names and types from Glue catalog to provide
    schema context for SQLGlot lineage parsing.

    Args:
        database: Glue database name
        table: Table name
        region: AWS region (default: us-east-1)

    Returns:
        JSON string with schema in SQLGlot MappingSchema format:
        {
            "schema": {
                "database.table": {
                    "column1": "VARCHAR",
                    "column2": "INT"
                }
            },
            "columns": ["column1", "column2"],
            "source": "glue"
        }
    """
    client = _get_glue_client(region)

    try:
        response = client.get_table(
            DatabaseName=database,
            Name=table
        )

        table_def = response.get("Table", {})
        storage_descriptor = table_def.get("StorageDescriptor", {})
        columns = storage_descriptor.get("Columns", [])

        # Also get partition keys
        partition_keys = table_def.get("PartitionKeys", [])
        all_columns = columns + partition_keys

        # Build schema mapping
        schema_dict = {}
        column_names = []

        for col in all_columns:
            col_name = col.get("Name", "")
            col_type = col.get("Type", "STRING").upper()

            # Map Glue types to SQL types
            type_mapping = {
                "STRING": "VARCHAR",
                "INT": "INTEGER",
                "BIGINT": "BIGINT",
                "DOUBLE": "DOUBLE",
                "FLOAT": "FLOAT",
                "BOOLEAN": "BOOLEAN",
                "TIMESTAMP": "TIMESTAMP",
                "DATE": "DATE",
                "DECIMAL": "DECIMAL",
                "ARRAY": "ARRAY",
                "MAP": "MAP",
                "STRUCT": "STRUCT"
            }

            # Handle complex types (e.g., "array<string>")
            base_type = col_type.split("<")[0].split("(")[0]
            sql_type = type_mapping.get(base_type, col_type)

            schema_dict[col_name] = sql_type
            column_names.append(col_name)

        # Format for SQLGlot MappingSchema
        full_table_name = f"{database}.{table}"

        return json.dumps({
            "schema": {
                full_table_name: schema_dict
            },
            "columns": column_names,
            "table": full_table_name,
            "source": "glue"
        }, indent=2)

    except client.exceptions.EntityNotFoundException:
        return json.dumps({
            "error": f"Table not found: {database}.{table}",
            "schema": {},
            "columns": [],
            "source": "glue"
        })
    except Exception as e:
        return json.dumps({
            "error": str(e),
            "schema": {},
            "columns": [],
            "source": "glue"
        })


# Export functions for agent registration
__all__ = ["extract_redshift_queries", "extract_athena_queries", "get_glue_catalog_schema"]
