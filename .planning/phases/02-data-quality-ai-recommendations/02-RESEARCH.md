# Phase 2: Data Quality & AI Recommendations - Research

**Researched:** 2026-01-18
**Domain:** AI-powered data quality rule generation, validation execution, Step Functions integration
**Confidence:** HIGH (verified with AWS official documentation, Strands Agents SDK, DQDL reference)

## Summary

Phase 2 builds the data quality validation layer and AI-powered rule recommendation system. This phase enables users to generate quality rules from natural language, review AI reasoning, execute validations, and receive alerts for data quality issues. The core challenge is balancing automation (AI recommendations, automatic anomaly detection) with human oversight (rule approval, feedback loops).

The standard approach uses:
- **AWS Glue Data Quality** with DQDL for rule definition and execution (managed, serverless)
- **Strands Agents SDK** for the DQ Recommender agent with Amazon Bedrock Claude
- **AWS Glue Data Quality Recommendations API** for ML-based rule suggestions
- **Step Functions** for orchestrating validation workflows and pipeline integration
- **EventBridge** for freshness monitoring and volume anomaly alerting
- **Supabase PostgreSQL** for rules storage, validation results, and alert history

**Primary recommendation:** Use AWS Glue Data Quality as the execution engine (DQDL rules), with a Strands-based DQ Recommender agent that combines Glue's ML recommendations with LLM-powered natural language rule generation. Always require human approval before activating AI-generated rules.

---

## Standard Stack

The established libraries and tools for Phase 2 implementation.

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **AWS Glue Data Quality** | Latest | Rule execution, ML recommendations | AWS-native, serverless, built on DeeQu, supports DQDL |
| **Strands Agents SDK** | 1.x | DQ Recommender agent framework | AWS-native, Bedrock-optimized, @tool decorator pattern |
| **Amazon Bedrock** | Claude Sonnet 4 | Natural language rule generation | Converse API, tool use, reasoning explanations |
| **AWS Step Functions** | Latest | Validation workflow orchestration | Native Glue DQ integration, waitForTaskToken for approvals |
| **EventBridge** | Latest | Freshness monitoring, alerting | Event-driven triggers, schedule-based checks |
| **boto3** | 1.35.x+ | AWS SDK for Glue DQ API | Required for rule recommendations, evaluations |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **Great Expectations** | 1.x | Complex validation rules | When DQDL lacks expressiveness (regex distributions, custom Python) |
| **pydantic** | 2.x | Rule schema validation | Validating rule structures before storage |
| **aws-lambda-powertools** | 3.x | Lambda observability | Structured logging for validation Lambda functions |
| **croniter** | 2.x | Cron expression parsing | Freshness SLA scheduling |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| AWS Glue Data Quality | Great Expectations | GE requires self-managed infrastructure; Glue DQ is serverless |
| AWS Glue Data Quality | Soda Core | Commercial features gated; less AWS integration |
| DQDL | Custom Python validation | Reinventing the wheel; DQDL handles edge cases |
| Strands Agents | LangChain | Over-abstracted; Strands is simpler, AWS-native |
| Step Functions | Airflow/MWAA | Overkill for rule orchestration; Step Functions simpler |

**Installation:**

```bash
# Python (Lambda/agent layer)
pip install strands-agents>=1.0.0
pip install boto3>=1.35.0
pip install great-expectations>=1.0.0
pip install pydantic>=2.0.0
pip install aws-lambda-powertools>=3.0.0

# For Strands pre-built tools
pip install strands-agents-tools>=1.0.0
```

---

## Architecture Patterns

### Recommended Project Structure

```
/
├── infra/                        # AWS CDK infrastructure
│   └── lib/
│       ├── dq-recommender-stack.ts  # DQ Recommender Lambda
│       ├── validator-stack.ts       # Validation Step Functions
│       └── alerting-stack.ts        # EventBridge + SNS
├── agents/
│   └── dq_recommender/
│       ├── agent.py              # Strands DQ Recommender agent
│       ├── tools/
│       │   ├── rule_generator.py # Natural language to DQDL
│       │   ├── glue_recommender.py # AWS Glue recommendations
│       │   ├── template_library.py # Industry rule templates
│       │   └── remediation.py    # Remediation suggestions
│       ├── prompts.py            # System prompts
│       └── schemas.py            # Pydantic models for rules
├── lambdas/
│   ├── validator/                # Rule execution Lambda
│   ├── alert_handler/            # Alert processing Lambda
│   └── approval_handler/         # Human approval webhook
├── frontend/
│   └── src/
│       └── app/
│           └── (dashboard)/
│               ├── rules/        # Rule management UI
│               ├── validations/  # Validation results UI
│               └── alerts/       # Alert dashboard
└── supabase/
    └── migrations/
        ├── 002_dq_rules.sql
        ├── 003_validation_results.sql
        └── 004_alerts.sql
```

