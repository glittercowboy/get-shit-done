#!/bin/bash
# GSD Stop Hook
# Detects GSD_SPAWN marker when Claude finishes responding
# Spawns successor window and exits current session

LOGFILE="$HOME/.claude/hooks/gsd-session.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [Stop] $1" >> "$LOGFILE"
}

INPUT=$(cat)
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // empty')

# Only run if in a GSD project
if [[ ! -d "$CWD/.planning" ]]; then
    exit 0
fi

# Check if yolo/spawn mode is enabled
MODE=$(cat "$CWD/.planning/config.json" 2>/dev/null | jq -r '.mode // "interactive"')
SPAWN_ENABLED=$(cat "$CWD/.planning/config.json" 2>/dev/null | jq -r '.spawn.enabled // false')

if [[ "$MODE" != "yolo" && "$SPAWN_ENABLED" != "true" ]]; then
    exit 0
fi

# Parse transcript for GSD_SPAWN marker in the most recent response
if [[ ! -f "$TRANSCRIPT_PATH" ]]; then
    log "Skip: transcript not found"
    exit 0
fi

# Check if we already spawned recently (prevent duplicate spawns)
SPAWN_MARKER_FILE="$CWD/.planning/.spawn-marker-processed"
CURRENT_TIME=$(date +%s)

# Get the last assistant message and check for spawn marker
# Look at the last 100 lines to find recent output
SPAWN_LINE=$(tail -100 "$TRANSCRIPT_PATH" 2>/dev/null | \
    jq -r '.message.content[]?.text // empty' 2>/dev/null | \
    grep -o 'GSD_SPAWN: /gsd:[^ ]*[^`]*' | \
    tail -1 || echo "")

# If we found a marker, check if it's the same one we already processed
if [[ -n "$SPAWN_LINE" && -f "$SPAWN_MARKER_FILE" ]]; then
    LAST_PROCESSED=$(cat "$SPAWN_MARKER_FILE" 2>/dev/null)
    if [[ "$SPAWN_LINE" == "$LAST_PROCESSED" ]]; then
        # Already processed this marker
        exit 0
    fi
fi

if [[ -z "$SPAWN_LINE" ]]; then
    # No spawn marker - normal stop, nothing to do
    exit 0
fi

# Found spawn marker!
log "Found spawn marker: $SPAWN_LINE"

# Get current pane PID (same PID that was used at session start)
PANE_PID=$(tmux display-message -p '#{pane_pid}' 2>/dev/null || echo "")
if [[ -z "$PANE_PID" ]]; then
    log "Skip: cannot get pane PID"
    exit 0
fi

# Read source window ID from PID-specific file (prevents killing wrong session)
SOURCE_ID_FILE="$CWD/.planning/.window-$PANE_PID"
if [[ ! -f "$SOURCE_ID_FILE" ]]; then
    log "Skip: no window ID file for PID $PANE_PID"
    exit 0
fi
SOURCE_WINDOW_ID=$(cat "$SOURCE_ID_FILE")
log "Source window ID: $SOURCE_WINDOW_ID (pane PID: $PANE_PID)"

# Parse the command
NEXT_CMD=$(echo "$SPAWN_LINE" | sed 's/^GSD_SPAWN: //' | sed 's/[[:space:]]*$//')
log "Spawn command: $NEXT_CMD"

# Generate successor window name
PROJECT_NAME=$(basename "$CWD")
TIMESTAMP=$(date +%s)
SUCCESSOR_NAME="${PROJECT_NAME}-${TIMESTAMP}"

# Spawn successor window
log "Spawning: $SUCCESSOR_NAME"
tmux new-window -n "$SUCCESSOR_NAME" -c "$CWD" \
    "claude --dangerously-skip-permissions --chrome '$NEXT_CMD'"

# Brief delay to let window initialize
sleep 1

# Verify successor exists
if tmux list-windows -F '#W' | grep -q "^${SUCCESSOR_NAME}$"; then
    log "Successor verified: $SUCCESSOR_NAME"

    # Send notification
    osascript -e "display notification \"$NEXT_CMD\" with title \"GSD: $PROJECT_NAME\"" 2>/dev/null || true

    # Mark this marker as processed (prevent duplicate spawns)
    echo "$SPAWN_LINE" > "$SPAWN_MARKER_FILE"

    # Send /exit to the source window to close it cleanly
    # This will trigger SessionEnd which can clean up
    log "Sending /exit to source window"
    tmux send-keys -t ":$SOURCE_WINDOW_ID" '/exit' Enter

    # Clean up window ID file
    rm -f "$SOURCE_ID_FILE"
else
    log "ERROR: Successor not found, keeping source window open"
fi
