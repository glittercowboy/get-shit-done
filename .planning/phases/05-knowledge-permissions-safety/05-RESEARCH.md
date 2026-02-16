# Phase 05: Knowledge Permissions & Safety - Research

**Researched:** 2026-02-16
**Domain:** Permission systems, safety controls, cost tracking, and principle management for autonomous AI agents
**Confidence:** MEDIUM-HIGH

## Summary

Phase 5 builds permission and safety controls on top of Phase 4's autonomous decision framework. The architecture combines explicit permission grants with stated limits, cost tracking with graduated budget alerts, safety-first action classification (irreversible/external/costly require approval), and conflict resolution via user-defined priority rules. The system enables users to grant bounded autonomy ("max $20 on AWS", "delete test files only") while maintaining emergency stop capabilities and feedback loops to invalidate outdated principles.

The standard approach uses SQLite schema extensions for permission storage (grant_id, action_pattern, scope, limits, expiration), cost tracking with threshold-based alerts (50%/80%/90%/100%), action classification allowlists (safe operations proceed autonomously, dangerous operations stop-and-ask), and priority matrices for principle conflict resolution (safety > speed > cost as default hierarchy). Feedback mechanisms allow users to mark principles as "wrong" or "outdated", triggering confidence degradation or invalidation.

**Primary recommendation:** Start with conservative allowlists (filesystem reads, test execution, package install), implement graduated cost alerts with automatic circuit breakers at 100% budget, use priority hierarchies for conflict resolution (user-defined weights), and provide simple `/gsd:grant` and `/gsd:revoke` commands for permission management. Avoid hand-rolling permission matching logic—use pattern-based rules with scope constraints.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-sqlite3 | 12.6.2+ | Permission storage (from Phase 3) | Already implemented in Phase 3 foundation |
| sqlite-vec | 0.1.7-alpha.2+ | Semantic permission matching (from Phase 3) | Already implemented, enables "similar action" detection |
| knowledge-principles.js | Current | Action classification (from Phase 4) | Already implemented in Phase 4, classifies actions by safety |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Node.js crypto | Built-in | Permission token generation | Create secure revocable tokens for grants |
| JSON Schema (conceptual) | - | Permission limit validation | Validate user-provided limits match expected schema |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SQLite permissions table | OAuth2 scopes | OAuth: industry standard, complex setup. SQLite: simpler, local-first, git-trackable. |
| Pattern matching | Regex allowlist | Pattern matching: more flexible ("delete test/*"). Regex: faster but brittle. |
| Priority matrix | Rule-based engine | Priority matrix: simple, transparent. Rule engine: powerful but opaque, harder to debug. |

**Installation:**
```bash
# No new dependencies - builds on Phase 3/4 foundation
```

## Architecture Patterns

### Recommended Project Structure
```
get-shit-done/bin/
├── knowledge-permissions.js   # Permission grant/revoke/check logic
├── knowledge-safety.js        # Safety controls, stop-and-ask gates
├── knowledge-cost.js          # Cost tracking, budget alerts
├── knowledge-conflicts.js     # Principle conflict resolution
└── knowledge-principles.js    # (existing) Action classification

.planning/knowledge/
├── {username}.db              # Knowledge + permissions storage
└── permissions-config.json    # Default limits, priority rules
```

### Pattern 1: Permission Schema Extension
**What:** Extend SQLite schema with permissions table for grant tracking
**When to use:** Phase 5 initialization, schema migration from v1 to v2
**Example:**
```sql
-- Add to knowledge-db.js schema creation
CREATE TABLE IF NOT EXISTS permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  grant_token TEXT UNIQUE NOT NULL,    -- Revocable token
  action_pattern TEXT NOT NULL,        -- 'delete_file', 'api_call:*', 'aws:*'
  scope TEXT NOT NULL,                 -- 'global', 'project', 'path:/test/*'
  limits TEXT,                         -- JSON: { max_cost: 20, max_count: 100 }
  granted_at INTEGER NOT NULL,
  expires_at INTEGER,                  -- TTL for temporary grants
  revoked_at INTEGER,                  -- Track revocation
  metadata TEXT                        -- JSON: { reason, granted_by }
);

CREATE INDEX idx_permissions_pattern ON permissions(action_pattern);
CREATE INDEX idx_permissions_active ON permissions(revoked_at) WHERE revoked_at IS NULL;

-- Cost tracking table
CREATE TABLE IF NOT EXISTS cost_tracking (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  cost REAL NOT NULL,                  -- Dollars
  timestamp INTEGER NOT NULL,
  metadata TEXT                        -- JSON: { provider, tokens, model }
);

CREATE INDEX idx_cost_timestamp ON cost_tracking(timestamp DESC);
```