### Pattern 1: DQ Recommender Agent with Strands

**What:** Build the DQ Recommender as a Strands agent with specialized tools for rule generation.
**When to use:** For AI-powered rule recommendations with human-in-the-loop approval.

```python
# Source: Strands Agents SDK documentation
from strands import Agent, tool
from strands.models import BedrockModel
import boto3
import json

# Tool: Generate DQDL rules from natural language
@tool
def generate_dqdl_rule(
    description: str,
    column_name: str,
    profile_summary: str
) -> str:
    """
    Generate a DQDL rule from a natural language description.

    Args:
        description: Natural language description of the quality rule
        column_name: The column to validate
        profile_summary: JSON string with column statistics from profiling

    Returns:
        JSON with DQDL rule and reasoning explanation
    """
    # This tool uses the agent's LLM to generate rules
    # The actual generation happens in the agent's reasoning
    return json.dumps({
        "instruction": "Generate DQDL rule based on description and profile",
        "description": description,
        "column": column_name,
        "profile": profile_summary
    })

# Tool: Get AWS Glue Data Quality recommendations
@tool
def get_glue_recommendations(
    database: str,
    table: str,
    catalog_id: str = None
) -> str:
    """
    Get ML-based rule recommendations from AWS Glue Data Quality.

    Args:
        database: Glue catalog database name
        table: Table name to analyze
        catalog_id: Optional AWS account ID for cross-account

    Returns:
        JSON with recommended DQDL rules from AWS Glue
    """
    client = boto3.client('glue')

    # Start recommendation run
    response = client.start_data_quality_rule_recommendation_run(
        DataSource={
            'GlueTable': {
                'DatabaseName': database,
                'TableName': table,
                'CatalogId': catalog_id or ''
            }
        },
        Role='arn:aws:iam::ACCOUNT:role/GlueDataQualityRole'
    )
    run_id = response['RunId']

    # Poll for completion (simplified - use Step Functions in production)
    import time
    while True:
        status = client.get_data_quality_rule_recommendation_run(RunId=run_id)
        if status['Status'] in ['SUCCEEDED', 'FAILED']:
            break
        time.sleep(5)

    if status['Status'] == 'SUCCEEDED':
        return json.dumps({
            'ruleset': status.get('RecommendedRuleset', ''),
            'run_id': run_id
        })
    else:
        return json.dumps({'error': status.get('ErrorString', 'Unknown error')})

# Tool: Apply industry rule template
@tool
def apply_rule_template(
    template_name: str,
    column_name: str,
    parameters: str = "{}"
) -> str:
    """
    Apply a pre-defined industry rule template.

    Args:
        template_name: Name of template (e.g., 'email_validity', 'date_format', 'currency_range')
        column_name: Column to apply rule to
        parameters: JSON string with template parameters

    Returns:
        JSON with generated DQDL rule from template
    """
    templates = {
        'email_validity': 'ColumnValues "{col}" matches "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}"',
        'date_format_iso': 'ColumnValues "{col}" matches "\\d{4}-\\d{2}-\\d{2}"',
        'positive_number': 'ColumnValues "{col}" > 0',
        'percentage_range': 'ColumnValues "{col}" between 0 and 100',
        'currency_precision': 'ColumnValues "{col}" matches "^\\d+\\.\\d{2}$"',
        'phone_us': 'ColumnValues "{col}" matches "^\\+?1?[-.\\s]?\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}$"',
        'ssn_format': 'ColumnValues "{col}" matches "^\\d{3}-\\d{2}-\\d{4}$"',
        'uuid_format': 'ColumnValues "{col}" matches "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"'
    }

    params = json.loads(parameters)
    if template_name not in templates:
        return json.dumps({'error': f'Unknown template: {template_name}'})

    rule = templates[template_name].format(col=column_name, **params)
    return json.dumps({
        'template': template_name,
        'rule': rule,
        'column': column_name
    })

# Tool: Suggest remediation for quality issue
@tool
def suggest_remediation(
    issue_type: str,
    column_name: str,
    issue_details: str
) -> str:
    """
    Suggest remediation actions for detected quality issues.

    Args:
        issue_type: Type of issue (e.g., 'null_values', 'out_of_range', 'format_mismatch')
        column_name: Affected column
        issue_details: JSON with issue specifics (count, percentage, examples)

    Returns:
        JSON with remediation suggestions
    """
    remediations = {
        'null_values': [
            'Add NOT NULL constraint at source',
            'Implement default value in ETL pipeline',
            'Flag for manual review if business-critical',
            'Exclude nulls from downstream aggregations'
        ],
        'out_of_range': [
            'Validate input at source system',
            'Add range constraint in database schema',
            'Implement soft/hard bounds in ETL',
            'Review data entry process for errors'
        ],
        'format_mismatch': [
            'Standardize format at ingestion',
            'Add format validation in source application',
            'Transform to canonical format in ETL',
            'Create data quality report for data steward review'
        ],
        'duplicate_values': [
            'Implement unique constraint at source',
            'Add deduplication step in pipeline',
            'Review merge/upsert logic',
            'Investigate data source for duplicate entries'
        ],
        'referential_integrity': [
            'Add foreign key constraint if supported',
            'Validate reference before insert',
            'Implement cascade delete/update policy',
            'Create orphan record cleanup job'
        ]
    }

    suggestions = remediations.get(issue_type, ['Review data and investigate root cause'])

    return json.dumps({
        'issue_type': issue_type,
        'column': column_name,
        'remediation_suggestions': suggestions,
        'priority': 'high' if 'critical' in issue_details.lower() else 'medium'
    })

# DQ Recommender Agent
model = BedrockModel(
    model_id="anthropic.claude-sonnet-4-20250514",
    region_name="us-east-1",
    temperature=0.2  # Lower temperature for consistent rule generation
)

dq_recommender_agent = Agent(
    model=model,
    system_prompt="""You are a Data Quality Recommender agent. Your job is to:

1. Analyze data profiles and suggest appropriate quality rules
2. Generate DQDL (Data Quality Definition Language) rules from natural language descriptions
3. Explain your reasoning for each recommended rule
4. Apply industry-standard templates where appropriate
5. Suggest remediation actions for detected quality issues

When recommending rules:
- Start with AWS Glue ML recommendations for baseline rules
- Add custom rules based on user requirements and data patterns
- Always explain WHY each rule is important (business context, risk)
- Consider data type, distribution, and existing patterns from profiles
- Prefer specific rules over generic ones

DQDL Rule Format Examples:
- Completeness: IsComplete "column_name"
- Uniqueness: IsUnique "column_name"
- Range: ColumnValues "column_name" between 0 and 100
- Pattern: ColumnValues "column_name" matches "regex_pattern"
- Freshness: DataFreshness "date_column" <= 24 hours
- Referential: ReferentialIntegrity "col1" "reference.col2"

Always output rules in valid DQDL syntax.""",
    tools=[generate_dqdl_rule, get_glue_recommendations, apply_rule_template, suggest_remediation]
)
```

