#!/bin/bash
# Interactive Terminal: Execution Wrapper
COMMAND=$@
LOG_FILE="/Users/sky770825/.openclaw/workspace/sandbox/terminal_history.log"
echo "[$(date)] Executing: $COMMAND" >> "$LOG_FILE"
eval "$COMMAND"