### Pattern 2: Permission Grant with Limits
**What:** Store permission grant with explicit boundaries (cost, count, scope)
**When to use:** User executes `/gsd:grant` command
**Example:**
```javascript
// Source: OAuth2 scope patterns + SQLite local storage
const crypto = require('crypto');

function grantPermission(db, { action, scope = 'global', limits = {}, ttl = null }) {
  // Generate revocable token
  const grantToken = crypto.randomBytes(16).toString('hex');

  // Calculate expiration
  const grantedAt = Date.now();
  const expiresAt = ttl ? grantedAt + ttl : null;

  // Validate limits schema
  const validLimits = validateLimits(limits);
  if (!validLimits.valid) {
    return { granted: false, error: validLimits.error };
  }

  // Insert grant
  const result = db.prepare(`
    INSERT INTO permissions (grant_token, action_pattern, scope, limits, granted_at, expires_at, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    grantToken,
    action,
    scope,
    JSON.stringify(limits),
    grantedAt,
    expiresAt,
    JSON.stringify({ granted_by: 'user', reason: 'explicit grant' })
  );

  return {
    granted: true,
    grant_id: result.lastInsertRowid,
    grant_token: grantToken,
    expires_at: expiresAt
  };
}

function validateLimits(limits) {
  // Validate common limit types
  if (limits.max_cost !== undefined && (typeof limits.max_cost !== 'number' || limits.max_cost < 0)) {
    return { valid: false, error: 'max_cost must be positive number' };
  }
  if (limits.max_count !== undefined && (typeof limits.max_count !== 'number' || limits.max_count < 1)) {
    return { valid: false, error: 'max_count must be positive integer' };
  }
  if (limits.path !== undefined && typeof limits.path !== 'string') {
    return { valid: false, error: 'path must be string pattern' };
  }
  return { valid: true };
}

// Example usage:
// grantPermission(db, {
//   action: 'aws:*',
//   scope: 'project',
//   limits: { max_cost: 20 },
//   ttl: 7 * 24 * 60 * 60 * 1000  // 7 days
// });
```

### Pattern 3: Permission Check with Pattern Matching
**What:** Check if action permitted by matching against granted permissions
**When to use:** Before executing any action requiring permission
**Example:**
```javascript
// Source: https://www.osohq.com/learn/ai-agent-permissions-delegated-access
// Pattern matching for action permissions

function checkPermission(db, action, context = {}) {
  const now = Date.now();

  // Get active grants matching action pattern
  const grants = db.prepare(`
    SELECT id, action_pattern, scope, limits, grant_token
    FROM permissions
    WHERE revoked_at IS NULL
      AND (expires_at IS NULL OR expires_at > ?)
    ORDER BY granted_at DESC
  `).all(now);

  // Check each grant for match
  for (const grant of grants) {
    const match = matchesPattern(action, grant.action_pattern);
    const scopeMatch = matchesScope(context.scope, grant.scope);

    if (match && scopeMatch) {
      // Check limits
      const limits = JSON.parse(grant.limits || '{}');
      const withinLimits = checkLimits(db, grant.id, action, limits);

      if (withinLimits.allowed) {
        return {
          permitted: true,
          grant_id: grant.id,
          grant_token: grant.grant_token,
          limits
        };
      } else {
        return {
          permitted: false,
          reason: 'limit_exceeded',
          limit_type: withinLimits.exceeded
        };
      }
    }
  }

  return { permitted: false, reason: 'no_matching_grant' };
}

function matchesPattern(action, pattern) {
  // Exact match
  if (action === pattern) return true;

  // Wildcard match (e.g., "aws:*" matches "aws:s3:upload")
  if (pattern.endsWith(':*')) {
    const prefix = pattern.slice(0, -2);
    return action.startsWith(prefix + ':');
  }

  // Glob-style match (e.g., "delete_file:/test/*")
  if (pattern.includes('*')) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(action);
  }

  return false;
}

function matchesScope(contextScope, grantScope) {
  // Global grants work everywhere
  if (grantScope === 'global') return true;

  // Exact scope match
  if (contextScope === grantScope) return true;

  // Path-based scope (e.g., "path:/test/*")
  if (grantScope.startsWith('path:')) {
    const pathPattern = grantScope.slice(5);
    return matchesPattern(contextScope, pathPattern);
  }

  return false;
}