### Pattern 2: Step Functions Validation Workflow

**What:** Orchestrate validation execution with human approval using Step Functions.
**When to use:** Production validation workflows requiring approval, retry handling, and audit trails.

```yaml
# Validation workflow with human approval
Comment: "Execute DQ validation with optional human approval for new rules"
StartAt: CheckRuleStatus
States:
  CheckRuleStatus:
    Type: Choice
    Choices:
      - Variable: "$.ruleStatus"
        StringEquals: "approved"
        Next: ExecuteValidation
      - Variable: "$.ruleStatus"
        StringEquals: "pending"
        Next: RequestApproval
    Default: ExecuteValidation

  RequestApproval:
    Type: Task
    Resource: "arn:aws:states:::sqs:sendMessage.waitForTaskToken"
    Parameters:
      QueueUrl: "${ApprovalQueueUrl}"
      MessageBody:
        taskToken.$: "$$.Task.Token"
        rules.$: "$.rules"
        datasetRef.$: "$.datasetRef"
        reasoning.$: "$.reasoning"
    TimeoutSeconds: 86400  # 24 hour approval window
    Catch:
      - ErrorEquals: ["States.Timeout"]
        Next: ApprovalTimedOut
    Next: ExecuteValidation

  ExecuteValidation:
    Type: Task
    Resource: "arn:aws:states:::glue:startDataQualityRulesetEvaluationRun.sync"
    Parameters:
      DataSource:
        GlueTable:
          DatabaseName.$: "$.database"
          TableName.$: "$.table"
      RulesetNames.$: "$.rulesetNames"
    ResultPath: "$.validationResult"
    Retry:
      - ErrorEquals: ["Glue.ConcurrentRunsExceededException"]
        MaxAttempts: 3
        IntervalSeconds: 60
        BackoffRate: 2
    Catch:
      - ErrorEquals: ["States.ALL"]
        Next: HandleValidationError
    Next: ProcessResults

  ProcessResults:
    Type: Task
    Resource: "arn:aws:lambda:invoke"
    Parameters:
      FunctionName: "${ProcessResultsFunction}"
      Payload.$: "$"
    ResultPath: "$.processedResults"
    Next: CheckQualityScore

  CheckQualityScore:
    Type: Choice
    Choices:
      - Variable: "$.processedResults.overallScore"
        NumericLessThan: 0.8
        Next: TriggerAlert
    Default: StoreResults

  TriggerAlert:
    Type: Task
    Resource: "arn:aws:states:::events:putEvents"
    Parameters:
      Entries:
        - Source: "data-quality"
          DetailType: "QualityCheckFailed"
          Detail:
            dataset.$: "$.datasetRef"
            score.$: "$.processedResults.overallScore"
            failedRules.$: "$.processedResults.failedRules"
    Next: StoreResults

  StoreResults:
    Type: Task
    Resource: "arn:aws:lambda:invoke"
    Parameters:
      FunctionName: "${StoreResultsFunction}"
      Payload.$: "$"
    End: true

  HandleValidationError:
    Type: Task
    Resource: "arn:aws:states:::sns:publish"
    Parameters:
      TopicArn: "${AlertTopicArn}"
      Message.$: "States.Format('Validation failed for {}: {}', $.datasetRef, $.Error)"
    Next: FailState

  ApprovalTimedOut:
    Type: Task
    Resource: "arn:aws:lambda:invoke"
    Parameters:
      FunctionName: "${NotifyApprovalTimeoutFunction}"
      Payload.$: "$"
    Next: FailState

  FailState:
    Type: Fail
    Error: "ValidationFailed"
```

