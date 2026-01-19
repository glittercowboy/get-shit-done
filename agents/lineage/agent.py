"""
Lineage Agent using Strands Agents SDK.

This agent tracks column-level data lineage with:
- SQLGlot-based SQL parsing for lineage extraction
- OpenLineage-compatible event creation
- Upstream/downstream impact analysis via graph traversal

Usage:
    from agents.lineage.agent import lineage_agent

    response = lineage_agent(
        "Parse this SQL and show me the column lineage: SELECT id, UPPER(name) FROM users"
    )
"""

# Import tools - support both package and direct execution
try:
    from .tools.sql_parser import parse_sql_lineage, extract_column_dependencies
    from .tools.openlineage import create_lineage_event, emit_openlineage_event
    from .tools.impact_analyzer import (
        get_downstream_impact,
        get_upstream_sources,
        find_column_by_name
    )
    from .prompts import SYSTEM_PROMPT
except ImportError:
    from agents.lineage.tools.sql_parser import parse_sql_lineage, extract_column_dependencies
    from agents.lineage.tools.openlineage import create_lineage_event, emit_openlineage_event
    from agents.lineage.tools.impact_analyzer import (
        get_downstream_impact,
        get_upstream_sources,
        find_column_by_name
    )
    from agents.lineage.prompts import SYSTEM_PROMPT


def create_lineage_agent():
    """
    Create and return the lineage agent instance.

    Returns:
        Strands Agent configured for lineage tracking

    Raises:
        ImportError: If strands-agents is not installed
    """
    try:
        from strands import Agent
        from strands.models.bedrock import BedrockModel
    except ImportError as e:
        raise ImportError(
            "strands-agents not installed. Run: pip install strands-agents>=1.0.0"
        ) from e

    # Configure Bedrock model with moderate temperature for analysis
    model = BedrockModel(
        model_id="anthropic.claude-sonnet-4-20250514",
        region_name="us-east-1",
        temperature=0.3,  # Moderate temperature for consistent but flexible analysis
    )

    # Create agent with all lineage tools
    agent = Agent(
        model=model,
        system_prompt=SYSTEM_PROMPT,
        tools=[
            # SQL parsing tools
            parse_sql_lineage,
            extract_column_dependencies,
            # OpenLineage tools
            create_lineage_event,
            emit_openlineage_event,
            # Impact analysis tools
            get_downstream_impact,
            get_upstream_sources,
            find_column_by_name,
        ],
    )

    return agent


# Lazy loading support
_agent_instance = None


def get_lineage_agent():
    """Get or create the Lineage agent instance (lazy loading)."""
    global _agent_instance
    if _agent_instance is None:
        _agent_instance = create_lineage_agent()
    return _agent_instance


class LineageAgentProxy:
    """
    Proxy class that lazily loads the agent on first call.

    This allows the module to be imported even if strands is not installed,
    failing only when the agent is actually used.
    """

    def __init__(self):
        self._agent = None

    def _get_agent(self):
        if self._agent is None:
            self._agent = create_lineage_agent()
        return self._agent

    def __call__(self, prompt: str, **kwargs):
        """Run the agent with a prompt."""
        return self._get_agent()(prompt, **kwargs)

    @property
    def tools(self):
        """Access agent's tools."""
        return self._get_agent().tools

    def __getattr__(self, name):
        """Delegate attribute access to the underlying agent."""
        return getattr(self._get_agent(), name)


# Export the proxy as the agent
lineage_agent = LineageAgentProxy()

__all__ = [
    "lineage_agent",
    "create_lineage_agent",
    "get_lineage_agent",
]
