#!/usr/bin/env bash
# 重啟 OpenClaw Gateway
# 用法：./scripts/restart-openclaw-gateway.sh 或 bash scripts/restart-openclaw-gateway.sh
# 優先使用 openclaw gateway restart（launchd/systemd）；若無服務則 pkill + 手動啟動

set -e

echo "🔄 正在重啟 OpenClaw Gateway..."

# 1. 優先：使用官方 CLI 重啟（有安裝 launchd/systemd 服務時）
if openclaw gateway restart 2>/dev/null; then
  echo "✓ 已透過 openclaw gateway restart 重啟"
  exit 0
fi

# 2. Fallback：手動 pkill + 啟動
if pgrep -f "openclaw gateway" > /dev/null 2>&1; then
  pkill -f "openclaw gateway" || true
  sleep 2
  echo "✓ 已停止舊行程"
fi

echo "▶ 啟動 OpenClaw Gateway..."
exec openclaw gateway --port 18789 --verbose
