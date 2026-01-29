---
name: gsd:sync-note
description: Sync note with codebase state and detect rule violations
argument-hint: <topic>
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

<objective>
Synchronize topic notes with actual codebase state through file discovery, git diff analysis, and rule violation detection.

Purpose: Keep notes current by discovering new related files, updating Current State section with actual implementation status, detecting violations of documented rules/conventions, and offering to fix violations automatically.
</objective>

<context>
@.planning/STATE.md
@.planning/config.json
</context>

<process>

<step name="validate_topic">
Parse topic from arguments or prompt if missing.

**Extract topic input:**
```bash
topic_input="$*"
```

**If no topic provided:**
Use AskUserQuestion:
- header: "Sync Topic"
- question: "Which topic should I sync?"
- options: [{ label: "Free text input" }]

Result stored in `topic_input` variable.

**Convert to filename:**
Preserve case, convert spaces to hyphens.

```bash
topic_filename=$(echo "$topic_input" | sed 's/ /-/g')
# Example: "API Design" → "API-Design.md"
```

Store both `topic_input` (display name) and `topic_filename` (file name).
</step>

<step name="check_note_exists">
Verify note exists before syncing.

```bash
note_path=".planning/notes/${topic_filename}.md"

if [ ! -f "$note_path" ]; then
  echo "ERROR: Note not found: ${topic_filename}.md"
  echo ""
  echo "Create this note first with:"
  echo "  /gsd:add-note ${topic_input}"
  exit 1
fi
```

Exit workflow if note doesn't exist.
</step>

<step name="load_note">
Read existing note and extract key sections.

**Read note file:**
Use Read tool to load `.planning/notes/${topic_filename}.md`

**Extract sections using sed:**

```bash
# Extract Related Files section
related_files_section=$(sed -n '/<related_files>/,/<\/related_files>/p' "$note_path")

# Extract file patterns from Related Files
# Look for lines with backticks containing file extensions
existing_files=$(echo "$related_files_section" | grep -o '`[^`]*\.\(ts\|tsx\|js\|jsx\|md\|json\)[^`]*`' | tr -d '`')

# Extract patterns for directory scoping
# Look for lines with glob patterns (**, *)
file_patterns=$(echo "$related_files_section" | grep -o '`[^`]*\*[^`]*`' | tr -d '`')

# Extract Rules/Conventions section
rules_section=$(sed -n '/<rules>/,/<\/rules>/p' "$note_path")

# Extract Current State section (to compare with actual)
current_state_section=$(sed -n '/<current_state>/,/<\/current_state>/p' "$note_path")
```

Store extracted content in shell variables for later processing.

**Parse topic keywords for search:**
```bash
# Convert topic to search keywords
# "API Design" → ["api", "design"]
topic_keywords=$(echo "$topic_input" | tr '[:upper:]' '[:lower:]' | tr ' -' '\n' | grep -v '^$')
```
</step>

<step name="scan_related_files">
Stage 1: Discover new files related to topic.

**Search for files using Glob tool:**

For each keyword in `topic_keywords`:
```bash
# Call Glob tool to find files by name pattern
# Examples:
#   glob "**/*api*.ts" "**/*api*.tsx" "**/*api*.js" "**/*api*.jsx"
#   glob "**/*design*.ts" "**/*design*.tsx"
```

**Search for files using Grep tool:**

```bash
# Search for files containing topic (case-insensitive)
# grep -i "$topic_input" --type ts --output_mode files_with_matches
# grep -i "$topic_input" --type js --output_mode files_with_matches
```

**Combine and dedupe results:**

```bash
# Merge Glob and Grep results
all_discovered_files=$(echo "$glob_results $grep_results" | tr ' ' '\n' | sort -u)

# Filter out files already in Related Files section
new_files=""
for file in $all_discovered_files; do
  # Check if file is already documented
  if ! echo "$existing_files" | grep -q "$file"; then
    new_files="$new_files $file"
  fi
done

# Limit to top 10 most relevant (prevent option overload)
# Rank by: exact keyword match in filename > partial match > content mention
new_files_limited=$(echo "$new_files" | head -10)
```

**Present new files to user (if any found):**

If `new_files_limited` is not empty:

AskUserQuestion:
- header: "New Related Files Found"
- question: "Found N new files mentioning ${topic_input}. Which should I add to the note?"
- options:
  - Build list from `new_files_limited`:
    - { label: "path/to/file1.ts", description: "Brief description from file content" }
    - { label: "path/to/file2.tsx", description: "Brief description from file content" }
    - ...
  - { label: "None", description: "Don't add any files" }
- multiSelect: true

Capture selected files in `selected_new_files` variable.

If no new files found:
```
No new related files discovered.
```

Continue to next step.
</step>

<step name="update_current_state">
Stage 2: Analyze actual codebase state and compare to documented state.

**Collect related files for analysis:**
```bash
# Combine existing files + newly selected files
all_related_files="$existing_files $selected_new_files"
```

**Analyze with git:**

```bash
# Get recent commits affecting related files
echo "Recent commits to related files:"
git log --oneline -10 -- $all_related_files