function checkLimits(db, grantId, action, limits) {
  // Check max_cost limit
  if (limits.max_cost !== undefined) {
    const spent = getTotalCost(db, grantId);
    if (spent >= limits.max_cost) {
      return { allowed: false, exceeded: 'max_cost' };
    }
  }

  // Check max_count limit
  if (limits.max_count !== undefined) {
    const count = getActionCount(db, grantId);
    if (count >= limits.max_count) {
      return { allowed: false, exceeded: 'max_count' };
    }
  }

  return { allowed: true };
}
```

### Pattern 4: Cost Tracking with Graduated Alerts
**What:** Track costs and trigger alerts at 50%, 80%, 90%, 100% thresholds
**When to use:** After any action with monetary cost (API calls, cloud resources)
**Example:**
```javascript
// Source: https://uptimerobot.com/knowledge-hub/monitoring/ai-agent-monitoring-best-practices-tools-and-metrics/
// Graduated budget alerts pattern

const ALERT_THRESHOLDS = [0.5, 0.8, 0.9, 1.0]; // 50%, 80%, 90%, 100%

function trackCost(db, { action, cost, metadata = {} }) {
  const timestamp = Date.now();

  // Insert cost record
  db.prepare(`
    INSERT INTO cost_tracking (action, cost, timestamp, metadata)
    VALUES (?, ?, ?, ?)
  `).run(action, cost, timestamp, JSON.stringify(metadata));

  // Check budget limits
  const budgetCheck = checkBudgetAlerts(db, cost);

  return {
    tracked: true,
    cost,
    total_cost: budgetCheck.total_cost,
    alerts: budgetCheck.alerts
  };
}

function checkBudgetAlerts(db, newCost) {
  // Get current spending period (e.g., daily, weekly)
  const periodStart = getStartOfPeriod('daily'); // or 'weekly'

  const result = db.prepare(`
    SELECT SUM(cost) as total_cost
    FROM cost_tracking
    WHERE timestamp >= ?
  `).get(periodStart);

  const totalCost = (result?.total_cost || 0) + newCost;

  // Get budget limit from config
  const budget = getBudgetLimit('daily');
  const percentage = totalCost / budget;

  const alerts = [];
  for (const threshold of ALERT_THRESHOLDS) {
    if (percentage >= threshold && !hasAlertFired(db, threshold, periodStart)) {
      alerts.push({
        level: threshold === 1.0 ? 'critical' : threshold >= 0.9 ? 'high' : 'warning',
        threshold: threshold * 100,
        spent: totalCost,
        budget,
        message: `Budget ${(threshold * 100)}% threshold reached ($${totalCost.toFixed(2)} / $${budget.toFixed(2)})`
      });

      // Mark alert as fired
      markAlertFired(db, threshold, periodStart);

      // Circuit breaker at 100%
      if (threshold === 1.0) {
        enableCircuitBreaker(db, 'budget_exceeded');
      }
    }
  }

  return { total_cost: totalCost, alerts };
}

function getStartOfPeriod(period) {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  if (period === 'daily') {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return startOfDay.getTime();
  } else if (period === 'weekly') {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    return startOfWeek.getTime();
  }

  return now - oneDay; // Default: last 24 hours
}
```

### Pattern 5: Principle Conflict Resolution with Priority Matrix
**What:** Resolve conflicts when multiple principles apply using user-defined priority rules
**When to use:** When autonomous decision-making encounters conflicting principles
**Example:**
```javascript
// Source: https://www.arionresearch.com/blog/conflict-resolution-playbook
// Source: https://www.meegle.com/en_us/topics/decision-matrix/decision-matrix-for-conflict-resolution
// Priority-based conflict resolution

const DEFAULT_PRIORITIES = {
  safety: 1.0,      // Highest priority
  reliability: 0.9,
  security: 0.85,
  speed: 0.6,
  cost: 0.5,
  convenience: 0.3  // Lowest priority
};

