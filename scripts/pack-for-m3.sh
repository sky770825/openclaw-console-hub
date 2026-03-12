#!/bin/bash

# M3 遷移打包腳本 (macOS 修復版)
# 用途：將 .openclaw 核心資料打包到桌面

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_FILE="$HOME/Desktop/openclaw-m3-migration_$TIMESTAMP.tar.gz"
SOURCE_DIR="$HOME/.openclaw"

echo "📦 開始打包 OpenClaw 系統..."
echo "📂 來源: $SOURCE_DIR"
echo "🎯 目標: $OUTPUT_FILE"

# 檢查來源是否存在
if [ ! -d "$SOURCE_DIR" ]; then
    echo "❌ 錯誤: 找不到 $SOURCE_DIR"
    exit 1
fi

# 執行打包 (macOS tar 參數順序調整)
# 注意：--exclude 放在前面
COPYFILE_DISABLE=1 tar \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='build' \
    --exclude='.next' \
    --exclude='.cache' \
    --exclude='tmp' \
    --exclude='.DS_Store' \
    --exclude='*.log' \
    -czf "$OUTPUT_FILE" \
    -C "$HOME" .openclaw

if [ $? -eq 0 ]; then
    echo "✅ 打包成功！"
    echo "📍 檔案位於: $OUTPUT_FILE"
    echo "🚀 請將此檔案複製到 M3 機器的桌面"
else
    echo "❌ 打包失敗，請檢查權限或磁碟空間"
fi