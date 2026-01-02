#!/bin/bash
# GSD Session Start Hook
# Captures tmux window ID for safe cleanup later

INPUT=$(cat)
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')

# Only run if in a GSD project
if [[ ! -d "$CWD/.planning" ]]; then
    exit 0
fi

# Get tmux pane PID (unique per session - solves race condition)
PANE_PID=$(tmux display-message -p '#{pane_pid}' 2>/dev/null || echo "")
WINDOW_ID=$(tmux display-message -p '#I' 2>/dev/null || echo "")

if [[ -n "$WINDOW_ID" && -n "$PANE_PID" ]]; then
    # Store window ID in PID-specific file (prevents concurrent session overwrites)
    echo "$WINDOW_ID" > "$CWD/.planning/.window-$PANE_PID"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Captured window ID: $WINDOW_ID (pane PID: $PANE_PID) for $CWD" >> ~/.claude/hooks/gsd-session.log
fi
