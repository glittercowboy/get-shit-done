---
phase: 05
plan: 03
subsystem: knowledge-permissions-safety
tags: [cost-tracking, budget-management, circuit-breaker, safety]
dependency_graph:
  requires: [knowledge-db.js schema]
  provides: [cost tracking, budget alerts, circuit breaker]
  affects: [knowledge system operations, safety enforcement]
tech_stack:
  added: [graduated budget alerts, circuit breaker pattern]
  patterns: [threshold monitoring, alert deduplication, state machine]
key_files:
  created:
    - get-shit-done/bin/knowledge-cost.js
  modified:
    - get-shit-done/bin/knowledge-db.js
decisions:
  - Use graduated thresholds (50%/80%/90%/100%) for progressive warnings
  - Alert deduplication via budget_alerts table prevents notification spam
  - Circuit breaker auto-activates at 100% budget to enforce hard limits
  - Period-based tracking supports both daily and weekly budget windows
  - File-based budget configuration with fallback to sensible defaults ($5 daily/$25 weekly)
metrics:
  duration: 3 minutes
  tasks: 3
  files: 2
  commits: 3
  completed: 2026-02-16
---

# Phase 05 Plan 03: Cost Tracking & Budget Alerts Summary

**One-liner:** Graduated budget monitoring with circuit breaker at 50%/80%/90%/100% thresholds, alert deduplication, and auto-enforcement via circuit breaker pattern

## What Was Built

Implemented comprehensive cost tracking and budget management system for knowledge operations:

1. **Cost Tracking Schema** - Extended knowledge database to v3 with:
   - `cost_tracking` table for action cost logging with timestamps and metadata
   - `budget_alerts` table for threshold deduplication (prevents alert spam)
   - `circuit_breaker` table for budget enforcement state
   - Indexed on timestamp for efficient period queries

2. **Cost Tracking Module** (`knowledge-cost.js`) - Core budget monitoring:
   - `trackCost()` - Record action costs with metadata
   - `getTotalCost()` - Calculate daily/weekly period totals
   - `checkBudgetAlerts()` - Monitor thresholds and fire alerts
   - Period calculation functions (daily starts at midnight, weekly starts Sunday)
   - Budget configuration via `.planning/knowledge/permissions-config.json` with defaults

3. **Graduated Budget Alerts** - Progressive warning system:
   - 50% threshold → info level
   - 80% threshold → warning level
   - 90% threshold → high level
   - 100% threshold → critical level + circuit breaker activation
   - Each alert fires only once per budget period (deduplication)
   - Alerts include total cost, budget, percentage, and severity level

4. **Circuit Breaker** - Hard limit enforcement:
   - Auto-activates at 100% budget via `checkBudgetAlerts()`
   - Manual control via `enableCircuitBreaker()` / `disableCircuitBreaker()`
   - State checking via `isCircuitBreakerEnabled()` and `shouldBlockCostlyAction()`
   - Persists reason and activation timestamp
   - Prevents costly operations when enabled

## Key Decisions Made

**1. Graduated thresholds vs single limit**
- Chose 4-level progression (50%/80%/90%/100%) over simple on/off
- Rationale: Progressive warnings allow intervention before hard limit
- Pattern: info → warning → high → critical escalation

**2. Alert deduplication via database**
- Chose database table over in-memory tracking
- Rationale: Prevents spam across process restarts
- Pattern: UNIQUE constraint on (threshold, period_start)

**3. Circuit breaker auto-activation at 100%**
- Chose automatic enforcement over manual-only control
- Rationale: Safety system should be fail-safe by default
- Pattern: Critical alert triggers circuit breaker

**4. Period-based tracking (daily/weekly)**
- Chose calendar periods over rolling windows
- Rationale: Simpler mental model, aligns with typical billing cycles
- Pattern: Midnight/Sunday boundaries via `getStartOfPeriod()`

**5. File-based budget configuration**
- Chose JSON config file over hardcoded limits
- Rationale: Allows per-project customization without code changes
- Fallback: $5 daily / $25 weekly defaults

## Verification Results

All verification criteria passed:

