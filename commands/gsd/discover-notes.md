---
name: gsd:discover-notes
description: Enumerate and parse notes from notes directory (utility for matching/integration phases)
allowed-tools:
  - Read
  - Bash
  - Glob
---

<objective>
Discover and parse all notes from `.planning/notes/` directory.

Purpose: Provides infrastructure for Phase 6 (Matching) and Phase 7 (Agent Integration) to enumerate available notes, extract structured content from all four sections, and provide metadata for cache invalidation.

This is a utility command - it performs discovery and returns structured data. It does not interact with users.
</objective>

<context>
No context required - standalone utility.
</context>

<process>

<step name="check_notes_directory">
Check if notes directory exists.

**Validate directory:**
```bash
notes_dir=".planning/notes"

if [ ! -d "$notes_dir" ]; then
  # No notes directory - this is valid state (new project with no notes)
  # Return empty result, exit success
  echo "Discovered 0 notes" >&2
  exit 0
fi
```

If directory doesn't exist, exit successfully with empty result.
If directory exists, proceed to enumerate files.
</step>

<step name="enumerate_notes">
Enumerate all markdown files in notes directory.

**Find all .md files:**
```bash
# Initialize counters
note_count=0
valid_count=0
invalid_count=0

# Enumerate markdown files (maxdepth 1 - only direct children)
# Use while read to handle filenames with spaces
while IFS= read -r note_file; do
  # Process each note
  process_note "$note_file"
done < <(find "$notes_dir" -maxdepth 1 -name "*.md" -type f 2>/dev/null)
```

**Extract topic from filename:**
```bash
# Get filename without path and extension
# Preserve case (authentication.md → authentication, API-Design.md → API-Design)
topic=$(basename "$note_file" .md)
```

**Get file metadata (cross-platform):**
```bash
# Detect OS and use appropriate stat command
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS (BSD stat)
  mtime=$(stat -f %m "$note_file")
else
  # Linux (GNU stat)
  mtime=$(stat -c %Y "$note_file")
fi
```

Store topic, path, and mtime for each note.
</step>

<step name="parse_note_sections">
Extract all four sections using established sed pattern from sync-note.md.

**Extract sections:**
```bash
# Extract Overview section
overview=$(sed -n '/<overview>/,/<\/overview>/p' "$note_file")

# Extract Current State section
current_state=$(sed -n '/<current_state>/,/<\/current_state>/p' "$note_file")

# Extract Rules/Conventions section
rules=$(sed -n '/<rules>/,/<\/rules>/p' "$note_file")

# Extract Related Files section
related_files=$(sed -n '/<related_files>/,/<\/related_files>/p' "$note_file")
```

**Validate completeness:**
```bash
# Check if all required sections exist
valid="true"
if [ -z "$overview" ] || [ -z "$current_state" ] || \
   [ -z "$rules" ] || [ -z "$related_files" ]; then
  valid="false"
  echo "Warning: $topic missing required sections" >&2
  invalid_count=$((invalid_count + 1))
else
  valid_count=$((valid_count + 1))
fi
```

Notes with missing sections are marked as invalid but still included in results.
Callers can use the `valid` flag to filter or warn.
</step>

<step name="expand_related_files">
Extract and expand glob patterns from Related Files section.

**Extract file references:**
```bash
# Extract explicit file paths (in backticks with extensions)
# Matches: `src/auth/login.ts`, `config/api.json`, etc.
explicit_files=$(echo "$related_files" | \
  grep -o '`[^`]*\.\(ts\|tsx\|js\|jsx\|md\|json\|py\|go\|java\|rb\|php\)[^`]*`' | \
  tr -d '`')

# Extract glob patterns (contain * or **)
# Matches: `src/**/*.ts`, `api/*.js`, etc.
patterns=$(echo "$related_files" | \
  grep -o '`[^`]*\*[^`]*`' | \
  tr -d '`')
```

**Expand glob patterns to actual files:**
```bash
# Enable extended globbing for ** patterns
shopt -s globstar 2>/dev/null || true

