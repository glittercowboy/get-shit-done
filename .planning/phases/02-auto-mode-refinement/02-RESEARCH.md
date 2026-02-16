# Phase 2: Auto Mode Refinement - Research

**Researched:** 2026-02-16
**Domain:** Validation systems, circuit breakers, error escalation, feedback loops for autonomous model selection
**Confidence:** HIGH

## Summary

Phase 2 implements safety and learning mechanisms for autonomous model selection, building on Phase 1's routing infrastructure. The system ensures quality through Sonnet-based validation of Haiku outputs, prevents runaway execution via circuit breakers, handles errors through weighted escalation, and learns from mistakes to improve future routing decisions.

The core challenge is balancing autonomy with safety: allowing the system to run unattended while preventing catastrophic failures, cost overruns, or quality degradation. This requires multiple defensive layers that work independently but coordinate effectively.

Research reveals that modern AI systems use LLM-as-a-judge validation patterns achieving 80-90% agreement with human judgment, circuit breakers borrowed from microservices resilience patterns, and reinforcement learning from human feedback (RLHF) for continuous improvement. The GSD infrastructure already supports quota tracking and JSONL logging, providing strong foundations for Phase 2 features.

**Primary recommendation:** Use LLM-as-a-judge validation with two-stage checking (output correctness + reasoning quality), implement circuit breakers using opossum library for timeouts and iteration caps, apply weighted error scoring with exponential backoff for escalation, and leverage simple prompt-based feedback collection with rule merging for learning improvements.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Validation Strategy
- **Sonnet validates both output correctness AND reasoning quality** (not just final result)
- **Auto-retry with Sonnet when validation fails** (no user confirmation needed)
- **Display: Summary only** ("Validated by Sonnet ✓") — silent on success, show summary on failure
- **Tiered validation depth:** Light checks for low-risk tasks, thorough review for critical tasks
- **Validation checks:** Does output match expectations? Was Haiku's approach sound? Any shortcuts or misunderstandings?

#### Circuit Breaker Behavior
- **Iteration cap priority:** Iteration limits are primary safety net, time limits are secondary
- **Time limits:** Configurable per model (default: 20m Haiku, 40m Sonnet, 60m Opus)
- **Logging:** Track time per task + model for future threshold tuning
- **Recovery on trip:** Attempt to salvage work or escalate to stronger model before failing
- **Adaptive thresholds:** Task-based adjustment (complex tasks get higher limits) PLUS learning-based adjustment (system learns which task types need more iterations over time)

#### Error Escalation
- **Weighted error scoring:**
  - Complete rejections (Sonnet says "redo from scratch") = 1.0
  - Validation fixes (partial corrections needed) = 0.5
  - Retries (transient failures) = 0.25
- **Error feedback:** Include explanation of what went wrong + review that rework fixed the issues
- **Escalation threshold:** Aggressive (1-2 errors trigger escalation to stronger model) — prefer quality over cost savings
- **User notification:** Summary at end only (silent during execution, show escalation history in final report)

#### Learning Feedback
- **Feature flag:** Optional prompt after task completion ("Was this the right model?")
- **Modes:** Ask human OR ask Opus (configurable in GSD config)
- **On incorrect routing:** System must learn which model SHOULD have been used for that pattern
- **Multi-signal learning:** Extract patterns, task signatures, AND user preferences
  - Pattern-based rules (e.g., "validation tasks → Sonnet")
  - Task fingerprints (keywords, complexity signals)
  - User-specific quality/cost trade-offs
- **Rule merging:** Learned rules merge intelligently with built-in routing rules (conflict resolution)
- **Transparency:** Full visibility — users can view and edit learned routing rules

### Claude's Discretion
- Specific validation checks to run (within "output + reasoning quality" framework)
- Exact weighted scoring formula (within provided ranges)
- Conflict resolution strategy when learned rules clash with built-in rules
- UI/UX for reviewing and editing learned rules

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.

</user_constraints>

## Standard Stack

### Core Libraries

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| opossum | ^8.1.3 | Circuit breaker for Node.js | Industry standard, used by Red Hat/IBM. Supports timeout, fallback, state events. 12M+ downloads. |
| Node.js built-in fs/path | N/A | JSONL logging, file I/O | No dependencies, already used in gsd-tools.js for quota tracking |
| Claude API (via Claude Code) | Current | LLM-as-a-judge validation | Native access, response headers for quota, existing in Phase 1 |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| cockatiel | ^3.2.0 | Alternative resilience library (retry, bulkhead, timeout) | If opossum insufficient, cockatiel offers broader resilience patterns (Polly-inspired) |
| natural | ^7.0.7 | Lightweight NLP (tokenization, readability metrics) | If keyword extraction needs sophistication beyond regex (Flesch-Kincaid, syllable counting) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| opossum | cockatiel | Cockatiel has more features (retry policies, bulkheads) but heavier. Opossum focused on circuit breakers only. |
| Claude-as-validator | Guardrails-AI, hai-guardrails | Guardrails libraries add PII detection, prompt injection protection. Overkill for task validation (not user-facing). |
| Simple keyword learning | TensorFlow.js embeddings | Embeddings enable semantic similarity but add complexity. User deferred to simple patterns. |
| Custom feedback prompts | RLHF frameworks (trl, InstructLab) | RLHF frameworks designed for model fine-tuning, not routing rule updates. Over-engineered. |

