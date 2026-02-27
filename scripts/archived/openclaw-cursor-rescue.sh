#!/bin/bash
# OpenClaw Cursor Agent 救援模式
# 當 OpenClaw 被卡住無法自行恢復時，呼叫 Cursor Agent 介入

set -e

RESCUE_LOG="/tmp/openclaw-rescue-$(date +%Y%m%d-%H%M%S).log"
WORKSPACE_DIR="${1:-$HOME/openclaw任務面版設計}"
ISSUE_DESCRIPTION="${2:-OpenClaw 瀏覽器自動化被卡住，需要檢查和修復}"

echo "🆘 啟動 Cursor Agent 救援模式..." | tee -a "$RESCUE_LOG"
echo "📍 工作目錄: $WORKSPACE_DIR" | tee -a "$RESCUE_LOG"
echo "📝 問題描述: $ISSUE_DESCRIPTION" | tee -a "$RESCUE_LOG"
echo "" | tee -a "$RESCUE_LOG"

# 檢查 agent 是否安裝
if ! command -v agent &> /dev/null; then
    echo "⚠️  Cursor Agent 未安裝，正在安裝..." | tee -a "$RESCUE_LOG"
    curl https://cursor.com/install -fsS | bash
    export PATH="$HOME/.local/bin:$PATH"
fi

# 先執行基礎自救
echo "🧹 步驟 1: 執行基礎清理..." | tee -a "$RESCUE_LOG"
bash ~/.openclaw/workspace/scripts/openclaw-recovery.sh | tee -a "$RESCUE_LOG"

# 呼叫 Cursor Agent 進行深度修復
echo "" | tee -a "$RESCUE_LOG"
echo "🤖 步驟 2: 呼叫 Cursor Agent 分析問題..." | tee -a "$RESCUE_LOG"

cd "$WORKSPACE_DIR"

# 使用 Cursor Agent 檢查問題並修復
agent -p "$ISSUE_DESCRIPTION

當前問題：
1. OpenClaw 瀏覽器自動化可能被卡住
2. 需要檢查是否有殘留的 playwright/agent-browser 程序
3. 檢查 Railway 部署設定是否需要調整
4. 確保 ~/.openclaw/workspace/scripts/ 下的腳本正確

請幫我：
1. 檢查並清理所有卡住的程序
2. 驗證 OpenClaw Gateway 和任務板伺服器狀態
3. 如有需要，修復 Railway 部署設定
4. 給出一個完整的修復報告" 2>&1 | tee -a "$RESCUE_LOG"

echo "" | tee -a "$RESCUE_LOG"
echo "✅ Cursor Agent 救援完成！" | tee -a "$RESCUE_LOG"
echo "📄 完整日誌: $RESCUE_LOG" | tee -a "$RESCUE_LOG"
