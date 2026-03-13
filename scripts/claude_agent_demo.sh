#!/bin/bash
# 此腳本展示 Claude Code 如何透過單一代理管理多個並行任務
echo "Starting parallel analysis of workspace..."

# 任務 A: 檢查報告
{
    echo "[Agent-Task-A] Checking reports..."
    ls -l /Users/sky770825/.openclaw/workspace/reports/
} &

# 任務 B: 檢查腳本
{
    echo "[Agent-Task-B] Checking scripts..."
    ls -l /Users/sky770825/.openclaw/workspace/scripts/
} &

wait
echo "All tasks managed by Claude Agent are complete."
