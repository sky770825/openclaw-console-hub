#!/bin/bash
# 中控台環境設定
# 加入 .zshrc: source ~/.openclaw/workspace/scripts/dashboard-env.sh

export PATH="${HOME}/.openclaw/workspace/projects/dashboard/modules/cli-tool/bin:${PATH}"
export DASHBOARD_WEB_UI="${HOME}/.openclaw/workspace/projects/dashboard/modules/web-ui"

# 快捷指令
alias oc-dashboard='cd "$DASHBOARD_WEB_UI" && npm run dev'
alias oc-status='autoexecutor.sh status'
alias oc-logs='tail -f ~/.openclaw/workspace/logs/autoexecutor.log'

echo "🎯 中控台環境已載入"
echo "  oc dashboard  - 啟動 Web UI"
echo "  oc status     - 查看任務狀態"
echo "  oc-auto logs  - 查看自動執行日誌"
