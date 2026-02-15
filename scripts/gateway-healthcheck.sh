#!/usr/bin/env bash
# OpenClaw Gateway 健康檢查（可選：用 cron 定時跑）
# 若探測失敗且距上次重啟超過 COOLDOWN 秒，則執行 openclaw gateway restart。
# 用法：
#   ./scripts/gateway-healthcheck.sh
#   GATEWAY_PORT=18789 COOLDOWN=60 ./scripts/gateway-healthcheck.sh
# Cron 範例（每 5 分鐘）：*/5 * * * * /path/to/scripts/gateway-healthcheck.sh >> /tmp/gateway-healthcheck.log 2>&1

set -e

GATEWAY_PORT="${GATEWAY_PORT:-18789}"
COOLDOWN="${COOLDOWN:-60}"
PROBE_URL="http://127.0.0.1:${GATEWAY_PORT}/"
STAMP_FILE="${STAMP_FILE:-/tmp/openclaw-gateway-restart.stamp}"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

if curl -sf --max-time 5 "$PROBE_URL" >/dev/null 2>&1; then
  log "Gateway OK (${PROBE_URL})"
  exit 0
fi

log "Gateway 無回應 (${PROBE_URL})"

# 冷卻：距上次重啟不足 COOLDOWN 秒則不重啟，避免重啟風暴
if [ -f "$STAMP_FILE" ]; then
  last=$(cat "$STAMP_FILE" 2>/dev/null || echo 0)
  now=$(date +%s)
  if [ $((now - last)) -lt "$COOLDOWN" ]; then
    log "跳過重啟（距上次重啟未滿 ${COOLDOWN} 秒）"
    exit 1
  fi
fi

if ! command -v openclaw >/dev/null 2>&1; then
  log "找不到 openclaw，請手動檢查 Gateway"
  exit 1
fi

log "執行 openclaw gateway restart..."
if openclaw gateway restart 2>/dev/null; then
  date +%s > "$STAMP_FILE"
  log "已重啟 Gateway"
  exit 0
fi

log "重啟失敗，請手動執行 openclaw gateway status"
exit 1