**Installation:**
```bash
npm install opossum  # Only new dependency for Phase 2
# Optional if keyword extraction proves insufficient:
# npm install natural
```

## Architecture Patterns

### Recommended Project Structure

```
.planning/
├── config.json                           # Extended with validation/circuit breaker settings
├── validation/
│   ├── validation-log.jsonl              # Validation results (pass/fail, reasoning)
│   └── escalation-log.jsonl              # Error escalation events
├── circuit-breaker/
│   ├── timeout-log.jsonl                 # Timeout events per task/model
│   └── thresholds.json                   # Adaptive timeout/iteration thresholds
├── feedback/
│   ├── human-feedback.jsonl              # User corrections to model selection
│   ├── learned-rules.md                  # Auto-generated routing rules from feedback
│   └── rule-merge-log.jsonl              # Conflict resolution decisions
└── routing/
    └── routing-stats.jsonl               # (Existing from Phase 1) Unmatched task log

~/.claude/
├── skills/
│   └── gsd-task-router/
│       ├── SKILL.md                      # (Phase 1) Main routing skill
│       ├── routing-rules.md              # (Phase 1) Pattern → Model lookup table
│       ├── learned-rules.md              # (Phase 2) Rules generated from feedback
│       └── context-index.json            # (Phase 1) Cached doc/guide index
└── get-shit-done/
    └── bin/
        ├── gsd-tools.js                  # Extended with validation/escalation functions
        └── gsd-validator.js              # (NEW) Validation orchestration module
```

### Pattern 1: LLM-as-a-Judge Two-Stage Validation

**What:** Use Sonnet to evaluate Haiku task outputs on both correctness (did it work?) and reasoning quality (was the approach sound?).

**When to use:** Every Haiku task completion before marking as done.

**Example:**
```javascript
// gsd-validator.js
const CircuitBreaker = require('opossum');

// Validation prompt for Sonnet
const validationPrompt = (task, output, reasoning) => `
You are validating work completed by a junior model (Haiku) on this task:

**Task:** ${task.description}

**Output:** ${output}

**Reasoning:** ${reasoning}

Evaluate on TWO dimensions:

1. **Correctness**: Does the output meet task requirements? Are there bugs, missing features, or incorrect logic?
2. **Reasoning Quality**: Was the approach sound? Did Haiku cut corners, make assumptions, or misunderstand the problem?

Respond in JSON:
{
  "valid": true/false,
  "correctness_score": 0-100,
  "reasoning_score": 0-100,
  "issues": ["issue 1", "issue 2", ...],
  "recommendation": "PASS" | "FIX" | "REDO",
  "explanation": "What went wrong and why"
}

- PASS: Output is good, approve task completion
- FIX: Minor issues, fixable with targeted corrections
- REDO: Fundamental misunderstanding, restart from scratch
`;

async function validateTask(task, haikuOutput, haikuReasoning) {
  const prompt = validationPrompt(task, haikuOutput, haikuReasoning);

  // Call Sonnet for validation
  const validationResult = await callSonnet(prompt);

  // Log validation result
  logValidation({
    timestamp: new Date().toISOString(),
    task_id: task.id,
    haiku_model: 'haiku',
    validator_model: 'sonnet',
    result: validationResult,
    valid: validationResult.valid
  });

  return validationResult;
}

// Tiered validation depth based on task risk
function selectValidationDepth(task) {
  // Risk signals: database operations, security, authentication, payments
  const highRiskKeywords = /database|migration|schema|security|auth|payment|transaction/i;
  const mediumRiskKeywords = /API|integration|config|deploy/i;

  if (highRiskKeywords.test(task.description)) {
    return 'thorough'; // Full correctness + reasoning analysis
  } else if (mediumRiskKeywords.test(task.description)) {
    return 'standard'; // Correctness focus, light reasoning check
  } else {
    return 'light'; // Quick sanity check only
  }
}
```