# Get recent changes (ignore whitespace)
echo ""
echo "Recent changes (last 5 commits):"
git diff HEAD~5..HEAD -w --stat -- $all_related_files

# Show detailed diff for understanding changes
git diff HEAD~5..HEAD -w -- $all_related_files | head -100
```

**Read current file contents:**
For each related file (up to 5 files to avoid overload):
```bash
# Read first 50 lines to understand current implementation
head -50 "$file"
```

**Synthesize findings:**

Compare documented state from `current_state_section` with:
- What actually exists in files (from Read/head)
- What changed recently (from git log/diff)
- New patterns or structures not documented

Generate summary:
```
Based on codebase analysis:

Current Implementation:
- [actual file structure found]
- [actual patterns being used]
- [recent changes from git]

Documentation Status:
- Documented: [what matches note]
- Not documented: [what's missing from note]
- Changed since last update: [what's different]
```

**Preview Current State update:**

AskUserQuestion:
- header: "Current State Update"
- question: "Update Current State section with these findings?"
- Show before (existing current_state_section) and after (new analysis)
- options:
  - { label: "Yes, update it", description: "Replace Current State with this analysis" }
  - { label: "Let me refine", description: "Edit before applying" }
  - { label: "Skip", description: "Keep existing Current State" }

If "Yes, update it":
  Store new Current State content in `new_current_state` variable.

If "Let me refine":
  AskUserQuestion:
  - header: "Refine Current State"
  - question: "Describe the current state (I'll incorporate my findings):"
  - options: [{ label: "Free text" }]

  Combine user input with findings, store in `new_current_state`.

If "Skip":
  Set `new_current_state` to empty (no update).
</step>

<step name="detect_violations">
Stage 3: Check related files against documented rules.

**Extract rules from Rules section:**

```bash
# Parse rules section into checkable items
# Rules are typically numbered list items
rules_list=$(echo "$rules_section" | grep -E '^\s*[0-9]+\.' | sed 's/^[^0-9]*[0-9]*\.\s*//')
```

**Check if rules are machine-parseable:**

Attempt to convert rules into simple grep patterns:

```bash
# Example patterns:
# "All API routes must use /api/ prefix"
#   → check: grep "router\." | grep -v "/api/"
#
# "Use camelCase for function names"
#   → check: grep "function [a-z]*_[a-z_]*"
#
# "Always wrap async calls in try/catch"
#   → check: grep "await" without nearby try/catch (too complex - skip)
```

**For each related file, check against parseable rules:**

```bash
violations=""

for file in $all_related_files; do
  # Check API prefix rule (if present in rules)
  if echo "$rules_list" | grep -iq "api.*prefix\|/api/"; then
    # Find route definitions missing /api/ prefix
    route_violations=$(grep -n "router\.\(get\|post\|put\|delete\|patch\)" "$file" 2>/dev/null \
      | grep -v '"/api/' | sed "s/:/ Line /")

    if [ -n "$route_violations" ]; then
      violations="$violations\n$file:\n$route_violations (missing /api/ prefix)"
    fi
  fi

  # Check naming convention (if present in rules)
  if echo "$rules_list" | grep -iq "camelCase\|naming"; then
    # Find snake_case function definitions
    naming_violations=$(grep -n "^\s*function [a-z]*_[a-z_]*\|^\s*const [a-z]*_[a-z_]*\s*=" "$file" 2>/dev/null \
      | sed "s/:/ Line /")

    if [ -n "$naming_violations" ]; then
      violations="$violations\n$file:\n$naming_violations (uses snake_case, should be camelCase)"
    fi
  fi

  # Additional rule checks can be added here
done
```

**If no rules are machine-parseable:**
```
Rules in this note require manual review.
Skipping automated violation detection.
```

Skip to preview_changes step.

**If violations found:**
Store in `violations_found` variable for next step.
</step>

<step name="offer_fixes">
Stage 4: Present violations and offer per-violation fixes.

**If no violations:**
```
✓ No rule violations found in related files.
```

Skip to preview_changes step.

**If violations found:**

Group violations by file and present summary:
```
Found N violations across M files:

file1.ts:
  ✗ Line 15: Route missing /api/ prefix
  ✗ Line 23: Route missing /api/ prefix

file2.ts:
  ✗ Line 8: Function uses snake_case (should be camelCase)
```

**For each violation, offer fix:**

AskUserQuestion:
- header: "Violation in [filename]"
- question: "Line [N]: [violation description]"
- Show code snippet with context (5 lines before/after):
  ```
  12: const app = express();
  13: const router = express.Router();
  14:
  15: router.get('/login', authController.login);
  16:                      ^^^^^^^^^^^^^^^^^^^ Missing /api/ prefix
  17:
  18: router.get('/logout', authController.logout);
  ```
- options:
  - { label: "Fix it", description: "Apply suggested fix" }
  - { label: "Skip", description: "Leave as is" }
  - { label: "Fix all in this file", description: "Apply all fixes for this file" }

**If "Fix it":**
  - Show preview of fix:
    ```
    Before:
    router.get('/login', authController.login);

    After:
    router.get('/api/login', authController.login);
    ```
  - Confirm:
    AskUserQuestion:
    - question: "Apply this fix?"
    - options: [{ label: "Yes" }, { label: "No" }]

  - If confirmed, store fix in `fixes_to_apply` list

**If "Skip":**
  - Continue to next violation
  - Track in `skipped_violations` list

**If "Fix all in this file":**
  - Generate all fixes for current file
  - Show preview of all changes
  - Confirm:
    AskUserQuestion:
    - question: "Apply all N fixes to [filename]?"
    - Show before/after diff
    - options: [{ label: "Yes" }, { label: "No" }]

  - If confirmed, add all fixes for file to `fixes_to_apply` list
  - Skip remaining violations for this file

Track fixes vs skips for summary report.
</step>

<step name="preview_changes">
Show summary of all changes before applying.

**Build change summary:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sync Summary: ${topic_input}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Related Files:
  • Current: N files
  • New: M files selected
  [List new files if any]

Current State:
  [✓] Updated with codebase analysis
  OR
  [—] No changes

Violations:
  • Found: X violations
  • Fixed: Y violations
  • Skipped: Z violations
  [Summary of fixes if any]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Confirm changes:**

AskUserQuestion:
- header: "Apply Changes"
- question: "Apply all changes to note?"
- options:
  - { label: "Yes, apply all", description: "Update note and fix violations" }
  - { label: "Cancel", description: "Discard changes" }

If "Cancel": exit workflow without changes.
If "Yes, apply all": proceed to write_note.
</step>

<step name="write_note">
Update note file with all changes.

**Backup original:**
```bash
cp "$note_path" "$note_path.bak"
```

**Add new files to Related Files section:**

If `selected_new_files` is not empty:

```bash
# Extract existing Related Files content (without tags)
existing_content=$(sed -n '/<related_files>/,/<\/related_files>/p' "$note_path" \
  | sed '1d;$d')

# Append new files to Specific Files subsection
new_files_formatted=""
for file in $selected_new_files; do
  # Read first line of file for description
  file_desc=$(head -1 "$file" | sed 's/^\/\/ *//')
  new_files_formatted="$new_files_formatted\n- \`$file\` — $file_desc"
done

# Combine existing + new
updated_related_files="$existing_content\n\n### Newly Added\n$new_files_formatted"

# Replace Related Files section
sed -i '' "/<related_files>/,/<\/related_files>/c\\
<related_files>\\
$updated_related_files\\
</related_files>" "$note_path"
```

**Update Current State section:**

If `new_current_state` is not empty:

```bash
# Replace Current State section with new analysis
sed -i '' "/<current_state>/,/<\/current_state>/c\\
<current_state>\\
## Current State\\
\\
$new_current_state\\
</current_state>" "$note_path"
```

**Update Last Updated timestamp:**

```bash
new_timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
sed -i '' "s/\*\*Last Updated:\*\*.*/\*\*Last Updated:\*\* ${new_timestamp}/" "$note_path"
```

**Verify update:**
```bash
if [ ! -f "$note_path" ]; then
  echo "ERROR: Failed to update note file"
  # Restore from backup
  mv "$note_path.bak" "$note_path"
  exit 1
fi
```

Confirm: "Note updated: ${topic_filename}.md"
</step>

<step name="apply_fixes">
Apply code fixes to violation files.

**If no fixes to apply:**
Skip this step.

**For each fix in `fixes_to_apply`:**

```bash
# Apply fix to source file
# Example: Replace route path
sed -i '' "s|router\.get('/login'|router.get('/api/login'|g" "$file"

# Verify fix applied
if grep -q "/api/login" "$file"; then
  echo "✓ Applied fix to $file"
else
  echo "✗ Failed to apply fix to $file"
fi
```

**Track applied fixes for commit message.**

Note: Use Write tool to replace file content with fixed version (more reliable than sed -i for complex fixes).

For each file with fixes:
1. Read original file content
2. Apply fix transformations
3. Write updated content back
4. Verify change
</step>

<step name="git_commit">
Commit changes if enabled.

**Check planning config:**

```bash
COMMIT_PLANNING_DOCS=$(cat .planning/config.json 2>/dev/null | grep -o '"commit_docs"[[:space:]]*:[[:space:]]*[^,}]*' | grep -o 'true\|false' || echo "true")
git check-ignore -q .planning 2>/dev/null && COMMIT_PLANNING_DOCS=false
```

**Determine what changed:**
- Note updated: Yes/No
- Code fixes applied: N files

**If `COMMIT_PLANNING_DOCS=false`:**
Skip git operations for note file.
Log: "Note updated (not committed - commit_docs: false)"

**If `COMMIT_PLANNING_DOCS=true` (default):**

Commit note update:
```bash
git add "$note_path"
git commit -m "$(cat <<'EOF'
docs(notes): sync ${topic_input} note

Sync updates:
- Scanned: N files (M new added)
- Current State: Updated with codebase analysis
- Violations: X found, Y fixed

File: .planning/notes/${topic_filename}.md
EOF
)"
```

**For code fixes (always commit, regardless of commit_docs):**

If fixes were applied:
```bash
# Stage fixed files
for file in $fixed_files; do
  git add "$file"
done

git commit -m "$(cat <<'EOF'
fix(notes): apply ${topic_input} rule violations

Fixed violations:
- [violation type 1]: N instances
- [violation type 2]: M instances

Affected files:
$fixed_files_list

Per note: .planning/notes/${topic_filename}.md
EOF
)"
```

Confirm:
- "Note updated and committed: docs(notes): sync ${topic_input} note"
- "Code fixes committed: fix(notes): apply ${topic_input} rule violations"
</step>

<step name="confirm">
Show completion summary with adaptive output.

**Concise summary (if no violations):**
```
✓ Sync complete: ${topic_input}

  • Scanned: N files (M new added)
  • Current State: Updated with recent implementation
  • Violations: None found
