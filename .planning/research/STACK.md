# Technology Stack: Data Reply Agentic Platform

**Project:** Data Reply Agentic Platform - AI-powered Data Lineage & Quality Module
**Researched:** 2026-01-18
**Overall Confidence:** HIGH (Core stack) / MEDIUM (Supporting libraries)

---

## Executive Summary

This stack recommendation builds on the pre-decided technologies (Next.js/Vercel, AWS Lambda/Step Functions, Amazon Bedrock, Supabase) and completes the picture with specific libraries, versions, and supporting tools for building an AI-powered data quality and lineage platform.

**Key recommendations:**
- **Agent Framework:** Strands Agents SDK (AWS-native, Bedrock-optimized)
- **Data Quality:** AWS Glue Data Quality (DQDL) + ydata-profiling for profiling
- **Data Lineage:** OpenLineage standard + self-hosted Marquez
- **Data Connectivity:** PyIceberg for Iceberg tables, SQLAlchemy dialects for Redshift/Aurora

---

## Pre-Decided Stack (Confirmed)

| Layer | Technology | Version | Confidence |
|-------|------------|---------|------------|
| Frontend Hosting | Vercel | Latest | HIGH |
| Frontend Framework | Next.js | 15.x (App Router) | HIGH |
| Backend Compute | AWS Lambda | Python 3.14 runtime | HIGH |
| Orchestration | AWS Step Functions | Latest | HIGH |
| AI Provider | Amazon Bedrock (Claude) | Claude Sonnet 4 | HIGH |
| Auth | AWS IAM/SSO | Native | HIGH |
| Application Database | Supabase (PostgreSQL) | Latest | HIGH |
| Primary Data Sources | S3/Iceberg, Redshift, RDS/Aurora | Various | HIGH |

---

## Recommended Stack Additions

### Frontend Layer

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| **shadcn/ui** | Latest (2025) | Component library for dashboard UI | HIGH |
| **TanStack Query** | v5.x | Server state management, caching | HIGH |
| **Zod** | 3.x | Runtime validation, API schemas | HIGH |
| **Recharts** | 2.x | Data visualization, quality charts | HIGH |
| **React Flow** | 11.x | Lineage graph visualization | MEDIUM |
| **nuqs** | 2.x | URL state management for filters | MEDIUM |

**Why this combination:**
- shadcn/ui provides accessible, customizable components without vendor lock-in. Trusted by OpenAI, Adobe, and enterprise teams.
- TanStack Query v5 has first-class support for Next.js App Router with streaming and hydration patterns.
- Zod provides runtime validation that TypeScript alone cannot offer for API boundaries.
- React Flow is the standard for node-based graph UIs, ideal for lineage visualization.

**Installation:**
```bash
# shadcn/ui (uses CLI)
npx shadcn@latest init

# Core dependencies
npm install @tanstack/react-query zod recharts @xyflow/react nuqs
```

### AI/Agent Layer

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| **Strands Agents SDK** | 1.x | Agent orchestration framework | HIGH |
| **Amazon Bedrock** | Latest | Foundation model provider | HIGH |
| **Bedrock AgentCore** | Latest | Agent deployment & scaling | MEDIUM |

**Why Strands Agents (not LangChain/CrewAI):**
- **AWS-native:** Built by AWS, first-class Bedrock integration
- **Model-agnostic:** Supports Bedrock, Anthropic API, OpenAI if needed
- **MCP support:** Native Model Context Protocol for tool integration
- **Production-ready:** AgentCore provides serverless deployment
- **Simple:** "Model-driven" approach — agent loop that just works
- **Released May 2025:** Actively maintained, v1.0 with multi-agent in July 2025

```python
# Agent definition pattern
from strands import Agent
from strands.models.bedrock import BedrockModel

model = BedrockModel(
    model_id="anthropic.claude-sonnet-4-20250514",
    region_name="us-east-1"
)

data_profiler = Agent(
    model=model,
    system_prompt="You are a data profiler agent...",
    tools=[profile_table, detect_anomalies, generate_summary]
)
```

**What NOT to use:**
- **LangChain:** Over-engineered for this use case, adds unnecessary abstraction layers
- **CrewAI:** Less mature AWS integration, smaller community
- **Raw Bedrock API:** Missing agent loop, tool orchestration, memory management

