#!/usr/bin/env bash
# NEUXA Agent 經驗追蹤器 (XP Tracker)
# 用法: ./agent-xp-tracker.sh [AgentID]

DB="$HOME/.openclaw/automation/tasks.json"
AGENT_ID="${1:-L1-NEUXA}"

if [ ! -f "$DB" ]; then
    echo "Task database not found."
    exit 1
fi

# 簡單統計：計算 status=done 的任務數量
COMPLETED_COUNT=$(jq -r ".tasks[] | select(.status == \"done\") | .id" "$DB" | wc -l)
XP=$((COMPLETED_COUNT * 10))

echo "=== Agent Evolution Status: $AGENT_ID ==="
echo "Total Completed Tasks: $COMPLETED_COUNT"
echo "Current XP: $XP"

# 等級判定
if [ $XP -lt 100 ]; then
    LEVEL="Lv.1 (Larva)"
elif [ $XP -lt 500 ]; then
    LEVEL="Lv.2 (Worker)"
else
    LEVEL="Lv.3 (Strategist)"
fi

echo "Current Evolution State: $LEVEL"
