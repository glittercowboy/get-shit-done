"""
SQL Parser tool for column-level lineage extraction.

Uses SQLGlot to parse SQL and extract column-level dependencies,
supporting multiple dialects (Redshift, Athena, PostgreSQL, Presto).
"""

import json
import hashlib
from typing import Optional

# SQLGlot imports
try:
    import sqlglot
    from sqlglot import lineage as sqlglot_lineage
    from sqlglot import exp
    from sqlglot.schema import MappingSchema
    SQLGLOT_AVAILABLE = True
except ImportError:
    SQLGLOT_AVAILABLE = False


def _compute_sql_hash(sql: str) -> str:
    """Compute SHA-256 hash of normalized SQL."""
    # Normalize whitespace and case
    normalized = " ".join(sql.split()).strip()
    return hashlib.sha256(normalized.encode()).hexdigest()


def _extract_tables_from_sql(sql: str, dialect: str = "redshift") -> list[str]:
    """Extract table names from SQL using SQLGlot."""
    if not SQLGLOT_AVAILABLE:
        return []

    tables = set()
    try:
        parsed = sqlglot.parse_one(sql, dialect=dialect)
        for table in parsed.find_all(exp.Table):
            # Build fully qualified name
            parts = []
            if table.catalog:
                parts.append(table.catalog)
            if table.db:
                parts.append(table.db)
            parts.append(table.name)
            tables.add(".".join(parts))
    except Exception:
        pass

    return sorted(tables)


def _extract_target_table(sql: str, dialect: str = "redshift") -> Optional[str]:
    """Extract target table for INSERT/CREATE statements."""
    if not SQLGLOT_AVAILABLE:
        return None

    try:
        parsed = sqlglot.parse_one(sql, dialect=dialect)

        # Check for INSERT INTO
        if isinstance(parsed, exp.Insert):
            table = parsed.this
            if isinstance(table, exp.Table):
                parts = []
                if table.db:
                    parts.append(table.db)
                parts.append(table.name)
                return ".".join(parts)

        # Check for CREATE TABLE AS
        if isinstance(parsed, exp.Create):
            table = parsed.this
            if isinstance(table, exp.Table):
                parts = []
                if table.db:
                    parts.append(table.db)
                parts.append(table.name)
                return ".".join(parts)

    except Exception:
        pass

    return None


def _infer_transformation_type(expression_str: str) -> tuple[str, str, str]:
    """
    Infer OpenLineage transformation type from an expression string.

    Returns (type, subtype, description).
    """
    expr_lower = expression_str.lower()

    # Aggregation functions
    agg_functions = ['sum(', 'count(', 'avg(', 'min(', 'max(', 'array_agg(', 'listagg(', 'string_agg(']
    if any(func in expr_lower for func in agg_functions):
        return "DIRECT", "AGGREGATION", f"Aggregated: {expression_str}"

    # Window functions
    if 'over(' in expr_lower or 'over (' in expr_lower:
        return "INDIRECT", "WINDOW", f"Window function: {expression_str}"

    # String transformations
    string_funcs = ['concat(', 'upper(', 'lower(', 'trim(', 'substring(', 'replace(', 'coalesce(']
    if any(func in expr_lower for func in string_funcs):
        return "DIRECT", "TRANSFORMATION", f"Transformed: {expression_str}"

    # Date transformations
    date_funcs = ['dateadd(', 'datediff(', 'date_trunc(', 'to_date(', 'to_timestamp(']
    if any(func in expr_lower for func in date_funcs):
        return "DIRECT", "TRANSFORMATION", f"Date transformation: {expression_str}"

    # Math operations
    if any(op in expression_str for op in ['+', '-', '*', '/', '%']):
        return "DIRECT", "TRANSFORMATION", f"Calculated: {expression_str}"

    # Case expressions
    if 'case' in expr_lower:
        return "INDIRECT", "CONDITIONAL", f"Conditional: {expression_str}"

    # Default to identity
    return "DIRECT", "IDENTITY", "Direct column reference"


