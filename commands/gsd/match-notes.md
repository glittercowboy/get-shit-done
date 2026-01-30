---
name: gsd:match-notes
description: Match notes to phase using keyword and file overlap signals (utility for agent integration)
allowed-tools:
  - Read
  - Bash
  - Glob
---

<objective>
Identify relevant notes for a given phase by matching topic keywords against phase description and comparing related files against phase target files.

Purpose: Provides core matching logic for Phase 7 (Agent Integration) to determine which notes should be injected into agent prompts. Uses dual-signal matching (keywords OR file overlap) to ensure broad recall of relevant context.

This is a utility command - it performs matching and returns structured data. It does not interact with users.
</objective>

<context>
Requires discover-notes utility for note enumeration.
Accepts phase metadata as input parameters (name, goal, target files).
</context>

<process>

<step name="validate_input">
Validate required input parameters are provided.

**Check environment variables:**
```bash
# Required parameters
PHASE_NAME="${PHASE_NAME:-}"
PHASE_GOAL="${PHASE_GOAL:-}"

# Optional parameters
PHASE_FILES="${PHASE_FILES:-}"

# Validate required fields
if [ -z "$PHASE_NAME" ]; then
  echo "Error: PHASE_NAME required" >&2
  exit 1
fi

if [ -z "$PHASE_GOAL" ]; then
  echo "Error: PHASE_GOAL required" >&2
  exit 1
fi
```

PHASE_FILES is optional - if empty, only keyword matching is active.
PHASE_NAME and PHASE_GOAL are required for matching logic.
</step>

<step name="discover_notes">
Call discover-notes utility to get all available notes.

**Invoke discovery:**
```bash
# Call discover-notes and capture structured output
discover_output=$(bash commands/gsd/discover-notes.md 2>/dev/null)

# Check if any notes were discovered
if [ -z "$discover_output" ]; then
  # No notes found - output summary and exit
  echo "Matched 0/0 notes" >&2
  exit 0
fi
```

Store discover_output for parsing.
Handle empty result gracefully (no notes in system).
</step>

<step name="parse_and_match_notes">
Parse each note from discover-notes output and apply dual-signal matching.

**Parse notes using boundary markers:**
```bash
# Initialize counters
total_notes=0
matched_notes=0

# Initialize parsing state
in_note=false
current_topic=""
current_expanded=""
current_content=""

# Parse line by line
while IFS= read -r line; do
  if [ "$line" = "NOTE_START" ]; then
    in_note=true
    current_topic=""
    current_expanded=""
    current_content=""

  elif [ "$line" = "NOTE_END" ]; then
    in_note=false
    total_notes=$((total_notes + 1))

    # Attempt to match this note
    match_note "$current_topic" "$current_expanded" "$current_content"

  elif [ "$in_note" = "true" ]; then
    # Extract metadata lines
    if [[ "$line" =~ ^TOPIC:\ (.+)$ ]]; then
      current_topic="${BASH_REMATCH[1]}"
    elif [[ "$line" =~ ^EXPANDED_FILES:\ (.*)$ ]]; then
      current_expanded="${BASH_REMATCH[1]}"
    fi

    # Accumulate full note content for output
    current_content="$current_content$line\n"
  fi
done <<< "$discover_output"
```

For each complete note (between NOTE_START/NOTE_END), extract topic and expanded files, then attempt matching.
</step>

<step name="dual_signal_matching">
Apply keyword matching and file overlap detection (OR logic).

**Match using two independent signals:**
```bash
match_note() {
  local note_topic="$1"
  local note_files="$2"
  local note_content="$3"

  local matched=false
  local match_reason=""

  # Signal 1: Keyword matching (case-insensitive substring)
  # Convert both to lowercase for comparison
  local topic_lower=$(echo "$note_topic" | tr '[:upper:]' '[:lower:]')
  local phase_text=$(echo "$PHASE_NAME $PHASE_GOAL" | tr '[:upper:]' '[:lower:]')

  # Check if topic appears anywhere in phase text (substring match)
  if echo "$phase_text" | grep -q "$topic_lower"; then
    matched=true
    match_reason="keyword '$note_topic'"
  fi

  # Signal 2: File overlap (only if keyword didn't match and both file lists exist)
  if [ "$matched" = "false" ] && [ -n "$note_files" ] && [ -n "$PHASE_FILES" ]; then
    # Check for any common files between lists
    for phase_file in $PHASE_FILES; do
      for note_file in $note_files; do
        if [ "$phase_file" = "$note_file" ]; then
          matched=true
          match_reason="file overlap: $phase_file"
          break 2  # Exit both loops
        fi
      done
    done
  fi

  # Output match if either signal succeeded
  if [ "$matched" = "true" ]; then
    output_match "$note_topic" "$note_content" "$match_reason"
    matched_notes=$((matched_notes + 1))
  fi
}
```

**Matching logic:**
- **MTCH-01:** Topic keyword in phase text (case-insensitive substring)
- **MTCH-02:** Any file overlap between phase targets and note's related files
- **MTCH-03:** Either signal triggers match (OR logic, not AND)
- First match reason wins (keyword checked before files)
</step>

<step name="output_matched_notes">
Output matched notes in structured format for consumption by agents.

**Use delimited format consistent with discover-notes:**
```bash
output_match() {
  local topic="$1"
  local content="$2"
  local reason="$3"

  # Structured output to stdout
  echo "MATCH_START"
  echo "TOPIC: $topic"
  echo "REASON: $reason"
  echo "CONTENT_START"
  # Use printf to handle escape sequences in content
  printf "%b" "$content"
  echo "CONTENT_END"
  echo "MATCH_END"
}
```

