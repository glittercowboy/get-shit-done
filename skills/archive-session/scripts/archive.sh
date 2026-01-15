#!/bin/bash
# archive.sh - Archive Claude Code session transcript and subagent logs

set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Archive destination - configurable via env var or argument
# Default: .claude/session-archive/ (project-local)
# Can be overridden with CLAUDE_ARCHIVE_DIR env var or --output=<path> argument
DEFAULT_ARCHIVE_BASE="${PROJECT_DIR}/.claude/session-archive"
ARCHIVE_BASE="${CLAUDE_ARCHIVE_DIR:-${DEFAULT_ARCHIVE_BASE}}"

# Claude Code stores transcripts in ~/.claude/projects/<project-hash>/
PROJECT_HASH=$(echo "${PROJECT_DIR}" | sed 's|/|-|g')
TRANSCRIPT_DIR="${HOME}/.claude/projects/${PROJECT_HASH}"

# Accept session ID as first positional arg, or detect from most recent
SESSION_ID=""
for arg in "$@"; do
    case "$arg" in
        --output=*) ARCHIVE_BASE="${arg#*=}" ;;
        *) [ -z "$SESSION_ID" ] && SESSION_ID="$arg" ;;
    esac
done

# Security: Validate SESSION_ID format (UUID only)
if [ -n "${SESSION_ID}" ]; then
    if ! [[ "${SESSION_ID}" =~ ^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$ ]]; then
        echo "Error: Invalid session ID format. Expected UUID format (e.g., 602fca42-0159-466c-bdb7-00745e1939f1)"
        exit 1
    fi
fi

# Security: Validate and normalize ARCHIVE_BASE path
# Expand tilde
ARCHIVE_BASE=$(eval echo "${ARCHIVE_BASE}")

# Security: Ensure archive path is not a sensitive system directory (before path normalization)
case "${ARCHIVE_BASE}" in
    /etc|/etc/*|/bin|/bin/*|/sbin|/sbin/*|/usr/bin|/usr/bin/*|/usr/sbin|/usr/sbin/*|/System|/System/*|/private/etc|/private/etc/*|/private/var/root|/private/var/root/*)
        echo "Error: Cannot archive to system directory: ${ARCHIVE_BASE}"
        exit 1
        ;;
esac

# Normalize to absolute path
ARCHIVE_BASE=$(cd "$(dirname "${ARCHIVE_BASE}")" 2>/dev/null && pwd)/$(basename "${ARCHIVE_BASE}") || {
    echo "Error: Invalid output path: ${ARCHIVE_BASE}"
    exit 1
}

if [ -z "${SESSION_ID}" ]; then
    # Find most recently modified .jsonl file = current session
    LATEST_TRANSCRIPT=$(ls -t "${TRANSCRIPT_DIR}"/*.jsonl 2>/dev/null | head -1)
    if [ -n "${LATEST_TRANSCRIPT}" ]; then
        SESSION_ID=$(basename "${LATEST_TRANSCRIPT}" .jsonl)

        # Validate auto-detected session ID
        if ! [[ "${SESSION_ID}" =~ ^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$ ]]; then
            echo "Error: Auto-detected invalid session ID format"
            exit 1
        fi

        echo "Detected current session: ${SESSION_ID}"
    fi
fi

if [ -z "${SESSION_ID}" ]; then
    echo "No session found to archive"
    exit 0
fi

# Verify session exists
MAIN_TRANSCRIPT="${TRANSCRIPT_DIR}/${SESSION_ID}.jsonl"
if [ ! -f "${MAIN_TRANSCRIPT}" ]; then
    echo "Session transcript not found: ${MAIN_TRANSCRIPT}"
    exit 1
fi

# Archive destination with export timestamp
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
SESSION_ARCHIVE="${ARCHIVE_BASE}/exported-on-${TIMESTAMP}"

mkdir -p "${SESSION_ARCHIVE}"

# Archive main transcript
echo "Archiving main transcript..."
cp "${MAIN_TRANSCRIPT}" "${SESSION_ARCHIVE}/session.jsonl"
MAIN_SIZE=$(ls -lh "${SESSION_ARCHIVE}/session.jsonl" | awk '{print $5}')
echo "Main transcript: ${MAIN_SIZE}"

# Archive subagent logs if they exist
SUBAGENTS_DIR="${TRANSCRIPT_DIR}/${SESSION_ID}/subagents"
SUBAGENT_COUNT=0
if [ -d "${SUBAGENTS_DIR}" ]; then
    SUBAGENT_COUNT=$(find "${SUBAGENTS_DIR}" -name "agent-*.jsonl" 2>/dev/null | wc -l | tr -d ' ')
    if [ "${SUBAGENT_COUNT}" -gt 0 ]; then
        echo "Archiving ${SUBAGENT_COUNT} subagent transcripts..."
        cp -r "${SUBAGENTS_DIR}" "${SESSION_ARCHIVE}/subagents"
    fi
fi

# Generate HTML report with claude-code-log
if [ "${SUBAGENT_COUNT}" -gt 0 ]; then
    REPORT_SOURCE="${SESSION_ARCHIVE}/subagents"
elif [ -f "${SESSION_ARCHIVE}/session.jsonl" ]; then
    REPORT_SOURCE="${SESSION_ARCHIVE}/session.jsonl"
else
    REPORT_SOURCE=""
fi

if [ -n "${REPORT_SOURCE}" ]; then
    if command -v claude-code-log &>/dev/null; then
        echo "Generating HTML report..."
        claude-code-log "${REPORT_SOURCE}" --open-browser 2>/dev/null || {
            echo "Warning: HTML report generation failed"
        }
    elif command -v uvx &>/dev/null; then
        echo "Generating HTML report via uvx..."
        uvx claude-code-log@latest "${REPORT_SOURCE}" --open-browser 2>/dev/null || {
            echo "Warning: HTML report generation failed"
        }
    else
        echo "Warning: claude-code-log not available, skipping report generation"
    fi

    # Remove redundant combined file if subagents were processed
    if [ "${SUBAGENT_COUNT}" -gt 0 ]; then
        rm -f "${SESSION_ARCHIVE}/subagents/combined_transcripts.html"
    fi
fi

# Create session metadata
cat >"${SESSION_ARCHIVE}/session-info.txt" <<EOF
Session ID: ${SESSION_ID}
Project: ${PROJECT_DIR}
Timestamp: ${TIMESTAMP}
Main Transcript: ${MAIN_SIZE}
Subagent Count: ${SUBAGENT_COUNT}
EOF

echo ""
echo "Session archive complete: ${SESSION_ARCHIVE}"
cat "${SESSION_ARCHIVE}/session-info.txt"
