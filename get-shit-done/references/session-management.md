# Session Management

Prevents concurrent GSD execution on the same phase across multiple Claude sessions.

## Session File

Location: `.planning/ACTIVE-SESSIONS.json`

```json
{
  "sessions": [
    {
      "id": "03-1737123456",
      "phase": "03",
      "started": "2026-01-17T10:30:00Z",
      "last_activity": "2026-01-17T10:45:00Z",
      "status": "executing"
    }
  ]
}
```

## Session ID Format

`{phase}-{unix_timestamp}`

Examples:
- `03-1737123456` — Phase 3, started at timestamp
- `02.1-1737123456` — Inserted phase 2.1

## Session Lifecycle

### 1. Registration (Start of execute-phase)

```bash
PHASE="03"

# Initialize sessions file and prune stale entries (4h TTL)
node ~/.claude/hooks/gsd-session.js init --ttl-seconds 14400

# Register a new session (prints the session id)
SESSION_ID=$(node ~/.claude/hooks/gsd-session.js register --phase "$PHASE")

# Export for stop hook best-effort cleanup
export GSD_SESSION_ID="$SESSION_ID"
```

### 2. Conflict Detection

Before registration, check for existing sessions on same phase:

```bash
CONFLICTS=$(node ~/.claude/hooks/gsd-session.js list --phase "$PHASE" --format lines 2>/dev/null)
```

If conflicts found, present to user with options.

### 3. Conflict Resolution

User chooses one of:
1. **Continue anyway** — Register this session, may cause git conflicts
2. **Wait** — Exit without execution, check back later
3. **Claim phase** — Remove old session(s), register this one (use if old session is stale)

Claim implementation:
```bash
node ~/.claude/hooks/gsd-session.js claim --phase "$PHASE" 2>/dev/null
```

### 4. Heartbeat (Between waves)

Update `last_activity` after each wave completes:

```bash
node ~/.claude/hooks/gsd-session.js heartbeat --id "$SESSION_ID" 2>/dev/null || true
```

### 5. Cleanup (Completion or exit)

Remove session entry when execution completes:

```bash
node ~/.claude/hooks/gsd-session.js cleanup --id "$SESSION_ID" 2>/dev/null || true
```

## Stale Session Detection

Sessions older than 4 hours are considered stale:

```bash
node ~/.claude/hooks/gsd-session.js init --ttl-seconds 14400
```

Run this at session start to auto-clean stale entries.

## Environment Variable

After registration, export the session ID for cleanup hooks:

```bash
export GSD_SESSION_ID="$SESSION_ID"
```

The stop hook uses this to clean up on session exit.

## Hook Integration

### Session Start (hooks/session-start.js)

Optional hook that runs on Claude session start:
- Creates ACTIVE-SESSIONS.json if missing
- Cleans stale sessions
- Shows warning if active sessions exist

### Session Stop (hooks/session-stop.js)

Runs on Claude session exit:
- Reads `GSD_SESSION_ID` from environment
- Removes session entry from ACTIVE-SESSIONS.json
- Silent operation (no output)

## Disabling Session Safety

Add to `.planning/config.json`:

```json
{
  "enhancements": {
    "session_safety": false
  }
}
```

When disabled, skip all session checks and registration.
