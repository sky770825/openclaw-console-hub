#!/bin/bash
set -e

# Define paths
PROJECT_ROOT="/Users/caijunchang/openclaw任務面版設計/server"
REPORT_DIR="/Users/caijunchang/.openclaw/workspace/reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_FILE="$REPORT_DIR/type_check_report_$TIMESTAMP.txt"
SCRIPT_PATH="/Users/caijunchang/.openclaw/workspace/scripts/verify_executor_fix.sh"

# Ensure report directory exists
mkdir -p "$REPORT_DIR"
mkdir -p "/Users/caijunchang/.openclaw/workspace/scripts"

# Verification logic encapsulated in a function/script
check_types() {
    echo "=== QualityGate Verification: TypeScript Type Check ==="
    echo "Time: $(date)"
    echo "Target: $PROJECT_ROOT"
    
    if [ ! -d "$PROJECT_ROOT" ]; then
        echo "ERROR: Directory $PROJECT_ROOT does not exist."
        return 1
    fi

    cd "$PROJECT_ROOT"

    echo "Running: npx tsc --noEmit..."
    
    # Capture output and exit code
    # We use 'npx tsc --noEmit' as requested to verify types without generating files
    if TSC_OUT=$(npx tsc --noEmit 2>&1); then
        echo "Status: SUCCESS - No type errors found."
        echo "$TSC_OUT"
        return 0
    else
        echo "Status: FAILURE - Type errors detected."
        echo "$TSC_OUT"
        return 1
    fi
}

# Run the check and pipe to report file while showing on stdout
{
    check_types
} | tee "$REPORT_FILE"

# Determine final status for the summary
if grep -q "Status: SUCCESS" "$REPORT_FILE"; then
    RESULT="SUCCESS"
else
    RESULT="FAILED"
fi

# Cleanly exit with the summary required
echo ""
echo "----------------------------------------------------------"
echo "Report generated at: $REPORT_FILE"
echo "TASK_COMPLETE: QualityGate TypeScript verification $RESULT"
echo "----------------------------------------------------------"

# Finalize the script file itself for record-keeping in the scripts directory
cp "$0" "$SCRIPT_PATH" 2>/dev/null || true

[ "$RESULT" = "SUCCESS" ] && exit 0 || exit 1