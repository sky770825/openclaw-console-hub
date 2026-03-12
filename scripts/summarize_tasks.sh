#!/bin/bash
DATA_FILE=$1
REPORT_PATH=$2
TODAY=$(date +"%Y-%m-%d")

echo "# 系統任務執行報告 ($TODAY)" > "$REPORT_PATH"
echo "" >> "$REPORT_PATH"

if [ ! -f "$DATA_FILE" ]; then
    echo "錯誤：找不到任務數據文件。" >> "$REPORT_PATH"
    exit 1
fi

# Use jq to summarize
TOTAL=$(jq '. | length' "$DATA_FILE")
DONE=$(jq '[.[] | select(.status == "done")] | length' "$DATA_FILE")
IN_PROGRESS=$(jq '[.[] | select(.status == "in_progress")] | length' "$DATA_FILE")
QUEUED=$(jq '[.[] | select(.status == "queued")] | length' "$DATA_FILE")

echo "## 任務統計摘要" >> "$REPORT_PATH"
echo "- **總任務數**: $TOTAL" >> "$REPORT_PATH"
echo "- **已完成 (done)**: $DONE" >> "$REPORT_PATH"
echo "- **進行中 (in_progress)**: $IN_PROGRESS" >> "$REPORT_PATH"
echo "- **隊列中 (queued)**: $QUEUED" >> "$REPORT_PATH"
echo "" >> "$REPORT_PATH"

echo "## 最近任務列表 (Top 10)" >> "$REPORT_PATH"
echo "| ID | 任務名稱 | 狀態 | 更新時間 |" >> "$REPORT_PATH"
echo "|----|----------|------|----------|" >> "$REPORT_PATH"
jq -r '. | sort_by(.updated_at) | reverse | .[:10] | .[] | "| \(.id) | \(.task // .name // "未知") | \(.status) | \(.updated_at) |"' "$DATA_FILE" >> "$REPORT_PATH"

echo "" >> "$REPORT_PATH"
echo "---" >> "$REPORT_PATH"
echo "報告生成時間: $(date)" >> "$REPORT_PATH"
