#!/bin/bash
SOURCE_FILE="/Users/caijunchang/openclaw任務面版設計/server/src/routes/auto-executor.ts"
echo "Checking current status filter in source..."
grep ".eq('status', 'ready')" "$SOURCE_FILE" || echo "Status 'ready' filter not found in standard .eq format."
echo "Checking if 'queued' is included..."
grep "queued" "$SOURCE_FILE" || echo "'queued' status is currently missing from the query logic."
