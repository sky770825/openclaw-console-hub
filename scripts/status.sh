#!/bin/bash
echo "--- OpenClaw Workspace Status ---"
echo "Sandbox Output: $(ls -A /Users/sky770825/.openclaw/workspace/sandbox/output | wc -l) files"
echo "Recent Reports: $(ls -t /Users/sky770825/.openclaw/workspace/reports | head -n 5)"
echo "--------------------------------"
