#!/bin/bash
# 老蔡專用：快速檢查當前 Workspace 的產出狀況
WORKSPACE_BASE="/Users/caijunchang/.openclaw/workspace"

echo "=== OpenClaw Workspace Status ==="
echo "Reports generated:"
ls -lh "$WORKSPACE_BASE/reports"
echo ""
echo "Scripts created:"
ls -lh "$WORKSPACE_BASE/scripts"
echo ""
echo "Output queue:"
ls -lh "$WORKSPACE_BASE/sandbox/output"
echo "================================="
