#!/usr/bin/env bash
set -e
# 匯出 OpenClaw cron jobs 到 JSON 檔供儀表板使用
# 透過 gateway API 取得，寫入 ~/.openclaw/automation/crons.json

DATA_DIR="$HOME/.openclaw/automation"
OUT="$DATA_DIR/crons.json"

# Try gateway cron API (internal)
result=$(curl -sS --connect-timeout 3 "http://localhost:$(cat ~/.openclaw/gateway-port 2>/dev/null || echo 4445)/api/cron/jobs" 2>/dev/null) || true

if [ -n "$result" ] && echo "$result" | jq . &>/dev/null; then
  echo "$result" > "$OUT"
else
  # Fallback: use openclaw CLI
  if command -v openclaw &>/dev/null; then
    openclaw cron list --json 2>/dev/null > "$OUT" || true
  fi
fi || true