✓ Cost tracking persists to database with timestamps
✓ Period totals (daily/weekly) calculate correctly
✓ Budget alerts fire at correct thresholds (50%, 80%, 90%, 100%)
✓ Each alert fires only once per period (deduplication works)
✓ Circuit breaker activates at 100% budget
✓ Circuit breaker can be manually enabled/disabled
✓ `shouldBlockCostlyAction` respects circuit breaker state

## Integration Points

**Dependencies:**
- `knowledge-db.js` - Database connection and schema management
- `better-sqlite3` - SQLite operations
- Node.js `fs` - Config file loading

**Provides to downstream:**
- Cost tracking for all knowledge operations
- Budget monitoring for Phase 8 observability (OBSV-03)
- Circuit breaker pattern for KNOW-22 enhancement

**Usage pattern:**
```javascript
const { openKnowledgeDB } = require('./knowledge-db.js')
const { trackCost, shouldBlockCostlyAction } = require('./knowledge-cost.js')

const conn = openKnowledgeDB('project')

// Check if allowed
const check = shouldBlockCostlyAction(conn.db)
if (check.blocked) {
  throw new Error(`Action blocked: ${check.reason}`)
}

// Track cost and get alerts
const result = trackCost(conn.db, {
  action: 'api_call',
  cost: 0.50,
  metadata: { model: 'gpt-4', tokens: 1000 }
})

if (result.alerts.length > 0) {
  console.warn('Budget alerts:', result.alerts)
}
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed double-counting in trackCost**
- **Found during:** Task 2 verification
- **Issue:** `trackCost` called `checkBudgetAlerts(db, cost)` after inserting cost to DB, causing cost to be counted twice (once in DB, once in newCost param)
- **Fix:** Changed to `checkBudgetAlerts(db, 0)` since cost already in database
- **Files modified:** `get-shit-done/bin/knowledge-cost.js`
- **Commit:** 45ce1fb (included in main task commit)

**2. [Rule 2 - Missing critical functionality] Added circuit_breaker_enabled to trackCost response**
- **Found during:** Task 3 verification
- **Issue:** `trackCost` return value didn't include `circuit_breaker_enabled` field, inconsistent with `checkBudgetAlerts` response
- **Fix:** Added `circuit_breaker_enabled: alertResult.circuit_breaker_enabled` to return object
- **Files modified:** `get-shit-done/bin/knowledge-cost.js`
- **Commit:** 4dc1fb4

## Technical Notes

**Schema version migration:**
- Bumped from v2 to v3
- Migration adds three new tables
- Initializes circuit_breaker with `enabled=0` default

**Period calculation details:**
- Daily: `setHours(0,0,0,0)` for current day start
- Weekly: Sunday as week start (day 0), calculated via `setDate(diff)`
- Returns millisecond timestamps for SQLite INTEGER compatibility

**Circuit breaker pattern:**
- Single-row table with `CHECK (id = 1)` constraint
- Binary enabled flag (INTEGER 0/1 for SQLite compatibility)
- Stores reason and timestamp for audit trail

**Alert level mapping:**
- Threshold >= 1.0 → critical
- Threshold >= 0.9 → high
- Threshold >= 0.8 → warning
- Threshold >= 0.5 → info

## Self-Check: PASSED

**Created files exist:**
```
✓ get-shit-done/bin/knowledge-cost.js
```

**Modified files exist:**
```
✓ get-shit-done/bin/knowledge-db.js (schema v2→v3)
```

**Commits exist:**
```
✓ 0239eb6: feat(05-03): add cost tracking schema
✓ 45ce1fb: feat(05-03): implement cost tracking module
✓ 4dc1fb4: fix(05-03): include circuit breaker state in trackCost response
```

**Schema validation:**
```
✓ Tables created: cost_tracking, budget_alerts, circuit_breaker
✓ Schema version: 3
✓ Indexes created: idx_cost_timestamp
```

**Functional validation:**
```
✓ Cost tracking works
✓ Period totals calculate correctly
✓ All 4 thresholds fire appropriately
✓ Alert deduplication prevents spam
✓ Circuit breaker auto-activates at 100%
✓ Manual circuit breaker control works
✓ shouldBlockCostlyAction respects state
```
