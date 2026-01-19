---
phase: 03-column-level-lineage
plan: 02
subsystem: agents
tags: [boto3, redshift-data-api, athena, openlineage, lambda, eventbridge, cdk]

# Dependency graph
requires:
  - phase: 03-column-level-lineage
    provides: Lineage graph schema, SQL parser, OpenLineage event creation
provides:
  - AWS query extraction from Redshift SVL_STATEMENTTEXT and Athena
  - OpenLineage consumer endpoint for external tool integration (INT-02)
  - Lineage storage with deduplication via sql_hash
  - Scheduled batch extraction via EventBridge (hourly)
affects: [03-03-PLAN, future Airflow/Spark/dbt integration]

# Tech tracking
tech-stack:
  added:
    - boto3 redshift-data client for Redshift Data API
    - boto3 athena client for query history
    - boto3 glue client for schema lookup
  patterns:
    - Scheduled Lambda extraction via EventBridge
    - OpenLineage RunEvent consumption at /api/openlineage
    - sql_hash deduplication for edge creation
    - Secrets Manager integration for Supabase credentials

key-files:
  created:
    - agents/lineage/tools/aws_extractor.py
    - agents/lineage/tools/lineage_store.py
    - lambdas/lineage_extractor/handler.py
    - lambdas/lineage_extractor/requirements.txt
    - lambdas/openlineage_consumer/handler.py
    - lambdas/openlineage_consumer/requirements.txt
    - infra/lib/lineage-stack.ts
  modified:
    - agents/lineage/tools/__init__.py
    - infra/bin/app.ts

key-decisions:
  - "Redshift Data API for serverless-friendly extraction (matches profiler pattern)"
  - "Athena list_query_executions + batch_get for query history retrieval"
  - "Glue Catalog schema lookup to provide SQLGlot parsing context"
  - "sql_hash deduplication prevents reprocessing same queries"
  - "2-hour lookback on hourly schedule for overlap/safety margin"
  - "OpenLineage consumer at /api/openlineage for INT-02 requirement"

patterns-established:
  - "LineageStack CDK pattern with EventBridge scheduled Lambda"
  - "Secrets Manager secret reference for Lambda environment"
  - "OpenLineage ColumnLineageDatasetFacet parsing and storage"
  - "Batch extraction with error continuation (log and skip failed queries)"

# Metrics
duration: 7min
completed: 2026-01-19
---

# Phase 03 Plan 02: AWS Lineage Extraction Summary

**AWS query extraction from Redshift/Athena with OpenLineage consumer endpoint for external tool integration**

## Performance

- **Duration:** 7 min
- **Started:** 2026-01-19T01:26:01Z
- **Completed:** 2026-01-19T01:32:59Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- AWS extractor tools for Redshift SVL_STATEMENTTEXT and Athena query history
- Lineage storage tools with sql_hash deduplication for graph persistence
- OpenLineage consumer Lambda accepting RunEvents at POST /api/openlineage (INT-02)
- Hourly scheduled extraction via EventBridge with 2-hour lookback window
- CDK stack with full IAM permissions for Redshift Data API, Athena, Glue Catalog

## Task Commits

Each task was committed atomically:

1. **Task 1: AWS Extractor and Lineage Store Tools** - `778caa0` (feat)
2. **Task 2: Lineage Extractor Lambda, OpenLineage Consumer, and CDK Stack** - `f630930` (feat)

## Files Created/Modified

- `agents/lineage/tools/aws_extractor.py` - Redshift/Athena query extraction, Glue schema lookup
- `agents/lineage/tools/lineage_store.py` - Node/edge upsert, lineage result storage, OpenLineage parsing
- `agents/lineage/tools/__init__.py` - Updated exports for new tools
- `lambdas/lineage_extractor/handler.py` - Batch extraction Lambda with run tracking
- `lambdas/lineage_extractor/requirements.txt` - Dependencies including sqlglot
- `lambdas/openlineage_consumer/handler.py` - OpenLineage event consumer with validation
- `lambdas/openlineage_consumer/requirements.txt` - Dependencies for consumer
- `infra/lib/lineage-stack.ts` - CDK stack with Lambdas, EventBridge, API Gateway
- `infra/bin/app.ts` - Added LineageStack to CDK app

## Decisions Made

1. **Redshift Data API over JDBC** - Serverless-friendly, matches existing profiler pattern for Redshift access without VPC.

2. **2-hour lookback on hourly schedule** - Provides overlap margin to catch queries that might be missed at boundary times.

3. **OpenLineage at /api/openlineage** - Standard path for OpenLineage events, enabling Airflow/Spark/dbt integration (INT-02).

4. **sql_hash for deduplication** - SHA-256 of normalized SQL prevents duplicate edges when same query processed multiple times.

5. **Error continuation in batch** - Failed query parsing logs warning but continues, only infrastructure errors fail the run.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all implementations followed established patterns from existing codebase.

## User Setup Required

None - no external service configuration required. Supabase credentials must already exist in Secrets Manager at `profiler/supabase` (created in Phase 01).

## Next Phase Readiness

**Ready for Plan 03-03:**
- Lineage extraction pipeline operational
- Graph populated from AWS query logs
- OpenLineage endpoint ready for external tool integration
- Impact analysis functions available for visualization

**External Integration:**
- Airflow: Configure OpenLineage integration to emit to POST /api/openlineage
- Spark: Use OpenLineage Spark integration with consumer endpoint
- dbt: Configure dbt-openlineage to emit events to consumer

---
*Phase: 03-column-level-lineage*
*Completed: 2026-01-19*