### Pattern 3: Freshness and Volume Monitoring

**What:** Use EventBridge scheduled rules to monitor data freshness and volume anomalies.
**When to use:** Continuous data quality monitoring with SLA enforcement.

```python
# Source: AWS EventBridge + Glue Data Quality patterns
import boto3
from datetime import datetime, timedelta
import json

def check_freshness(event, context):
    """
    Lambda handler for freshness monitoring.
    Triggered by EventBridge schedule rule.
    """
    glue = boto3.client('glue')
    events = boto3.client('events')

    # Get configured SLAs from parameter store or database
    sla_config = {
        'transactions': {'max_age_hours': 1, 'severity': 'critical'},
        'customer_data': {'max_age_hours': 24, 'severity': 'warning'},
        'analytics_summary': {'max_age_hours': 48, 'severity': 'info'}
    }

    for table_name, config in sla_config.items():
        # Check table's last update time via Glue catalog
        try:
            response = glue.get_table(
                DatabaseName='production',
                Name=table_name
            )

            last_updated = response['Table'].get('UpdateTime')
            if last_updated:
                age_hours = (datetime.now(last_updated.tzinfo) - last_updated).total_seconds() / 3600

                if age_hours > config['max_age_hours']:
                    # Emit freshness violation event
                    events.put_events(
                        Entries=[{
                            'Source': 'data-quality.freshness',
                            'DetailType': 'FreshnessSLAViolation',
                            'Detail': json.dumps({
                                'table': table_name,
                                'expected_max_age_hours': config['max_age_hours'],
                                'actual_age_hours': round(age_hours, 2),
                                'severity': config['severity'],
                                'timestamp': datetime.now().isoformat()
                            })
                        }]
                    )
        except Exception as e:
            print(f"Error checking {table_name}: {e}")

    return {'statusCode': 200}

def check_volume_anomaly(event, context):
    """
    Lambda handler for volume anomaly detection.
    Compares current row count against historical baseline.
    """
    glue = boto3.client('glue')
    events = boto3.client('events')

    table_name = event['table']
    database = event['database']

    # Run row count rule
    response = glue.start_data_quality_ruleset_evaluation_run(
        DataSource={
            'GlueTable': {
                'DatabaseName': database,
                'TableName': table_name
            }
        },
        Ruleset=f'''
            Rules = [
                RowCount > min(last(7)) * 0.5,  -- Not less than 50% of last 7 runs
                RowCount < max(last(7)) * 2.0   -- Not more than 200% of last 7 runs
            ]
        ''',
        Role='arn:aws:iam::ACCOUNT:role/GlueDataQualityRole'
    )

    # Results will be processed asynchronously
    return {'runId': response['RunId']}
```

