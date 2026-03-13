#!/bin/bash
# 星艦掃描自動化工具
TARGET_DIR="/Users/caijunchang/openclaw任務面版設計"
OUTPUT="/Users/sky770825/.openclaw/workspace/reports/last_scan.txt"

echo "=== 星艦掃描時間: $(date) ===" > "$OUTPUT"
if [ -d "$TARGET_DIR" ]; then
    echo "狀態: 正常" >> "$OUTPUT"
    echo "組件概況:" >> "$OUTPUT"
    find "$TARGET_DIR" -maxdepth 2 >> "$OUTPUT"
else
    echo "狀態: 離線 (路徑不可用)" >> "$OUTPUT"
fi
