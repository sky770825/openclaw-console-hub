#!/usr/bin/env bash
# 定時檢查 OpenClaw relay (18792) 是否活著；可選：若掛了則自動啟動 Gateway。
# 用法：./scripts/check-relay-and-gateway.sh  或  RELAY_PORT=18792 AUTO_START_GATEWAY=1 ./scripts/check-relay-and-gateway.sh

RELAY_PORT="${RELAY_PORT:-18792}"
CHECK_INTERVAL="${CHECK_INTERVAL:-60}"
AUTO_START_GATEWAY="${AUTO_START_GATEWAY:-0}"
RELAY_URL="http://127.0.0.1:${RELAY_PORT}/json/version"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
check_relay() { curl -sf --max-time 3 "$RELAY_URL" >/dev/null; }

while true; do
  if check_relay; then
    log "relay OK (${RELAY_URL})"
  else
    log "relay 無回應 (${RELAY_URL})"
    if [ "$AUTO_START_GATEWAY" = "1" ] || [ "$AUTO_START_GATEWAY" = "yes" ]; then
      log "嘗試啟動 Gateway…"
      if command -v openclaw >/dev/null 2>&1; then
        openclaw gateway start &
        sleep 5
      else
        log "找不到 openclaw 指令，請手動啟動 Gateway"
      fi
    else
      log "提示：若希望 relay 掛掉時自動啟動 Gateway，請設 AUTO_START_GATEWAY=1"
    fi
  fi
  sleep "$CHECK_INTERVAL"
done