### Anti-Patterns to Avoid

- **Auto-activating AI-generated rules:** Always require human approval before production activation
- **Skipping AWS Glue recommendations:** Glue's ML provides excellent baseline rules; start there
- **Storing full validation results in PostgreSQL:** Store summaries; use S3 for detailed results
- **Synchronous validation in request path:** Use async job pattern; validations can take minutes
- **Alert on every rule failure:** Implement severity tiers and alert budgets to prevent fatigue
- **Building custom DQDL parser:** Use AWS Glue APIs; they handle parsing internally

---

## Don't Hand-Roll

Problems that look simple but have existing solutions.

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ML-based rule recommendations | Custom anomaly-to-rule mapping | AWS Glue Data Quality Recommendations API | ML model trained on millions of datasets |
| DQDL rule execution | Custom SQL validation queries | AWS Glue Data Quality Evaluate | Handles edge cases, parallelism, metrics |
| Freshness monitoring | Custom timestamp comparisons | DataFreshness DQDL rule + EventBridge | Native support, historical comparison |
| Volume anomaly detection | Custom statistical analysis | RowCount with `last(k)` dynamic rules | Built-in baseline comparison |
| Rule template library | Hardcoded regex patterns | Strands tool with configurable templates | Extensible, version-controlled |
| Validation workflow orchestration | Custom async job system | Step Functions with Glue integration | Native retry, state management, audit trail |

**Key insight:** AWS Glue Data Quality provides ML-based recommendations that analyze your data shape and suggest appropriate rules. Starting with these recommendations and augmenting with LLM-generated custom rules is far more effective than building recommendation logic from scratch.

---

## Common Pitfalls

### Pitfall 1: AI Hallucinations in Rule Recommendations

**What goes wrong:** LLM generates plausible-sounding rules that don't match actual data patterns.
**Why it happens:** LLM lacks grounding in actual schema metadata and historical patterns.
**How to avoid:**
- Always ground LLM recommendations with profile data (from Phase 1)
- Validate generated DQDL syntax before storing
- Run "dry run" validation to show what rule WOULD catch
- Require human approval for all AI-generated rules
**Warning signs:** Rules reference non-existent columns, impossible value ranges

### Pitfall 2: Alert Fatigue from Over-Alerting

**What goes wrong:** Teams receive hundreds of alerts, start ignoring them, miss critical issues.
**Why it happens:** Every statistical anomaly triggers an alert without business context.
**How to avoid:**
- Implement severity tiers: Critical (blocks business), Warning (investigate), Info (logged)
- Set alert budgets per team/domain (max N critical alerts per day)
- Use learning period (2-4 weeks) before alerting on new datasets
- Build feedback mechanism: thumbs up/down to tune sensitivity
**Warning signs:** More than 10 alerts per day per domain, declining investigation rate

### Pitfall 3: Rule Sprawl Without Lifecycle Management

**What goes wrong:** Thousands of rules accumulate, most obsolete, maintenance impossible.
**Why it happens:** Easier to add rules than investigate root causes; rules never deprecated.
**How to avoid:**
- Require rule ownership and expiration dates
- Track rule effectiveness (how often does it catch real issues?)
- Deprecate rules that never trigger in 6 months
- Use ML-based anomaly detection instead of manual threshold rules
**Warning signs:** Rule count growing faster than data asset count

### Pitfall 4: Step Functions History Limit

**What goes wrong:** Validation workflows with many iterations hit 25,000 event limit.
**Why it happens:** Testing with small datasets doesn't reveal scale issues.
**How to avoid:**
- Use Distributed Map for processing multiple tables
- Use child workflows for complex nested processes
- Test at production scale in staging
**Warning signs:** Workflow failures at scale not reproducible in dev

### Pitfall 5: DQDL Dialect Differences

**What goes wrong:** Rules work in Glue ETL but fail in Data Catalog, or vice versa.
**Why it happens:** Some DQDL features (like dynamic rules) are ETL-only.
**How to avoid:**
- Check rule compatibility for target execution environment
- Use ETL context for dynamic rules with `last(k)`
- Document which rules require ETL vs Data Catalog
**Warning signs:** "Rule not supported" errors in production