```

**Detailed summary (if violations found):**
```
✓ Sync complete: ${topic_input}

Scanned: N files (M new added)

Current State:
  ✓ Updated with codebase analysis
  [Brief summary of what changed]

Violations Found: X issues across Y files

Fixed (Z violations):
  file1.ts:
    ✓ Line 15: Route prefix fixed
    ✓ Line 23: Route prefix fixed

Skipped (W violations):
  file2.ts:
    — Line 8: Naming convention (user skipped)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Next Steps

View updated note:
  cat .planning/notes/${topic_filename}.md

Run sync again to verify fixes:
  /gsd:sync-note ${topic_input}
```

Workflow complete.
</step>

</process>

<output>
- Updated `.planning/notes/{topic}.md` with:
  - New related files in Related Files section
  - Updated Current State section with actual codebase analysis
  - Refreshed Last Updated timestamp
- Fixed source code files (if violations found and user confirmed)
- Updated git history (if commit_docs enabled):
  - Commit for note update
  - Separate commit for code fixes (always committed)
</output>

<success_criteria>
- [ ] Topic name validated and note existence verified
- [ ] Related Files section scanned for existing files
- [ ] File discovery using Glob and Grep tools
- [ ] New files presented for user selection (if any found)
- [ ] Git analysis performed (log + diff) on related files
- [ ] Current State update generated from actual codebase
- [ ] Preview and confirmation before updating Current State
- [ ] Rules extracted from Rules/Conventions section
- [ ] Simple pattern matching for violation detection (no AST)
- [ ] Per-violation fix offering with code context
- [ ] Preview shown for each fix before applying
- [ ] Summary of all changes before final apply
- [ ] Note file updated with new files and Current State
- [ ] Code fixes applied to source files (if confirmed)
- [ ] Git commits respect commit_docs config
- [ ] Adaptive output (concise if no violations, detailed if violations found)
- [ ] Completion summary shows what was done
</success_criteria>
