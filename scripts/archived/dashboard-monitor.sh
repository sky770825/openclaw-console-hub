#!/bin/bash
set -e
# 中控板智能監控腳本
# 每 3 分鐘檢查，但只在有任務時詳細監控

TASK_BOARD_API="http://localhost:3011"
LOG_FILE="/tmp/openclaw/dashboard-monitor.log"

# 記錄時間
echo "=== $(date '+%Y-%m-%d %H:%M:%S') 智能監控 ===" >> "$LOG_FILE"

# 先檢查任務狀態
pending_count=$(curl -s "${TASK_BOARD_API}/api/tasks?status=pending" 2>/dev/null | grep -c '"status":"pending"' 2>/dev/null || true)
pending_count=${pending_count:-0}
running_count=$(curl -s "${TASK_BOARD_API}/api/tasks?status=running" 2>/dev/null | grep -c '"status":"running"' 2>/dev/null || true)
running_count=${running_count:-0}

# 如果沒有任何任務，只做輕量檢查
if [ "$pending_count" -eq 0 ] && [ "$running_count" -eq 0 ]; then
    echo "💤 系統閒置 (0 pending, 0 running)，輕量檢查模式" >> "$LOG_FILE"
    # 只檢查最基本健康
    health=$(curl -s -o /dev/null -w "%{http_code}" "${TASK_BOARD_API}/health" 2>/dev/null)
    [ "$health" = "200" ] && echo "✅ 任務板正常" >> "$LOG_FILE"
    echo "" >> "$LOG_FILE"
    exit 0
fi

# 有任務時做詳細監控
echo "🔥 系統忙碌 (pending: $pending_count, running: $running_count)，詳細監控模式" >> "$LOG_FILE"

# 1. 檢查任務板健康
health=$(curl -s -o /dev/null -w "%{http_code}" "${TASK_BOARD_API}/health" 2>/dev/null)
if [ "$health" != "200" ]; then
    echo "⚠️ 任務板異常 (HTTP $health)" >> "$LOG_FILE"
else
    echo "✅ 任務板正常" >> "$LOG_FILE"
fi

# 2. 檢查 AutoExecutor 狀態
autoexec=$(curl -s "${TASK_BOARD_API}/api/openclaw/auto-executor/status" 2>/dev/null | grep -o '"isRunning":true' || echo "stopped")
if [ "$autoexec" = "stopped" ] && [ "$pending_count" -gt 0 ]; then
    echo "🚨 AutoExecutor 停止但有 pending 任務，重啟中..." >> "$LOG_FILE"
    curl -s -X POST "${TASK_BOARD_API}/api/openclaw/auto-executor/start" \
        -H "Content-Type: application/json" \
        -d '{"pollIntervalMs":30000}' > /dev/null 2>&1
fi

# 3. 記錄執行時間數據（用於後續優化）
if [ "$running_count" -gt 0 ]; then
    echo "⏱️ 記錄：$running_count 個任務執行中（收集速度數據）" >> "$LOG_FILE"
fi

echo "" >> "$LOG_FILE"
