#!/bin/bash
# NEUXA 建立的啟動腳本 (2026-02-28)
# 解決 launchd 服務無法讀取使用者 shell 環境變數 PATH 的問題

# 將必要的路徑加入 PATH
export PATH="/Users/sky770825/.local/bin:$PATH"

# 導航到專案根目錄 (請確保此腳本是從專案根目錄執行的)
# cd "$(dirname "$0")/.."

echo "[NEUXA] PATH 已設定，準備啟動 OpenClaw server..."

# 執行 server (請確認這是正確的啟動指令)
node server/dist/index.js