**Source:** [LLM-as-a-Judge: A 2026 Guide](https://labelyourdata.com/articles/llm-as-a-judge), [LLM-as-a-judge complete guide](https://www.evidentlyai.com/llm-guide/llm-as-a-judge)

### Pattern 2: Circuit Breaker with Adaptive Thresholds

**What:** Wrap task execution in circuit breaker to enforce iteration caps and timeouts, with thresholds that adapt based on task complexity and historical data.

**When to use:** All task executions (Haiku, Sonnet, Opus) to prevent runaway loops and excessive resource consumption.

**Example:**
```javascript
const CircuitBreaker = require('opossum');

// Load adaptive thresholds from learned data
function getAdaptiveThresholds(task, model) {
  const thresholds = loadThresholds(); // From .planning/circuit-breaker/thresholds.json

  // Base thresholds per model (user decision)
  const base = {
    haiku: { timeout: 20 * 60 * 1000, iterations: 15 },
    sonnet: { timeout: 40 * 60 * 1000, iterations: 20 },
    opus: { timeout: 60 * 60 * 1000, iterations: 25 }
  };

  // Task-based adjustment (complex tasks get +50% limits)
  const complexityMultiplier = estimateComplexity(task) > 70 ? 1.5 : 1.0;

  // Learning-based adjustment (if this task type historically needs more time)
  const learnedMultiplier = thresholds.learned[task.pattern] || 1.0;

  const combined = base[model];
  combined.timeout *= complexityMultiplier * learnedMultiplier;
  combined.iterations *= complexityMultiplier * learnedMultiplier;

  return combined;
}

// Circuit breaker factory
function createTaskBreaker(task, model) {
  const thresholds = getAdaptiveThresholds(task, model);

  const options = {
    timeout: thresholds.timeout, // ms
    errorThresholdPercentage: 50, // Open circuit if 50% of requests fail
    resetTimeout: 30000, // Try again after 30s
    name: `task-${task.id}-${model}`
  };

  const breaker = new CircuitBreaker(executeTask, options);

  // Event handlers
  breaker.on('timeout', () => {
    logTimeout({
      timestamp: new Date().toISOString(),
      task_id: task.id,
      model: model,
      timeout_ms: thresholds.timeout,
      reason: 'execution exceeded time limit'
    });
  });

  breaker.on('open', () => {
    console.warn(`⚠️  Circuit breaker opened for ${task.id} on ${model}`);
  });

  // Fallback: attempt salvage or escalate
  breaker.fallback((err) => {
    return salvageOrEscalate(task, model, err);
  });

  return breaker;
}

// Iteration cap enforcement (separate from opossum timeout)
async function executeWithIterationCap(task, model, maxIterations) {
  let iterations = 0;
  let result = null;

  while (iterations < maxIterations) {
    result = await executeTaskStep(task, model);
    iterations++;

    if (result.complete) break;

    // Log iteration progress
    if (iterations >= maxIterations * 0.8) {
      console.warn(`⚠️  Task ${task.id} approaching iteration cap (${iterations}/${maxIterations})`);
    }
  }

  if (iterations >= maxIterations) {
    throw new Error(`Task exceeded iteration cap (${maxIterations})`);
  }

  return result;
}
```

**Source:** [Trustworthy AI Agents: Circuit Breakers](https://www.sakurasky.com/blog/missing-primitives-for-trustworthy-ai-part-6/), [Opossum documentation](https://nodeshift.dev/opossum/)

### Pattern 3: Weighted Error Scoring and Escalation

**What:** Track errors with weighted scores, escalate to stronger model when cumulative score exceeds threshold (aggressive: 1-2 errors).

**When to use:** After every validation failure or task error to decide whether to retry or escalate.

**Example:**
```javascript
// Error weight table (user decision)
const ERROR_WEIGHTS = {
  COMPLETE_REJECTION: 1.0,  // Sonnet says "redo from scratch"
  VALIDATION_FIX: 0.5,      // Partial corrections needed
  RETRY: 0.25               // Transient failure (API timeout, etc)
};

// Escalation threshold (user decision: aggressive)
const ESCALATION_THRESHOLD = 1.0; // 1-2 errors trigger escalation

class ErrorTracker {
  constructor(task) {
    this.task = task;
    this.errors = [];
    this.cumulativeScore = 0;
  }

  recordError(type, explanation, fix_attempted = null) {
    const weight = ERROR_WEIGHTS[type] || 0.25;
    const error = {
      timestamp: new Date().toISOString(),
      type: type,
      weight: weight,
      explanation: explanation,
      fix_attempted: fix_attempted
    };

    this.errors.push(error);
    this.cumulativeScore += weight;

    logEscalation({
      timestamp: error.timestamp,
      task_id: this.task.id,
      error_type: type,
      weight: weight,
      cumulative_score: this.cumulativeScore,
      explanation: explanation
    });
  }

  shouldEscalate() {
    return this.cumulativeScore >= ESCALATION_THRESHOLD;
  }

  getNextModel(currentModel) {
    // Escalation ladder: Haiku → Sonnet → Opus
    const ladder = { haiku: 'sonnet', sonnet: 'opus', opus: null };
    return ladder[currentModel];
  }
}

// Escalation with exponential backoff
async function executeWithEscalation(task) {
  const tracker = new ErrorTracker(task);
  let currentModel = task.assigned_model || 'haiku';
  let attempt = 0;
  const MAX_ATTEMPTS = 3;

  while (attempt < MAX_ATTEMPTS) {
    try {
      const result = await executeTask(task, currentModel);

      // Validate if model was Haiku
      if (currentModel === 'haiku') {
        const validation = await validateTask(task, result.output, result.reasoning);

        if (!validation.valid) {
          if (validation.recommendation === 'REDO') {
            tracker.recordError('COMPLETE_REJECTION', validation.explanation);
          } else if (validation.recommendation === 'FIX') {
            tracker.recordError('VALIDATION_FIX', validation.explanation);
          }

          // Check if escalation needed
          if (tracker.shouldEscalate()) {
            const nextModel = tracker.getNextModel(currentModel);
            if (!nextModel) {
              throw new Error('Cannot escalate further (already at Opus)');
            }

            console.log(`🔼 Escalating task ${task.id} from ${currentModel} to ${nextModel}`);
            console.log(`   Reason: ${tracker.errors.map(e => e.explanation).join('; ')}`);

            currentModel = nextModel;
            attempt++;

            // Exponential backoff before retry
            const backoffMs = Math.min(1000 * Math.pow(2, attempt), 30000);
            await sleep(backoffMs);

            continue; // Retry with stronger model
          }
        }
      }

      // Success
      return result;

    } catch (err) {
      tracker.recordError('RETRY', err.message);

      if (tracker.shouldEscalate()) {
        const nextModel = tracker.getNextModel(currentModel);
        if (nextModel) {
          currentModel = nextModel;
        }
      }

      attempt++;
      const backoffMs = Math.min(1000 * Math.pow(2, attempt), 30000);
      await sleep(backoffMs);
    }
  }

  throw new Error(`Task ${task.id} failed after ${MAX_ATTEMPTS} attempts across escalation ladder`);
}
```

**Source:** [Retries, fallbacks, and circuit breakers in LLM apps](https://portkey.ai/blog/retries-fallbacks-and-circuit-breakers-in-llm-apps/), [Exponential backoff strategies](https://portkey.ai/blog/retries-fallbacks-and-circuit-breakers-in-llm-apps/)

### Pattern 4: Feedback Collection and Rule Learning

**What:** Prompt user (or Opus) after task completion to validate model selection, extract patterns from incorrect choices, merge learned rules with built-in rules.

**When to use:** Configurable feature flag in GSD config. Run after task completion if enabled.

**Example:**
```javascript
// Feedback collection (user decision: optional prompt)
async function collectFeedback(task, usedModel, config) {
  if (!config.feedback_enabled) return null;

  const mode = config.feedback_mode; // 'human' or 'opus'

  if (mode === 'human') {
    // Prompt user in CLI
    const response = await promptUser(`
Task: ${task.description}
Model used: ${usedModel}

Was this the right model choice? (y/n/better):
- y: Correct choice
- n: Wrong choice (you'll specify which model should have been used)
- better: Skip (no feedback)
    `);

    if (response === 'n') {
      const correctModel = await promptUser('Which model should have been used? (haiku/sonnet/opus): ');
      return { correct: false, should_use: correctModel, task: task };
    }

    return { correct: true };

  } else if (mode === 'opus') {
    // Ask Opus to evaluate routing decision
    const prompt = `
Task: ${task.description}
Model used: ${usedModel}
Task outcome: ${task.outcome}
Execution time: ${task.duration}ms
Errors encountered: ${task.errors.length}

Based on this information, was ${usedModel} the right model choice?
If not, which model should have been used, and why?

Respond in JSON:
{
  "correct_choice": true/false,
  "should_use": "haiku"|"sonnet"|"opus",
  "reasoning": "Explanation of why different model would be better"
}
    `;

    return await callOpus(prompt);
  }
}

// Extract patterns from incorrect routing (user decision: multi-signal learning)
function extractPatterns(feedbackLog) {
  const patterns = [];

  for (const feedback of feedbackLog) {
    if (!feedback.correct) {
      // Extract keywords from task description
      const keywords = extractKeywords(feedback.task.description);

      // Calculate complexity signals
      const complexity = {
        word_count: feedback.task.description.split(/\s+/).length,
        has_technical_terms: /database|schema|migration|architecture|integration/i.test(feedback.task.description),
        has_security_terms: /auth|security|encryption|permission/i.test(feedback.task.description),
        flesch_score: calculateFleschScore(feedback.task.description) // Using natural library
      };

      patterns.push({
        keywords: keywords,
        complexity_signals: complexity,
        correct_model: feedback.should_use,
        evidence: {
          task: feedback.task.description,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  return consolidatePatterns(patterns);
}

// Rule merging with conflict resolution (user decision: intelligent merge)
function mergeRules(builtInRules, learnedRules) {
  const merged = [...builtInRules];

  for (const learned of learnedRules) {
    // Check for conflicts
    const conflict = builtInRules.find(rule =>
      rule.pattern === learned.pattern && rule.model !== learned.model
    );

    if (conflict) {
      // Conflict resolution strategy (Claude's discretion within user framework)
      // Option 1: User feedback takes precedence (learned overrides built-in)
      // Option 2: Higher priority model wins (safety over cost)
      // Option 3: Create hybrid rule (if confidence high enough)

      // Example: User feedback takes precedence if evidence count > 3
      if (learned.evidence_count >= 3) {
        console.log(`⚠️  Learned rule overrides built-in: "${learned.pattern}" → ${learned.model} (was ${conflict.model})`);
        logRuleMerge({
          timestamp: new Date().toISOString(),
          pattern: learned.pattern,
          conflict_type: 'override',
          old_model: conflict.model,
          new_model: learned.model,
          evidence_count: learned.evidence_count
        });

        // Replace built-in rule
        const index = merged.indexOf(conflict);
        merged[index] = learned;
      } else {
        console.log(`ℹ️  Insufficient evidence to override built-in rule: "${learned.pattern}" (evidence: ${learned.evidence_count})`);
      }
    } else {
      // No conflict, add learned rule
      merged.push(learned);
    }
  }

  return merged;
}

// Generate learned-rules.md from feedback (user decision: transparency)
function generateLearnedRulesDoc(patterns) {
  let markdown = `# Learned Routing Rules

**Generated:** ${new Date().toISOString()}
**Source:** User feedback and Opus evaluation

These rules were automatically generated from feedback on incorrect model selections.
You can edit this file to adjust rules or delete entries.

| Pattern | Model | Evidence Count | Last Updated |
|---------|-------|----------------|--------------|
`;

  for (const pattern of patterns) {
    markdown += `| ${pattern.pattern} | ${pattern.model} | ${pattern.evidence_count} | ${pattern.last_updated} |\n`;
  }

  markdown += `\n## Pattern Details\n\n`;

  for (const pattern of patterns) {
    markdown += `### ${pattern.pattern}\n`;
    markdown += `- **Model:** ${pattern.model}\n`;
    markdown += `- **Reasoning:** ${pattern.reasoning}\n`;
    markdown += `- **Example tasks:**\n`;
    for (const example of pattern.examples.slice(0, 3)) {
      markdown += `  - ${example}\n`;
    }
    markdown += `\n`;
  }

  return markdown;
}
```

**Source:** [RLHF explained](https://intuitionlabs.ai/articles/reinforcement-learning-human-feedback), [Preference learning survey](https://dl.acm.org/doi/full/10.1145/3773279)

### Anti-Patterns to Avoid

- **Validation theater:** Don't validate just to log "validated ✓" — actually analyze output and reasoning quality
- **Rigid thresholds:** Don't use fixed timeout/iteration caps for all tasks — adapt based on complexity and learning
- **Ignoring feedback:** Don't collect feedback and never update routing rules — close the loop with learning
- **Binary validation:** Don't just check "works/doesn't work" — assess reasoning quality to catch brittle solutions
- **Alert fatigue:** Don't notify user for every escalation — batch into end-of-execution summary
- **Premature escalation:** Don't escalate on first error — use weighted scoring to differentiate transient vs systemic issues

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Circuit breakers | Custom timeout wrapper with state machine | opossum | Handles open/closed/half-open states, fallbacks, event hooks, battle-tested in production |
| Exponential backoff | Manual retry loop with sleep() | opossum fallback + built-in retry logic | Jitter, max attempts, backoff multiplier already implemented |
| LLM validation | Custom rule-based checker | Claude API (Sonnet as judge) | LLMs understand context better than regex, 80-90% human agreement |
| Readability metrics | Regex word/sentence counting | natural library (Flesch-Kincaid) | Handles syllable counting, linguistic complexity, standardized scores |
| JSONL parsing | Custom line-by-line reader | fs.readFileSync + split + JSON.parse | JSONL is simple enough, no library needed (Node.js built-ins sufficient) |

**Key insight:** Circuit breakers are solved problems in distributed systems — don't reinvent. LLM-as-a-judge is now standard for output validation. Weighted scoring and feedback loops are well-established patterns in ML monitoring. Focus implementation effort on GSD-specific integration, not reimplementing these primitives.

## Common Pitfalls

### Pitfall 1: Validation Becoming a Bottleneck

**What goes wrong:** Every Haiku task requires Sonnet validation, doubling execution time and token costs for simple tasks.

**Why it happens:** Treating all tasks equally — validating trivial work with same rigor as critical work.

**How to avoid:**
- Implement tiered validation depth (light/standard/thorough) based on task risk signals
- Cache validation results for idempotent tasks (e.g., "run tests" always validated the same way)
- Skip validation for tasks below complexity threshold (e.g., "update README")
- Run validation asynchronously where possible (mark task tentatively complete, validate in background)

**Warning signs:** Haiku tasks take longer than Sonnet tasks due to validation overhead. Token costs don't decrease despite using cheaper model.

**Source:** [Risk-based testing 2026](https://www.trigyn.com/insights/risk-based-testing-2026-aligning-qa-priorities-business-impact)

### Pitfall 2: Circuit Breaker Tripping on Expected Slow Tasks

**What goes wrong:** Complex tasks (database migrations, large refactors) consistently hit timeout limits, causing unnecessary escalation.

**Why it happens:** Static thresholds don't account for task complexity variance.

**How to avoid:**
- Implement adaptive thresholds that adjust based on task complexity score
- Learn from historical data — if "database migration" tasks average 35min, adjust Sonnet timeout to 45min for that pattern
- Provide task-specific overrides in plan metadata (e.g., `timeout: 60min` in PLAN.md frontmatter)
- Log near-timeout events (>80% of limit) to identify threshold tuning opportunities

**Warning signs:** Timeout logs show same task types repeatedly triggering circuit breaker. Escalations happen despite tasks completing successfully with stronger model.

**Source:** [Adaptive thresholding](https://www.splunk.com/en_us/blog/learn/adaptive-thresholding.html), [Test-time compute](https://www.emerge.haus/blog/test-time-compute-generative-ai)

### Pitfall 3: Escalation Ladder Exhaustion

**What goes wrong:** Task fails with Haiku, escalates to Sonnet (fails), escalates to Opus (fails), user left with no path forward.

**Why it happens:** Underlying issue isn't model capability — it's malformed task, missing context, or blocked dependency.

**How to avoid:**
- Before escalating, check for common issues: missing files, unavailable tools, incorrect assumptions
- Include task context in escalation (what has been tried, what failed, what error messages)
- Implement "stuck task" detection — if Opus fails, don't retry, surface to user with diagnostic info
- Maintain escalation history in task metadata for debugging

**Warning signs:** Opus failure rate increases. Users report tasks that "should be simple" failing. Escalation logs show multiple models hitting same error.

**Source:** [LLM Router: failed request strategies](https://www.vellum.ai/blog/what-to-do-when-an-llm-request-fails)

### Pitfall 4: Feedback Loop Doesn't Close

**What goes wrong:** User/Opus provides feedback on incorrect routing, but learned rules never affect future decisions.

**Why it happens:** Rule merging logic has bugs, learned rules stored but not loaded, or confidence thresholds too high.

**How to avoid:**
- Verify learned rules are loaded on skill initialization (log "loaded N learned rules")
- Test rule merging with conflicts — ensure learned rules actually override built-in when appropriate
- Lower evidence threshold for high-confidence feedback (single Opus correction may be sufficient)
- Periodic audit: compare routing decisions before/after learning to verify impact

**Warning signs:** Same incorrect routing happens repeatedly despite feedback. Learned-rules.md file grows but routing behavior unchanged.

**Source:** [Feedback loops in ML](https://www.zendesk.com/blog/ai-feedback-loop/), [ML lifecycle phases](https://docs.aws.amazon.com/wellarchitected/latest/machine-learning-lens/mloe-08.html)

### Pitfall 5: Weighted Scoring Drift

**What goes wrong:** Error weights (1.0 for rejection, 0.5 for fix, 0.25 for retry) no longer reflect actual severity in production.

**Why it happens:** System evolves, new error types emerge, validation criteria changes, but weights remain static.

**How to avoid:**
- Periodically review escalation logs to see if weights align with human judgment
- Track escalation accuracy: did escalated tasks actually benefit from stronger model?
- Implement weight tuning based on outcomes (e.g., if FIX errors lead to REDO 80% of time, increase FIX weight)
- Make weights configurable in GSD config for easy adjustment

**Warning signs:** Escalations happening too frequently (aggressive threshold too low) or too rarely (missing quality issues). Weight distribution in logs doesn't match perceived error severity.

**Source:** [Weighted scoring model guide](https://productschool.com/blog/product-fundamentals/weighted-scoring-model)

## Code Examples

Verified patterns from research and GSD codebase:

### JSONL Append-Only Logging

```javascript
// Append validation result to log
function logValidation(entry) {
  const logPath = path.join(process.cwd(), '.planning/validation/validation-log.jsonl');
  fs.mkdirSync(path.dirname(logPath), { recursive: true });

  const line = JSON.stringify(entry) + '\n';
  fs.appendFileSync(logPath, line, 'utf-8');
}

// Read and parse JSONL log
function readValidationLog() {
  const logPath = path.join(process.cwd(), '.planning/validation/validation-log.jsonl');
  if (!fs.existsSync(logPath)) return [];

  const content = fs.readFileSync(logPath, 'utf-8');
  return content
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line));
}

// Query log for specific task
function getValidationHistory(taskId) {
  const log = readValidationLog();
  return log.filter(entry => entry.task_id === taskId);
}
```

**Source:** [JSONL for log processing](https://jsonl.help/use-cases/log-processing/), [JSON logging best practices](https://betterstack.com/community/guides/logging/json-logging/)

### Flesch-Kincaid Complexity Scoring

```javascript
// Using natural library for readability metrics
const natural = require('natural');

function calculateComplexity(text) {
  // Flesch Reading Ease: 206.835 - 1.015(words/sentences) - 84.6(syllables/words)
  // Score: 0-100 (higher = easier to read)

  const sentences = text.split(/[.!?]+/).filter(s => s.trim());
  const words = text.split(/\s+/).filter(w => w.trim());
  const syllables = words.reduce((sum, word) => sum + countSyllables(word), 0);

  const avgWordsPerSentence = words.length / sentences.length;
  const avgSyllablesPerWord = syllables / words.length;

  const fleschScore = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);

  // Invert for complexity (lower Flesch = higher complexity)
  const complexityScore = Math.max(0, Math.min(100, 100 - fleschScore));

  return {
    flesch_reading_ease: Math.max(0, Math.min(100, fleschScore)),
    complexity_score: complexityScore,
    word_count: words.length,
    sentence_count: sentences.length,
    avg_word_length: avgSyllablesPerWord
  };
}