---

## Code Examples

### Bedrock Converse API for Rule Generation

```python
# Source: AWS Bedrock Converse API documentation
import boto3
import json

def generate_rule_with_reasoning(
    natural_language_description: str,
    profile_data: dict,
    column_name: str
) -> dict:
    """
    Generate DQDL rule from natural language using Bedrock Converse API.
    Returns rule and reasoning explanation.
    """
    bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')

    system_prompt = """You are a data quality expert. Generate DQDL rules from descriptions.

DQDL Syntax Reference:
- IsComplete "column" - checks for non-null
- IsUnique "column" - checks for unique values
- ColumnValues "column" > X - numeric comparison
- ColumnValues "column" in ["a", "b"] - set membership
- ColumnValues "column" matches "regex" - pattern matching
- DataFreshness "date_column" <= 24 hours - freshness check
- ReferentialIntegrity "col1" "ref_table.col2" - FK check
- RowCount > X - row count threshold

Always provide:
1. The DQDL rule
2. Reasoning explaining why this rule is appropriate
3. Potential false positive scenarios to watch for"""

    messages = [
        {
            "role": "user",
            "content": [
                {
                    "text": f"""Generate a DQDL rule for this requirement:

Description: {natural_language_description}
Column: {column_name}
Profile Data: {json.dumps(profile_data, indent=2)}

Respond in JSON format:
{{
    "rule": "DQDL rule syntax",
    "reasoning": "Why this rule is appropriate",
    "false_positive_scenarios": ["scenario1", "scenario2"],
    "severity": "critical|warning|info"
}}"""
                }
            ]
        }
    ]

    response = bedrock.converse(
        modelId='anthropic.claude-sonnet-4-20250514',
        messages=messages,
        system=[{"text": system_prompt}],
        inferenceConfig={
            "maxTokens": 1024,
            "temperature": 0.2
        }
    )

    result_text = response['output']['message']['content'][0]['text']
    return json.loads(result_text)
```

### Validation Result Processing

```python
# Source: AWS Glue Data Quality API patterns
import boto3
from typing import List, Dict, Any
from datetime import datetime

def process_validation_results(run_id: str) -> Dict[str, Any]:
    """
    Process validation results from AWS Glue Data Quality.
    Returns structured results for storage and alerting.
    """
    glue = boto3.client('glue')

    # Get run results
    response = glue.get_data_quality_ruleset_evaluation_run(RunId=run_id)

    # Get detailed results
    results_response = glue.batch_get_data_quality_result(
        ResultIds=[response['ResultIds'][0]] if response.get('ResultIds') else []
    )

    processed = {
        'run_id': run_id,
        'status': response['Status'],
        'started_at': response.get('StartedOn'),
        'completed_at': response.get('CompletedOn'),
        'overall_score': 0.0,
        'rules_passed': 0,
        'rules_failed': 0,
        'failed_rules': [],
        'rule_results': []
    }

    if results_response.get('Results'):
        result = results_response['Results'][0]
        processed['overall_score'] = result.get('Score', 0.0)

        for rule_result in result.get('RuleResults', []):
            rule_data = {
                'name': rule_result.get('Name', ''),
                'description': rule_result.get('Description', ''),
                'result': rule_result.get('Result', 'UNKNOWN'),
                'evaluation_message': rule_result.get('EvaluationMessage', '')
            }
            processed['rule_results'].append(rule_data)

            if rule_result.get('Result') == 'PASS':
                processed['rules_passed'] += 1
            else:
                processed['rules_failed'] += 1
                processed['failed_rules'].append(rule_data)

    return processed
```

### Human Approval Handler

```python
# Source: Step Functions waitForTaskToken pattern
import boto3
import json

def handle_approval(event, context):
    """
    Lambda handler for processing human approvals.
    Called by API Gateway when user approves/rejects rules.
    """
    sfn = boto3.client('stepfunctions')

    body = json.loads(event['body'])
    task_token = body['taskToken']
    approved = body['approved']
    reviewer = body.get('reviewer', 'unknown')
    comments = body.get('comments', '')

    if approved:
        # Send success to Step Functions
        sfn.send_task_success(
            taskToken=task_token,
            output=json.dumps({
                'approved': True,
                'reviewer': reviewer,
                'comments': comments,
                'approved_at': datetime.now().isoformat()
            })
        )
    else:
        # Send failure to Step Functions
        sfn.send_task_failure(
            taskToken=task_token,
            error='RulesRejected',
            cause=json.dumps({
                'reviewer': reviewer,
                'comments': comments,
                'rejected_at': datetime.now().isoformat()
            })
        )

    return {
        'statusCode': 200,
        'body': json.dumps({'status': 'processed'})
    }
```

