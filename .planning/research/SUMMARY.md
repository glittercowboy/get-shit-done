# Project Research Summary

**Project:** Data Reply Agentic Platform - AI-powered Data Lineage & Quality Module
**Domain:** Data Quality and Lineage Platform with AI Agents
**Researched:** 2026-01-18
**Confidence:** HIGH

## Executive Summary

The Data Reply Agentic Platform is an AI-powered data quality and lineage system targeting 10-50 internal users. Research confirms this is a well-understood domain with mature tooling patterns, but AI-powered features represent the cutting edge where careful implementation is required. The recommended approach follows a **layered architecture** with AWS Step Functions as the orchestration backbone, Strands Agents SDK for AI agent implementation, and OpenLineage for interoperable lineage capture.

The core innovation lies in the three-agent system (Data Profiler, DQ Recommender, Data Validator) that automates rule generation from natural language. Industry benchmarks show AI-assisted rule creation reduces time from 9 minutes to 1 minute per rule. However, this AI capability requires robust guardrails: human-in-the-loop approval is mandatory, and alert fatigue from over-profiling is the primary adoption killer (50-95% false positive rates without proper tuning).

The key architectural risk is treating lineage as a one-time documentation project rather than continuous automated capture. Research strongly recommends building OpenLineage event emission into pipelines from day one. Column-level lineage with transformation tracking is the stated differentiator, but SQL parsing complexity is consistently underestimated. Use battle-tested parsers (sqlglot) and design for graceful degradation.

## Key Findings

### Recommended Stack

The stack builds on pre-decided technologies (Next.js/Vercel, AWS Lambda/Step Functions, Amazon Bedrock, Supabase) with carefully selected additions for agent orchestration, data quality, and lineage.

**Core technologies:**
- **Strands Agents SDK**: Agent framework - AWS-native, Bedrock-optimized, simpler than LangChain
- **AWS Glue Data Quality**: Rule execution - DQDL rules, ML anomaly detection, no infrastructure to manage
- **ydata-profiling**: Data profiling - one-line EDA reports that feed the DQ Recommender agent
- **OpenLineage + Marquez**: Lineage standard - interoperable events, self-hosted backend
- **PyIceberg**: Data connectivity - Iceberg table access from Lambda without JVM
- **React Flow**: Lineage visualization - node-based graph UI for interactive lineage

**Avoid:** LangChain (over-abstracted), Apache Atlas (outdated), full data catalogs (scope creep), real-time streaming DQ (complexity explosion).

### Expected Features

**Must have (table stakes):**
- Automated data profiling with statistics (nulls, distributions, cardinality)
- Column-level lineage with downstream/upstream views
- Basic quality checks (null, unique, referential integrity, freshness)
- Schema validation with type checking
- Alert notifications (Slack minimum)
- Visual lineage graph (interactive)
- Quality metrics dashboard with drill-down

**Should have (competitive):**
- AI-generated validation rules from natural language (core differentiator)
- Transformation tracking in lineage (HOW data transforms, not just WHERE)
- Quality scoring system per table/domain
- Historical trend analysis

**Defer (v2+):**
- ML-based anomaly detection (start with statistical methods)
- Data contracts support (emerging standard, less urgent)
- Business glossary integration
- Impact analysis automation
- Self-healing suggestions

### Architecture Approach

The architecture follows a **5-layer pattern** with strict boundaries: Presentation (Next.js), Orchestration (Step Functions), Intelligence (Bedrock/Strands Agents), Data Access (connectors), and Storage (Supabase + S3). The critical insight is that **agents must be stateless executors** coordinated by Step Functions, never calling each other directly.

**Major components:**
1. **Step Functions Orchestrator** - Coordinates multi-agent workflows, manages state, handles retries
2. **Data Profiler Agent** - Fargate-based, scans datasets, generates statistical profiles
3. **DQ Recommender Agent** - Bedrock-powered, analyzes profiles, suggests DQDL rules
4. **Data Validator Agent** - Batch-compatible, executes rules, computes quality scores
5. **Lineage Store** - PostgreSQL with OpenLineage schema, recursive CTEs for traversal

### Critical Pitfalls

1. **Treating lineage as one-time documentation** - Design automated capture from day one; emit OpenLineage events during pipeline execution; assign ongoing ownership to platform team
2. **SQL parsing complexity underestimation** - Use sqlglot/sqllineage libraries; test against production SQL immediately; design graceful degradation to table-level when column-level fails; budget 3-5x estimated time
3. **Alert fatigue from AI profiling** - Implement 2-4 week learning period; tier alerts by severity with business context; build feedback loops (thumbs up/down); set alert budgets per team
4. **AI agent hallucinations** - Never auto-activate recommendations; require human approval; validate rules against actual data samples; show confidence scores and reasoning
5. **Data quality rule sprawl** - Require root cause analysis before new rules; implement rule ownership with annual review; track rule effectiveness (deprecate rules that never trigger)
6. **Siloed quality tool** - Build integrated quality + lineage + catalog from day one; use shared metadata storage; quality alerts must include lineage context automatically

## Implications for Roadmap

Based on research, suggested phase structure follows architectural dependencies and risk mitigation patterns:

### Phase 1: Foundation
**Rationale:** Everything depends on storage and infrastructure. Cannot build agents without somewhere to store results. Also addresses critical pitfall of siloed architecture.
**Delivers:** Supabase schema (datasets, fields, runs), S3 buckets, CDK infrastructure, basic auth
**Addresses:** Foundation for all table-stakes features
**Avoids:** Siloed architecture pitfall, Iceberg compatibility issues (test early)
**Stack:** Supabase, AWS CDK, Powertools for Lambda

