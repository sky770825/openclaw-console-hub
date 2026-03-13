#!/bin/bash
# 若不希望使用連結，可使用此腳本手動將檔案複製回主目錄的指定位置
DESTINATION="/Users/sky770825/.openclaw/workspace/commander_output"
mkdir -p "$DESTINATION"
cp -rv "/Users/sky770825/.openclaw/workspace/sandbox/output"/* "$DESTINATION/"
echo "同步完成！檔案已複製到 $DESTINATION"
