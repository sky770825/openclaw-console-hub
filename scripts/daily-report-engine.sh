#!/bin/bash
# scripts/daily-report-engine.sh
# 每天早上產出系統健康與進度摘要報告

echo "📊 OpenClaw 每日健康摘要報告 - $(date +'%Y-%m-%d')"
echo "-----------------------------------"

# 1. 檢查 Gateway 狀態
GW_STATUS=$(openclaw gateway status | grep "^Runtime:" | awk '{print $2}')
if [ "$GW_STATUS" == "running" ]; then
    echo "✅ Gateway: 穩定運行中"
else
    echo "⚠️ Gateway: 異常 (狀態: $GW_STATUS)"
fi

# 2. 統計任務板
TOTAL_TASKS=$(curl -s http://localhost:3011/api/tasks | jq '. | length')
READY_TASKS=$(curl -s http://localhost:3011/api/tasks | jq '[.[] | select(.status == "ready")] | length')
DONE_TASKS_24H=$(curl -s http://localhost:3011/api/tasks | jq '[.[] | select(.status == "done" and .updatedAt > "'$(date -v-1d -u +%Y-%m-%dT%H:%M:%SZ)'")] | length')

echo "📋 任務板快報："
echo "   - 待辦任務 (Ready): $READY_TASKS"
echo "   - 24hr 內完成: $DONE_TASKS_24H"
echo "   - 總任務數: $TOTAL_TASKS"

# 3. 資源監控
DISK_USAGE=$(df -h . | awk 'NR==2 {print $5}')
echo "💾 資源使用率：$DISK_USAGE"

# 4. 戰略進度
if [ -f "projects/openclaw/MASTER-PLAN.md" ]; then
    echo "🗺️ 戰略清單已定版：MASTER-PLAN.md ✅"
fi

echo "-----------------------------------"
echo "小蔡已準備就緒，隨時待命開墾！🦞"
