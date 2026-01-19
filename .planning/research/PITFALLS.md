# Domain Pitfalls: Data Quality and Lineage Platforms

**Domain:** AI-powered data quality and lineage platform (Data Reply Agentic Platform)
**Researched:** 2026-01-18
**Confidence:** HIGH (verified against multiple industry sources and vendor documentation)

---

## Critical Pitfalls

Mistakes that cause rewrites, major failures, or project abandonment. Address these in early phases.

---

### Pitfall 1: Treating Lineage as a One-Time Documentation Project

**What goes wrong:** Teams approach lineage as a compliance checkbox—map data flows once for auditors, then move on. Within weeks, the lineage graph becomes stale as pipelines evolve, schemas change, and new sources are added.

**Why it happens:** Lineage is often funded by audit/compliance budgets with a specific deadline. Once the audit passes, there's no operational mandate to maintain it.

**Consequences:**
- Engineers discover outdated lineage, lose trust, stop consulting it entirely
- Impact analysis during incidents uses wrong information, causing longer outages
- Compliance audits in subsequent years require complete remapping
- Investment wasted—teams end up rebuilding from scratch

**Warning signs:**
- Lineage project has a "completion date" rather than ongoing ownership
- No automated lineage extraction from pipelines
- Lineage metadata stored separately from operational systems
- "Lineage refresh" appears as a quarterly task

**Prevention:**
- Design lineage capture as part of pipeline execution (emit OpenLineage events)
- Store lineage in the same metadata layer as operational catalog
- Make lineage freshness a monitored metric
- Assign ongoing ownership to data platform team, not a project team

**Phase mapping:** Address in Phase 1 (Foundation). Build automated lineage capture from day one—retrofitting is 10x harder.

