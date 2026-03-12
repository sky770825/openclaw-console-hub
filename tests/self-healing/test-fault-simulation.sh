#!/bin/zsh
# test-fault-simulation.sh - 故障模擬與測試腳本

WORKSPACE="${OPENCLAW_WORKSPACE:-$HOME/.openclaw/workspace}"
MONITOR_SCRIPT="$WORKSPACE/scripts/self-healing/proactive-monitor.sh"

echo "🧪 開始故障模擬測試..."

# 測試場景 1: 根目錄污染 (可修復)
echo "\n--- 場景 1: 根目錄污染 (預期: 自動修復) ---"
touch "$WORKSPACE/dirty_file.tmp"
echo "已在根目錄建立污染檔案。"
$MONITOR_SCRIPT

# 測試場景 2: API 斷線模擬 (不可修復 - 需要人工)
# 這裡我們模擬一個假的 API_BASE 來讓 self-heal 失敗
echo "\n--- 場景 2: API 斷線模擬 (預期: 智能預警) ---"
export OPENCLAW_API_BASE="http://localhost:9999" 
$MONITOR_SCRIPT
unset OPENCLAW_API_BASE

# 測試場景 3: 知識庫缺失 README (警告)
echo "\n--- 場景 3: 知識庫品質異常 (預期: 警告通知) ---"
mkdir -p "$WORKSPACE/knowledge/test-bad-kb"
touch "$WORKSPACE/knowledge/test-bad-kb/empty.txt"
$MONITOR_SCRIPT

# 清理測試環境
rm -rf "$WORKSPACE/knowledge/test-bad-kb"
echo "\n✅ 測試結束。"