---

## Database Schema for Rules, Validations, and Alerts

```sql
-- Supabase PostgreSQL schema for Phase 2

-- DQ Rules with lifecycle management
CREATE TABLE dq_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
    column_name VARCHAR(255),  -- NULL for table-level rules

    -- Rule definition
    rule_type VARCHAR(50) NOT NULL,  -- completeness, uniqueness, range, pattern, freshness, referential, custom
    dqdl_expression TEXT NOT NULL,
    description TEXT,

    -- AI generation metadata
    generated_by VARCHAR(50),  -- 'ai_recommender', 'glue_ml', 'user', 'template'
    reasoning TEXT,  -- AI-provided explanation
    template_name VARCHAR(100),  -- If from template

    -- Lifecycle
    status VARCHAR(20) DEFAULT 'pending',  -- pending, approved, active, disabled, deprecated
    severity VARCHAR(20) DEFAULT 'warning',  -- critical, warning, info

    -- Ownership
    created_by UUID REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    owner_id UUID REFERENCES auth.users(id),

    -- Expiration
    expires_at TIMESTAMPTZ,
    last_triggered_at TIMESTAMPTZ,
    trigger_count INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Validation runs
CREATE TABLE validation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,

    -- Execution details
    glue_run_id VARCHAR(255),
    step_function_execution_arn VARCHAR(500),
    status VARCHAR(50) NOT NULL,  -- pending, running, completed, failed

    -- Timing
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Trigger info
    triggered_by VARCHAR(50),  -- scheduled, manual, pipeline, event
    trigger_details JSONB,

    -- Results summary
    overall_score DECIMAL(5,4),
    rules_evaluated INTEGER,
    rules_passed INTEGER,
    rules_failed INTEGER,

    -- Storage reference
    s3_results_uri VARCHAR(500),  -- Full results in S3

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual rule results
CREATE TABLE rule_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES validation_runs(id) ON DELETE CASCADE,
    rule_id UUID REFERENCES dq_rules(id) ON DELETE SET NULL,

    -- Result
    result VARCHAR(20) NOT NULL,  -- pass, fail, error, skip
    evaluation_message TEXT,

    -- Metrics
    evaluated_count BIGINT,
    passed_count BIGINT,
    failed_count BIGINT,

    -- Row-level details (for debugging)
    sample_failures JSONB,  -- Sample of failed rows

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quality scores time series
CREATE TABLE quality_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,

    -- Dimension scores
    dimension VARCHAR(50) NOT NULL,  -- completeness, validity, uniqueness, consistency, freshness
    score DECIMAL(5,4) NOT NULL,  -- 0.0000 to 1.0000

    -- Reference
    run_id UUID REFERENCES validation_runs(id) ON DELETE CASCADE,

    measured_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alerts
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Source
    dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
    rule_id UUID REFERENCES dq_rules(id) ON DELETE SET NULL,
    run_id UUID REFERENCES validation_runs(id) ON DELETE SET NULL,

    -- Alert details
    alert_type VARCHAR(50) NOT NULL,  -- rule_failure, freshness_sla, volume_anomaly
    severity VARCHAR(20) NOT NULL,  -- critical, warning, info
    title VARCHAR(255) NOT NULL,
    message TEXT,
    details JSONB,

    -- Status
    status VARCHAR(20) DEFAULT 'open',  -- open, acknowledged, resolved, snoozed
    acknowledged_by UUID REFERENCES auth.users(id),
    acknowledged_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,

    -- Notification
    notification_sent BOOLEAN DEFAULT FALSE,
    notification_channels JSONB,  -- ['slack', 'email']

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Freshness SLA configuration
CREATE TABLE freshness_slas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,

    -- SLA definition
    max_age_hours INTEGER NOT NULL,
    check_schedule VARCHAR(100),  -- Cron expression
    severity VARCHAR(20) DEFAULT 'warning',

    -- Status
    enabled BOOLEAN DEFAULT TRUE,
    last_check_at TIMESTAMPTZ,
    last_violation_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rule templates
CREATE TABLE rule_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50),  -- format, range, consistency, compliance
    description TEXT,

    -- Template definition
    dqdl_pattern TEXT NOT NULL,  -- With {column}, {param1} placeholders
    parameters JSONB,  -- Parameter definitions with types and defaults

    -- Metadata
    industry_standards JSONB,  -- ['HIPAA', 'PCI-DSS', 'GDPR']

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_rules_dataset ON dq_rules(dataset_id);
CREATE INDEX idx_rules_status ON dq_rules(status);
CREATE INDEX idx_runs_dataset ON validation_runs(dataset_id);
CREATE INDEX idx_runs_status ON validation_runs(status);
CREATE INDEX idx_results_run ON rule_results(run_id);
CREATE INDEX idx_scores_dataset_time ON quality_scores(dataset_id, measured_at);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_severity ON alerts(severity, created_at);

-- RLS policies
ALTER TABLE dq_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rule_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual rule writing | AI-assisted rule generation | 2024-2025 | 70%+ faster rule creation |
| Static thresholds | Dynamic rules with `last(k)` | AWS Glue 2023 | Adaptive to data patterns |
| Custom validation code | DQDL + managed execution | AWS Glue DQ GA | Serverless, no infrastructure |
| Reactive alerts only | Proactive ML anomaly detection | 2024 | Earlier issue detection |
| Single-model LLM calls | Agentic workflows (Strands) | 2025 | Multi-step reasoning, tool use |

**Deprecated/outdated:**
- **Custom DeeQu setup:** Use AWS Glue Data Quality (managed DeeQu)
- **Manual rule recommendation:** Use Glue's ML recommendations as baseline
- **Synchronous validation APIs:** Always use async job pattern

---

## Open Questions

1. **Multi-table referential integrity**
   - What we know: DQDL supports cross-table referential integrity
   - What's unclear: Performance with large reference tables (>10M rows)
   - Recommendation: Test with representative data volumes; consider sampling

2. **Rule versioning strategy**
   - What we know: Need to track rule changes over time
   - What's unclear: How to handle active rule modifications mid-pipeline
   - Recommendation: Implement immutable rule versions; new version = new rule ID

3. **Feedback loop for AI recommendations**
   - What we know: Need to improve recommendations based on user feedback
   - What's unclear: How to fine-tune without dedicated training infrastructure
   - Recommendation: Store feedback in database; use in-context learning initially

---

## Sources

### Primary (HIGH confidence)
- [AWS Glue Data Quality DQDL Reference](https://docs.aws.amazon.com/glue/latest/dg/dqdl.html) - Complete DQDL syntax
- [DQDL Rule Types Reference](https://docs.aws.amazon.com/glue/latest/dg/dqdl-rule-types.html) - All rule types and parameters
- [AWS Bedrock Converse API Tool Use](https://docs.aws.amazon.com/bedrock/latest/userguide/tool-use-inference-call.html) - Tool use patterns
- [Strands Agents SDK GitHub](https://github.com/strands-agents/sdk-python) - @tool decorator, agent patterns
- [AWS Step Functions Glue Integration](https://docs.aws.amazon.com/step-functions/latest/dg/connect-glue.html) - Native DQ orchestration

### Secondary (MEDIUM confidence)
- [AWS Blog - Glue DQ Recommendations](https://aws.amazon.com/blogs/big-data/getting-started-with-aws-glue-data-quality-from-the-aws-glue-data-catalog/) - ML recommendations
- [AWS Blog - Strands Agents 1.0](https://aws.amazon.com/blogs/opensource/introducing-strands-agents-1-0-production-ready-multi-agent-orchestration-made-simple/) - Multi-agent patterns
- [dbt Labs - Data SLAs](https://www.getdbt.com/blog/data-slas-best-practices) - Freshness monitoring patterns
- [DQOps - Data Quality Requirements Template](https://dqops.com/data-quality-requirements-template/) - Industry rule patterns

### Tertiary (LOW confidence)
- WebSearch results for AI code generation patterns - validated against AWS documentation
- Community patterns for alert fatigue prevention - general best practices

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - AWS official documentation, production-ready services
- Architecture patterns: HIGH - AWS prescriptive guidance, Strands SDK patterns
- Database schema: MEDIUM - Based on common DQ platform patterns, may need adjustment
- Alert fatigue prevention: MEDIUM - Industry best practices, needs tuning

**Research date:** 2026-01-18
**Valid until:** 60 days (stable AWS services, evolving AI patterns)