def parse_sql_lineage(
    sql: str,
    dialect: str = "redshift",
    schema: str = "{}"
) -> str:
    """
    Parse SQL and extract column-level lineage.

    Uses SQLGlot to analyze the SQL query and determine which source columns
    contribute to each output column, including transformation information.

    Args:
        sql: The SQL query to parse
        dialect: SQL dialect (redshift, athena, postgres, presto, mysql, bigquery, snowflake, spark, hive)
        schema: JSON string with schema definition for resolving column references.
                Format: {"schema.table": {"column1": "type1", "column2": "type2"}}

    Returns:
        JSON string containing:
        - sql_hash: SHA-256 hash of the SQL
        - source_tables: List of source tables
        - target_table: Target table (for INSERT/CREATE)
        - column_lineages: Array of column lineage objects
        - parse_errors: Any errors encountered

    Example:
        >>> result = parse_sql_lineage(
        ...     "SELECT c.id, CONCAT(c.first, ' ', c.last) as name FROM customers c",
        ...     dialect="redshift",
        ...     schema='{"customers": {"id": "INT", "first": "VARCHAR", "last": "VARCHAR"}}'
        ... )
    """
    if not SQLGLOT_AVAILABLE:
        return json.dumps({
            "error": "SQLGlot not installed. Run: pip install sqlglot>=26.0.0",
            "sql_hash": _compute_sql_hash(sql),
            "source_tables": [],
            "target_table": None,
            "column_lineages": [],
            "parse_errors": ["SQLGlot library not available"]
        })

    result = {
        "sql_hash": _compute_sql_hash(sql),
        "source_tables": [],
        "target_table": None,
        "column_lineages": [],
        "dialect": dialect,
        "parse_errors": []
    }

    try:
        # Parse schema if provided
        schema_dict = json.loads(schema) if schema else {}
        mapping_schema = MappingSchema(schema_dict) if schema_dict else None

        # Extract source tables
        result["source_tables"] = _extract_tables_from_sql(sql, dialect)

        # Extract target table
        result["target_table"] = _extract_target_table(sql, dialect)

        # Parse the SQL
        parsed = sqlglot.parse_one(sql, dialect=dialect)

        # Find SELECT clause to get output columns
        select = parsed.find(exp.Select)
        if not select:
            result["parse_errors"].append("No SELECT clause found")
            return json.dumps(result)

        # Process each output column
        for i, expr in enumerate(select.expressions):
            # Get output column name
            if isinstance(expr, exp.Alias):
                output_col = expr.alias
                source_expr = expr.this
            elif hasattr(expr, 'name'):
                output_col = expr.name or f"column_{i}"
                source_expr = expr
            else:
                output_col = f"column_{i}"
                source_expr = expr

            # Extract source columns from this expression
            source_columns = []
            for col in source_expr.find_all(exp.Column):
                # Build source column reference
                table_name = None
                if col.table:
                    # Try to resolve table alias
                    table_name = col.table
                    # Look for table alias resolution
                    for from_clause in parsed.find_all(exp.From):
                        for table_ref in from_clause.find_all(exp.Table):
                            if hasattr(table_ref, 'alias') and table_ref.alias == col.table:
                                parts = []
                                if table_ref.db:
                                    parts.append(table_ref.db)
                                parts.append(table_ref.name)
                                table_name = ".".join(parts)
                                break

                # Infer transformation type
                expr_str = source_expr.sql(dialect=dialect) if source_expr else ""
                trans_type, trans_subtype, description = _infer_transformation_type(expr_str)

                source_columns.append({
                    "namespace": "unknown",  # Would need actual namespace from schema
                    "table": table_name or "unknown",
                    "column": col.name,
                    "transformation_type": trans_type,
                    "transformation_subtype": trans_subtype,
                    "description": description
                })

            # Handle SELECT * case
            if isinstance(source_expr, exp.Star):
                source_columns.append({
                    "namespace": "unknown",
                    "table": "*",
                    "column": "*",
                    "transformation_type": "DIRECT",
                    "transformation_subtype": "IDENTITY",
                    "description": "SELECT * - schema required for full resolution"
                })

            # Build column lineage
            if source_columns:
                result["column_lineages"].append({
                    "column": output_col,
                    "source_columns": source_columns,
                    "transformation_description": f"Expression: {source_expr.sql(dialect=dialect)}" if source_expr else None
                })

        # Use SQLGlot's built-in lineage for more accurate results if schema available
        if mapping_schema and result["column_lineages"]:
            try:
                for col_lineage in result["column_lineages"]:
                    col_name = col_lineage["column"]
                    node = sqlglot_lineage(
                        column=col_name,
                        sql=sql,
                        schema=mapping_schema,
                        dialect=dialect
                    )
                    # Update with more accurate source info from sqlglot lineage
                    if node:
                        for descendant in node.walk():
                            if descendant.source and descendant.source.name:
                                # This would give us more accurate lineage
                                pass
            except Exception as e:
                result["parse_errors"].append(f"SQLGlot lineage enhancement failed: {str(e)}")

    except Exception as e:
        result["parse_errors"].append(f"Parse error: {str(e)}")

    return json.dumps(result, indent=2)


