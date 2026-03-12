#!/usr/bin/env bash
# 任務板 API 腳本 — 本地 JSON 版（無需伺服器）
# 用法: ./task-board-api.sh <指令> [參數]
# 指令: list-tasks | get-task <id> | run-task <id> | list-runs [taskId] | get-run <id> | rerun <id> | add-task <name> [desc] | update-task <id> <name> [desc]
# 資料檔: ~/.openclaw/automation/tasks.json

set -euo pipefail
DB="${TASK_BOARD_DB:-$HOME/.openclaw/automation/tasks.json}"

# 確保資料檔存在
if [ ! -f "$DB" ]; then
  echo '{"tasks":[],"runs":[],"nextTaskId":1,"nextRunId":1}' > "$DB"
fi

cmd="${1:-}"
shift 2>/dev/null || true

case "$cmd" in
  list-tasks)
    jq '.tasks' "$DB"
    ;;

  get-task)
    id="${1:-}"
    [ -z "$id" ] && echo '{"error":"need task id"}' && exit 1
    jq --arg id "$id" '.tasks[] | select(.id == ($id | tonumber))' "$DB"
    ;;

  add-task)
    name="${1:-}"
    desc="${2:-}"
    assignee="${3:-unassigned}"
    [ -z "$name" ] && echo '{"error":"need task name"}' && exit 1
    tmp=$(mktemp)
    jq --arg name "$name" --arg desc "$desc" --arg assignee "$assignee" '
      .nextTaskId as $nid |
      .tasks += [{
        id: $nid,
        name: $name,
        description: $desc,
        assignee: $assignee,
        status: "pending",
        createdAt: (now | todate),
        updatedAt: (now | todate)
      }] |
      .nextTaskId = $nid + 1
    ' "$DB" > "$tmp" && mv "$tmp" "$DB"
    jq --arg id "$(jq '.nextTaskId - 1' "$DB")" '.tasks[] | select(.id == ($id | tonumber))' "$DB"
    ;;

  update-task)
    id="${1:-}"
    name="${2:-}"
    desc="${3:-}"
    [ -z "$id" ] && echo '{"error":"need task id"}' && exit 1
    [ -z "$name" ] && echo '{"error":"need task name"}' && exit 1
    tmp=$(mktemp)
    jq --arg id "$id" --arg name "$name" --arg desc "$desc" '
      .tasks |= map(if .id == ($id | tonumber) then
        .name = $name |
        .description = $desc |
        .updatedAt = (now | todate)
      else . end)
    ' "$DB" > "$tmp" && mv "$tmp" "$DB"
    jq --arg id "$id" '.tasks[] | select(.id == ($id | tonumber))' "$DB"
    ;;

  assign-task)
    id="${1:-}"
    assignee="${2:-}"
    [ -z "$id" ] && echo '{"error":"need task id"}' && exit 1
    [ -z "$assignee" ] && echo '{"error":"need assignee"}' && exit 1
    tmp=$(mktemp)
    jq --arg id "$id" --arg assignee "$assignee" '
      .tasks |= map(if .id == ($id | tonumber) then
        .assignee = $assignee |
        .updatedAt = (now | todate)
      else . end)
    ' "$DB" > "$tmp" && mv "$tmp" "$DB"
    jq --arg id "$id" '.tasks[] | select(.id == ($id | tonumber))' "$DB"
    ;;

  run-task)
    id="${1:-}"
    [ -z "$id" ] && echo '{"error":"need task id"}' && exit 1
    # 確認 task 存在
    task=$(jq --arg id "$id" '.tasks[] | select(.id == ($id | tonumber))' "$DB")
    [ -z "$task" ] && echo '{"error":"task not found"}' && exit 1
    tmp=$(mktemp)
    jq --arg id "$id" '
      .nextRunId as $rid |
      .runs += [{
        id: $rid,
        taskId: ($id | tonumber),
        status: "running",
        startedAt: (now | todate),
        finishedAt: null
      }] |
      .nextRunId = $rid + 1 |
      .tasks |= map(if .id == ($id | tonumber) then .status = "running" | .updatedAt = (now | todate) else . end)
    ' "$DB" > "$tmp" && mv "$tmp" "$DB"
    echo "{\"runId\":$(jq '.nextRunId - 1' "$DB"),\"taskId\":$id,\"status\":\"running\"}"
    ;;

  list-runs)
    taskId="${1:-}"
    if [ -n "$taskId" ]; then
      jq --arg id "$taskId" '[.runs[] | select(.taskId == ($id | tonumber))]' "$DB"
    else
      jq '.runs' "$DB"
    fi
    ;;

  get-run)
    id="${1:-}"
    [ -z "$id" ] && echo '{"error":"need run id"}' && exit 1
    jq --arg id "$id" '.runs[] | select(.id == ($id | tonumber))' "$DB"
    ;;

  rerun)
    id="${1:-}"
    [ -z "$id" ] && echo '{"error":"need run id"}' && exit 1
    run=$(jq --arg id "$id" '.runs[] | select(.id == ($id | tonumber))' "$DB")
    [ -z "$run" ] && echo '{"error":"run not found"}' && exit 1
    taskId=$(echo "$run" | jq '.taskId')
    tmp=$(mktemp)
    jq --arg tid "$taskId" '
      .nextRunId as $rid |
      .runs += [{
        id: $rid,
        taskId: ($tid | tonumber),
        status: "running",
        startedAt: (now | todate),
        finishedAt: null
      }] |
      .nextRunId = $rid + 1
    ' "$DB" > "$tmp" && mv "$tmp" "$DB"
    echo "{\"runId\":$(jq '.nextRunId - 1' "$DB"),\"taskId\":$taskId,\"status\":\"running\"}"
    ;;

  complete-run)
    id="${1:-}"
    status="${2:-completed}"
    [ -z "$id" ] && echo '{"error":"need run id"}' && exit 1
    tmp=$(mktemp)
    jq --arg id "$id" --arg st "$status" '
      .runs |= map(if .id == ($id | tonumber) then
        .status = $st | .finishedAt = (now | todate)
      else . end)
    ' "$DB" > "$tmp" && mv "$tmp" "$DB"
    
    # 同步更新 task 狀態
    taskId=$(jq --arg id "$id" '.runs[] | select(.id == ($id | tonumber)) | .taskId' "$DB")
    if [ -n "$taskId" ]; then
      tmp=$(mktemp)
      jq --arg tid "$taskId" --arg st "$status" '
        .tasks |= map(if .id == ($tid | tonumber) then
          .status = $st | .updatedAt = (now | todate)
        else . end)
      ' "$DB" > "$tmp" && mv "$tmp" "$DB"
    fi
    
    jq --arg id "$id" '.runs[] | select(.id == ($id | tonumber))' "$DB"
    ;;

  status)
    tasks=$(jq '.tasks | length' "$DB")
    runs=$(jq '.runs | length' "$DB")
    running=$(jq '[.runs[] | select(.status == "running")] | length' "$DB")
    echo "{\"tasks\":$tasks,\"runs\":$runs,\"running\":$running}"
    ;;

  *)
    echo "用法: $0 <list-tasks|get-task|add-task|update-task|run-task|list-runs|get-run|rerun|complete-run|status>"
    exit 1
    ;;
esac
