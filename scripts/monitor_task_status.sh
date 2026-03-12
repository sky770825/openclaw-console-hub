#!/bin/bash
# 此腳本模擬掃描失敗任務並觸發分析
# 在真實場景中，這會查詢 DB: SELECT * FROM tasks WHERE status = 'failed' AND analyzed = false

echo "[INFO] 啟動 OpenClaw 任務狀態監控..."

# 模擬發現一個失敗任務
MOCK_TASK_ID="task-$(date +%s)"
MOCK_TASK_NAME="測試爬取任務"
MOCK_ERROR="Error: Connection timeout after 30000ms at fetch (node:internal/deps/undici/wrapper:58:25)"

# 觸發分析
/Users/caijunchang/.openclaw/workspace/scripts/trigger_failure_analysis.sh "$MOCK_TASK_ID" "$MOCK_TASK_NAME" "$MOCK_ERROR"

echo "[INFO] 監控輪詢結束。"
