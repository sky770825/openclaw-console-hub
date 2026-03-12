#!/bin/bash
# Manual force stop script for OpenClaw Auto-Executor
SEARCH_PATTERN="openclaw|executor|loop"
PIDS=$(ps aux | grep -Ei "$SEARCH_PATTERN" | grep -v "grep" | grep -v "$$" | awk '{print $2}' || true)
if [ -n "$PIDS" ]; then
    echo "Killing processes: $PIDS"
    kill -9 $PIDS 2>/dev/null || true
    echo "Processes terminated."
else
    echo "No executor processes found."
fi
