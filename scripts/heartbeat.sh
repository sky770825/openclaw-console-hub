#!/bin/bash
# heartbeat.sh - 達爾每日心跳報告生成器 v1.0

# 確保我們在正確的工作目錄下 (/Users/sky770825/.openclaw/workspace)
cd "$(dirname "$0")/.."

# 1. 準備環境
DATE=$(date +%Y-%m-%d)
OUTPUT_DIR="status"
OUTPUT_FILE="$OUTPUT_DIR/heartbeat-$DATE.md"

# 2. 寫入報告標頭
echo "# 達爾心跳報告 - $DATE" > "$OUTPUT_FILE"
echo "---" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# 3. 系統狀態 (直接引用 WAKE_STATUS.md)
echo "## 🚀 系統狀態" >> "$OUTPUT_FILE"
if [ -f "WAKE_STATUS.md" ]; then
    echo '``' >> "$OUTPUT_FILE"
    cat WAKE_STATUS.md >> "$OUTPUT_FILE"
    echo '``' >> "$OUTPUT_FILE"
else
    echo "WAKE_STATUS.md 未找到。" >> "$OUTPUT_FILE"
fi

# 4. 任務進度 (此處為 v1.0 佔位符，未來將由 API 取代)
echo "" >> "$OUTPUT_FILE"
echo "## 📊 任務進度" >> "$OUTPUT_FILE"
echo "- 注意: 此為 v1.0 靜態掃描，非即時 API 數據。" >> "$OUTPUT_FILE"
echo "- (下一步將升級為呼叫 /api/openclaw/tasks)" >> "$OUTPUT_FILE"

# 5. 新構想 (掃描 ideas/ 目錄)
echo "" >> "$OUTPUT_FILE"
echo "## 💡 新構想" >> "$OUTPUT_FILE"
if [ -d "projects/ideas" ] && [ "$(ls -A projects/ideas)" ]; then
    ls -1 projects/ideas | sed 's/^/- /' >> "$OUTPUT_FILE"
else
    echo "- 暫無新構想。" >> "$OUTPUT_FILE"
fi

# 6. 學習日誌 (掃描 learnings/ 目錄)
echo "" >> "$OUTPUT_FILE"
echo "## 🧠 學習與反思" >> "$OUTPUT_FILE"
if [ -d "projects/learnings" ] && [ "$(ls -A projects/learnings)" ]; then
    ls -1 projects/learnings | sed 's/^/- /' >> "$OUTPUT_FILE"
else
    echo "- 今日無新增學習日誌。" >> "$OUTPUT_FILE"
fi

echo "
---
報告生成完畢。"

# 讓腳本可執行
chmod +x "$(dirname "$0")/heartbeat.sh"

echo "✅ 心跳報告腳本 (v1.0) 已建立於 scripts/heartbeat.sh"