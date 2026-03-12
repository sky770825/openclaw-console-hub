#!/bin/bash
# Web Monitor Scheduler - 設置定時監控任務

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="${HOME}/.web-monitor"
CRON_TAG="# web-monitor-auto"

# 顏色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

show_help() {
    cat <<EOF
Web Monitor 定時任務管理

用法:
  $0 enable <分鐘間隔>   - 啟用定時監控（例如：$0 enable 30）
  $0 disable             - 停用定時監控
  $0 status              - 查看當前狀態
  $0 run                 - 立即執行一次監控檢查
  $0 setup-telegram      - 設置 Telegram 通知
  $0 setup-discord       - 設置 Discord 通知
  $0 setup-slack         - 設置 Slack 通知

環境變數:
  TELEGRAM_BOT_TOKEN    - Telegram Bot Token
  TELEGRAM_CHAT_ID      - Telegram Chat ID
  DISCORD_WEBHOOK_URL   - Discord Webhook URL
  SLACK_WEBHOOK_URL     - Slack Webhook URL

範例:
  $0 enable 60                    # 每 60 分鐘檢查一次
  TELEGRAM_BOT_TOKEN=xxx $0 run   # 執行並發送 Telegram 通知
EOF
}

enable_scheduler() {
    local interval="${1:-60}"
    
    # 先停用舊的
    disable_scheduler >/dev/null 2>&1 || true
    
    # 添加新的 cron 任務
    local cron_cmd="*/${interval} * * * * ${SCRIPT_DIR}/run-check.sh >> ${DATA_DIR}/scheduler.log 2>&1 ${CRON_TAG}"
    
    (crontab -l 2>/dev/null || echo "") | grep -v "${CRON_TAG}" | echo -e "$(cat -)\n${cron_cmd}" | crontab -
    
    echo -e "${GREEN}✅${NC} 定時監控已啟用"
    echo "   間隔: 每 ${interval} 分鐘"
    echo "   日誌: ${DATA_DIR}/scheduler.log"
}

disable_scheduler() {
    local current_crontab=$(crontab -l 2>/dev/null || echo "")
    local new_crontab=$(echo "$current_crontab" | grep -v "${CRON_TAG}")
    
    if [ "$current_crontab" != "$new_crontab" ]; then
        echo "$new_crontab" | crontab -
        echo -e "${GREEN}✅${NC} 定時監控已停用"
    else
        echo -e "${YELLOW}⚠️${NC} 沒有找到定時監控任務"
    fi
}

show_status() {
    echo -e "${BLUE}╔══════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}              Web Monitor 狀態                    ${BLUE}║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # 檢查 cron 任務
    if crontab -l 2>/dev/null | grep -q "${CRON_TAG}"; then
        local cron_line=$(crontab -l | grep "${CRON_TAG}")
        echo -e "定時任務: ${GREEN}已啟用${NC}"
        echo "  $cron_line"
    else
        echo -e "定時任務: ${RED}未啟用${NC}"
    fi
    
    echo ""
    
    # 顯示監控項目數量
    if [ -f "${DATA_DIR}/monitors.json" ]; then
        local count=$(python3 -c "import json; print(len(json.load(open('${DATA_DIR}/monitors.json')).get('monitors', [])))" 2>/dev/null || echo "0")
        echo "監控項目: ${count} 個"
    else
        echo "監控項目: 0 個"
    fi
    
    echo ""
    
    # 檢查通知設置
    echo "通知設置:"
    if [ -n "${TELEGRAM_BOT_TOKEN}" ]; then
        echo -e "  Telegram: ${GREEN}已配置${NC}"
    else
        echo -e "  Telegram: ${RED}未配置${NC}"
    fi
    
    if [ -n "${DISCORD_WEBHOOK_URL}" ]; then
        echo -e "  Discord: ${GREEN}已配置${NC}"
    else
        echo -e "  Discord: ${RED}未配置${NC}"
    fi
    
    if [ -n "${SLACK_WEBHOOK_URL}" ]; then
        echo -e "  Slack: ${GREEN}已配置${NC}"
    else
        echo -e "  Slack: ${RED}未配置${NC}"
    fi
    
    echo ""
    echo "資料目錄: ${DATA_DIR}"
}

run_now() {
    echo -e "${BLUE}▶${NC} 執行監控檢查..."
    "${SCRIPT_DIR}/run-check.sh"
}

setup_telegram() {
    echo -e "${BLUE}Telegram 通知設置${NC}"
    echo ""
    echo "請提供以下資訊："
    read -p "Bot Token: " token
    read -p "Chat ID: " chat_id
    
    # 保存到配置文件
    mkdir -p "${DATA_DIR}"
    cat > "${DATA_DIR}/telegram.env" <<EOF
TELEGRAM_BOT_TOKEN=${token}
TELEGRAM_CHAT_ID=${chat_id}
EOF
    
    echo -e "${GREEN}✅${NC} Telegram 配置已保存到: ${DATA_DIR}/telegram.env"
    echo ""
    echo "使用方式:"
    echo "  source ${DATA_DIR}/telegram.env"
    echo "  $0 run"
}

setup_discord() {
    echo -e "${BLUE}Discord 通知設置${NC}"
    echo ""
    read -p "Webhook URL: " webhook
    
    mkdir -p "${DATA_DIR}"
    cat > "${DATA_DIR}/discord.env" <<EOF
DISCORD_WEBHOOK_URL=${webhook}
EOF
    
    echo -e "${GREEN}✅${NC} Discord 配置已保存到: ${DATA_DIR}/discord.env"
}

setup_slack() {
    echo -e "${BLUE}Slack 通知設置${NC}"
    echo ""
    read -p "Webhook URL: " webhook
    
    mkdir -p "${DATA_DIR}"
    cat > "${DATA_DIR}/slack.env" <<EOF
SLACK_WEBHOOK_URL=${webhook}
EOF
    
    echo -e "${GREEN}✅${NC} Slack 配置已保存到: ${DATA_DIR}/slack.env"
}

case "${1:-}" in
    enable)
        enable_scheduler "${2:-60}"
        ;;
    disable)
        disable_scheduler
        ;;
    status)
        show_status
        ;;
    run)
        run_now
        ;;
    setup-telegram)
        setup_telegram
        ;;
    setup-discord)
        setup_discord
        ;;
    setup-slack)
        setup_slack
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        show_help
        exit 1
        ;;
esac
