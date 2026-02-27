#!/usr/bin/env bash
# oc-test.sh - 整合功能測試腳本

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OC="$SCRIPT_DIR/oc.sh"

echo "=== [1] 測試 oc help ==="
"$OC" --help

echo -e "\n=== [2] 測試 oc plan ==="
"$OC" plan "整合核心功能到 CLI 介面並寫測試"

echo -e "\n=== [3] 測試任務生命週期 ==="
echo ">> 新增任務"
"$OC" add "整合測試任務" "測試 oc 工具的 add/run/done 流程"

echo -e "\n>> 列出任務"
"$OC" ls

TASK_ID=$("$SCRIPT_DIR/task-board-api.sh" list-tasks | jq '. | last | .id')
echo ">> 啟動任務 (ID: $TASK_ID)"
RUN_OUTPUT=$("$OC" run "$TASK_ID")
echo "$RUN_OUTPUT"

RUN_ID=$(echo "$RUN_OUTPUT" | grep -oE "RunID: [0-9]+" | awk '{print $2}')
echo ">> 完成任務 (RunID: $RUN_ID)"
"$OC" done "$RUN_ID"

echo -e "\n=== [4] 測試 oc recall ==="
"$OC" recall "AGENTS"

echo -e "\n=== [5] 測試 oc check ==="
"$OC" check

echo -e "\n✅ 所有整合功能測試完成。"
