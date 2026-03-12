#!/bin/bash
# Interactive Terminal: Execution Wrapper
COMMAND=$@
LOG_FILE="/Users/caijunchang/.openclaw/workspace/sandbox/terminal_history.log"
echo "[$(date)] Executing: $COMMAND" >> "$LOG_FILE"
eval "$COMMAND"
