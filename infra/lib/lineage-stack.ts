import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayIntegrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { Construct } from 'constructs';

/**
 * LineageStack: Creates infrastructure for the Lineage service.
 *
 * Resources:
 * - Lambda function for batch lineage extraction (Redshift/Athena)
 * - Lambda function for OpenLineage event consumption
 * - EventBridge rule for scheduled extraction (hourly)
 * - API Gateway HTTP endpoints for manual trigger and OpenLineage intake
 */
export class LineageStack extends cdk.Stack {
  /** Lambda function for lineage extraction */
  public readonly lineageExtractor: lambda.Function;
  /** Lambda function for OpenLineage consumption */
  public readonly openlineageConsumer: lambda.Function;
  /** EventBridge rule for scheduled extraction */
  public readonly scheduledExtractionRule: events.Rule;
  /** API Gateway HTTP API */
  public readonly httpApi: apigateway.HttpApi;
  /** API endpoint URL */
  public readonly apiEndpoint: string;
  /** OpenLineage endpoint URL */
  public readonly openlineageEndpoint: string;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Reference Supabase secrets (must be created manually or via separate stack)
    const supabaseSecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      'SupabaseSecret',
      'profiler/supabase'
    );

    // ========================================
    // Lineage Extractor Lambda
    // ========================================

    const extractorLogGroup = new logs.LogGroup(this, 'LineageExtractorLogGroup', {
      logGroupName: '/aws/lambda/lineage-extractor',
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.lineageExtractor = new lambda.Function(this, 'LineageExtractor', {
      functionName: 'lineage-extractor',
      description: 'Batch extracts query history from Redshift/Athena and stores column lineage',
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'handler.handler',
      code: lambda.Code.fromAsset('../lambdas/lineage_extractor'),
      timeout: cdk.Duration.minutes(15), // Long extraction jobs
      memorySize: 1024, // SQLGlot parsing needs memory
      environment: {
        POWERTOOLS_SERVICE_NAME: 'lineage-extractor',
        POWERTOOLS_LOG_LEVEL: 'INFO',
        SUPABASE_SECRET_NAME: 'profiler/supabase',
        // REDSHIFT_WORKGROUP set via environment or event
      },
      logGroup: extractorLogGroup,
    });

    // Grant Lambda permission to read Supabase secrets
    supabaseSecret.grantRead(this.lineageExtractor);

    // Grant Redshift Data API permissions
    this.lineageExtractor.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'redshift-data:ExecuteStatement',
          'redshift-data:GetStatementResult',
          'redshift-data:DescribeStatement',
          'redshift-data:ListStatements',
        ],
        resources: ['*'], // Redshift Data API doesn't support resource-level permissions
      })
    );

    // Grant Redshift Serverless permissions for workgroup access
    this.lineageExtractor.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'redshift-serverless:GetCredentials',
        ],
        resources: [`arn:aws:redshift-serverless:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:workgroup/*`],
      })
    );

    // Grant Athena permissions
    this.lineageExtractor.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'athena:ListQueryExecutions',
          'athena:GetQueryExecution',
          'athena:BatchGetQueryExecution',
        ],
        resources: ['*'], // Athena doesn't support resource-level permissions for these actions
      })
    );

    // Grant Glue Catalog permissions
    this.lineageExtractor.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'glue:GetTable',
          'glue:GetDatabase',
          'glue:GetTables',
        ],
        resources: [
          `arn:aws:glue:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:catalog`,
          `arn:aws:glue:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:database/*`,
          `arn:aws:glue:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:table/*`,
        ],
      })
    );

    // ========================================
    // OpenLineage Consumer Lambda
    // ========================================

    const consumerLogGroup = new logs.LogGroup(this, 'OpenLineageConsumerLogGroup', {
      logGroupName: '/aws/lambda/openlineage-consumer',
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.openlineageConsumer = new lambda.Function(this, 'OpenLineageConsumer', {
      functionName: 'openlineage-consumer',
      description: 'Accepts OpenLineage events and stores column lineage (INT-02)',
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'handler.handler',
      code: lambda.Code.fromAsset('../lambdas/openlineage_consumer'),
      timeout: cdk.Duration.seconds(30), // Single event processing
      memorySize: 256,
      environment: {
        POWERTOOLS_SERVICE_NAME: 'openlineage-consumer',
        POWERTOOLS_LOG_LEVEL: 'INFO',
        SUPABASE_SECRET_NAME: 'profiler/supabase',
      },
      logGroup: consumerLogGroup,
    });

    // Grant Lambda permission to read Supabase secrets
    supabaseSecret.grantRead(this.openlineageConsumer);

    // ========================================
    // EventBridge Scheduled Extraction
    // ========================================

    this.scheduledExtractionRule = new events.Rule(this, 'ScheduledLineageExtraction', {
      ruleName: 'lineage-extraction-hourly',
      description: 'Triggers lineage extraction from Redshift/Athena every hour',
      schedule: events.Schedule.rate(cdk.Duration.hours(1)),
      enabled: true,
    });

    // Add Lambda as target with extraction config
    this.scheduledExtractionRule.addTarget(
      new targets.LambdaFunction(this.lineageExtractor, {
        event: events.RuleTargetInput.fromObject({
          source_type: 'all',
          since_hours: 2, // 2-hour lookback for overlap/safety
        }),
      })
    );

    // ========================================
    // API Gateway HTTP API
    // ========================================

    this.httpApi = new apigateway.HttpApi(this, 'LineageApi', {
      apiName: 'lineage-api',
      description: 'HTTP API for lineage extraction and OpenLineage intake',
      corsPreflight: {
        allowHeaders: ['Content-Type', 'Authorization'],
        allowMethods: [
          apigateway.CorsHttpMethod.GET,
          apigateway.CorsHttpMethod.POST,
          apigateway.CorsHttpMethod.OPTIONS,
        ],
        allowOrigins: ['*'], // Restrict in production
        maxAge: cdk.Duration.hours(1),
      },
    });

    // Create Lambda integrations
    const extractorIntegration = new apigatewayIntegrations.HttpLambdaIntegration(
      'ExtractorIntegration',
      this.lineageExtractor
    );

    const consumerIntegration = new apigatewayIntegrations.HttpLambdaIntegration(
      'ConsumerIntegration',
      this.openlineageConsumer
    );

    // Add POST /lineage/extract route (manual trigger)
    this.httpApi.addRoutes({
      path: '/lineage/extract',
      methods: [apigateway.HttpMethod.POST],
      integration: extractorIntegration,
    });

    // Add POST /api/openlineage route (INT-02: OpenLineage intake)
    this.httpApi.addRoutes({
      path: '/api/openlineage',
      methods: [apigateway.HttpMethod.POST],
      integration: consumerIntegration,
    });

    // Add GET /api/openlineage/health route
    this.httpApi.addRoutes({
      path: '/api/openlineage/health',
      methods: [apigateway.HttpMethod.GET],
      integration: consumerIntegration,
    });

    // Store endpoint URLs
    this.apiEndpoint = this.httpApi.apiEndpoint;
    this.openlineageEndpoint = `${this.httpApi.apiEndpoint}/api/openlineage`;

    // ========================================
    // Outputs
    // ========================================

    new cdk.CfnOutput(this, 'LineageExtractorArn', {
      value: this.lineageExtractor.functionArn,
      exportName: 'LineageExtractorArn',
      description: 'ARN of the lineage extractor Lambda function',
    });

    new cdk.CfnOutput(this, 'OpenLineageConsumerArn', {
      value: this.openlineageConsumer.functionArn,
      exportName: 'OpenLineageConsumerArn',
      description: 'ARN of the OpenLineage consumer Lambda function',
    });

    new cdk.CfnOutput(this, 'LineageApiEndpoint', {
      value: this.apiEndpoint,
      exportName: 'LineageApiEndpoint',
      description: 'HTTP API endpoint for lineage operations',
    });

    new cdk.CfnOutput(this, 'OpenLineageEndpoint', {
      value: this.openlineageEndpoint,
      exportName: 'OpenLineageEndpoint',
      description: 'POST endpoint for OpenLineage events (INT-02)',
    });

    new cdk.CfnOutput(this, 'ManualExtractionUrl', {
      value: `${this.apiEndpoint}/lineage/extract`,
      exportName: 'ManualExtractionUrl',
      description: 'POST endpoint to manually trigger lineage extraction',
    });

    new cdk.CfnOutput(this, 'ScheduledExtractionRuleArn', {
      value: this.scheduledExtractionRule.ruleArn,
      exportName: 'ScheduledExtractionRuleArn',
      description: 'ARN of the EventBridge rule for scheduled extraction',
    });
  }
}