### Data Quality Layer

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| **AWS Glue Data Quality** | Latest | Rule execution, DQDL rules | HIGH |
| **ydata-profiling** | 4.18.x | Data profiling, EDA reports | HIGH |
| **Great Expectations** | 1.x | Complex validation rules (fallback) | MEDIUM |

**Why this combination:**

**AWS Glue Data Quality (PRIMARY):**
- Native AWS service, no infrastructure to manage
- DQDL (Data Quality Definition Language) for declarative rules
- Built on DeeQu (open-source) but fully managed
- Dynamic rules with `last(k)` for trend comparison
- ML-based anomaly detection built-in
- **New Nov 2025:** Rule labeling for organization and reporting

```sql
-- DQDL Rule Examples
Rules = [
    ColumnExists "customer_id",
    IsComplete "customer_id",
    IsUnique "customer_id",
    ColumnValues "status" in ["active", "inactive", "pending"],
    RowCount > min(last(3)),  -- Dynamic rule
    Freshness "updated_at" <= 24 hours
]
```

**ydata-profiling (for initial profiling):**
- One-line EDA reports for quick data understanding
- Generates HTML/JSON reports the DQ Recommender agent can parse
- Supports pandas and Spark DataFrames
- Detects patterns, correlations, missing values automatically

```python
from ydata_profiling import ProfileReport
import pandas as pd

df = pd.read_parquet("s3://bucket/table/")
profile = ProfileReport(df, title="Customer Table Profile")
profile_json = profile.to_json()  # Feed to DQ Recommender agent
```

**Great Expectations (for complex validations):**
- Use when DQDL lacks expressiveness (regex, statistical distributions)
- Python-first, integrates with CI/CD
- Steeper learning curve but more powerful

**What NOT to use:**
- **Soda Core alone:** Less AWS integration, commercial features gated
- **dbt tests alone:** Only works within dbt, not standalone validation
- **Custom validation code:** Reinventing the wheel

### Data Lineage Layer

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| **OpenLineage** | 1.x | Lineage event standard | HIGH |
| **Marquez** | 0.49.x | Lineage backend & visualization | MEDIUM |
| **AWS Glue Data Catalog** | Latest | Metadata catalog, basic lineage | HIGH |

**Why OpenLineage + Marquez:**

OpenLineage is not a tool — it's a **standard** for lineage metadata. You emit OpenLineage events from your pipelines and consume them with a backend.

**Architecture:**
```
                    OpenLineage Events
                           |
    +----------------------+----------------------+
    |                      |                      |
[Airflow/MWAA]      [Spark/Glue]           [Custom agents]
    |                      |                      |
    +----------------------+----------------------+
                           |
                           v
                    [Marquez Backend]
                           |
                    +------+------+
                    |             |
                [API]        [Web UI]
                    |
            [Next.js Frontend]
```

**Marquez deployment on AWS:**
- ECS Fargate or EC2 for Marquez server
- Amazon RDS PostgreSQL for metadata storage
- ALB for traffic routing
- AWS provides CDK sample: `aws-samples/aws-mwaa-openlineage`

**Why NOT other options:**
- **Apache Atlas:** Hadoop-era, heavy, less relevant for modern cloud warehouses
- **DataHub:** Feature-rich but overkill for internal MVP
- **Commercial tools (Collibra, Atlan):** Expensive, not needed for 10-50 users

### Data Connectivity Layer

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| **PyIceberg** | 0.10.x | Iceberg table access from Python | HIGH |
| **sqlalchemy-redshift** | 0.8.x | Redshift connectivity | HIGH |
| **sqlalchemy-aurora-data-api** | 0.5.x | Aurora serverless connectivity | MEDIUM |
| **boto3** | 1.35.x | AWS SDK for S3, Glue, etc. | HIGH |
| **pyarrow** | 18.x | Columnar data processing | HIGH |

**Why PyIceberg:**
- Official Python implementation of Iceberg
- No JVM required (unlike Spark)
- Native support for AWS Glue Catalog
- Read/write Iceberg tables directly from Lambda

```python
from pyiceberg.catalog import load_catalog

catalog = load_catalog("glue", **{
    "type": "glue",
    "region_name": "us-east-1"
})

table = catalog.load_table("database.customer_data")
df = table.scan().to_pandas()  # Or .to_arrow()
```

