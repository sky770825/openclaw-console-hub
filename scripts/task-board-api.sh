#!/usr/bin/env bash
# 任務板 API 腳本 — 供 Agent 用 exec 呼叫，控制 OpenClaw 任務板
# 用法: ./task-board-api.sh <指令> [參數]
# 指令: list-tasks | get-task <id> | run-task <id> | list-runs [taskId] | get-run <id> | rerun <id> | add-task <name> [description] | update-task <id> <name> [description]
# 環境變數: TASK_BOARD_API_BASE (預設 http://localhost:3011)

BASE="${TASK_BOARD_API_BASE:-http://localhost:3011}"
BASE="${BASE%/}"

cmd="${1:-}"
id="${2:-}"
taskId="${2:-}"

case "$cmd" in
  list-tasks)
    curl -sS "${BASE}/api/tasks"
    ;;
  get-task)
    if [ -z "$id" ]; then echo '{"error":"need task id"}'; exit 1; fi
    curl -sS "${BASE}/api/tasks/${id}"
    ;;
  run-task)
    if [ -z "$id" ]; then echo '{"error":"need task id"}'; exit 1; fi
    curl -sS -X POST "${BASE}/api/tasks/${id}/run"
    ;;
  list-runs)
    if [ -n "$taskId" ]; then
      curl -sS "${BASE}/api/runs?taskId=${taskId}"
    else
      curl -sS "${BASE}/api/runs"
    fi
    ;;
  get-run)
    if [ -z "$id" ]; then echo '{"error":"need run id"}'; exit 1; fi
    curl -sS "${BASE}/api/runs/${id}"
    ;;
  rerun)
    if [ -z "$id" ]; then echo '{"error":"need run id"}'; exit 1; fi
    curl -sS -X POST "${BASE}/api/runs/${id}/rerun"
    ;;
  add-task)
    name="${2:-}"
    description="${3:-}"
    if [ -z "$name" ]; then echo '{"error":"need task name"}'; exit 1; fi
    curl -sS -X POST "${BASE}/api/tasks" \
      -H "Content-Type: application/json" \
      -d "{\"name\":\"$name\", \"description\":\"$description\"}"
    ;;
  update-task)
    id="${2:-}"
    name="${3:-}"
    description="${4:-}"
    if [ -z "$id" ]; then echo '{"error":"need task id"}'; exit 1; fi
    if [ -z "$name" ]; then echo '{"error":"need task name"}'; exit 1; fi
    curl -sS -X PATCH "${BASE}/api/tasks/${id}" \
      -H "Content-Type: application/json" \
      -d "{\"name\":\"$name\", \"description\":\"$description\"}"
    ;;
  *)
    echo "用法: $0 <list-tasks|get-task <id>|run-task <id>|list-runs [taskId]|get-run <id>|rerun <id>|add-task <name> [description]|update-task <id> <name> [description]>"
    echo "環境變數: TASK_BOARD_API_BASE (預設 http://localhost:3011)"
    exit 1
    ;;
esac
