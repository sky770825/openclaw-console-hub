#!/bin/bash
# 用法: ./trigger_failure_analysis.sh <TASK_ID> <TASK_NAME> <ERROR_MESSAGE>

TASK_ID=$1
TASK_NAME=$2
ERROR_MSG=$3
LOGS=$4

LEARNINGS_DIR="/Users/sky770825/.openclaw/workspace/learnings"
REPORT_FILE="$LEARNINGS_DIR/failure-report-$TASK_ID.md"

echo "[INFO] 正在分析任務失敗原因: $TASK_ID ..."

# 調用 AI 分析工具生成報告內容
python3 /Users/sky770825/.openclaw/workspace/scripts/ai_failure_analyzer.py "$TASK_ID" "$TASK_NAME" "$ERROR_MSG" "$LOGS" > "$REPORT_FILE"

echo "[SUCCESS] 複盤報告已生成: $REPORT_FILE"
