"""
Lineage Agent package.

Provides column-level data lineage tracking capabilities including:
- SQL parsing with SQLGlot for lineage extraction
- OpenLineage-compatible event creation
- Impact analysis via graph traversal

Usage:
    from agents.lineage import lineage_agent

    response = lineage_agent("Parse this SQL for column lineage...")
"""

from .agent import lineage_agent, create_lineage_agent, get_lineage_agent

__all__ = [
    "lineage_agent",
    "create_lineage_agent",
    "get_lineage_agent",
]
