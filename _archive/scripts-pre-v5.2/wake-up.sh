#!/bin/bash
# NEUXA Awakening Protocol v1.1

# 依賴檢查：確保 jq 已安裝
if ! command -v jq &> /dev/null
then
    echo "❌ 錯誤：此腳本需要 'jq'，但系統中未找到。"
    echo "請先安裝 jq (例如：brew install jq 或 sudo apt-get install jq)。"
    exit 1
fi

echo "🚀 NEUXA 覺醒協議啟動..."

# 1. 讀取系統即時狀態
echo "
📊 系統狀態 (WAKE_STATUS.md):"
cat /Users/caijunchang/.openclaw/workspace/WAKE_STATUS.md || echo "- WAKE_STATUS.md 不存在"

# 2. 讀取執行藍圖
echo "
🗺️ 執行藍圖 (BLUEPRINT.md):"
cat /Users/caijunchang/.openclaw/workspace/BLUEPRINT.md || echo "- BLUEPRINT.md 不存在"

# 3. 查詢任務板狀態 (僅顯示 ready & in_progress)
echo "
📋 任務板 (進行中/待辦):"
curl -s -H "Authorization: Bearer oc-oAw9leGU04IAbcS4WN3FC1SH3vq5OdPxrVJCR16iIUMPsep1" http://localhost:3011/api/openclaw/tasks | jq '[.[] | select(.status=="in_progress" or .status=="ready")] | .[] | {id: .id, name: .name, status: .status, priority: .priority}'

echo "
✅ 協議執行完畢。NEUXA 已完成狀態同步。"