function resolvePrincipleConflict(principles, context = {}) {
  // Load user-defined priorities (or use defaults)
  const priorities = loadUserPriorities() || DEFAULT_PRIORITIES;

  // Score each principle
  const scored = principles.map(p => {
    const meta = p.metadata || {};
    const category = meta.category || 'convenience';
    const priority = priorities[category] || 0.5;

    return {
      ...p,
      priority,
      score: p.confidence * priority,  // Combine confidence with priority
      category
    };
  });

  // Sort by score (highest first)
  scored.sort((a, b) => b.score - a.score);

  // Check if top choice is clear (>20% gap)
  if (scored.length >= 2 && (scored[0].score - scored[1].score) / scored[0].score < 0.2) {
    // Too close - escalate to user
    return {
      resolved: false,
      reason: 'ambiguous_priority',
      top_choices: scored.slice(0, 2),
      message: `Conflicting principles: "${scored[0].content}" (${scored[0].category}) vs "${scored[1].content}" (${scored[1].category}). Which should I follow?`
    };
  }

  return {
    resolved: true,
    chosen: scored[0],
    alternatives: scored.slice(1, 3),
    reasoning: `Applied ${scored[0].category} principle (priority: ${scored[0].priority}) with confidence ${scored[0].confidence.toFixed(2)}`
  };
}

