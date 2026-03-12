#!/bin/bash
# 小蔡的傳送門：從 sandbox 同步回 workspace
SRC="$1"
DEST="/Users/caijunchang/.openclaw/workspace/armory/"
if [ -z "$SRC" ]; then echo "Usage: $0 <source_path>"; exit 1; fi
cp -rv "$SRC" "$DEST"
echo "✅ 檔案已同步至 $DEST"