---
phase: 05-knowledge-permissions-safety
plan: 02
subsystem: knowledge-safety
tags: [safety-gates, stop-and-ask, cost-estimation, external-communications, irreversible-actions]

dependency_graph:
  requires:
    - 04-06-PLAN.md (autonomous decisions framework)
    - knowledge-principles.js (action classification)
  provides:
    - Safety gate module with stop-and-ask logic
    - Cost estimation for costly actions
    - Enhanced external communication detection
  affects:
    - Future permission system (05-03)
    - Autonomous execution workflows

tech_stack:
  added:
    - knowledge-safety.js module
  patterns:
    - Lazy-loading pattern for circular dependency avoidance
    - Category-based safety classification (irreversible/external/costly)
    - Graduated cost estimation by provider type

key_files:
  created:
    - get-shit-done/bin/knowledge-safety.js
  modified:
    - get-shit-done/bin/knowledge-principles.js

decisions:
  - Use lazy-loading for knowledge-permissions.js to avoid circular dependencies
  - Conservative cost estimates for cloud resources ($0.10 default)
  - Enhanced external communication patterns with contextual detection
  - Stop-and-ask prompts include estimated costs for costly actions

metrics:
  duration_minutes: 2
  completed_at: "2026-02-16T05:56:26Z"
  tasks_completed: 3
  files_created: 1
  files_modified: 2
  commits: 3
---

# Phase 05 Plan 02: Safety Gates & Stop-and-Ask Summary

**One-liner:** Stop-and-ask safety gates for irreversible/external/costly actions with cost estimation and permission integration

## Overview

Implemented comprehensive safety gate system (KNOW-20, KNOW-21, KNOW-22) that stops execution before dangerous actions unless explicitly permitted. The system categorizes actions into four types (reversible, irreversible, external, costly) and provides human-readable approval prompts with cost estimates. Enhanced external communication detection with contextual patterns and added cost estimation for cloud providers, AI APIs, and payment systems.

## Tasks Completed

### Task 1: Create safety gate module
**Commit:** a1003be
**Files:** get-shit-done/bin/knowledge-safety.js

Created knowledge-safety.js with four core functions:
- `shouldStopAndAsk()` - Determines if action requires approval based on classification
- `formatApprovalPrompt()` - Creates human-readable prompts for each category
- `executeWithSafetyCheck()` - Full safety check flow with permission integration
- `estimateActionCost()` - Provides cost estimates for costly actions

Key design decisions:
- Lazy-loads permissions module to avoid circular dependencies
- Returns structured decision objects with proceed/requires_approval flags
- Integrates with existing classifyAction from knowledge-principles.js

### Task 2: Enhance external communication detection
**Commit:** 42182d2
**Files:** get-shit-done/bin/knowledge-principles.js

Enhanced ACTION_TYPES.external with comprehensive patterns:
- Messaging platforms: slack_message, discord_message, telegram_send
- Communication types: http_request, post_to, publish, broadcast
- Notifications: sms, push_notification

Added contextual detection for compound patterns:
- "send email", "post message", "publish notification" correctly identified
- Combination of action verbs (send/post/publish) with targets (email/message/slack)

### Task 3: Add cost estimation patterns
**Commit:** adc5ced
**Files:** get-shit-done/bin/knowledge-safety.js, get-shit-done/bin/knowledge-principles.js

Enhanced cost estimation with provider-specific patterns:
- Cloud providers: AWS ($0.10), GCP ($0.10), Azure ($0.10)
- AI APIs: OpenAI ($0.05), Anthropic ($0.05)
- Payment systems: Stripe ($0.05)
- Deployments: deploy_to ($0.10)
- Token-based API calls: (tokens / 1M) * $0.50

Updated executeWithSafetyCheck to include estimated costs in approval prompts:
- "This action may cost ~$0.10: deploy_to production. Proceed? [y/N]"

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All verification tests passed:

**Task 1 verification:**
```javascript
shouldStopAndAsk('delete file important.txt')
// → { stop: true, reason: 'irreversible_action', category: 'irreversible', prompt: '...' }

shouldStopAndAsk('send email to client')
// → { stop: true, reason: 'external_communication', category: 'external', prompt: '...' }

shouldStopAndAsk('create cloud_resource on AWS')
// → { stop: true, reason: 'costly_action', category: 'costly', prompt: '...' }

shouldStopAndAsk('edit file config.js')
// → { stop: false, reason: 'safe_action', category: 'reversible' }
```

**Task 2 verification:**
```javascript
classifyAction('send email to user')        // → { category: 'external', keyword: 'send_email' }
classifyAction('post message to slack')     // → { category: 'external', keyword: 'communication_detected' }
classifyAction('publish notification')      // → { category: 'external', keyword: 'notification' }
classifyAction('http_request to external API') // → { category: 'external', keyword: 'http_request' }
```

**Task 3 verification:**
```javascript
estimateActionCost('aws:s3:upload')                              // → 0.1
estimateActionCost('api_call to openai', { estimated_tokens: 1000000 }) // → 0.5
executeWithSafetyCheck('deploy_to production')
// → { proceed: false, requires_approval: true, estimated_cost: 0.1, prompt: '...' }
```

## Success Criteria

All success criteria met:

- ✅ Irreversible actions (delete, drop, truncate) trigger stop-and-ask
- ✅ External communications (email, slack, webhooks) trigger stop-and-ask
- ✅ Costly actions (AWS, API calls, deploys) trigger stop-and-ask with cost estimate
- ✅ Safe/reversible actions proceed without prompt
- ✅ Approval prompts are clear and actionable

## Integration Points

**Upstream dependencies:**
- `knowledge-principles.js` - ACTION_TYPES and classifyAction()
- Future: `knowledge-permissions.js` - checkPermission() (lazy-loaded)

**Downstream consumers:**
- Phase 05 Plan 03: Permission grant/revoke system
- Phase 06: Autonomous execution workflows
- GSD execute-plan workflow (safety gates integration)

## Technical Notes

**Lazy-loading pattern:**
```javascript
function getPermissionsModule() {
  try {
    return require('./knowledge-permissions.js');
  } catch (err) {
    return null;
  }
}
```

This avoids circular dependency issues when knowledge-permissions.js imports knowledge-safety.js. Permission checks are optional - if module not ready, defaults to "not permitted".

**Cost estimation philosophy:**
- Conservative estimates (prefer overestimating to underestimating)
- Provider-agnostic defaults ($0.10 for cloud resources)
- Token-based calculation for API calls when context available
- Falls back to $0.00 for unrecognized actions

**Category priority:**
Safety gates check in order: irreversible → external → costly → reversible. First match determines category. Contextual detection supplements keyword matching for edge cases.

## Self-Check: PASSED

**Files created:**
```bash
[ -f "get-shit-done/bin/knowledge-safety.js" ] && echo "FOUND: knowledge-safety.js" || echo "MISSING"
# → FOUND: knowledge-safety.js
```

**Commits exist:**
```bash
git log --oneline --all | grep -q "a1003be" && echo "FOUND: a1003be" || echo "MISSING"
# → FOUND: a1003be

git log --oneline --all | grep -q "42182d2" && echo "FOUND: 42182d2" || echo "MISSING"
# → FOUND: 42182d2

git log --oneline --all | grep -q "adc5ced" && echo "FOUND: adc5ced" || echo "MISSING"
# → FOUND: adc5ced
```

**Module exports verified:**
```bash
node -e "const safety = require('./get-shit-done/bin/knowledge-safety.js'); console.log(Object.keys(safety));"
# → [ 'shouldStopAndAsk', 'formatApprovalPrompt', 'estimateActionCost', 'executeWithSafetyCheck' ]
```

All claims verified. Ready for STATE.md update.