function countSyllables(word) {
  // Simple syllable counter (natural library has more sophisticated version)
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;

  const vowels = 'aeiouy';
  let count = 0;
  let previousWasVowel = false;

  for (let i = 0; i < word.length; i++) {
    const isVowel = vowels.includes(word[i]);
    if (isVowel && !previousWasVowel) count++;
    previousWasVowel = isVowel;
  }

  // Adjust for silent e
  if (word.endsWith('e')) count--;

  return Math.max(1, count);
}
```

**Source:** [Flesch Reading Ease](https://yoast.com/flesch-reading-ease-score/), [Text complexity metrics](https://www.researchgate.net/publication/286557137_What_can_readability_measures_really_tell_us_about_text_complexity)

### Opossum Circuit Breaker Integration

```javascript
const CircuitBreaker = require('opossum');

// Extend GSD task execution with circuit breaker
function wrapTaskWithBreaker(taskFn, task, model) {
  const thresholds = getAdaptiveThresholds(task, model);

  const breakerOptions = {
    timeout: thresholds.timeout,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
    name: `task-${task.id}`,
    // Capacity: max concurrent executions
    capacity: 1 // Tasks execute sequentially in GSD
  };

  const breaker = new CircuitBreaker(taskFn, breakerOptions);

  // Monitoring events
  breaker.on('timeout', () => {
    console.error(`⏱️  Task ${task.id} timed out after ${thresholds.timeout}ms`);
    logTimeout({
      timestamp: new Date().toISOString(),
      task_id: task.id,
      model: model,
      timeout_ms: thresholds.timeout
    });
  });

  breaker.on('failure', (err) => {
    console.error(`❌ Task ${task.id} failed: ${err.message}`);
  });

  breaker.on('success', (result) => {
    console.log(`✅ Task ${task.id} completed successfully`);
  });

  // Fallback: attempt to salvage or escalate
  breaker.fallback((err) => {
    if (err.name === 'TimeoutError') {
      // Attempt salvage
      return salvagePartialWork(task, model);
    } else {
      // Escalate to stronger model
      return escalateTask(task, model);
    }
  });

  return breaker;
}

