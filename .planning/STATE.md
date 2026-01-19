# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2025-01-18)

**Core value:** AI agents that automatically profile data assets, recommend quality rules based on patterns, and validate data with actionable alerts
**Current focus:** Phase 3 - Column-Level Lineage

## Current Position

Phase: 3 of 4 (Column-Level Lineage)
Plan: 3 of 3 in current phase
Status: Phase complete
Last activity: 2026-01-19 - Completed 03-03-PLAN.md

Progress: [█████████░] 91%

## Performance Metrics

**Velocity:**
- Total plans completed: 10
- Average duration: 10.0 min
- Total execution time: 1.67 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 3/3 | 37 min | 12.3 min |
| 02-dq-recommendations | 4/4 | 33 min | 8.3 min |
| 03-column-lineage | 3/3 | 30 min | 10.0 min |

**Recent Trend:**
- Last 5 plans: 02-03b (8 min), 03-01 (5 min), 03-02 (7 min), 03-03 (18 min)
- Trend: Visualization plan took longer due to React Flow type complexity

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Init]: 4-phase roadmap consolidating research 6-phase structure for quick depth
- [Init]: Phase order follows architectural dependencies (profile before recommend, recommend before validate)
- [01-01]: VPC with public subnets only (no NAT) for cost savings
- [01-01]: Fargate task placeholder (2 vCPU, 8GB) - container added in 01-02
- [01-01]: Redshift connector uses Data API (serverless-friendly, no VPC required)
- [01-01]: DataConnector abstract base class with factory pattern
- [01-02]: ydata-profiling with minimal=True for performance
- [01-02]: Strands agent with BedrockModel (claude-sonnet-4)
- [01-02]: Z-score (>3 std, 5%) and IQR (10%) thresholds for anomaly detection
- [01-02]: EcsFargateLaunchTarget for Step Functions ECS integration
- [01-02]: Supabase client with 'any' typing for flexibility
- [01-03]: System font stack instead of Google Fonts (build-time network independence)
- [01-03]: Explicit TypeScript interfaces for Supabase entities (vs generated types)
- [01-03]: Polling for profile status (5s interval when running)
- [01-03]: Suspense boundary for useSearchParams (Next.js 15 requirement)
- [02-01]: Bedrock Converse API with temp=0.2 for consistent DQDL generation
- [02-01]: Double braces {{}} for regex quantifiers in Python format strings
- [02-01]: DQRecommenderAgentProxy for lazy loading (mirrors profiler pattern)
- [02-01]: Lambda Powertools APIGatewayHttpResolver for approval handler
- [02-01]: No FK to auth.users in dq_rules (environment flexibility)
- [02-02]: SQS visibility timeout 12h max (CDK limitation vs 24h approval window)
- [02-02]: Glue DQ polling loop in Step Functions (vs sync integration)
- [02-02]: Quality score threshold 0.8 for alert trigger
- [02-02]: Bedrock Converse API direct call in backend (vs agent invocation)
- [02-02]: Freshness monitor schedule every 15 minutes
- [02-02]: Volume anomaly thresholds: <50% or >200% of 7-run average
- [02-03a]: 9 TanStack Query hooks for full rules lifecycle (matches Phase 1 pattern)
- [02-03a]: 13 industry templates by category (format, range, consistency, compliance)
- [02-03a]: Mode selector via query params (?mode=ai|template|manual)
- [02-03a]: Conditional ApprovalPanel rendering for pending rules
- [02-03a]: Required rejection reason for approval workflow
- [02-03b]: 5s polling for running validations (matches profile polling pattern)
- [02-03b]: 30s polling for alert badge count (balance responsiveness vs load)
- [02-03b]: Alert status workflow: open -> acknowledged -> resolved (with snooze)
- [02-03b]: Quality score thresholds: green >80%, yellow 60-80%, red <60%
- [03-01]: PostgreSQL recursive CTEs for graph traversal (vs Neo4j for simplicity)
- [03-01]: OpenLineage transformation types: DIRECT (IDENTITY, TRANSFORMATION, AGGREGATION), INDIRECT (JOIN, GROUP_BY, FILTER, etc.)
- [03-01]: sql_hash field for edge deduplication when re-processing queries
- [03-01]: LineageAgentProxy lazy loading (consistent with profiler/dq_recommender)
- [03-01]: Temperature 0.3 for lineage agent (balance consistency and flexibility)
- [03-02]: Redshift Data API for extraction (serverless-friendly, matches profiler pattern)
- [03-02]: 2-hour lookback on hourly EventBridge schedule (overlap for safety)
- [03-02]: OpenLineage consumer at /api/openlineage (INT-02 external tool integration)
- [03-02]: sql_hash deduplication prevents reprocessing same queries
- [03-02]: Error continuation in batch extraction (log and skip failed queries)
- [03-03]: Index signatures for React Flow type compatibility on node/edge data
- [03-03]: elkjs layered layout: RIGHT direction, 120px layer spacing, 60px node spacing
- [03-03]: Context menu for column analysis (impact, root cause, details)
- [03-03]: URL state for selected nodes (?selected=nodeId) enabling deep linking
- [03-03]: Transformation color coding: DIRECT=blue/gray, INDIRECT=green/orange/purple

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-01-19T01:43:28Z
Stopped at: Completed 03-03-PLAN.md (Phase 3 complete)
Resume file: None