### Phase 2: Data Profiler Agent
**Rationale:** Profiling is the foundation for AI capabilities. DQ Recommender needs profile data. Proves architecture with one end-to-end flow before building all agents.
**Delivers:** Data Profiler Agent on Fargate, S3/Iceberg connector, basic Step Functions workflow, API endpoint
**Uses:** Strands Agents SDK, PyIceberg, ydata-profiling
**Implements:** Data Access Layer, first agent in Intelligence Layer
**Addresses:** Automated data profiling (table stakes)

### Phase 3: DQ Recommender Agent
**Rationale:** AI integration is highest risk after storage. Once profiling works, validate Bedrock integration and human-in-the-loop pattern.
**Delivers:** DQ Recommender Agent, rule generation from profiles, human approval workflow, rule storage
**Uses:** Amazon Bedrock (Claude), AWS Glue Data Quality (DQDL)
**Implements:** Full Intelligence Layer integration
**Addresses:** AI-generated validation rules (key differentiator)
**Avoids:** AI hallucination pitfall (human-in-the-loop built from start)

### Phase 4: Data Validator Agent
**Rationale:** Validation depends on rules from Recommender. Build last in agent chain. Completes the DQ workflow.
**Delivers:** Data Validator Agent, quality check execution, quality scores, alert system
**Uses:** AWS Glue Data Quality, EventBridge, SNS/Slack
**Implements:** Full validation workflow, alerting
**Addresses:** Basic quality checks, freshness monitoring, alerts (table stakes)
**Avoids:** Alert fatigue (implement tiered alerts with feedback loops)

### Phase 5: Column-Level Lineage
**Rationale:** Lineage is additive. Platform works without it. Add once core quality workflow is stable. High complexity for SQL parsing requires dedicated focus.
**Delivers:** OpenLineage schema, lineage capture in agents, lineage API
**Uses:** OpenLineage, PostgreSQL recursive CTEs, sqlglot
**Implements:** Lineage Store, lineage capture
**Addresses:** Column-level lineage (table stakes), transformation tracking (differentiator)
**Avoids:** SQL parsing underestimation (use proven libraries, graceful degradation)

### Phase 6: Lineage UI and Dashboard
**Rationale:** Visualization requires stable lineage data. Build UI once backend is proven.
**Delivers:** Visual lineage graph (React Flow), quality dashboard, historical trending
**Uses:** React Flow, Recharts, TanStack Query
**Implements:** Full Presentation Layer
**Addresses:** Visual lineage graph, quality dashboard (table stakes)

### Phase Ordering Rationale

- **Foundation first:** All subsequent phases depend on storage and infrastructure
- **Profile before Recommend:** AI rule generation requires statistical patterns as input
- **Recommend before Validate:** Validator executes rules; rules come from Recommender
- **Quality before Lineage:** Core value (AI-powered DQ) must work before adding lineage complexity
- **Backend before UI:** Visualization requires stable data; React Flow is straightforward once data exists
- **Human-in-the-loop early:** Building approval workflow in Phase 3 prevents hallucination issues

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (DQ Recommender):** Bedrock tool-use patterns, DQDL rule generation from LLM output
- **Phase 5 (Lineage):** SQL parsing library selection, production SQL complexity testing, OpenLineage event emission patterns

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** CDK patterns well-documented, Supabase setup standard
- **Phase 2 (Profiler):** ydata-profiling and PyIceberg have excellent docs
- **Phase 6 (UI):** React Flow and Recharts have extensive examples

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | AWS official documentation, Strands Agents released May 2025 with active development |
| Features | HIGH | Multiple industry sources agree on table stakes vs differentiators |
| Architecture | HIGH | AWS prescriptive guidance, Step Functions patterns well-documented |
| Pitfalls | HIGH | Verified across vendor docs, community sources, and failure case studies |

**Overall confidence:** HIGH

### Gaps to Address

- **Strands Agents maturity:** Released May 2025, less community content than LangChain. Mitigation: Fallback to raw Bedrock API if issues arise
- **Marquez self-hosting:** Operational complexity for ECS deployment. Mitigation: Use AWS CDK sample, consider simpler PostgreSQL-only approach initially
- **Production SQL parsing:** Cannot fully validate column-level lineage accuracy until tested against real Data Reply SQL. Mitigation: Build graceful degradation, test early in Phase 5

## Sources

### Primary (HIGH confidence)
- [AWS Glue Data Quality Documentation](https://docs.aws.amazon.com/glue/latest/dg/glue-data-quality.html)
- [Strands Agents Documentation](https://strandsagents.com/latest/documentation/docs/)
- [AWS Step Functions Bedrock Integration](https://docs.aws.amazon.com/step-functions/latest/dg/connect-bedrock.html)
- [OpenLineage Specification](https://openlineage.io/docs/)
- [PyIceberg Documentation](https://py.iceberg.apache.org/)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)

### Secondary (MEDIUM confidence)
- [Atlan - Data Quality Solutions 2025](https://atlan.com/know/data-quality-solutions/)
- [Monte Carlo - Data Quality Assessment Tools](https://www.montecarlodata.com/blog-best-quality-assessment-tools/)
- [Metaplane - Column-Level Lineage SQL Parsing](https://www.metaplane.dev/blog/column-level-lineage-an-adventure-in-sql-parsing)
- [AWS Multi-Agent Orchestration Guidance](https://aws.amazon.com/solutions/guidance/multi-agent-orchestration-on-aws/)

### Tertiary (needs validation)
- Strands Agents multi-agent patterns (released July 2025, limited production reports)
- Marquez performance at scale (>100K lineage edges)

---
*Research completed: 2026-01-18*
*Ready for roadmap: yes*
