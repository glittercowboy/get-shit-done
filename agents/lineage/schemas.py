"""
Pydantic schemas for Lineage Agent.

Defines data models for lineage nodes, edges, transformations, and
related types used throughout the lineage tracking workflow.
"""

from enum import Enum
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class NodeType(str, Enum):
    """Types of nodes in the lineage graph."""
    DATASET = "dataset"
    COLUMN = "column"
    JOB = "job"


class EdgeType(str, Enum):
    """Types of edges connecting lineage nodes."""
    DERIVES_FROM = "derives_from"
    TRANSFORMS_TO = "transforms_to"


class TransformationType(str, Enum):
    """OpenLineage transformation types."""
    DIRECT = "DIRECT"    # Data flows directly from source to target
    INDIRECT = "INDIRECT"  # Data affects target through filtering/grouping


class TransformationSubtype(str, Enum):
    """OpenLineage transformation subtypes."""
    # DIRECT subtypes
    IDENTITY = "IDENTITY"          # 1:1 copy without modification
    TRANSFORMATION = "TRANSFORMATION"  # Modified during transfer
    AGGREGATION = "AGGREGATION"    # Aggregated from multiple rows

    # INDIRECT subtypes
    JOIN = "JOIN"                  # Used in join condition
    GROUP_BY = "GROUP_BY"          # Used in GROUP BY clause
    FILTER = "FILTER"              # Used in WHERE clause
    SORT = "SORT"                  # Used in ORDER BY
    WINDOW = "WINDOW"              # Used in window function
    CONDITIONAL = "CONDITIONAL"    # Used in CASE/IF expressions


class LineageNode(BaseModel):
    """
    A node in the lineage graph representing a dataset, column, or job.

    Nodes are connected by edges to form a directed acyclic graph (DAG)
    showing data flow through the system.
    """
    id: Optional[str] = Field(None, description="Node UUID")
    node_type: NodeType = Field(..., description="Type: dataset, column, or job")
    namespace: str = Field(
        ...,
        description="Namespace URI (e.g., redshift://analytics, s3://bucket)"
    )
    name: str = Field(
        ...,
        description="Name (table name for dataset, column name for column)"
    )
    parent_id: Optional[str] = Field(
        None,
        description="Parent node ID (columns reference their parent dataset)"
    )
    data_type: Optional[str] = Field(
        None,
        description="Data type for columns (INT, VARCHAR, etc.)"
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional properties as key-value pairs"
    )
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class LineageEdge(BaseModel):
    """
    An edge in the lineage graph representing data flow between nodes.

    Edges connect source nodes to target nodes and include transformation
    metadata following the OpenLineage specification.
    """
    id: Optional[str] = Field(None, description="Edge UUID")
    source_id: str = Field(..., description="Source node ID")
    target_id: str = Field(..., description="Target node ID")
    edge_type: EdgeType = Field(..., description="Edge type: derives_from or transforms_to")
    transformation_type: Optional[TransformationType] = Field(
        None,
        description="OpenLineage transformation type: DIRECT or INDIRECT"
    )
    transformation_subtype: Optional[TransformationSubtype] = Field(
        None,
        description="OpenLineage subtype: IDENTITY, TRANSFORMATION, JOIN, etc."
    )
    transformation_description: Optional[str] = Field(
        None,
        description="Human-readable description of the transformation"
    )
    job_id: Optional[str] = Field(
        None,
        description="Job node that performed this transformation"
    )
    sql_hash: Optional[str] = Field(
        None,
        description="SHA-256 hash of SQL that created this edge"
    )
    created_at: Optional[datetime] = None


class SourceColumn(BaseModel):
    """A source column in a column lineage relationship."""
    namespace: str = Field(..., description="Source namespace")
    table: str = Field(..., description="Source table name")
    column: str = Field(..., description="Source column name")
    transformation_type: TransformationType = Field(
        default=TransformationType.DIRECT,
        description="Type of transformation"
    )
    transformation_subtype: TransformationSubtype = Field(
        default=TransformationSubtype.IDENTITY,
        description="Subtype of transformation"
    )
    description: Optional[str] = Field(
        None,
        description="Description of the transformation"
    )