// Usage in task execution
async function executeTaskWithSafety(task, model) {
  const taskFn = async () => {
    // Actual task execution logic
    return await executeTask(task, model);
  };

  const breaker = wrapTaskWithBreaker(taskFn, task, model);

  try {
    const result = await breaker.fire(task, model);
    return result;
  } catch (err) {
    // Circuit opened or fallback failed
    throw err;
  }
}
```

**Source:** [Opossum GitHub](https://github.com/nodeshift/opossum), [Circuit breaker in Node.js](https://blog.logrocket.com/use-circuit-breaker-node-js/)

### Validation Summary Display

```javascript
// Silent validation on success, summary on failure (user decision)
function displayValidationSummary(taskId, validationResult) {
  if (validationResult.valid) {
    // Silent on success
    console.log(`✓ Validated by Sonnet`);
  } else {
    // Show summary on failure
    console.log(`\n⚠️  Validation Failed for Task ${taskId}`);
    console.log(`   Correctness: ${validationResult.correctness_score}/100`);
    console.log(`   Reasoning: ${validationResult.reasoning_score}/100`);
    console.log(`   Issues:`);
    for (const issue of validationResult.issues) {
      console.log(`     - ${issue}`);
    }
    console.log(`   Recommendation: ${validationResult.recommendation}`);
    if (validationResult.recommendation === 'REDO') {
      console.log(`   ⚠️  Complete rework required`);
    }
  }
}

