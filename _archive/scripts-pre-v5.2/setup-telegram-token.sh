#!/bin/bash
# ============================================================
# 安全輸入 Token - 隱藏輸入，不顯示在畫面
# ============================================================

echo "═══════════════════════════════════════════"
echo "  🔐 Telegram Bot Token 安全輸入"
echo "═══════════════════════════════════════════"
echo ""
echo "請貼上你的 Bot Token（輸入時不會顯示）"
echo "輸入完成後按 Enter"
echo ""

# 隱藏輸入（不顯示在畫面）
read -s TOKEN

echo ""
echo "═══════════════════════════════════════════"

# 檢查是否為空
if [[ -z "$TOKEN" ]]; then
    echo "❌ 錯誤：Token 不能為空"
    exit 1
fi

# 檢查格式（應該是數字:英文數字混和）
if [[ ! "$TOKEN" =~ ^[0-9]+:[a-zA-Z0-9_-]+$ ]]; then
    echo "⚠️  警告：Token 格式似乎不正確"
    echo "正確格式應該是：123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
    echo ""
    read -p "仍要繼續嗎？(y/N) " confirm
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
        echo "已取消"
        exit 1
    fi
fi

# 建立 secure 目錄
mkdir -p ~/.openclaw/secure

# 寫入 Token 檔案（權限 600 - 只有擁有者可讀）
echo "$TOKEN" > ~/.openclaw/secure/telegram-bot-token
chmod 600 ~/.openclaw/secure/telegram-bot-token

echo "✅ Token 已安全儲存"
echo ""
echo "═══════════════════════════════════════════"
echo "  🎛️ 現在啟動圖文選單..."
echo "═══════════════════════════════════════════"
echo ""

# 設定環境變數並執行
export TELEGRAM_CONTROL_BOT_TOKEN="$TOKEN"
bash ~/.openclaw/workspace/scripts/telegram-rich-menu.sh set

echo ""
echo "═══════════════════════════════════════════"
echo "  📱 請查看 Telegram"
echo "═══════════════════════════════════════════"
