#!/bin/bash
echo "Stopping all processes matching 'executor' or 'loop' in workspace context..."
# Identify processes running from the workspace or related to the executor
PIDS=$(ps aux | grep -E "node|python|bash" | grep -E "executor|loop|automated" | grep -v grep | awk '{print $2}')
if [ -z "$PIDS" ]; then
    echo "No matching processes found."
else
    for PID in $PIDS; do
        echo "Terminating PID: $PID"
        kill -15 $PID 2>/dev/null || kill -9 $PID 2>/dev/null
    done
fi
# Remove the stop flag if it exists (for a clean restart later if needed)
# rm -f /Users/caijunchang/.openclaw/workspace/sandbox/.auto_executor_stop