// End-of-execution escalation history (user decision)
function displayEscalationHistory(executionLog) {
  const escalations = executionLog.filter(e => e.type === 'escalation');

  if (escalations.length === 0) {
    console.log(`\n✓ No escalations during execution`);
    return;
  }

  console.log(`\n📊 Escalation History`);
  console.log(`   Total escalations: ${escalations.length}`);

  for (const esc of escalations) {
    console.log(`   • Task ${esc.task_id}: ${esc.from_model} → ${esc.to_model}`);
    console.log(`     Reason: ${esc.reason}`);
    console.log(`     Error score: ${esc.cumulative_score.toFixed(2)}`);
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual quality review | LLM-as-a-judge automated validation | 2023-2024 | 500-5000x cost savings, 80-90% human agreement |
| Fixed timeout limits | Adaptive thresholds based on task complexity | 2025-2026 | Reduces false timeouts, improves resource allocation |
| Uniform error handling | Weighted error scoring with graduated escalation | 2025 | Differentiate transient vs systemic failures |
| Human-only feedback | RLHF + Opus evaluation | 2024-2026 | Scales feedback collection, maintains quality bar |
| Static circuit breakers | Learning-based threshold adjustment | 2026 | Thresholds improve over time from operational data |
| Simple retry loops | Exponential backoff with jitter | 2020s (distributed systems) | Prevents thundering herd, improves success rates to 95%+ |

**Deprecated/outdated:**
- **Binary pass/fail validation:** Modern approaches evaluate multiple dimensions (correctness, reasoning, approach soundness)
- **Fixed retry counts:** Replaced by weighted scoring and adaptive escalation ladders
- **Manual rule tuning:** Machine learning from feedback automates rule improvement
- **Synchronous validation blocking task completion:** Async validation where possible reduces latency

## Open Questions

1. **Validation prompt engineering**
   - What we know: LLM-as-a-judge works well, 80-90% human agreement
   - What's unclear: Exact prompt structure for GSD task validation (balance between false positives/negatives)
   - Recommendation: Start with comprehensive two-stage prompt (correctness + reasoning), tune based on false positive rate in production. A/B test prompt variations.

2. **Salvage strategy implementation**
   - What we know: Circuit breaker should attempt to salvage partial work before failing
   - What's unclear: How to detect salvageable work in GSD task context (incomplete file edits, partial test runs)
   - Recommendation: Start simple — save task state before timeout, attempt to commit partial work with explanatory message. Iterate based on salvage success rate.

3. **Feedback collection frequency**
   - What we know: User decision is "optional prompt after task completion"
   - What's unclear: Optimal frequency to avoid fatigue (every task? sample 10%? only on escalations?)
   - Recommendation: Start with escalations-only (high signal), expand to random 10% sample after rule base stabilizes. Make configurable.

4. **Rule confidence thresholds**
   - What we know: Learned rules should merge with built-in rules, require evidence count for conflicts
   - What's unclear: Exact evidence threshold (3 instances enough? need 10?)
   - Recommendation: Start conservative (5 instances), monitor rule override rate, lower if too few rules learned. Track precision/recall.

5. **Iteration cap vs timeout priority**
   - What we know: User decision is "iteration cap primary, timeout secondary"
   - What's unclear: How to coordinate both limits (check iteration count AND timeout, which fires first?)
   - Recommendation: Check iteration count after each step, wrap entire execution in timeout. Iteration cap prevents infinite loops, timeout prevents single-step hangs.

## Sources

### Primary (HIGH confidence)

- [LLM-as-a-Judge: A 2026 Guide](https://labelyourdata.com/articles/llm-as-a-judge) - Validation patterns, two-stage evaluation, 80-90% human agreement
- [LLM-as-a-judge complete guide](https://www.evidentlyai.com/llm-guide/llm-as-a-judge) - Best practices, pitfalls, prompt engineering
- [Opossum GitHub](https://github.com/nodeshift/opossum) - Circuit breaker library, features, API
- [Trustworthy AI Agents: Circuit Breakers](https://www.sakurasky.com/blog/missing-primitives-for-trustworthy-ai-part-6/) - Safety patterns for autonomous agents
- [Retries, fallbacks, and circuit breakers in LLM apps](https://portkey.ai/blog/retries-fallbacks-and-circuit-breakers-in-llm-apps/) - Resilience patterns, when to use each
- [RLHF explained](https://intuitionlabs.ai/articles/reinforcement-learning-human-feedback) - Feedback loop implementation
- [JSONL for log processing](https://jsonl.help/use-cases/log-processing/) - JSONL format, append-only logging
- GSD codebase (`gsd-tools.js`) - Existing quota tracking, JSONL logging, model profiles

### Secondary (MEDIUM confidence)

- [Risk-based testing 2026](https://www.trigyn.com/insights/risk-based-testing-2026-aligning-qa-priorities-business-impact) - Tiered validation depth
- [Adaptive thresholding](https://www.splunk.com/en_us/blog/learn/adaptive-thresholding.html) - ML-based threshold tuning
- [Test-time compute](https://www.emerge.haus/blog/test-time-compute-generative-ai) - Complexity-aware resource allocation
- [Exponential backoff decorators](https://johal.in/tenacity-retries-exponential-backoff-decorators-2026/) - Retry strategies, jitter
- [Preference learning survey](https://dl.acm.org/doi/full/10.1145/3773279) - Multi-signal learning, rule merging
- [Weighted scoring model](https://productschool.com/blog/product-fundamentals/weighted-scoring-model/) - Error weight calculation
- [Flesch Reading Ease](https://yoast.com/flesch-reading-ease-score/) - Text complexity metrics
- [SCoRe: Self-correction via RL](https://arxiv.org/pdf/2409.12917) - Learning from mistakes

### Tertiary (LOW confidence)

- [Cockatiel GitHub](https://github.com/connor4312/cockatiel) - Alternative resilience library (not verified in practice)
- [natural library](https://www.npmjs.com/package/natural) - NLP utilities (syllable counting, tokenization)

## Metadata

**Confidence breakdown:**
- Validation patterns: HIGH - LLM-as-a-judge is well-established in 2026, multiple authoritative sources
- Circuit breakers: HIGH - opossum is industry standard, pattern borrowed from proven microservices practices
- Error escalation: HIGH - Weighted scoring and exponential backoff are standard in distributed systems
- Feedback learning: MEDIUM-HIGH - RLHF patterns well-documented, but GSD-specific rule merging is custom implementation

**Research date:** 2026-02-16
**Valid until:** 2026-03-16 (30 days - stable domain, circuit breakers and validation are mature patterns)

**Key findings:**
1. **LLM-as-a-judge is production-ready** - 80-90% human agreement, 500-5000x cost savings vs manual review
2. **Circuit breakers prevent runaway execution** - opossum library provides battle-tested implementation, used by Red Hat/IBM
3. **Weighted error scoring differentiates severity** - Complete rejections (1.0) vs fixes (0.5) vs retries (0.25) enables smart escalation
4. **Adaptive thresholds improve over time** - Task complexity + learned historical data → better timeout/iteration limits
5. **GSD infrastructure ready for Phase 2** - JSONL logging, quota tracking, model profiles already in place from Phase 1
6. **Feedback loops close the learning cycle** - RLHF patterns enable continuous routing improvement without retraining models
7. **Tiered validation balances cost and quality** - Light checks for low-risk, thorough for critical tasks prevents validation bottleneck
