# Fixes Applied - Bug Report Follow-up

**Date:** 2026-01-31
**Related:** BUG_REPORT.md

---

## Critical Bugs Fixed

### 1. ✅ Fixed: Missing error handling in statusline.js

**File:** `hooks/gsd-statusline.js`
**Change:** Wrapped directory reading operations in try-catch block

**Before:**
```javascript
if (session && fs.existsSync(todosDir)) {
  const files = fs.readdirSync(todosDir)  // Could crash
    .filter(...)
    .map(f => ({ name: f, mtime: fs.statSync(...).mtime }))  // Could crash
```

**After:**
```javascript
if (session && fs.existsSync(todosDir)) {
  try {
    const files = fs.readdirSync(todosDir)
      .filter(...)
      .map(f => ({ name: f, mtime: fs.statSync(...).mtime }))
    // ... rest of logic
  } catch (e) {
    // Silently fail on file system errors - don't break statusline
  }
}
```

**Impact:** Prevents statusline crashes from file system permission issues or race conditions.

---

### 2. ✅ Fixed: Hex color validation in install.js

**File:** `bin/install.js`
**Change:** Added validation for hex color format

**Before:**
```javascript
} else if (colorValue.startsWith('#')) {
  // Already hex, keep as is
  newLines.push(line);
}
```

**After:**
```javascript
} else if (colorValue.startsWith('#')) {
  // Validate hex color format (#RGB or #RRGGBB)
  if (/^#[0-9a-f]{3}$|^#[0-9a-f]{6}$/i.test(colorValue)) {
    // Already hex and valid, keep as is
    newLines.push(line);
  }
  // Skip invalid hex colors
}
```

**Impact:** Prevents invalid hex color values from being written to config files.

---

### 3. ✅ Fixed: Git add rules violation in execute-phase.md

**File:** `commands/gsd/execute-phase.md`
**Change:** Replaced `git add -u` with individual file staging

**Before:**
```bash
git add -u && git commit -m "fix({phase}): orchestrator corrections"
```

**After:**
```bash
# Stage each modified file individually (never use git add -u, git add ., or git add -A)
git status --porcelain | grep '^ M' | cut -c4- | while read file; do
  git add "$file"
done
git commit -m "fix({phase}): orchestrator corrections"
```

**Impact:** Maintains consistency with documented git commit rules and prevents accidental staging of unwanted files.

---

## Known Issues Remaining

### Fragile JSON Parsing (High Priority - Not Fixed)

**Status:** ⚠️ Documented but not fixed
**Reason:** Requires more extensive refactoring to use `jq` or alternative JSON parser
**Location:** Multiple workflow files

**Files affected:**
- `get-shit-done/workflows/execute-phase.md:20, 62, 76-77`
- `commands/gsd/execute-phase.md:45, 100`
- `agents/gsd-executor.md:47`

**Current approach:**
```bash
MODEL_PROFILE=$(cat .planning/config.json 2>/dev/null | grep -o '"model_profile"[[:space:]]*:[[:space:]]*"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"' || echo "balanced")
```

**Recommended fix:**
```bash
MODEL_PROFILE=$(jq -r '.model_profile // "balanced"' .planning/config.json 2>/dev/null || echo "balanced")
```

**Workaround for users:**
- Ensure `.planning/config.json` is properly formatted with consistent spacing
- Always quote string values in JSON
- Avoid special characters in configuration values

**Next steps:**
- Evaluate if `jq` can be a required dependency
- Or create a Node.js helper script for JSON parsing that workflows can call
- Or document the JSON formatting requirements clearly for users

---

## Testing Recommendations

### 1. Statusline Error Handling
**Test case:** Delete files while statusline is reading them
```bash
# Terminal 1: Watch statusline
while true; do node hooks/gsd-statusline.js; sleep 1; done

# Terminal 2: Create and delete files rapidly
mkdir -p ~/.claude/todos
while true; do
  touch ~/.claude/todos/test-file.json
  sleep 0.1
  rm ~/.claude/todos/test-file.json
  sleep 0.1
done
```

**Expected:** Statusline continues working without crashes

### 2. Color Validation
**Test case:** Invalid hex colors in frontmatter
```markdown
---
color: #ZZZ
---
```
**Expected:** Invalid color is skipped during installation

### 3. Git Operations
**Test case:** Verify individual file staging
```bash
# Create some changes
touch file1.txt file2.txt
git add file1.txt file2.txt
git commit -m "test files"

echo "change" > file1.txt
echo "change" > file2.txt

# Run the orchestrator commit logic
# Should stage each file individually
```

**Expected:** Files are staged one at a time, not in bulk

---

## Future Improvements

1. **Centralize JSON parsing**: Create a helper utility for all JSON config reading
2. **Add unit tests**: Test critical paths like statusline, installer, config parsing
3. **Establish error handling patterns**: Document and enforce consistent error handling
4. **Path constants**: Centralize hardcoded paths in a configuration module
5. **Integration tests**: Test full workflow orchestration end-to-end

---

## Changelog Entry

```markdown
## [Unreleased]

### Fixed
- **hooks/gsd-statusline.js**: Added error handling for file system operations to prevent crashes
- **bin/install.js**: Added validation for hex color values to prevent invalid config
- **commands/gsd/execute-phase.md**: Fixed git staging to use individual files instead of git add -u

### Known Issues
- JSON config parsing uses fragile grep/sed patterns - will be addressed in future release
```
