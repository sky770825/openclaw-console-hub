#!/bin/bash
# 腳本目的：自動掃描原始碼中的功能變動，並更新產品策略報告
REPORT_PATH="/Users/caijunchang/.openclaw/workspace/reports/openclaw_product_strategy.md"
SOURCE_PATH="/Users/caijunchang/openclaw任務面版設計"

echo "正在掃描新功能..."
NEW_DEPS=$(grep -r "dependencies" "$SOURCE_PATH/package.json" | head -n 5)
DATE=$(date)

echo " - 更新時間: $DATE" >> "$REPORT_PATH"
echo " - 偵測到之技術變動: $NEW_DEPS" >> "$REPORT_PATH"
echo "行銷文件已更新。"
