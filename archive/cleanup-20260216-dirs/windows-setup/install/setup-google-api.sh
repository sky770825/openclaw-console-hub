#!/bin/bash
# Windows WSL Google API Key 設定

set -e

echo "🔐 Google API Key 設定"
echo "═══════════════════════════════════════"
echo ""

CONFIG_DIR="$HOME/.openclaw/secure"
mkdir -p "$CONFIG_DIR"
chmod 700 "$CONFIG_DIR"

# 檢查是否有從 Mac 複製過來的設定
if [[ -f "/mnt/c/openclaw-setup/config/google-api.key" ]]; then
    echo "📦 找到 Mac 的 API Key 設定，複製中..."
    cp "/mnt/c/openclaw-setup/config/google-api.key" "$CONFIG_DIR/"
    chmod 600 "$CONFIG_DIR/google-api.key"
    echo "✅ 已複製"
else
    echo "⚠️  未找到 API Key 設定"
    echo ""
    echo "請手動設定："
    echo "  1. 在 Mac 執行 🔐設定GoogleAPIKey.command"
    echo "  2. 複製 ~/.openclaw/secure/google-api.key 到 Windows"
    echo "  3. 放到 /mnt/c/openclaw-setup/config/"
fi

# 設定預算
echo "300" > "$CONFIG_DIR/google-api-budget"
echo "0" > "$CONFIG_DIR/google-api-usage"

echo ""
echo "✅ Google API 設定完成"