class ColumnLineage(BaseModel):
    """
    Column-level lineage showing which source columns contribute to an output column.
    """
    column: str = Field(..., description="Output column name")
    source_columns: List[SourceColumn] = Field(
        default_factory=list,
        description="Source columns that contribute to this output"
    )
    transformation_description: Optional[str] = Field(
        None,
        description="Overall transformation description"
    )


class SQLLineageResult(BaseModel):
    """
    Result of parsing SQL for column-level lineage extraction.
    """
    sql_hash: str = Field(..., description="SHA-256 hash of the SQL statement")
    source_tables: List[str] = Field(
        ...,
        description="List of source tables referenced in the SQL"
    )
    target_table: Optional[str] = Field(
        None,
        description="Target table (for INSERT/CREATE statements)"
    )
    column_lineages: List[ColumnLineage] = Field(
        default_factory=list,
        description="Column-level lineage for each output column"
    )
    dialect: str = Field(default="redshift", description="SQL dialect used")
    parse_errors: List[str] = Field(
        default_factory=list,
        description="Any errors encountered during parsing"
    )


class AffectedNode(BaseModel):
    """A node affected by lineage traversal with depth information."""
    id: str = Field(..., description="Node UUID")
    node_type: NodeType = Field(..., description="Type of node")
    namespace: str = Field(..., description="Node namespace")
    name: str = Field(..., description="Node name")
    parent_id: Optional[str] = Field(None, description="Parent node ID")
    depth: int = Field(..., description="Traversal depth from start node")


class ImpactResult(BaseModel):
    """
    Result of downstream or upstream impact analysis.
    """
    root_node: LineageNode = Field(
        ...,
        description="The starting node for the analysis"
    )
    affected_nodes: List[AffectedNode] = Field(
        default_factory=list,
        description="Nodes affected, ordered by depth"
    )
    total_count: int = Field(
        default=0,
        description="Total number of affected nodes"
    )
    max_depth_reached: int = Field(
        default=0,
        description="Maximum depth reached in traversal"
    )
    analysis_type: str = Field(
        ...,
        description="Type: downstream (impact) or upstream (root cause)"
    )


class LineageRun(BaseModel):
    """
    A lineage extraction run tracking metadata.
    """
    id: Optional[str] = Field(None, description="Run UUID")
    source_type: str = Field(..., description="Source: redshift, athena, glue, manual")
    status: str = Field(default="pending", description="Status: pending, running, completed, failed")
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    queries_processed: int = Field(default=0, description="Number of queries processed")
    edges_created: int = Field(default=0, description="Number of lineage edges created")
    error_message: Optional[str] = Field(None, description="Error message if failed")
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional run metadata"
    )
    created_at: Optional[datetime] = None


# OpenLineage-compatible models

class OpenLineageInputField(BaseModel):
    """Input field for OpenLineage ColumnLineageDatasetFacet."""
    namespace: str
    name: str
    field: str
    transformations: List[Dict[str, str]] = Field(default_factory=list)


class OpenLineageColumnLineage(BaseModel):
    """Column lineage in OpenLineage format."""
    inputFields: List[OpenLineageInputField] = Field(default_factory=list)


class OpenLineageRunEvent(BaseModel):
    """OpenLineage run event structure."""
    eventType: str = Field(..., description="Event type: START, RUNNING, COMPLETE, FAIL, ABORT")
    eventTime: str = Field(..., description="ISO 8601 timestamp")
    producer: str = Field(default="https://data-foundations/lineage-agent")
    schemaURL: str = Field(default="https://openlineage.io/spec/1-0-5/OpenLineage.json")
    run: Dict[str, Any] = Field(..., description="Run information with runId")
    job: Dict[str, Any] = Field(..., description="Job information with namespace and name")
    inputs: List[Dict[str, Any]] = Field(default_factory=list)
    outputs: List[Dict[str, Any]] = Field(default_factory=list)