**SQLAlchemy dialects:**
```python
# Redshift
from sqlalchemy import create_engine
engine = create_engine(
    "redshift+psycopg2://user:pass@cluster.region.redshift.amazonaws.com:5439/db"
)

# Aurora PostgreSQL via Data API (serverless-friendly)
engine = create_engine(
    "postgresql+auroradataapi://:@/dbname",
    connect_args={
        "aurora_cluster_arn": "arn:aws:rds:...",
        "secret_arn": "arn:aws:secretsmanager:..."
    }
)
```

### Infrastructure Layer

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| **AWS CDK** | 2.x | Infrastructure as code | HIGH |
| **@aws-cdk/aws-lambda-python-alpha** | Latest | Python Lambda constructs | HIGH |
| **Powertools for AWS Lambda** | 3.x | Observability, best practices | HIGH |

**Why AWS CDK (not Terraform/SAM):**
- TypeScript/Python constructs = reusable, testable
- First-class Step Functions integration
- Native Bedrock integration patterns
- Better for complex orchestration vs. simple deployments

```python
# CDK Lambda definition
from aws_cdk import aws_lambda as lambda_
from aws_cdk.aws_lambda_python_alpha import PythonFunction

profiler_fn = PythonFunction(
    self, "DataProfiler",
    entry="./lambda/profiler",
    runtime=lambda_.Runtime.PYTHON_3_14,
    timeout=Duration.minutes(5),
    memory_size=1024,
    layers=[powertools_layer],
    environment={
        "BEDROCK_MODEL_ID": "anthropic.claude-sonnet-4-20250514"
    }
)
```

**Powertools for AWS Lambda:**
- Structured logging, tracing, metrics
- Idempotency support (critical for data pipelines)
- Parameter Store/Secrets Manager integration
- Batch processing utilities

### Application Database (Supabase)

**Row-Level Security patterns for multi-tenant data:**

```sql
-- Enable RLS
ALTER TABLE data_quality_results ENABLE ROW LEVEL SECURITY;

-- Policy: Users see results for their organization
CREATE POLICY "org_isolation" ON data_quality_results
    FOR SELECT
    USING (org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid);

-- Policy: Agents can write results (service role)
CREATE POLICY "agent_write" ON data_quality_results
    FOR INSERT
    WITH CHECK (true);  -- Service role bypasses RLS
```

**Important RLS considerations:**
- Always separate SELECT, INSERT, UPDATE, DELETE policies
- Use `raw_app_meta_data` for authorization (user cannot modify)
- Add indexes on columns used in policies
- Cache JWT claims with `select` statement optimization

---

## Full Dependency Lists

### Python (Lambda/Agent layer)

```txt
# requirements.txt for Lambda functions

# Agent framework
strands-agents>=1.0.0
strands-agents-tools>=1.0.0

# AWS SDK
boto3>=1.35.0
botocore>=1.35.0

# Data connectivity
pyiceberg[glue,pyarrow,pandas]>=0.10.0
sqlalchemy>=2.0.0
sqlalchemy-redshift>=0.8.0
psycopg2-binary>=2.9.0

# Data quality & profiling
ydata-profiling>=4.18.0
great-expectations>=1.0.0
awswrangler>=3.9.0  # AWS Data Wrangler for Glue/Athena

# Utilities
pydantic>=2.0.0
python-dateutil>=2.9.0

# Observability
aws-lambda-powertools>=3.0.0
```

