#!/bin/bash
echo "--- OpenClaw Workspace Status ---"
echo "Sandbox Output: $(ls -A /Users/caijunchang/.openclaw/workspace/sandbox/output | wc -l) files"
echo "Recent Reports: $(ls -t /Users/caijunchang/.openclaw/workspace/reports | head -n 5)"
echo "--------------------------------"
