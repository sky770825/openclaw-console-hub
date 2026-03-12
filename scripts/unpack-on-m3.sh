#!/bin/bash

# M3 還原腳本
# 用途：在 M3 機器上還原 OpenClaw 系統

BACKUP_FILE=$1
TARGET_DIR="$HOME/.openclaw"

if [ -z "$BACKUP_FILE" ]; then
    echo "❌ 用法: ./unpack-on-m3.sh <備份檔案路徑>"
    echo "例如: ./unpack-on-m3.sh /Users/caijunchang/Desktop/openclaw-m3-migration_xxxx.tar.gz"
    exit 1
fi

echo "📦 準備還原 OpenClaw 到 $TARGET_DIR..."

# 如果目標存在，先備份舊的
if [ -d "$TARGET_DIR" ]; then
    echo "⚠️  偵測到既有目錄，正在備份為 .openclaw.bak..."
    mv "$TARGET_DIR" "${TARGET_DIR}.bak_$(date +%s)"
fi

# 解壓縮
echo "🔓 正在解壓縮..."
tar -xzf "$BACKUP_FILE" -C "$HOME"

if [ $? -eq 0 ]; then
    echo "✅ 還原成功！"
    echo "🔧 正在修復權限..."
    chmod +x "$TARGET_DIR/workspace/scripts/"*.sh
    
    echo ""
    echo "🎉 恭喜！你的 AI 夥伴已在 M3 復活。"
    echo "接下來請執行："
    echo "1. cd /Users/caijunchang/.openclaw/workspace"
    echo "2. npm install (重新安裝依賴)"
    echo "3. 檢查 .env 設定"
else
    echo "❌ 解壓縮失敗"
fi