This format allows consuming agents to:
- Parse matches sequentially using boundary markers
- Extract match reason for debugging/transparency
- Get full note content for prompt injection
</step>

<step name="output_summary">
Output summary to stderr for logging.

**After processing all notes:**
```bash
# Summary goes to stderr (structured data goes to stdout)
echo "Matched $matched_notes/$total_notes notes" >&2
```

This separates logging from structured data output.
Orchestrators can capture stdout for data and stderr for progress.
</step>

</process>

<implementation>
```bash
#!/bin/bash

# match-notes: Match notes to phase using keyword and file overlap signals
# Returns structured match data for Phase 7 agent integration

# Validate required inputs
PHASE_NAME="${PHASE_NAME:-}"
PHASE_GOAL="${PHASE_GOAL:-}"
PHASE_FILES="${PHASE_FILES:-}"

if [ -z "$PHASE_NAME" ]; then
  echo "Error: PHASE_NAME required" >&2
  exit 1
fi

if [ -z "$PHASE_GOAL" ]; then
  echo "Error: PHASE_GOAL required" >&2
  exit 1
fi

# Get project root (script should be run from project root)
project_root=$(pwd)

# Call discover-notes to get all available notes
discover_output=$(bash "$project_root/commands/gsd/discover-notes.md" 2>/dev/null)

# Handle no notes case
if [ -z "$discover_output" ]; then
  echo "Matched 0/0 notes" >&2
  exit 0
fi

# Initialize counters
total_notes=0
matched_notes=0

# Output single matched note
output_match() {
  local topic="$1"
  local content="$2"
  local reason="$3"

  echo "MATCH_START"
  echo "TOPIC: $topic"
  echo "REASON: $reason"
  echo "CONTENT_START"
  printf "%b" "$content"
  echo "CONTENT_END"
  echo "MATCH_END"
}

# Match note using dual-signal logic
match_note() {
  local note_topic="$1"
  local note_files="$2"
  local note_content="$3"

  local matched=false
  local match_reason=""

  # Signal 1: Keyword matching (case-insensitive substring)
  local topic_lower=$(echo "$note_topic" | tr '[:upper:]' '[:lower:]')
  local phase_text=$(echo "$PHASE_NAME $PHASE_GOAL" | tr '[:upper:]' '[:lower:]')

  if echo "$phase_text" | grep -q "$topic_lower"; then
    matched=true
    match_reason="keyword '$note_topic'"
  fi

  # Signal 2: File overlap (only if keyword didn't match and both file lists exist)
  if [ "$matched" = "false" ] && [ -n "$note_files" ] && [ -n "$PHASE_FILES" ]; then
    for phase_file in $PHASE_FILES; do
      for note_file in $note_files; do
        if [ "$phase_file" = "$note_file" ]; then
          matched=true
          match_reason="file overlap: $phase_file"
          break 2
        fi
      done
    done
  fi

  # Output if matched
  if [ "$matched" = "true" ]; then
    output_match "$note_topic" "$note_content" "$match_reason"
    matched_notes=$((matched_notes + 1))
  fi
}

# Parse discover-notes output and match each note
in_note=false
current_topic=""
current_expanded=""
current_content=""

while IFS= read -r line; do
  if [ "$line" = "NOTE_START" ]; then
    in_note=true
    current_topic=""
    current_expanded=""
    current_content=""

  elif [ "$line" = "NOTE_END" ]; then
    in_note=false
    total_notes=$((total_notes + 1))

    # Attempt to match this note
    match_note "$current_topic" "$current_expanded" "$current_content"

  elif [ "$in_note" = "true" ]; then
    # Extract metadata lines
    if [[ "$line" =~ ^TOPIC:\ (.+)$ ]]; then
      current_topic="${BASH_REMATCH[1]}"
    elif [[ "$line" =~ ^EXPANDED_FILES:\ (.*)$ ]]; then
      current_expanded="${BASH_REMATCH[1]}"
    fi

    # Accumulate full note content
    current_content="$current_content$line\n"
  fi
done <<< "$discover_output"

# Output summary to stderr
echo "Matched $matched_notes/$total_notes notes" >&2
```
</implementation>

<output>
Structured data to stdout (zero or more matches):
```
MATCH_START
TOPIC: [topic-name]
REASON: [keyword 'topic' | file overlap: path/to/file]
CONTENT_START
NOTE_START
TOPIC: [topic-name]
PATH: .planning/notes/[topic].md
MTIME: [unix-timestamp]
VALID: [true|false]
OVERVIEW_START
<overview>
[section content]
</overview>
OVERVIEW_END
[... full note content from discover-notes ...]
NOTE_END
CONTENT_END
MATCH_END
```

Summary to stderr:
```
Matched N/M notes
```

If no notes match:
```
Matched 0/M notes
```
(Empty stdout, summary only to stderr)

If no notes exist:
```
Matched 0/0 notes
```
(Empty stdout, exit 0)
</output>

<success_criteria>
- [ ] MTCH-01: Topic keyword in phase description triggers match (case-insensitive)
- [ ] MTCH-02: File overlap triggers match
- [ ] MTCH-03: Either signal alone triggers match (OR logic, not AND)
- [ ] Matched notes return full content for injection
- [ ] Multiple notes can match single phase
- [ ] Output uses MATCH_START/MATCH_END delimited format
- [ ] Match reason included for debugging/transparency
- [ ] Handles empty PHASE_FILES gracefully (keyword-only matching)
- [ ] Handles no notes case gracefully (empty output)
- [ ] Summary to stderr, structured data to stdout
- [ ] Follows discover-notes pattern (frontmatter, process steps, implementation)
</success_criteria>
