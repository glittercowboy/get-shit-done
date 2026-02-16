---
phase: 08-notifications-and-observability
plan: 01
subsystem: notifications
tags: [telegram, bot, human-in-loop, blocking-questions]
dependency_graph:
  requires: []
  provides: [telegram-bot-infrastructure, blocking-question-flow]
  affects: [autonomous-execution]
tech_stack:
  added: [telegraf, dotenv]
  patterns: [promise-based-blocking, in-memory-state, callback-queries]
key_files:
  created:
    - get-shit-done/bin/telegram-conversation.js
    - get-shit-done/bin/telegram-bot.js
  modified:
    - get-shit-done/bin/gsd-tools.js
    - package.json
decisions:
  - summary: "Use in-memory Map for question storage (single-user bot)"
    rationale: "Simple and sufficient for single-user workflow, avoids database overhead"
  - summary: "Lazy-load telegram modules in gsd-tools to avoid startup overhead"
    rationale: "Only load Telegraf when telegram commands are actually used"
  - summary: "Default 1-hour timeout for blocking questions"
    rationale: "Reasonable balance between responsiveness and patience for async human responses"
metrics:
  duration: "4 min 17 sec"
  tasks_completed: 4
  files_created: 2
  files_modified: 2
  commits: 3
  completed_at: "2026-02-16T13:12:32Z"
---

# Phase 08 Plan 01: Telegram Bot Infrastructure Summary

**One-liner:** Telegraf-based bot for sending blocking questions to users via Telegram with promise-based response handling and graceful credential fallback

## Overview

Created complete Telegram bot infrastructure for human-in-the-loop intervention during autonomous execution. Bot enables Claude to send blocking questions when human input is required (ambiguous requirements, security decisions, architecture tradeoffs) and resume execution after receiving responses.

## Implementation Details

### Core Components

**1. telegram-conversation.js (145 lines)**
- In-memory question storage using Map keyed by questionId
- Promise-based blocking question flow with `askUser()` and `handleResponse()`
- Question ID format: `q_timestamp_random` (e.g., `q_1771247295_abc123`)
- Configurable timeouts with automatic cleanup (default: 1 hour)
- Timeout and cancellation error handling with proper rejection
- Exported functions: `askUser`, `handleResponse`, `getPendingQuestions`, `cancelQuestion`, `generateQuestionId`

**2. telegram-bot.js (231 lines)**
- Telegraf bot initialization with graceful fallback for missing credentials
- Command handlers:
  - `/start` - Welcome message and chat ID capture
  - `/status` - Show pending questions count
  - `/pending` - List all pending questions with IDs and age
  - `/cancel <questionId>` - Cancel specific pending question
- Message handlers:
  - Text messages: Explicit format (`questionId answer`) or implicit (single pending question)
  - Callback queries: Inline keyboard button presses
- `sendBlockingQuestion()` function for blocking Q&A flow
- Bot lifecycle: `startBot()` and `stopBot()` with graceful shutdown on SIGINT/SIGTERM
- Graceful degradation when `TELEGRAM_BOT_TOKEN` not set (exports disabled stubs)

**3. gsd-tools.js telegram commands**
- `telegram start` - Start bot in polling mode
- `telegram stop` - Stop bot gracefully
- `telegram test <message>` - Send test message with 5-minute timeout
- `telegram ask <question>` - Send blocking question with optional `--choices` flag
- `telegram pending` - Show pending questions in table/JSON format
- `telegram status` - Show bot status and pending count

### Design Decisions

**Question Storage:**
- In-memory Map instead of database for simplicity
- Keyed by unique questionId for O(1) lookup
- Stores resolve/reject functions with question metadata

**Bot Flow:**
1. `sendBlockingQuestion()` creates promise via `askUser()`
2. Bot sends formatted message to owner with questionId
3. Optional inline keyboard if choices provided
4. User responds via text message or button press
5. Handler calls `handleResponse()` which resolves promise
6. Execution resumes with response object

**Graceful Fallback:**
- Checks for `TELEGRAM_BOT_TOKEN` before loading Telegraf
- If missing, exports disabled stubs that return error responses
- Prevents bot from crashing execution when not configured
- Clear setup instructions printed to console