def extract_column_dependencies(
    sql: str,
    target_column: str,
    dialect: str = "redshift",
    schema: str = "{}"
) -> str:
    """
    Extract lineage for a specific output column.

    Focuses on a single target column and traces back to its source columns,
    providing detailed transformation information.

    Args:
        sql: The SQL query to parse
        target_column: The specific output column to trace
        dialect: SQL dialect (redshift, athena, postgres, presto)
        schema: JSON string with schema definition

    Returns:
        JSON string containing:
        - column: Target column name
        - source_columns: Array of source column references with transformations
        - error: Error message if column not found or parsing fails

    Example:
        >>> result = extract_column_dependencies(
        ...     "SELECT id, UPPER(name) as name_upper FROM users",
        ...     target_column="name_upper",
        ...     dialect="redshift"
        ... )
    """
    if not SQLGLOT_AVAILABLE:
        return json.dumps({
            "column": target_column,
            "source_columns": [],
            "error": "SQLGlot not installed. Run: pip install sqlglot>=26.0.0"
        })

    result = {
        "column": target_column,
        "source_columns": []
    }

    try:
        # Parse schema if provided
        schema_dict = json.loads(schema) if schema else {}
        mapping_schema = MappingSchema(schema_dict) if schema_dict else None

        # First try SQLGlot's built-in lineage
        if mapping_schema:
            try:
                node = sqlglot_lineage(
                    column=target_column,
                    sql=sql,
                    schema=mapping_schema,
                    dialect=dialect
                )

                if node:
                    for descendant in node.walk():
                        if descendant.source and hasattr(descendant.source, 'name'):
                            source_name = descendant.source.name
                            if source_name and source_name != target_column:
                                # Infer transformation type
                                expr_str = str(descendant.expression) if descendant.expression else ""
                                trans_type, trans_subtype, description = _infer_transformation_type(expr_str)

                                result["source_columns"].append({
                                    "namespace": "unknown",
                                    "table": descendant.source.table or "unknown",
                                    "column": source_name,
                                    "transformation_type": trans_type,
                                    "transformation_subtype": trans_subtype,
                                    "description": description
                                })
                    return json.dumps(result, indent=2)
            except Exception:
                pass  # Fall back to manual extraction

        # Fall back to manual extraction
        parsed = sqlglot.parse_one(sql, dialect=dialect)
        select = parsed.find(exp.Select)

        if not select:
            result["error"] = "No SELECT clause found"
            return json.dumps(result)

        # Find the target column expression
        target_expr = None
        for expr in select.expressions:
            col_name = None
            if isinstance(expr, exp.Alias):
                col_name = expr.alias
                if col_name.lower() == target_column.lower():
                    target_expr = expr.this
                    break
            elif hasattr(expr, 'name'):
                col_name = expr.name
                if col_name and col_name.lower() == target_column.lower():
                    target_expr = expr
                    break

        if not target_expr:
            result["error"] = f"Column '{target_column}' not found in SELECT clause"
            return json.dumps(result)

        # Extract source columns
        expr_str = target_expr.sql(dialect=dialect) if target_expr else ""
        trans_type, trans_subtype, description = _infer_transformation_type(expr_str)

        for col in target_expr.find_all(exp.Column):
            result["source_columns"].append({
                "namespace": "unknown",
                "table": col.table or "unknown",
                "column": col.name,
                "transformation_type": trans_type,
                "transformation_subtype": trans_subtype,
                "description": description
            })

    except Exception as e:
        result["error"] = f"Parse error: {str(e)}"

    return json.dumps(result, indent=2)


# Export functions for agent registration
__all__ = ["parse_sql_lineage", "extract_column_dependencies"]
