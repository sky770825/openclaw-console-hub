#!/bin/bash
# 此腳本將在主環境建立連結，讓達爾直接在 workspace 看到產出
TARGET_LINK="/Users/sky770825/.openclaw/workspace/view_results"
SOURCE_DIR="/Users/sky770825/.openclaw/workspace/sandbox/output"

if [ -L "$TARGET_LINK" ]; then
    echo "連結已存在，正在更新..."
    rm "$TARGET_LINK"
fi

ln -s "$SOURCE_DIR" "$TARGET_LINK"
echo "完成！現在您可以直接存取 $TARGET_LINK 查看 sandbox 產出。"
