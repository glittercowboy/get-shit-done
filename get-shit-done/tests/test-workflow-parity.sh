#!/bin/bash
# Test script to verify execute-plan.md and execute-plan-compact.md stay in sync
# Usage: ./test-workflow-parity.sh

set -e

WORKFLOWS_DIR="$(cd "$(dirname "$0")/../workflows" && pwd)"
FULL_FILE="$WORKFLOWS_DIR/execute-plan.md"
COMPACT_FILE="$WORKFLOWS_DIR/execute-plan-compact.md"

echo "🔍 Testing workflow parity..."
echo ""

# Check files exist
if [ ! -f "$FULL_FILE" ]; then
  echo "❌ ERROR: execute-plan.md not found at $FULL_FILE"
  exit 1
fi

if [ ! -f "$COMPACT_FILE" ]; then
  echo "❌ ERROR: execute-plan-compact.md not found at $COMPACT_FILE"
  exit 1
fi

# Extract step names from both files
echo "Extracting step names from execute-plan.md..."
STEPS_FULL=$(grep '^<step name=' "$FULL_FILE" | sed 's/.*name="\([^"]*\)".*/\1/' | sort)

echo "Extracting step names from execute-plan-compact.md..."
STEPS_COMPACT=$(grep '^<step name=' "$COMPACT_FILE" | sed 's/.*name="\([^"]*\)".*/\1/' | sort)

# Compare step lists
if [ "$STEPS_FULL" != "$STEPS_COMPACT" ]; then
  echo "❌ ERROR: Workflow steps are out of sync!"
  echo ""
  echo "Steps in execute-plan.md:"
  echo "$STEPS_FULL" | sed 's/^/  - /'
  echo ""
  echo "Steps in execute-plan-compact.md:"
  echo "$STEPS_COMPACT" | sed 's/^/  - /'
  echo ""
  echo "Differences:"
  diff <(echo "$STEPS_FULL") <(echo "$STEPS_COMPACT") || true
  echo ""
  echo "💡 Fix: Ensure both files define the same <step name=\"...\"> elements"
  exit 1
fi

# Count steps
STEP_COUNT=$(echo "$STEPS_FULL" | wc -l | tr -d ' ')

echo "✅ Step names match ($STEP_COUNT steps)"
echo ""

# Verify critical sections exist in both files
echo "Checking critical sections..."

CRITICAL_SECTIONS=(
  "purpose"
  "required_reading"
  "process"
  "task_commit_protocol"
  "checkpoint_protocol"
  "deviation_rules"
  "summary_creation"
  "success_criteria"
)

ALL_GOOD=true

for SECTION in "${CRITICAL_SECTIONS[@]}"; do
  if ! grep -q "<$SECTION>" "$FULL_FILE"; then
    echo "  ⚠️  Missing section <$SECTION> in execute-plan.md"
    ALL_GOOD=false
  fi

  if ! grep -q "<$SECTION>" "$COMPACT_FILE"; then
    echo "  ⚠️  Missing section <$SECTION> in execute-plan-compact.md"
    ALL_GOOD=false
  fi
done

if [ "$ALL_GOOD" = true ]; then
  echo "✅ All critical sections present in both files"
else
  echo "❌ Some critical sections are missing"
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ WORKFLOW PARITY TEST PASSED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Both workflow files are synchronized:"
echo "  - Same step sequence ($STEP_COUNT steps)"
echo "  - All critical sections present"
echo ""
echo "💡 Run this test after modifying either workflow file to ensure sync"
