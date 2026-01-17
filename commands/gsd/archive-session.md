---
description: Archive current session transcript and subagent logs with HTML report
argument-hint: "[session-id] [--output=path]"
allowed-tools: Bash
---

Archive session transcript and subagent logs. Auto-detects current session, or pass specific session ID.

GSD projects archive to `.planning/sessions/`. Override with `--output=<path>`.

```bash
CLAUDE_ARCHIVE_DIR=".planning/sessions" bash ~/.claude/skills/archive-session/scripts/archive.sh $ARGUMENTS
```
