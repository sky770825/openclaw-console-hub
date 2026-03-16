#!/bin/bash
# ============================================================
# Telegram 圖文選單 - 設定底部固定按鈕
# 用途: 讓老蔡可以直接點按鈕，不用打字
# 使用: bash scripts/telegram-rich-menu.sh [set|remove|status]
# ============================================================

set -euo pipefail

WORKSPACE="/Users/sky770825/.openclaw/workspace"
CONFIG_FILE="${WORKSPACE}/config/telegram-menu.json"
BOT_TOKEN_FILE="${HOME}/.openclaw/secure/telegram-bot-token"

# 檢查 Bot Token
if [[ -f "$BOT_TOKEN_FILE" ]]; then
    BOT_TOKEN=$(cat "$BOT_TOKEN_FILE" | tr -d '[:space:]')
elif [[ -n "${TELEGRAM_CONTROL_BOT_TOKEN:-}" ]]; then
    BOT_TOKEN="$TELEGRAM_CONTROL_BOT_TOKEN"
else
    echo "❌ 錯誤: 找不到 Telegram Bot Token"
    echo "請設定 TELEGRAM_CONTROL_BOT_TOKEN 或建立 ${BOT_TOKEN_FILE}"
    exit 1
fi

# Chat ID（老蔡）
CHAT_ID="5819565005"

# 顯示使用說明
show_help() {
    cat << 'EOF'
🎛️ Telegram 圖文選單工具

用法: bash scripts/telegram-rich-menu.sh [指令]

指令:
    set      設定圖文選單（顯示底部按鈕）
    remove   移除圖文選單
    status   檢查狀態
    test     發送測試訊息

範例:
    bash scripts/telegram-rich-menu.sh set
    bash scripts/telegram-rich-menu.sh remove

EOF
}

# 設定圖文選單（Reply Keyboard）
set_menu() {
    echo "🎛️ 正在設定 Telegram 圖文選單..."
    
    # 使用 ReplyKeyboardMarkup - 底部固定按鈕
    curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
        -H "Content-Type: application/json" \
        -d "{
            \"chat_id\": \"${CHAT_ID}\",
            \"text\": \"🎛️ 小蔡控制面板已啟動\\n\\n點擊下方按鈕快速執行指令：\",
            \"reply_markup\": {
                \"keyboard\": [
                    [{\"text\": \"🆕 新對話\"}, {\"text\": \"📊 進度同步\"}],
                    [{\"text\": \"📚 知識庫\"}, {\"text\": \"🔧 系統診斷\"}],
                    [{\"text\": \"📋 規範總覽\"}, {\"text\": \"🧹 維護巡檢\"}],
                    [{\"text\": \"💰 模型切換\"}, {\"text\": \"🛑 緊急停止\"}],
                    [{\"text\": \"🔄 一鍵重啟\"}]
                ],
                \"resize_keyboard\": true,
                \"persistent\": true,
                \"input_field_placeholder\": \"點擊按鈕或輸入指令...\"
            }
        }" | jq -r '.ok // .description'
    
    echo ""
    echo "✅ 圖文選單已設定！"
    echo ""
    echo "📱 按鈕對應功能："
    echo "  🆕 新對話    → /new"
    echo "  📊 進度同步  → 查看進度"
    echo "  📚 知識庫    → 知識庫任務"
    echo "  🔧 系統診斷  → 系統檢查"
    echo "  📋 規範總覽  → 行為規範"
    echo "  🧹 維護巡檢  → SOP-5 巡檢"
    echo "  💰 模型切換  → Kimi/Gemini 切換"
    echo "  🛑 緊急停止  → 立即停止"
    echo "  🔄 一鍵重啟  → 清理重啟"
}

# 移除圖文選單
remove_menu() {
    echo "🗑️ 正在移除圖文選單..."
    
    curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
        -H "Content-Type: application/json" \
        -d "{
            \"chat_id\": \"${CHAT_ID}\",
            \"text\": \"🗑️ 圖文選單已移除\\n\\n恢復文字輸入模式。\",
            \"reply_markup\": {
                \"remove_keyboard\": true
            }
        }" | jq -r '.ok // .description'
    
    echo ""
    echo "✅ 圖文選單已移除"
}

# 檢查狀態
status_menu() {
    echo "📊 檢查 Bot 狀態..."
    
    # 取得 Bot 資訊
    result=$(curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getMe")
    ok=$(echo "$result" | jq -r '.ok')
    
    if [[ "$ok" == "true" ]]; then
        username=$(echo "$result" | jq -r '.result.username')
        echo "✅ Bot 連線正常: @${username}"
    else
        echo "❌ Bot 連線失敗"
        echo "$result" | jq -r '.description'
        exit 1
    fi
    
    # 取得 Webhook 資訊
    webhook=$(curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo")
    webhook_url=$(echo "$webhook" | jq -r '.result.url // "未設定"')
    echo "📡 Webhook: ${webhook_url}"
}

# 發送測試訊息
test_message() {
    echo "🧪 發送測試訊息..."
    
    curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
        -H "Content-Type: application/json" \
        -d "{
            \"chat_id\": \"${CHAT_ID}\",
            \"text\": \"🧪 測試訊息\\n\\n如果看到這個訊息，表示 Bot 運作正常。\"
        }" | jq -r '.ok // .description'
}

# 主程式
case "${1:-}" in
    set)
        set_menu
        ;;
    remove)
        remove_menu
        ;;
    status)
        status_menu
        ;;
    test)
        test_message
        ;;
    *)
        show_help
        ;;
esac