**Timeout Handling:**
- Each question gets a setTimeout that rejects promise on expiry
- Timeout cleared when question answered or cancelled
- Question automatically removed from pendingQuestions on timeout
- Custom timeouts via options parameter

## Verification Results

All verification tests passed:

1. ✓ Module loads with graceful fallback (no token)
2. ✓ Question ID generation follows format `q_\d+_[a-z0-9]+`
3. ✓ Pending questions initially empty
4. ✓ gsd-tools telegram commands registered and working
5. ✓ Conversation round-trip works: ask → pending → respond → resolve
6. ✓ Both bot and conversation modules export required functions

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing telegraf dependency**
- **Found during:** Task 2 - Creating telegram-bot.js
- **Issue:** `require('telegraf')` failed with MODULE_NOT_FOUND
- **Fix:** `npm install telegraf --save`
- **Files modified:** package.json, package-lock.json
- **Commit:** Included in Task 2 commit (e6ac32f)

**2. [Rule 3 - Blocking] Missing dotenv dependency**
- **Found during:** Task 2 - Verifying telegram-bot.js
- **Issue:** `require('dotenv')` failed with MODULE_NOT_FOUND
- **Fix:** `npm install dotenv --save`
- **Files modified:** package.json, package-lock.json
- **Commit:** Included in Task 2 commit (e6ac32f)

Both deviations were expected missing dependencies required for the feature to work. No architectural changes or plan modifications needed.

## Integration Points

**With gsd-tools:**
- Telegram commands accessible via `node get-shit-done/bin/gsd-tools.js telegram <subcommand>`
- JSON output with `--raw` flag for programmatic use
- Lazy-loaded modules avoid overhead when not used

**With autonomous execution:**
- `sendBlockingQuestion()` can be imported and called from executor agents
- Promise-based API integrates cleanly with async execution flows
- Timeout errors allow executors to handle unresponsive users gracefully

**With .env configuration:**
- `TELEGRAM_BOT_TOKEN` - Bot token from @BotFather
- `TELEGRAM_OWNER_ID` - User's chat ID (optional, captured via /start)

## Testing Coverage

**Unit-level verification:**
- Module exports correct function types
- Question ID format validation
- Pending questions tracking
- Response handling and promise resolution

**Integration verification:**
- gsd-tools command registration
- Module loading with/without credentials
- Round-trip question/response flow (mocked)

**Manual testing required:**
- Live Telegram message sending (requires bot token)
- Inline keyboard button interactions (requires bot token)
- Multi-user scenarios (currently single-user design)

## Next Steps

**Immediate (Plan 08-02):**
- Integrate `sendBlockingQuestion()` into autonomous executor agents
- Add checkpoint handling for human-verify scenarios
- Create notification templates for common question types

**Future enhancements:**
- Multi-user support with user-to-chatId mapping
- Question history persistence (SQLite or JSON file)
- Rich message formatting (Markdown, code blocks)
- File/image attachments in questions
- Webhook mode for production deployment

## Commits

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Create telegram-conversation.js module | 29ea22c | telegram-conversation.js |
| 2 | Create telegram-bot.js server | e6ac32f | telegram-bot.js, package.json, package-lock.json |
| 3 | Add telegram CLI commands to gsd-tools | 8771969 | gsd-tools.js |
| 4 | Verify integration (no code changes) | - | - |

## Self-Check

Verifying all claimed artifacts exist and commits are valid.

**Files created:**

✓ FOUND: get-shit-done/bin/telegram-conversation.js
✓ FOUND: get-shit-done/bin/telegram-bot.js

**Commits exist:**
✓ FOUND: 29ea22c (Task 1: telegram-conversation module)
✓ FOUND: e6ac32f (Task 2: telegram-bot server)
✓ FOUND: 8771969 (Task 3: telegram CLI commands)

**Modified files verified:**
✓ FOUND: get-shit-done/bin/gsd-tools.js (telegram commands added)
✓ FOUND: package.json (telegraf and dotenv dependencies)

## Self-Check: PASSED

All claimed artifacts exist, all commits are valid, all verifications passed.
