# High Context Protocol

Save detailed session transcripts and logs when context usage hits ~90% by proactively interrupting and presenting options:

```
Context at ~90% capacity.

Options:
A. Archive session (/archive-session) - Save JSON transcripts (with individual spawned subagents) + HTML report
B. Export conversation (/export) - Save plain text via built-in Claude Code command
C. Both - Full audit trail

Which would you like?
```

Wait for user choice before continuing.

## If User Chooses A or C (Archive)

Before running `/archive-session`, confirm destination:

```
Archiving to default: .claude/session-archive/exported-on-<timestamp>/

Override? Provide a path, or enter for default.
```

If user provides a path, run:
```bash
/archive-session --output=<user-provided-path>
```

Otherwise run with default:
```bash
/archive-session
```

## Archive-Session vs Export

**Archive-Session (/archive-session):**
- Archives main session transcript (session.jsonl)
- Archives subagent transcripts if present
- Generates browsable HTML report
- Opens report in browser
- Default: `.claude/session-archive/exported-on-<timestamp>/`
- Override exported path with either
    - env var: `CLAUDE_ARCHIVE_DIR=.planning/sessions` or
    - flag: `--output=.planning/sessions`

**Export (/export):**
- Saves main conversation to markdown file
- Simpler format, no HTML generation
- Built-in Claude Code command

**Both:**
Most complete audit trail - structured archive + readable markdown.
