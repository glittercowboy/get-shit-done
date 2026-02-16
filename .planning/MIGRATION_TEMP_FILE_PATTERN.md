# Migration Guide: Temp File Pattern for Large JSON

## Problem

Bash command substitution `INIT=$(...)` has buffer limits of 2-3MB. When `gsd-tools.js init` commands return large JSON (e.g., with `--include` flags loading VERIFICATION.md files), bash fails to capture the output, causing jq parse errors.

## Solution

Replace command substitution with temp file pattern:

### Before (broken with large JSON):
```bash
INIT=$(node ~/.claude/get-shit-done/bin/gsd-tools.js init plan-phase "$PHASE" --include state,roadmap,requirements,context,research,verification,uat)
PHASE_FOUND=$(echo "$INIT" | jq -r '.phase_found')
STATE_CONTENT=$(echo "$INIT" | jq -r '.state_content // empty')
```

### After (works with any size):
```bash
# Use temp file to avoid bash command substitution buffer limits
INIT_FILE="/tmp/gsd-init-$$.json"
node ~/.claude/get-shit-done/bin/gsd-tools.js init plan-phase "$PHASE" --include state,roadmap,requirements,context,research,verification,uat > "$INIT_FILE"

# Extract values using jq from temp file
PHASE_FOUND=$(jq -r '.phase_found' < "$INIT_FILE")
STATE_CONTENT=$(jq -r '.state_content // empty' < "$INIT_FILE")
```

## Benefits

1. **No size limit**: Temp files work with JSON of any size
2. **Better performance**: No shell string copying overhead
3. **Cleaner debugging**: Temp file can be inspected with `cat "$INIT_FILE" | jq`
4. **Auto-cleanup**: `$$` ensures unique temp files per process

## Pattern Details

- `$$` expands to current shell PID, ensuring unique temp files
- `/tmp/` is standard location, cleaned on reboot
- No explicit cleanup needed (short-lived scripts)
- For long-running scripts, add: `trap 'rm -f "$INIT_FILE"' EXIT`

## Migration Checklist

If you have custom GSD workflows or commands:

- [ ] Search for `INIT=$(...gsd-tools...)` pattern
- [ ] Replace with temp file pattern
- [ ] Update all `echo "$INIT" | jq` to `jq ... < "$INIT_FILE"`
- [ ] Test with a phase that has large VERIFICATION.md (>1MB)

## Files Updated

All official GSD workflows have been migrated:
- `get-shit-done/workflows/*.md` (20+ files)
- `commands/gsd/debug.md`
- `commands/gsd/research-phase.md`

## Control Character Fix

Additionally, `gsd-tools.js` now escapes control characters in file content to prevent JSON serialization errors. This is automatic and requires no workflow changes.