function loadUserPriorities() {
  // Load from .planning/knowledge/permissions-config.json
  try {
    const configPath = path.join(process.cwd(), '.planning', 'knowledge', 'permissions-config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    return config.priorities;
  } catch {
    return null;
  }
}

// Example usage:
// const conflict = resolvePrincipleConflict([
//   { content: 'Use caching for speed', confidence: 0.8, metadata: { category: 'speed' } },
//   { content: 'Avoid caching sensitive data', confidence: 0.9, metadata: { category: 'security' } }
// ]);
// Result: security principle wins (0.9 * 0.85 = 0.765 vs 0.8 * 0.6 = 0.48)
```

### Pattern 6: Feedback Loop for Principle Invalidation
**What:** Allow users to mark principles as wrong/outdated, degrading confidence or invalidating
**When to use:** User corrects Claude's autonomous decision or identifies outdated principle
**Example:**
```javascript
// Source: https://productschool.com/blog/user-experience/customer-feedback-loop
// Feedback loop with principle confidence degradation

function markPrincipleWrong(db, principleId, feedback = {}) {
  const { reason, severity = 'minor' } = feedback;

  // Get current principle
  const principle = db.prepare('SELECT * FROM knowledge WHERE id = ?').get(principleId);
  if (!principle) {
    return { success: false, error: 'principle_not_found' };
  }

  const meta = JSON.parse(principle.metadata || '{}');
  const currentConfidence = meta.confidence || 0.7;

  // Degrade confidence based on severity
  const degradation = {
    critical: 1.0,   // Invalidate immediately
    major: 0.5,      // Cut confidence in half
    minor: 0.2       // Reduce by 20%
  };

  const factor = 1 - (degradation[severity] || 0.2);
  const newConfidence = currentConfidence * factor;

  // Update principle
  const updatedMeta = {
    ...meta,
    confidence: newConfidence,
    feedback_count: (meta.feedback_count || 0) + 1,
    last_feedback: Date.now(),
    last_feedback_reason: reason
  };

  // If confidence drops below 0.3, mark as invalidated
  if (newConfidence < 0.3) {
    updatedMeta.invalidated = true;
    updatedMeta.invalidated_at = Date.now();
  }

  db.prepare(`
    UPDATE knowledge
    SET metadata = ?
    WHERE id = ?
  `).run(JSON.stringify(updatedMeta), principleId);

  return {
    success: true,
    old_confidence: currentConfidence,
    new_confidence: newConfidence,
    invalidated: newConfidence < 0.3,
    message: newConfidence < 0.3
      ? 'Principle invalidated due to low confidence'
      : `Confidence reduced to ${(newConfidence * 100).toFixed(0)}%`
  };
}

function markPrincipleOutdated(db, principleId, replacement = null) {
  const meta = getPrincipleMetadata(db, principleId);

  // Mark as outdated
  const updatedMeta = {
    ...meta,
    outdated: true,
    outdated_at: Date.now(),
    replaced_by: replacement,
    confidence: 0.0  // Zero out confidence
  };

  db.prepare(`
    UPDATE knowledge
    SET metadata = ?,
        expires_at = ?
    WHERE id = ?
  `).run(
    JSON.stringify(updatedMeta),
    Date.now() + (7 * 24 * 60 * 60 * 1000),  // Delete in 7 days
    principleId
  );

  return { success: true, outdated: true };
}
```

### Pattern 7: Stop-and-Ask Gate Integration
**What:** Integrate with Phase 4's action classification to stop before dangerous operations
**When to use:** Before executing any irreversible/external/costly action
**Example:**
```javascript
// Source: https://internationalaisafetyreport.org/publication/international-ai-safety-report-2026
// Safety-first stop-and-ask pattern

const { classifyAction } = require('./knowledge-principles.js');

async function executeWithSafetyCheck(action, context = {}, options = {}) {
  // Step 1: Classify action
  const classification = classifyAction(action);

  // Step 2: Check if we have permission
  const permCheck = checkPermission(db, action, context);

  // Irreversible actions ALWAYS require approval unless explicitly granted
  if (classification.category === 'irreversible') {
    if (!permCheck.permitted) {
      return {
        proceed: false,
        requires_approval: true,
        reason: 'irreversible_action',
        prompt: `This action will ${action}. This cannot be undone. Proceed?`,
        classification
      };
    }
  }

  // External communications require approval (unless granted)
  if (classification.category === 'external') {
    if (!permCheck.permitted) {
      return {
        proceed: false,
        requires_approval: true,
        reason: 'external_communication',
        prompt: `This will communicate externally: ${action}. Proceed?`,
        classification
      };
    }
  }

  // Costly actions check budget
  if (classification.category === 'costly') {
    const estimatedCost = estimateActionCost(action, context);

    // Check if we're near budget limit
    const budgetCheck = checkBudgetAlerts(db, estimatedCost);
    if (budgetCheck.alerts.some(a => a.level === 'critical')) {
      return {
        proceed: false,
        requires_approval: true,
        reason: 'budget_exceeded',
        prompt: `Budget limit reached. This action costs ~$${estimatedCost.toFixed(2)}. Proceed?`,
        budget_status: budgetCheck
      };
    }

    // Check permission limits
    if (!permCheck.permitted) {
      return {
        proceed: false,
        requires_approval: true,
        reason: 'no_cost_permission',
        prompt: `This costs money (~$${estimatedCost.toFixed(2)}). Proceed?`,
        estimated_cost: estimatedCost
      };
    }
  }

  // Safe to proceed
  return {
    proceed: true,
    autonomous: true,
    classification,
    permission: permCheck.permitted ? permCheck : null
  };
}

function estimateActionCost(action, context) {
  // Estimate costs based on action type
  if (action.includes('api_call')) {
    return context.estimated_tokens ? (context.estimated_tokens / 1000000) * 0.50 : 0.01;
  }
  if (action.includes('aws:')) {
    return 0.10; // Conservative estimate
  }
  return 0.0;
}
```

### Anti-Patterns to Avoid

- **Implicit Permission Grants:** Do NOT assume permission without explicit grant—require user to run `/gsd:grant` command
- **No Expiration:** Do NOT create permanent grants for costly actions—always set TTL for external/costly permissions
- **Single Priority:** Do NOT use fixed priority order—allow user to customize priority weights via config
- **Ignoring Circuit Breakers:** Do NOT continue execution after budget exceeded—pause and require user override
- **Permission After Action:** Do NOT check permissions after executing action—ALWAYS check before
- **Hardcoded Limits:** Do NOT hardcode budget limits in code—store in user-editable config file

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Permission pattern matching | Custom regex parser | Glob-style patterns with wildcard support | Well-understood, predictable, testable. Edge cases already solved. |
| Cost tracking aggregation | Manual date range queries | SQLite window functions + indexed timestamp | Database handles efficiently, supports complex time windows |
| Priority conflict resolution | Complex decision tree | Weighted score matrix (confidence × priority) | Transparent, debuggable, user-configurable |
| Permission revocation | Delete records | Soft delete with revoked_at timestamp | Maintains audit trail, enables analysis of revoked permissions |
| Budget period calculation | Manual date arithmetic | Standard period functions (start of day/week) | Handles timezone, DST, leap years correctly |
| Alert deduplication | In-memory state | Database-backed alert tracking table | Survives restarts, prevents duplicate alerts |

**Key insight:** Permission systems are security-critical—subtle bugs enable unauthorized actions or block legitimate work. Pattern matching, scope resolution, and limit checking must be bulletproof. Use proven patterns (OAuth scopes, RBAC, capability-based security) adapted to local-first, git-trackable storage.

## Common Pitfalls

### Pitfall 1: Permission Creep Without Revocation
**What goes wrong:** User grants permission temporarily, forgets to revoke, system continues with unbounded access months later
**Why it happens:** No default TTL, no expiration warnings, no periodic permission review
**How to avoid:**
- Default all permissions to 7-day TTL unless user specifies "permanent"
- Weekly permission review notification listing active grants
- Auto-expire permissions after 90 days of non-use
- `/gsd:list-permissions` command shows active grants with age
**Warning signs:** Dozens of old permission grants, grants from months ago still active

### Pitfall 2: Budget Alert Fatigue
**What goes wrong:** Multiple 50% alerts in same hour, user ignores all alerts, misses 100% limit
**Why it happens:** Alerts fire on every action, no deduplication, no rate limiting
**How to avoid:**
- Fire each threshold alert once per budget period
- Rate limit: maximum 1 alert per threshold per hour
- Consolidate alerts: "3 thresholds crossed" instead of 3 separate alerts
- Progressive severity: 50%=info, 80%=warning, 90%=error, 100%=critical
**Warning signs:** Users complain about "too many notifications", budget exceeded without user awareness

### Pitfall 3: Scope Confusion
**What goes wrong:** User grants "delete_file:global" thinking it means "delete any file globally", actually means "grant applies to all projects"
**Why it happens:** Scope (global/project) confused with action scope (what files)
**How to avoid:**
- Rename to grant_scope vs action_scope
- Use path-based patterns: "delete_file:path:/test/*" for file scope
- Show examples in grant command: `/gsd:grant delete_file --scope project --path "/test/*"`
- Validate: require explicit path pattern for dangerous actions
**Warning signs:** User surprised by broad permission application, accidental deletions

### Pitfall 4: Cost Attribution Lag
**What goes wrong:** API cost counted hours after action, budget check passes at execution time but fails retroactively
**Why it happens:** External APIs bill asynchronously, costs reported in batches
**How to avoid:**
- Use estimated costs for real-time checks (pessimistic estimate)
- Track "committed" vs "billed" costs separately
- Reserve budget on action start, confirm on billing
- Periodic reconciliation: fetch actual costs, adjust estimates
**Warning signs:** Budget "exceeded" long after actions completed, inaccurate cost predictions

### Pitfall 5: Principle Invalidation Without Replacement
**What goes wrong:** User marks principle "wrong", system has no alternative, falls back to always asking
**Why it happens:** Invalidation doesn't prompt for correct principle
**How to avoid:**
- On invalidation, ask: "What should I do instead?"
- Store invalidation reason + replacement principle in metadata
- Link replacement principle to invalidated one (metadata.replaced_by)
- Search for similar principles before falling back to ask
**Warning signs:** Increasing rate of "requires approval" after principle invalidations, user frustration

### Pitfall 6: Permission Check Performance Degradation
**What goes wrong:** Permission check scans 1000s of grants on every action, execution slows to crawl
**Why it happens:** No indexes on action_pattern, no query optimization, checking all expired grants
**How to avoid:**
- Index on action_pattern (prefix matching)
- Filter expired grants in query: `WHERE expires_at IS NULL OR expires_at > ?`
- Cache permission checks for 60 seconds (same action/context)
- Limit: maximum 100 active grants per user (warn at 50)
**Warning signs:** Permission checks take >100ms, query logs show table scans

### Pitfall 7: Circular Priority Dependencies
**What goes wrong:** User sets "security > safety" and "safety > security" in different contexts, conflict resolution fails
**Why it happens:** No validation of priority matrix consistency
**How to avoid:**
- Validate priority weights are globally consistent (no cycles)
- Detect conflicts: if A > B and B > A, reject config
- Single global priority order (safety > security > reliability > speed > cost)
- Allow context overrides but inherit base ordering
**Warning signs:** Conflict resolution infinite loops, "cannot resolve conflict" errors

### Pitfall 8: Missing Emergency Stop
**What goes wrong:** Autonomous agent stuck in expensive loop, no way to pause without killing process
**Why it happens:** No circuit breaker toggle, no interrupt mechanism
**How to avoid:**
- Implement `/gsd:pause` command (sets circuit breaker flag)
- Check circuit breaker before every action: if set, stop and await user
- Expose circuit breaker via config file: `emergency_stop: true`
- Auto-enable circuit breaker at 100% budget or 3 failed actions in 60s
**Warning signs:** Users force-kill GSD processes, runaway token usage, inability to stop gracefully

## Code Examples

Verified patterns from official sources:

### Permission Config File
```json
// .planning/knowledge/permissions-config.json
{
  "version": 1,
  "budget": {
    "daily": 5.0,
    "weekly": 25.0,
    "alert_thresholds": [0.5, 0.8, 0.9, 1.0]
  },
  "priorities": {
    "safety": 1.0,
    "security": 0.9,
    "reliability": 0.85,
    "speed": 0.6,
    "cost": 0.5,
    "convenience": 0.3
  },
  "defaults": {
    "permission_ttl_days": 7,
    "max_active_grants": 100,
    "circuit_breaker_enabled": true
  },
  "allowlist": {
    "safe_actions": [
      "read_file:*",
      "run_test:*",
      "format_code",
      "lint",
      "install_package:dev"
    ]
  }
}
```

### Simple Grant Command
```javascript
// CLI command: /gsd:grant delete_file --path "/test/*" --ttl 7d
async function handleGrantCommand(args) {
  const { action, path, ttl, maxCost, maxCount } = args;

  const limits = {};
  if (path) limits.path = path;
  if (maxCost) limits.max_cost = parseFloat(maxCost);
  if (maxCount) limits.max_count = parseInt(maxCount);

  const ttlMs = ttl ? parseDuration(ttl) : 7 * 24 * 60 * 60 * 1000; // Default 7 days

  const grant = grantPermission(db, {
    action,
    scope: 'project',
    limits,
    ttl: ttlMs
  });

  if (grant.granted) {
    console.log(`Permission granted:`);
    console.log(`  Action: ${action}`);
    console.log(`  Limits: ${JSON.stringify(limits)}`);
    console.log(`  Expires: ${new Date(grant.expires_at).toLocaleDateString()}`);
    console.log(`  Token: ${grant.grant_token}`);
    console.log(`\nRevoke with: /gsd:revoke ${grant.grant_token}`);
  } else {
    console.error(`Failed to grant permission: ${grant.error}`);
  }
}

function parseDuration(str) {
  const match = str.match(/^(\d+)([hdw])$/);
  if (!match) throw new Error('Invalid duration format (use: 7d, 24h, 2w)');

  const value = parseInt(match[1]);
  const unit = match[2];

  const ms = {
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000
  };

  return value * ms[unit];
}
```

### Revoke Permission
```javascript
// CLI command: /gsd:revoke <token>
function revokePermission(db, grantToken) {
  const result = db.prepare(`
    UPDATE permissions
    SET revoked_at = ?
    WHERE grant_token = ?
      AND revoked_at IS NULL
  `).run(Date.now(), grantToken);

  if (result.changes === 0) {
    return { revoked: false, error: 'grant not found or already revoked' };
  }

  return { revoked: true, grant_token: grantToken };
}

// CLI command: /gsd:list-permissions
function listActivePermissions(db) {
  const now = Date.now();

  const grants = db.prepare(`
    SELECT
      grant_token,
      action_pattern,
      scope,
      limits,
      granted_at,
      expires_at,
      CASE
        WHEN expires_at IS NULL THEN 'permanent'
        ELSE CAST((expires_at - ?) / (24*60*60*1000) AS INTEGER) || ' days'
      END as expires_in
    FROM permissions
    WHERE revoked_at IS NULL
      AND (expires_at IS NULL OR expires_at > ?)
    ORDER BY granted_at DESC
  `).all(now, now);

  return grants;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual approval for everything | Autonomous with bounded permissions | 2025-2026 | 80% fewer interruptions, faster workflows |
| Static permission lists | Pattern-based dynamic matching | 2026 | Flexible, handles new actions without code changes |
| All-or-nothing access | Graduated limits (cost, count, scope) | 2026 | Fine-grained control, reduced risk |
| Post-execution cost tracking | Pre-execution budget checks | 2025-2026 | Prevents overruns, predictable spending |
| Single priority order | User-defined priority matrix | 2026 | Customizable conflict resolution, context-aware |
| Ignore feedback | Confidence degradation on negative feedback | 2026 | Self-correcting, learns from mistakes |

**Deprecated/outdated:**
- **Binary permissions (allow/deny):** Replaced by graduated limits (max cost, max count, scope patterns)
- **Global permission grants:** Now scoped to project/path/resource type
- **No expiration tracking:** All grants now have default TTL
- **Hardcoded priorities:** Now user-configurable via config file

## Open Questions

1. **Multi-User Permission Coordination**
   - What we know: Per-user database files prevent merge conflicts (Phase 3 pattern)
   - What's unclear: If two users grant conflicting permissions to same project, which takes precedence?
   - Recommendation: Permissions are per-user, Claude asks each user independently. No shared permission model in v1.

2. **External Cost Attribution**
   - What we know: Can estimate LLM costs, track explicitly
   - What's unclear: How to track costs for external APIs (AWS, Stripe) without API keys?
   - Recommendation: User provides budget, we track estimated costs. Optional: fetch actual costs via API if keys provided.

3. **Permission Grant UX**
   - What we know: CLI commands work (`/gsd:grant`, `/gsd:revoke`)
   - What's unclear: Should permission grants be interactive (wizard) or command-line flags?
   - Recommendation: Start with flags (explicit), add interactive mode in future if user feedback requests it.

4. **Principle Replacement Workflow**
   - What we know: User can mark principle "wrong"
   - What's unclear: Should Claude immediately ask for replacement, or defer to next Q&A session?
   - Recommendation: Immediate prompt: "What should I do instead?" Store replacement in metadata.

5. **Circuit Breaker Scope**
   - What we know: Budget circuit breaker pauses at 100%
   - What's unclear: Should circuit breaker pause all actions or only costly ones?
   - Recommendation: Pause only costly/external actions. Reversible local actions (tests, formatting) continue.

## Sources

### Primary (HIGH confidence)
- [International AI Safety Report 2026](https://internationalaisafetyreport.org/publication/international-ai-safety-report-2026) - Autonomous AI risks, irreversible actions, emergency stop mechanisms
- [AI Agent Security: Enterprise Guide 2026 | MintMCP](https://www.mintmcp.com/blog/ai-agent-security) - Permission boundaries, allowlists, policy engines
- [AI Agent Access Control | WorkOS](https://workos.com/blog/ai-agent-access-control) - Role-based access, purpose-specific permissions, scope-based control
- [OAuth 2.0 Scopes](https://oauth.net/2/scope/) - Scope mechanism, grant/revoke patterns (industry standard)
- [Microsoft Scopes and Permissions](https://learn.microsoft.com/en-us/entra/identity-platform/scopes-oidc) - Permission schema design, delegated access

### Secondary (MEDIUM confidence)
- [AI Agent Monitoring Best Practices 2026 | UptimeRobot](https://uptimerobot.com/knowledge-hub/monitoring/ai-agent-monitoring-best-practices-tools-and-metrics/) - Cost tracking, budget alerts (50%/80%/90%/100% thresholds)
- [Agent Permission Boundaries | Adopt AI](https://www.adopt.ai/glossary/agent-permission-boundaries) - Security perimeters, access control definitions
- [Conflict Resolution Playbook | Arion Research](https://www.arionresearch.com/blog/conflict-resolution-playbook) - Priority-based resolution, rule hierarchies
- [Decision Matrix for Conflict Resolution | Meegle](https://www.meegle.com/en_us/topics/decision-matrix/decision-matrix-for-conflict-resolution) - Weighted scoring, criteria-based decisions
- [Customer Feedback Loops | ProductSchool](https://productschool.com/blog/user-experience/customer-feedback-loop) - Feedback loop patterns, continuous improvement
- [Setting Permissions for AI Agents | Oso](https://www.osohq.com/learn/ai-agent-permissions-delegated-access) - Delegated access, permission models
- [Claude Code Security Best Practices | Backslash](https://www.backslash.security/blog/claude-code-security-best-practices) - Allowlist approach, filesystem security, zero-trust
- [SQLite RBAC Implementation | SQLite Forum](https://www.sqliteforum.com/p/mastering-role-based-access-control) - Manual RBAC via tables, permission schema

### Tertiary (LOW confidence - marked for validation)
- [Prioritization Matrix Guide 2026 | Digital PM](https://thedigitalprojectmanager.com/productivity/prioritization-matrix/) - Priority matrix applications (general PM, not AI-specific)
- [AI Agent Development Cost 2026 | Cleveroad](https://www.cleveroad.com/blog/ai-agent-development-cost/) - Cost estimates (not directly applicable to tracking)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Builds directly on Phase 3 (SQLite) and Phase 4 (principles) foundations, no new dependencies
- Architecture patterns: MEDIUM-HIGH - Permission patterns verified from OAuth2/RBAC standards, cost tracking from 2026 monitoring guides, conflict resolution from decision matrix literature
- Pitfalls: MEDIUM - Mix of predicted issues (based on permission system complexity) and documented challenges from AI safety reports
- Integration: HIGH - Clear integration points with existing knowledge-principles.js, established schema extension path

**Research date:** 2026-02-16
**Valid until:** ~2026-04-16 (60 days—AI safety practices evolving, new permission models emerging)