### Node.js (Frontend)

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "@tanstack/react-query": "^5.0.0",
    "zod": "^3.23.0",
    "recharts": "^2.13.0",
    "@xyflow/react": "^12.0.0",
    "nuqs": "^2.0.0",
    "@supabase/supabase-js": "^2.45.0",
    "date-fns": "^3.6.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/react": "^18.3.0",
    "tailwindcss": "^4.0.0",
    "eslint": "^9.0.0"
  }
}
```

---

## Architecture Integration

```
                                    +-------------------+
                                    |   Next.js/Vercel  |
                                    |  (shadcn, Query)  |
                                    +--------+----------+
                                             |
                            +----------------+----------------+
                            |                                 |
                    +-------v--------+               +--------v-------+
                    |   Supabase     |               |   API Gateway  |
                    |  (PostgreSQL)  |               |                |
                    +----------------+               +--------+-------+
                                                             |
                    +----------------------------------------+
                    |                    |                   |
            +-------v-------+    +-------v-------+   +-------v-------+
            | Step Functions|    | Step Functions|   | Step Functions|
            |  (Profiler)   |    | (Recommender) |   |  (Validator)  |
            +-------+-------+    +-------+-------+   +-------+-------+
                    |                    |                   |
            +-------v-------+    +-------v-------+   +-------v-------+
            |    Lambda     |    |    Lambda     |   |    Lambda     |
            | Strands Agent |    | Strands Agent |   | Strands Agent |
            +-------+-------+    +-------+-------+   +-------+-------+
                    |                    |                   |
                    +--------------------+-------------------+
                                         |
                    +--------------------+--------------------+
                    |                    |                    |
            +-------v-------+    +-------v-------+    +-------v-------+
            |   PyIceberg   |    | Bedrock/Claude|    | Glue Data     |
            |   S3/Iceberg  |    |               |    | Quality       |
            +---------------+    +---------------+    +---------------+
                    |
            +-------v-------+
            |   OpenLineage |
            |   -> Marquez  |
            +---------------+
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not Alternative |
|----------|-------------|-------------|---------------------|
| Agent Framework | Strands Agents | LangChain | Over-abstracted, slower iteration, weaker AWS integration |
| Agent Framework | Strands Agents | CrewAI | Less mature, smaller AWS community |
| Data Quality | AWS Glue DQ | Soda Core | Commercial features gated, less AWS-native |
| Data Quality | ydata-profiling | pandas-profiling | Name changed, use new package name |
| Lineage | OpenLineage + Marquez | Apache Atlas | Hadoop-era, heavy, declining relevance |
| Lineage | OpenLineage + Marquez | DataHub | Overkill for internal MVP |
| Frontend State | TanStack Query | SWR | Less feature-rich, weaker SSR support |
| IaC | AWS CDK | Terraform | Less native AWS integration, no type safety |
| Compute | Lambda | ECS Fargate | Lambda simpler for event-driven agents |

---

## Risk Assessment

| Risk | Mitigation | Confidence |
|------|------------|------------|
| Strands Agents is new (May 2025) | AWS-backed, active development, fallback to raw Bedrock | MEDIUM |
| Marquez self-hosting complexity | Start with AWS sample CDK, consider managed alternative if needed | MEDIUM |
| PyIceberg version compatibility | Pin versions, test against Glue catalog | HIGH |
| Lambda cold starts for agents | Use provisioned concurrency for latency-sensitive paths | HIGH |
| Glue DQ limitations | Fallback to Great Expectations for complex rules | HIGH |

---

## Sources

### Official Documentation (HIGH Confidence)
- [AWS Glue Data Quality](https://docs.aws.amazon.com/glue/latest/dg/glue-data-quality.html)
- [AWS Step Functions Bedrock Integration](https://docs.aws.amazon.com/step-functions/latest/dg/connect-bedrock.html)
- [Strands Agents Documentation](https://strandsagents.com/latest/documentation/docs/)
- [PyIceberg Documentation](https://py.iceberg.apache.org/)
- [TanStack Query SSR Guide](https://tanstack.com/query/v5/docs/react/guides/advanced-ssr)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)

### AWS Blog Posts (MEDIUM-HIGH Confidence)
- [Introducing Strands Agents](https://aws.amazon.com/blogs/opensource/introducing-strands-agents-an-open-source-ai-agents-sdk/)
- [Orchestrate GenAI with Step Functions](https://aws.amazon.com/blogs/machine-learning/orchestrate-generative-ai-workflows-with-amazon-bedrock-and-aws-step-functions/)
- [OpenLineage on Amazon MWAA](https://aws.amazon.com/blogs/big-data/automate-data-lineage-on-amazon-mwaa-with-openlineage/)
- [AWS Glue DQ Dynamic Rules](https://aws.amazon.com/blogs/big-data/get-started-with-aws-glue-data-quality-dynamic-rules-for-etl-pipelines/)

### Community Sources (MEDIUM Confidence)
- [ydata-profiling GitHub](https://github.com/ydataai/ydata-profiling)
- [Marquez Project](https://marquezproject.ai/)
- [OpenLineage Standard](https://openlineage.io/getting-started/)

---

*Research completed: 2026-01-18*
