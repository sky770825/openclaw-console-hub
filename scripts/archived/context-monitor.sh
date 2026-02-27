#!/bin/bash
set -e
# context-monitor.sh - Context 使用率監控
# 當達到 70% 時自動觸發檢查點

WORKSPACE="$HOME/.openclaw/workspace"
LOG_FILE="$WORKSPACE/memory/context-monitor.log"
CHECKPOINT_SCRIPT="$WORKSPACE/scripts/checkpoint.sh"

# 確保日誌目錄存在
mkdir -p "$WORKSPACE/memory"

# 記錄檢查時間
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 監控檢查" >> "$LOG_FILE"

# 注意：此腳本需配合 OpenClaw 內部機制
# 實際的 context 檢查應在 session 內透過 session_status 工具執行
# 此腳本作為 cron 輔助，用於定期提醒或外部監控

echo "Context 監控已啟動"
echo "建議：在 HEARTBEAT.md 中加入 context 檢查邏輯"
echo "當使用率 > 70% 時執行: ./scripts/checkpoint.sh"
