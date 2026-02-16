# Phase Coordinator Failure Handling Integration

## Summary

Integrated failure handling with retry/skip/escalate options into the gsd-phase-coordinator agent definition.

## Location

File updated: `/Users/ollorin/.claude/get-shit-done/agents/gsd-phase-coordinator.md`

This is a global GSD framework file (outside repository) that defines the phase coordinator agent behavior.

## Changes Made

### 1. Added Failure Handling Decision Tree

In the `<step name="execute">` section, added comprehensive failure handling:

- **Automatic retry** for transient errors (ECONNRESET, 429, 503, ETIMEDOUT, rate limit, etc.)
- **Exponential backoff** with jitter (baseDelay * 2^attempt, capped at 30s)
- **Classification** of errors using `gsd-tools.js failure classify`
- **Decision tree** for non-retryable or exhausted retries:
  - RETRY: Manual retry (user believes transient)
  - SKIP: Mark plan incomplete, continue
  - ESCALATE: Stop roadmap, require human intervention

### 2. Added Failure Logging Integration

```bash
node gsd-tools.js failure log-failure ${PHASE} "${ERROR}" ${ACTION}
```

Logs all failures (retried, skipped, escalated) to EXECUTION_LOG.md with NDJSON format.

### 3. Updated Return State Structure

Added `failures` array to return state for tracking:

- **Success with retries**: Shows resolved failures with retry count
- **Blocked/Failed**: Shows unresolved failures with escalation action

Example:
```json
{
  "status": "completed",
  "failures": [
    {
      "phase": 3,
      "plan": "03-02",
      "error": "ECONNRESET: Connection reset",
      "action": "retry",
      "retries": 2,
      "resolved": true
    }
  ]
}
```

## Integration Points

- Uses `failure-handler.js` module for retry logic
- Uses `gsd-tools.js failure` commands for classification and logging
- Compatible with existing checkpoint/verification flow
- No breaking changes to coordinator protocol

## Verification

Confirmed integration via:
```bash
grep -c "retry\|skip\|escalate" /Users/ollorin/.claude/get-shit-done/agents/gsd-phase-coordinator.md
# Result: 25 occurrences (well above minimum requirement)
```

Key patterns verified:
- RETRY/SKIP/ESCALATE options present
- Failure logging command integrated
- Return state includes failures array