expanded_files=""
if [ -n "$patterns" ]; then
  while IFS= read -r pattern; do
    # Skip empty lines
    [ -z "$pattern" ] && continue

    # Expand pattern (bash glob expansion)
    for file in $pattern; do
      # Verify file exists (glob may not match or return literal pattern)
      if [ -f "$file" ]; then
        expanded_files="$expanded_files $file"
      fi
    done
  done <<< "$patterns"
fi
```

**Combine and deduplicate:**
```bash
# Merge explicit files and expanded patterns
all_files="$explicit_files $expanded_files"

# Deduplicate (sort -u removes duplicates)
all_files=$(echo "$all_files" | tr ' ' '\n' | sort -u | tr '\n' ' ')

# Trim leading/trailing spaces
all_files=$(echo "$all_files" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
```

Store expanded file list for output.
</step>

<step name="output_structured_data">
Output note data in structured format for consumption by Phase 6.

**Use delimited format for parsing:**
```bash
# Output note boundary
echo "NOTE_START"

# Output metadata
echo "TOPIC: $topic"
echo "PATH: $note_file"
echo "MTIME: $mtime"
echo "VALID: $valid"

# Output sections with boundaries (keeps XML tags for validation)
echo "OVERVIEW_START"
echo "$overview"
echo "OVERVIEW_END"

echo "CURRENT_STATE_START"
echo "$current_state"
echo "CURRENT_STATE_END"

echo "RULES_START"
echo "$rules"
echo "RULES_END"

echo "RELATED_FILES_START"
echo "$related_files"
echo "RELATED_FILES_END"

# Output expanded file list
echo "EXPANDED_FILES: $all_files"

# Output note end boundary
echo "NOTE_END"
```

Increment note counter:
```bash
note_count=$((note_count + 1))
```

This format allows Phase 6 to:
- Parse notes sequentially using boundary markers
- Extract individual sections easily
- Use expanded file list for matching without re-expanding globs
- Validate sections using VALID flag
</step>

<step name="output_summary">
Output summary to stderr for logging.

**After processing all notes:**
```bash
# Summary goes to stderr (structured data goes to stdout)
echo "Discovered $note_count notes ($valid_count valid, $invalid_count with issues)" >&2
```

This separates logging from structured data output.
Consuming commands can capture stdout for data and stderr for progress.
</step>

</process>

<implementation>
```bash
#!/bin/bash

# discover-notes: Enumerate and parse notes from .planning/notes/
# Returns structured note data for Phase 6 and 7 consumption

notes_dir=".planning/notes"

# Handle missing directory gracefully
if [ ! -d "$notes_dir" ]; then
  echo "Discovered 0 notes" >&2
  exit 0
fi

# Initialize counters
note_count=0
valid_count=0
invalid_count=0

# Cross-platform stat function
get_mtime() {
  local file="$1"
  if [[ "$OSTYPE" == "darwin"* ]]; then
    stat -f %m "$file"
  else
    stat -c %Y "$file"
  fi
}

# Extract and expand Related Files
expand_related_files() {
  local related_files_section="$1"

  # Extract explicit file paths (in backticks with extensions)
  local explicit_files=$(echo "$related_files_section" | \
    grep -o '`[^`]*\.\(ts\|tsx\|js\|jsx\|md\|json\|py\|go\|java\|rb\|php\)[^`]*`' | \
    tr -d '`')

  # Extract glob patterns (contain * or **)
  local patterns=$(echo "$related_files_section" | \
    grep -o '`[^`]*\*[^`]*`' | \
    tr -d '`')

  # Enable extended globbing for ** patterns
  shopt -s globstar 2>/dev/null || true

  # Expand glob patterns to actual files
  local expanded_files=""
  if [ -n "$patterns" ]; then
    while IFS= read -r pattern; do
      # Skip empty lines
      [ -z "$pattern" ] && continue

      # Expand pattern (bash glob expansion)
      for file in $pattern; do
        # Verify file exists (glob may not match or return literal pattern)
        if [ -f "$file" ]; then
          expanded_files="$expanded_files $file"
        fi
      done
    done <<< "$patterns"
  fi

  # Combine explicit + expanded, deduplicate
  local all_files="$explicit_files $expanded_files"
  all_files=$(echo "$all_files" | tr ' ' '\n' | sort -u | tr '\n' ' ')

  # Trim leading/trailing spaces
  all_files=$(echo "$all_files" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

  echo "$all_files"
}

# Process single note
process_note() {
  local note_file="$1"

  # Extract topic from filename (preserve case)
  local topic=$(basename "$note_file" .md)

  # Get modification time
  local mtime=$(get_mtime "$note_file")

  # Extract all four sections using established sed pattern
  local overview=$(sed -n '/<overview>/,/<\/overview>/p' "$note_file")
  local current_state=$(sed -n '/<current_state>/,/<\/current_state>/p' "$note_file")
  local rules=$(sed -n '/<rules>/,/<\/rules>/p' "$note_file")
  local related_files=$(sed -n '/<related_files>/,/<\/related_files>/p' "$note_file")

  # Validate all sections exist
  local valid="true"
  if [ -z "$overview" ] || [ -z "$current_state" ] || \
     [ -z "$rules" ] || [ -z "$related_files" ]; then
    valid="false"
    echo "Warning: $topic missing required sections" >&2
    invalid_count=$((invalid_count + 1))
  else
    valid_count=$((valid_count + 1))
  fi

  # Expand Related Files glob patterns
  local expanded=$(expand_related_files "$related_files")

  # Output structured data to stdout
  echo "NOTE_START"
  echo "TOPIC: $topic"
  echo "PATH: $note_file"
  echo "MTIME: $mtime"
  echo "VALID: $valid"

  echo "OVERVIEW_START"
  echo "$overview"
  echo "OVERVIEW_END"

  echo "CURRENT_STATE_START"
  echo "$current_state"
  echo "CURRENT_STATE_END"

  echo "RULES_START"
  echo "$rules"
  echo "RULES_END"

  echo "RELATED_FILES_START"
  echo "$related_files"
  echo "RELATED_FILES_END"

  echo "EXPANDED_FILES: $expanded"
  echo "NOTE_END"

  # Increment counter
  note_count=$((note_count + 1))
}

# Enumerate and process all notes
while IFS= read -r note_file; do
  process_note "$note_file"
done < <(find "$notes_dir" -maxdepth 1 -name "*.md" -type f 2>/dev/null)

# Output summary to stderr
echo "Discovered $note_count notes ($valid_count valid, $invalid_count with issues)" >&2
```
</implementation>

<output>
Structured data to stdout (one or more notes):
```
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
CURRENT_STATE_START
<current_state>
[section content]
</current_state>
CURRENT_STATE_END
RULES_START
<rules>
[section content]
</rules>
RULES_END
RELATED_FILES_START
<related_files>
[section content]
</related_files>
RELATED_FILES_END
EXPANDED_FILES: [space-separated file paths]
NOTE_END
```

Summary to stderr:
```
Discovered N notes (M valid, K with issues)
```

If notes directory doesn't exist:
```
Discovered 0 notes
```
(Empty stdout, exit 0)
</output>

<success_criteria>
- [ ] Utility handles missing notes directory gracefully (returns empty, no error)
- [ ] All .md files in .planning/notes/ enumerated
- [ ] Topic extracted from filename preserving case
- [ ] File metadata (mtime) included using cross-platform stat
- [ ] All four sections extracted using sed pattern from sync-note.md
- [ ] Notes validated for completeness (valid flag)
- [ ] Malformed notes included with valid: false
- [ ] Glob patterns in Related Files expanded to actual file paths
- [ ] Globs handle ** patterns with shopt -s globstar
- [ ] File existence verified before including in expanded list
- [ ] Expanded file list deduplicated
- [ ] Structured output format parseable by consuming commands
- [ ] Filenames with spaces handled correctly (while read loop)
- [ ] Summary output to stderr, structured data to stdout
</success_criteria>
