#!/bin/bash
#
# skill: health-check.sh
# 用途: 檢查 OpenClaw Server 的 API 健康狀態。
# 參數: 無
# 範例: ./health-check.sh
#

echo "🚀 正在檢查 OpenClaw Server 狀態..."

# -sS: 靜默模式但顯示錯誤
# --fail: HTTP 錯誤時回傳 exit code 22
curl -sS --fail http://localhost:3011/api/health || echo "❌ 錯誤：伺服器 API 無法連線或回應不正常。"

echo ""