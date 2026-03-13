#!/bin/bash
# This script attempts to start the server and log output to the workspace
cd "/Users/caijunchang/openclaw任務面版設計/server" || exit
echo "Starting server on port ..."
# Note: Using npm start or equivalent, outputting to workspace for debugging
npm install && npm run dev > "/Users/sky770825/.openclaw/workspace/sandbox/output/server_output.log" 2>&1 &
echo "Server started in background. Check /Users/sky770825/.openclaw/workspace/sandbox/output/server_output.log for details."