**Sources:** [Seemore Data - Data Lineage 2025](https://seemoredata.io/blog/data-lineage-in-2025-examples-techniques-best-practices/), [Hevo Data - Lineage Implementation Challenges](https://hevodata.com/learn/data-lineage-implementation-challenges/)

---

### Pitfall 2: Column-Level Lineage SQL Parsing Complexity Underestimation

**What goes wrong:** Teams assume column-level lineage is "just parse the SQL." They underestimate edge cases: `SELECT *`, nested CTEs, dynamic SQL, window functions, pivots, JSON unpacking, lateral joins, and macro expansion (dbt).

**Why it happens:** Simple SQL examples work easily. Real production SQL is thousands of lines with hundreds of CTEs and dialect-specific features.

**Consequences:**
- Incomplete lineage graphs with unexplained gaps
- False confidence in impact analysis ("column X isn't used anywhere"—actually it is, but parsing failed)
- Performance issues when parsing complex queries at scale
- Constant maintenance burden as SQL patterns evolve

**Warning signs:**
- Initial prototype "works" on sample queries but hasn't been tested on production SQL
- No strategy for handling `SELECT *` (requires schema resolution)
- Assuming one SQL parser handles all warehouse dialects
- No graceful degradation when parsing fails

**Prevention:**
- Use battle-tested SQL parsing libraries (sqlglot, sqllineage) rather than building from scratch
- Design for graceful degradation: when parsing fails, capture table-level lineage and flag for manual review
- Test against real production SQL from day one, not synthetic examples
- Plan for dialect differences (Redshift SQL vs Spark SQL vs standard)
- Budget 3-5x more time for parsing than initial estimates

**Phase mapping:** Address in Phase 2 (Lineage Foundation). Do NOT promise column-level lineage in MVP without validating against production SQL complexity.

**Sources:** [Metaplane - Column-Level Lineage SQL Parsing](https://www.metaplane.dev/blog/column-level-lineage-an-adventure-in-sql-parsing), [SQLLineage Documentation](https://sqllineage.readthedocs.io/en/latest/behind_the_scene/column-level_lineage_design.html)

---

### Pitfall 3: Alert Fatigue from Over-Profiling

**What goes wrong:** AI profiling generates thousands of anomaly alerts. Teams initially investigate each one. Within weeks, they ignore alerts entirely. Critical data quality issues get missed alongside false positives.

**Why it happens:** Automated profiling detects statistical anomalies, but most anomalies are expected business variations (seasonal patterns, marketing campaigns, product launches). Without context, every deviation looks like an error.

**Consequences:**
- 50-95% false positive rates (industry benchmarks)
- Critical alerts missed—the "boy who cried wolf" effect
- Teams disable alerting or create workarounds, defeating the purpose
- AI recommendations lose credibility, reducing adoption
- Up to 30% of actual issues go uninvestigated

**Warning signs:**
- Alerts lack severity levels or business context
- No baseline learning period before alerting
- Alerting on statistical anomalies without business rules
- No feedback loop to tune sensitivity
- More than 10 alerts per day per data domain

**Prevention:**
- Implement a learning period (2-4 weeks) before enabling alerts on new datasets
- Tier alerts: Critical (blocks business), Warning (investigate when possible), Info (logged only)
- Require business context for Critical alerts (e.g., "revenue data" vs "debug logs")
- Build feedback mechanisms: thumbs up/down on alerts that tune future sensitivity
- Set alert budgets per team (max N critical alerts per day)
- Use behavioral baselines, not just static thresholds

**Phase mapping:** Address in Phase 3 (AI Profiling). Build feedback loops from the start—retrofitting alert tuning is very difficult.

**Sources:** [Resolve.io - False Positive Alerts](https://resolve.io/blog/false-positive-alerts-a-hidden-risk-in-observability), [DataBahn - Alert Fatigue](https://www.databahn.ai/blog/siem-alert-fatigue-false-positive)

---

### Pitfall 4: AI Agent Hallucinations in Rule Recommendations

**What goes wrong:** LLM-based agents recommend data quality rules that are plausible-sounding but factually wrong. Users trust AI recommendations, implement bad rules, and either miss real issues or create cascading false positives.

**Why it happens:** LLMs generate statistically likely outputs, not verified facts. Without grounding in actual schema metadata and historical patterns, recommendations are "educated guesses" that can be confidently wrong.

**Consequences:**
- Rules that don't match actual data patterns (wrong column types, impossible value ranges)
- Cascading errors if bad rules are used in downstream validation
- Loss of trust in AI features—users stop using recommendations
- Legal/compliance risk if hallucinated rules miss actual violations

**Warning signs:**
- AI recommendations go directly to production without human review
- No validation of recommended rules against actual data samples
- Recommendations reference columns or patterns that don't exist
- No confidence scores or explanations for recommendations

**Prevention:**
- Always validate AI-recommended rules against actual data samples before activation
- Require human approval for rule activation (human-in-the-loop)
- Show AI confidence scores and reasoning chain
- Cross-check recommendations against schema metadata
- Use retrieval-augmented generation (RAG) grounded in actual catalog metadata
- Implement "dry run" mode: show what the rule WOULD catch before activating

**Phase mapping:** Critical for Phase 3 (AI Profiling) and Phase 4 (AI Rule Recommendations). Never auto-activate AI recommendations.

**Sources:** [Appsmith - De-hallucinate AI Agents](https://www.appsmith.com/blog/de-hallucinate-ai-agents), [B EYE - Enterprise Data Gaslighting LLMs](https://b-eye.com/blog/llm-hallucinations-enterprise-data/)

---

### Pitfall 5: Data Quality Rule Sprawl

**What goes wrong:** Teams create rules reactively—every data incident spawns new rules. Within months, there are thousands of rules, most redundant or obsolete. Maintenance becomes impossible, rule execution slows pipelines, and no one knows which rules matter.

**Why it happens:** It's easier to add a rule than to investigate root causes. Rules are never deprecated. No governance over rule creation.

**Consequences:**
- Average enterprise: ~2,600 rules, only 30% actively used
- Estimated 85 person-days/year just maintaining rules
- Implementation cost of several hundred euros per rule
- Pipeline slowdowns from executing unnecessary validations
- Conflicting rules that trigger on the same data

**Warning signs:**
- No rule ownership or expiration dates
- Rules added without understanding root cause of issues
- No metrics on rule effectiveness (how often does this rule catch real issues?)
- Different teams creating similar rules independently
- Rule count growing faster than data asset count

**Prevention:**
- Require root cause analysis before creating new rules (fix source, not symptoms)
- Implement rule ownership with annual review/renewal
- Track rule effectiveness: rules that never trigger in 6 months are candidates for deprecation
- Create a rule library with reusable patterns instead of one-off rules
- Set rule budgets per data domain
- Prefer ML-based anomaly detection over manual threshold rules for patterns that change

**Phase mapping:** Address in Phase 4 (Rule Management). Build rule lifecycle governance before the library grows.

**Sources:** [TELM.ai - Why DQ Rules Engines Fail](https://www.telm.ai/blog/why-your-dq-rules-engine-is-failing-and-how-to-fix-it/), [Monte Carlo - Rules You Should Never Write](https://www.montecarlodata.com/blog-the-5-data-quality-rules-you-should-never-write-again/)

---

### Pitfall 6: Siloing Data Quality from Lineage and Catalog

**What goes wrong:** Teams build data quality as a standalone tool. Quality checks run, but there's no connection to lineage (which downstream assets are affected?) or catalog (who owns this data? what's the business context?).

**Why it happens:** Different vendors, different teams, different budgets. Quality tools are bought/built in isolation.

**Consequences:**
- Quality alerts lack business context (is this a critical revenue table or a test dataset?)
- No impact analysis when quality issues are found
- Duplicate work: quality team documents data separately from catalog team
- Users must switch between 3+ tools to understand a single dataset
- 67% of organizations don't trust their data for decision-making

**Warning signs:**
- Quality tool doesn't know about data ownership
- Lineage tool doesn't show quality scores
- Quality alerts don't link to downstream consumers
- Metadata exists in multiple systems with no synchronization

**Prevention:**
- Design quality, lineage, and catalog as integrated capabilities from day one
- Use shared metadata storage (single source of truth for assets)
- Quality alerts should include lineage context automatically
- Ownership from catalog should drive alert routing

**Phase mapping:** Foundation architecture decision. Address in Phase 1 (Foundation)—build integrated from start.

**Sources:** [Atlan - Data Quality Issues](https://atlan.com/data-quality-issues/), [Atlan - Data Quality Solutions 2025](https://atlan.com/know/data-quality-solutions/)

---

## Moderate Pitfalls

Mistakes that cause delays, technical debt, or reduced value. Address in early-to-mid phases.

---

### Pitfall 7: Step Functions History Limit for Complex Pipelines

**What goes wrong:** AWS Step Functions Standard workflows have a 25,000 event history limit. Data pipelines with many iterations (processing thousands of files, records, or partitions) hit this limit and fail unexpectedly.

**Why it happens:** Developers test with small datasets. Production scales hit limits never seen in development.

**Consequences:**
- Pipeline failures at scale that don't reproduce in dev/test
- Entire workflow restarts required (no partial recovery pre-2023)
- Difficult debugging—must manually dig through EMR/Lambda logs
- Unexpected production outages during high-volume periods

**Warning signs:**
- Loops in Step Functions that iterate over data (not using Distributed Map)
- No testing at production scale
- Hard-coded ARNs (can't switch environments)
- No error handling at step level

**Prevention:**
- Use Distributed Map for high-cardinality iterations
- Use child workflows for complex nested processes
- Test at production scale in staging
- Add explicit error catching and retry logic to each step
- Use CloudFormation/Terraform for environment-specific ARNs
- Consider MWAA (Airflow) if workflows are complex—Step Functions best for simple orchestration

**Phase mapping:** Address in Phase 2 (Infrastructure). Architect for scale from the start.

**Sources:** [Thoughtworks - Building Data Pipelines with Step Functions](https://thoughtworks-es.medium.com/taming-the-monster-building-data-pipelines-with-aws-step-functions-114758633be2), [AWS Big Data Blog - ETL with Step Functions](https://aws.amazon.com/blogs/big-data/build-efficient-etl-pipelines-with-aws-step-functions-distributed-map-and-redrive-feature/)

---

### Pitfall 8: Iceberg Version Compatibility Across Query Engines

**What goes wrong:** Teams adopt Iceberg V2/V3 features (row-level deletes, deletion vectors, row lineage) but some query engines don't support them. Tables that work in Spark fail in Athena, or Redshift can't read certain manifests.

**Why it happens:** Iceberg spec adoption is uneven. ClickHouse is read-only. DuckDB writing support was limited. Different AWS services support different Iceberg versions.

**Consequences:**
- Tables written by one engine unreadable by another
- Features downgraded to "lowest common denominator" across the organization
- Unexpected query failures in production
- Blocked migrations when incompatibilities are discovered late

**Warning signs:**
- Assuming "Iceberg compatible" means full feature support
- Not testing read/write across all query engines in stack
- Adopting V3 features without verifying consumer compatibility
- Mixed Spark, Athena, Redshift access without compatibility matrix

**Prevention:**
- Create compatibility matrix: which engines read/write which Iceberg features
- Test cross-engine access explicitly before production
- Standardize on Iceberg version supported by ALL engines in use
- Plan upgrade paths when new engine versions release
- Use AWS Glue Data Catalog as central metastore for consistency

**Phase mapping:** Address in Phase 1 (Foundation). Technology selection must account for compatibility.

**Sources:** [Quesma - Apache Iceberg Practical Limitations 2025](https://quesma.com/blog/apache-iceberg-practical-limitations-2025/), [AWS Big Data Blog - Iceberg V3](https://aws.amazon.com/blogs/big-data/accelerate-data-lake-operations-with-apache-iceberg-v3-deletion-vectors-and-row-lineage/)

---

### Pitfall 9: Metadata Extraction Gaps Creating Lineage Blind Spots

**What goes wrong:** Some tools expose rich metadata APIs (dbt, Spark), others barely document internals (legacy ETL, custom scripts). Legacy applications have no metadata capabilities. Result: lineage graphs have invisible gaps.

**Why it happens:** Lineage tools depend on metadata APIs. No API = no lineage.

**Consequences:**
- False confidence in lineage completeness
- Critical data flows invisible to impact analysis
- Compliance gaps where lineage can't be proven
- Manual documentation that becomes stale

**Warning signs:**
- Lineage tool shows 100% coverage but you know there are manual processes
- Legacy ETL jobs not represented in lineage
- "Unknown" sources appearing in lineage graphs
- Business users mention data flows not in the lineage

**Prevention:**
- Inventory ALL data movement mechanisms before selecting lineage approach
- Plan explicit integration strategy for each: native API, log parsing, manual annotation
- Accept that some lineage will be manual—build workflows for it
- Show lineage confidence/completeness scores, not just the graph
- Prioritize lineage for high-value assets first

**Phase mapping:** Address in Phase 2 (Lineage). Inventory gaps before committing to architecture.

**Sources:** [Gable.ai - Data Lineage Challenges](https://www.gable.ai/blog/data-lineage-challenges), [OvalEdge - Lineage Challenges](https://www.ovaledge.com/blog/data-lineage-challenges)

---

### Pitfall 10: Governance Frameworks Built for Human Speed, Not AI Agent Speed

**What goes wrong:** AI agents request data access at machine speed—thousands of requests per minute. Existing governance systems assume human-speed access requests with manual approvals, role-based access, and predictable patterns.

**Why it happens:** Governance tools were designed before agentic AI. Traditional access control assumes humans filling out forms.

**Consequences:**
- Governance bottlenecks block AI agent effectiveness
- Agents bypass governance to maintain performance (security risk)
- Audit logs overwhelmed by agent activity
- Privacy violations when agents access data faster than policies can evaluate

**Warning signs:**
- Manual approval steps in data access workflows
- Role-based access not designed for service accounts
- No rate limiting or anomaly detection on data access
- Audit logs don't distinguish human vs agent access

**Prevention:**
- Design policy-as-code that evaluates at query time, not approval time
- Implement service account governance distinct from human access
- Add rate limiting and anomaly detection for agent access patterns
- Build agent-specific audit trails with decision explanations
- Require human approval for new access patterns, auto-approve within established patterns

**Phase mapping:** Address in Phase 3 (AI Agents). Governance architecture must accommodate agent patterns.

**Sources:** [Immuta - AI Agents Reshaping Data Governance](https://www.immuta.com/guides/data-security-101/how-ai-agents-are-reshaping-data-governance/), [Dataversity - Data Danger of Agentic AI](https://www.dataversity.net/articles/the-data-danger-of-agentic-ai/)

---

### Pitfall 11: Trying to Capture Everything (Lineage Noise)

**What goes wrong:** Teams attempt comprehensive lineage across every data movement. Result: cluttered, noisy graphs that are hard to use. Engineers need lineage for specific troubleshooting, not a firehose of every connection.

**Why it happens:** Completeness feels safer than selectivity. Hard to know what's "important" upfront.

**Consequences:**
- Large graphs slow performance (millions of nodes)
- Important relationships buried in noise
- Users can't find what they need, stop using the tool
- Storage and compute costs for unused metadata

**Warning signs:**
- Lineage for debug/test tables at same priority as production
- No tier system for data assets
- Graph visualization unusable at actual scale
- "Show me lineage for X" returns thousands of nodes

**Prevention:**
- Prioritize lineage for business-critical assets first
- Implement tiering: Tier 1 (revenue-critical), Tier 2 (operational), Tier 3 (experimental)
- Build "focused lineage" views: show N hops, not entire graph
- Capture everything, display selectively
- Let users mark which lineage paths matter for their use cases

**Phase mapping:** Address in Phase 2 (Lineage). Design tiering before building capture.

**Sources:** [Monte Carlo - Data Lineage Guide](https://www.montecarlodata.com/blog-data-lineage/), [Scikiq - Top 10 Lineage Challenges](https://scikiq.com/blog/top-10-data-lineage-challenges-and-how-to-overcome-them/)

---

### Pitfall 12: Model/AI Quality Degradation Over Time

**What goes wrong:** AI profiling models work well initially, then degrade as data patterns shift. 91% of AI models experience quality degradation due to data drift, concept drift, or stale training data.

**Why it happens:** Models trained on historical patterns. Business changes, data changes, but models don't automatically adapt.

**Consequences:**
- Increasing false positives over time
- Missing new anomaly patterns
- Recommendations become irrelevant
- Users lose trust in AI features

**Warning signs:**
- No monitoring of model performance metrics over time
- No retraining schedule
- Feedback from users not incorporated into models
- Performance metrics flat or declining

**Prevention:**
- Implement model monitoring (accuracy, precision, recall over time)
- Build automated retraining pipelines triggered by performance degradation
- Incorporate user feedback into training data
- A/B test model updates before full rollout
- Set model "freshness" SLAs (retrain at least every N months)

**Phase mapping:** Address in Phase 4 (AI Operations). Plan for model lifecycle from design.

**Sources:** [Informatica - AI Agent Engineering](https://www.informatica.com/resources/articles/enterprise-ai-agent-engineering.html), [Acceldata - AI Data Governance](https://www.acceldata.io/blog/ai-data-governance-ensuring-compliance-and-security)

---

## Minor Pitfalls

Mistakes that cause annoyance but are recoverable. Address as encountered.

---

### Pitfall 13: Excessive Step Functions Logging Costs

**What goes wrong:** Teams enable ALL logging level for Step Functions in production. High-volume pipelines generate massive CloudWatch costs.

**Why it happens:** ALL logging is useful for debugging. Developers forget to change for production.

**Consequences:**
- Unexpected CloudWatch bills
- Log storage costs
- Noise in operational dashboards

**Warning signs:**
- Step Functions log level set to ALL in production
- No cost monitoring on CloudWatch
- Same Terraform/CloudFormation for dev and prod

**Prevention:**
- Set log level to ERROR for production, ALL for development only
- Environment-specific configuration for logging
- CloudWatch cost alerts
- Regular cost review

**Phase mapping:** Address during Phase 2 (Infrastructure) deployment configuration.

**Sources:** [Dev.to - Step Functions Best Practices 2026](https://dev.to/jubinsoni/mastering-serverless-data-pipelines-aws-step-functions-best-practices-for-2026-44bl)

---

### Pitfall 14: Neglecting Change Management for Catalog/Quality Tool Adoption

**What goes wrong:** Teams build excellent tools that users don't adopt. Engineers prefer existing workflows. Tool "collects dust."

**Why it happens:** 10% of transformation budget goes to change management. Technology focus over people focus.

**Consequences:**
- Low adoption despite good tooling
- Investment wasted
- Shadow workflows emerge
- Data in catalog becomes stale from neglect

**Warning signs:**
- No user research during design
- No training plan
- Tool not integrated into existing workflows
- Success measured by features shipped, not users active

**Prevention:**
- Involve users in design from the start
- Integrate into existing workflows (IDE plugins, Slack alerts, not separate portal)
- Measure adoption metrics, not just feature delivery
- Budget for training and onboarding
- Start with champions/early adopters, expand from there

**Phase mapping:** Ongoing concern. Plan adoption strategy alongside each phase.

**Sources:** [Atlan - Data Catalog Adoption](https://atlan.com/data-catalog-adoption/), [Enterprise Knowledge - Data Catalog Success](https://enterprise-knowledge.com/three-pillars-of-successful-data-catalog-adoption/)

---

### Pitfall 15: INSERT/UPDATE Statement Gaps in Lineage Parsing

**What goes wrong:** SQL parsers often support CREATE and SELECT well, but INSERT INTO and UPDATE statements—which account for most warehouse transformations—are poorly supported.

**Why it happens:** Parsers optimize for common analytics patterns (SELECT), not data engineering patterns (INSERT/UPDATE).

**Consequences:**
- Major gaps in lineage for ETL pipelines
- Lineage shows reads but not writes
- Inaccurate impact analysis

**Warning signs:**
- Lineage mostly shows reporting views, not ETL transformations
- INSERT statements show as "unknown destination"
- Lineage incomplete for incremental load patterns

**Prevention:**
- Explicitly test parser against INSERT, UPDATE, MERGE patterns
- Choose parsers with demonstrated warehouse ETL support
- Supplement parsing with execution-time lineage capture (OpenLineage from Spark)
- Accept parser limitations and supplement with other mechanisms

**Phase mapping:** Validate during Phase 2 (Lineage) parser selection.

**Sources:** [Metaplane - Column-Level Lineage SQL Parsing](https://www.metaplane.dev/blog/column-level-lineage-an-adventure-in-sql-parsing)

---

## Phase-Specific Warnings

| Phase | Likely Pitfall | Mitigation |
|-------|---------------|------------|
| Phase 1: Foundation | Siloed architecture, Iceberg compatibility | Design integrated metadata layer; test cross-engine compatibility |
| Phase 2: Lineage | SQL parsing underestimation, metadata gaps | Use proven parsers; inventory all data sources before architecture |
| Phase 3: AI Profiling | Alert fatigue, hallucinations, governance speed | Build feedback loops; require human-in-loop; policy-as-code |
| Phase 4: Rules | Rule sprawl, model degradation | Lifecycle governance; monitoring and retraining pipelines |
| Phase 5: Adoption | Change management neglect | User involvement; workflow integration; adoption metrics |

---

## Anti-Patterns Summary

| Anti-Pattern | Do This Instead |
|--------------|-----------------|
| One-time lineage project | Continuous automated capture |
| Build SQL parser from scratch | Use battle-tested libraries (sqlglot, sqllineage) |
| Alert on every anomaly | Tiered alerts with business context |
| Auto-activate AI recommendations | Human-in-the-loop approval |
| Add rule for every incident | Root cause analysis; rule lifecycle |
| Standalone quality tool | Integrated quality + lineage + catalog |
| Assume Iceberg compatibility | Explicit compatibility matrix testing |
| Capture everything at same priority | Tier assets; focused lineage views |
| Human-speed governance for agents | Policy-as-code at query time |

---

## Sources

### Data Quality Platforms
- [Atlan - Data Quality Issues](https://atlan.com/data-quality-issues/)
- [Atlan - Data Quality Solutions 2025](https://atlan.com/know/data-quality-solutions/)
- [Precisely - Data Quality Challenges 2025](https://www.precisely.com/data-integrity/2025-planning-insights-data-quality-remains-the-top-data-integrity-challenges/)
- [IBM - Data Quality Issues](https://www.ibm.com/think/insights/data-quality-issues)

### Data Lineage
- [Seemore Data - Data Lineage 2025](https://seemoredata.io/blog/data-lineage-in-2025-examples-techniques-best-practices/)
- [Hevo Data - Lineage Implementation Challenges](https://hevodata.com/learn/data-lineage-implementation-challenges/)
- [Data Crossroads - Lineage Challenges 2025](https://datacrossroads.nl/2025/10/01/part-1-technological-challenges-data-lineage/)
- [Gable.ai - Data Lineage Challenges](https://www.gable.ai/blog/data-lineage-challenges)

### Column-Level Lineage
- [Metaplane - Column-Level Lineage SQL Parsing](https://www.metaplane.dev/blog/column-level-lineage-an-adventure-in-sql-parsing)
- [SQLLineage Documentation](https://sqllineage.readthedocs.io/en/latest/behind_the_scene/column-level_lineage_design.html)
- [OpenLineage - Spark Column Lineage](https://openlineage.io/docs/integrations/spark/spark_column_lineage/)

### AI/Agentic Systems
- [Immuta - AI Agents Reshaping Data Governance](https://www.immuta.com/guides/data-security-101/how-ai-agents-are-reshaping-data-governance/)
- [Informatica - AI Agent Engineering](https://www.informatica.com/resources/articles/enterprise-ai-agent-engineering.html)
- [Dataversity - Data Danger of Agentic AI](https://www.dataversity.net/articles/the-data-danger-of-agentic-ai/)
- [Appsmith - De-hallucinate AI Agents](https://www.appsmith.com/blog/de-hallucinate-ai-agents)

### AWS/Infrastructure
- [AWS Big Data Blog - Iceberg V3](https://aws.amazon.com/blogs/big-data/accelerate-data-lake-operations-with-apache-iceberg-v3-deletion-vectors-and-row-lineage/)
- [Quesma - Apache Iceberg Limitations 2025](https://quesma.com/blog/apache-iceberg-practical-limitations-2025/)
- [Thoughtworks - Step Functions Data Pipelines](https://thoughtworks-es.medium.com/taming-the-monster-building-data-pipelines-with-aws-step-functions-114758633be2)

### Alert Fatigue & Rules
- [Resolve.io - False Positive Alerts](https://resolve.io/blog/false-positive-alerts-a-hidden-risk-in-observability)
- [TELM.ai - DQ Rules Engine Failures](https://www.telm.ai/blog/why-your-dq-rules-engine-is-failing-and-how-to-fix-it/)
- [Monte Carlo - Rules You Should Never Write](https://www.montecarlodata.com/blog-the-5-data-quality-rules-you-should-never-write-again/)

### Adoption
- [Atlan - Data Catalog Adoption](https://atlan.com/data-catalog-adoption/)
- [Zeenea - Failing Data Catalog Projects](https://zeenea.com/how-youre-going-to-fail-your-data-catalog-project/)
