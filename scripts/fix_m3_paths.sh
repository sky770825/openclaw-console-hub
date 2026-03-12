#!/bin/bash
# 修復 M3 Ultra 計畫中的硬編碼路徑
TARGET_FILE=$1
if [ -f "$TARGET_FILE" ]; then
    sed -i '' 's|/old/path/data|/Users/caijunchang/.openclaw/workspace/reports|g' "$TARGET_FILE"
    echo "Path fix applied to $TARGET_FILE"
else
    echo "Target file not found."
fi
