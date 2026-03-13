#!/bin/bash
# Gateway 健康監控與自動修復腳本 v2.0
# 每分鐘由 crontab 呼叫，連續 2 次失敗則嘗試重啟 + Telegram 通知

set -euo pipefail

GATEWAY_PORT="${OPENCLAW_GATEWAY_PORT:-18789}"
GATEWAY_URL="http://127.0.0.1:${GATEWAY_PORT}/"
LOG_FILE="${HOME}/.openclaw/logs/gateway-health.log"
STATE_FILE="${HOME}/.openclaw/gateway-health-state"
MAX_FAILURES=2
PLIST_LABEL="ai.openclaw.gateway"
PLIST_PATH="${HOME}/Library/LaunchAgents/${PLIST_LABEL}.plist"

# Telegram（從 telegram.env 讀取）
if [ -f "${HOME}/.openclaw/config/telegram.env" ]; then
    source "${HOME}/.openclaw/config/telegram.env"
fi
BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
CHAT_ID="${TELEGRAM_CHAT_ID:-}"

mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

send_telegram() {
    if [ -n "$BOT_TOKEN" ] && [ -n "$CHAT_ID" ]; then
        curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
            --data-urlencode "chat_id=${CHAT_ID}" \
            --data-urlencode "text=$1" > /dev/null 2>&1 || true
    fi
}

check_health() {
    local http_code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$GATEWAY_URL" 2>/dev/null) || http_code="000"
    if [ "$http_code" = "200" ]; then
        echo "healthy"
    else
        echo "unhealthy:${http_code}"
    fi
}

restart_gateway() {
    log "嘗試重啟 gateway..."

    # 找到現有 gateway pid
    local gw_pid
    gw_pid=$(pgrep -f "openclaw-gateway" 2>/dev/null | head -1) || true

    if [ -n "$gw_pid" ]; then
        kill "$gw_pid" 2>/dev/null || true
        sleep 3
    fi

    # 用 launchctl 重新載入
    launchctl bootout "gui/$(id -u)/${PLIST_LABEL}" 2>/dev/null || true
    sleep 1
    launchctl bootstrap "gui/$(id -u)" "$PLIST_PATH" 2>/dev/null || true
    sleep 5

    # 驗證
    local status
    status=$(check_health)
    if [ "$status" = "healthy" ]; then
        log "重啟成功，gateway 恢復正常"
        return 0
    else
        log "重啟後仍然異常: $status"
        return 1
    fi
}

# 讀取失敗計數
failures=0
if [ -f "$STATE_FILE" ]; then
    failures=$(cat "$STATE_FILE" 2>/dev/null) || failures=0
fi

# 健康檢查
status=$(check_health)

if [ "$status" = "healthy" ]; then
    # 如果之前有失敗，現在恢復了，通知
    if [ "$failures" -gt 0 ]; then
        log "Gateway 恢復正常 (之前連續失敗 ${failures} 次)"
        send_telegram "✅ Gateway 已恢復正常 (之前連續失敗 ${failures} 次)"
    fi
    echo "0" > "$STATE_FILE"
    exit 0
fi

# 失敗
failures=$((failures + 1))
echo "$failures" > "$STATE_FILE"
log "健康檢查失敗 ($status)，連續第 ${failures} 次"

if [ "$failures" -ge "$MAX_FAILURES" ]; then
    log "達到閾值，嘗試自動重啟..."
    send_telegram "⚠️ Gateway 連續 ${failures} 次健康檢查失敗，正在嘗試自動重啟..."

    if restart_gateway; then
        echo "0" > "$STATE_FILE"
        send_telegram "✅ Gateway 自動重啟成功"
    else
        send_telegram "🚨 Gateway 自動重啟失敗！需要手動處理。Port: ${GATEWAY_PORT}"
        log "自動重啟失敗，需要人工介入"
    fi
fi

exit 0
