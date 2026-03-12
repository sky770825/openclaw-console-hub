#!/bin/bash
set -e
TARGET_DIR="/Users/caijunchang/.openclaw/workspace/cookbook/"
if [ -d "$TARGET_DIR" ]; then
    COUNT=$(find "$TARGET_DIR" -maxdepth 1 -name "*.md" | wc -l | xargs)
    echo "目錄 $TARGET_DIR 下共有 $COUNT 個 .md 檔案。"
else
    echo "錯誤：目錄 $TARGET_DIR 不存在。"
    exit 1
fi
