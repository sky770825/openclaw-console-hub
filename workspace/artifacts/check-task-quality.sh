#!/bin/bash
# Usage: ./check-task-quality.sh <task_id> <duration_sec> <files_changed_count> <log_file_path>

TASK_ID=$1
DURATION=$2
FILES_CHANGED=$3
LOG_FILE=$4
OUTPUT_DIR="/Users/caijunchang/.openclaw/workspace/sandbox/output"

if [ -z "$TASK_ID" ] || [ -z "$DURATION" ] || [ -z "$FILES_CHANGED" ] || [ -z "$LOG_FILE" ]; then
    echo "Usage: $0 <task_id> <duration_sec> <files_changed_count> <log_file_path>"
    exit 1
fi

echo "--- Quality Guard Audit: Task $TASK_ID ---"
echo "Duration: ${DURATION}s"
echo "Files Changed: $FILES_CHANGED"

# Check if log file exists
if [ ! -f "$LOG_FILE" ]; then
    HAS_RUN_SCRIPT=0
else
    # Check if run_script was actually called in logs
    HAS_RUN_SCRIPT=$(grep -c "run_script" "$LOG_FILE" || echo 0)
fi

echo "Script executions detected: $HAS_RUN_SCRIPT"

# Audit Logic: If duration < 5s AND no file changes AND no script execution -> FAILED
if [ "$DURATION" -lt 5 ] && [ "$FILES_CHANGED" -eq 0 ] && [ "$HAS_RUN_SCRIPT" -eq 0 ]; then
    echo "[RESULT] AUDIT FAILED: Task detected as 'idling' (裝忙)."
    echo "ACTION: Reverting status to FAILED/READY."
    echo "FAILED" > "$OUTPUT_DIR/task_${TASK_ID}_status.audit"
    exit 1
else
    echo "[RESULT] AUDIT PASSED: Substance detected."
    echo "PASSED" > "$OUTPUT_DIR/task_${TASK_ID}_status.audit"
    exit 0
fi
