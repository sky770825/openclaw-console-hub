#!/bin/bash
# 阿秘的進度追蹤工具 (A-Mi's Progress Tracker)
SOURCE_DIR="/Users/sky770825/openclaw任務面版設計"
KNOWLEDGE_DIR="/Users/sky770825/.openclaw/workspace/knowledge"
REPORT_PATH="/Users/sky770825/.openclaw/workspace/reports/feature_progress_report.md"

echo "# OpenClaw 功能特色頁面 - 進度追蹤報告" > "$REPORT_PATH"
echo "生成時間: $(date)" >> "$REPORT_PATH"
echo "" >> "$REPORT_PATH"
echo "| ID | 功能名稱 | 目標檔案 | 實作狀態 | 檢查結果 |" >> "$REPORT_PATH"
echo "|----|----------|----------|----------|----------|" >> "$REPORT_PATH"

# Read features from JSON and check file existence
# Using python3 for reliable JSON parsing
python3 -c "
import json, os
with open('$KNOWLEDGE_DIR/feature_roadmap.json', 'r') as f:
    data = json.load(f)
    for feat in data['features']:
        target = os.path.join('$SOURCE_DIR', feat['target_file'])
        exists = '✅ 已偵測' if os.path.exists(target) else '❌ 未建立'
        print(f\"| {feat['id']} | {feat['name']} | {feat['target_file']} | {feat['status']} | {exists} |\")
" >> "$REPORT_PATH"

echo "" >> "$REPORT_PATH"
echo "## 專案原始碼掃描摘要" >> "$REPORT_PATH"
echo "\`\`\`" >> "$REPORT_PATH"
find "$SOURCE_DIR/src" -maxdepth 2 -not -path '*/.*' >> "$REPORT_PATH" 2>/dev/null || echo "Source src directory structure not fully accessible." >> "$REPORT_PATH"
echo "\`\`\`" >> "$REPORT_PATH"

echo "[系統訊息] 報告已更新於: $REPORT_PATH"
