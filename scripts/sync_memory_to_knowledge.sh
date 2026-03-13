#!/bin/bash
# 此腳本用於同步 阿秘 的 MEMORY.md 到知識庫
SOURCE="/Users/sky770825/.openclaw/workspace/crew/ami/MEMORY.md"
TARGET="/Users/sky770825/.openclaw/workspace/knowledge/MEMORY.md"

if [ -f "$SOURCE" ]; then
    cp "$SOURCE" "$TARGET"
    echo "[$ (date)] 成功：已從 $SOURCE 同步到 $TARGET"
else
    echo "[$ (date)] 警告：找不到來源文件 $SOURCE，請確認路徑是否正確。"
fi
