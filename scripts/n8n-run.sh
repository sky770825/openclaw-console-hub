#!/usr/bin/env bash
# N8N CLI：用環境變數的 API Key 觸發或查詢 workflow
# 使用方式：
#   export N8N_BASE_URL=http://localhost:5678
#   export N8N_API_KEY=eyJhbGciOiJIUzI1NiIs...
#   ./scripts/n8n-run.sh list
#   ./scripts/n8n-run.sh run "OpenClaw Run Index Reporter"
#   ./scripts/n8n-run.sh run <workflow-id>

set -e
# 優先 N8N_BASE_URL，其次 N8N_API_URL（與 .env 一致），預設本機
BASE="${N8N_BASE_URL:-${N8N_API_URL:-http://localhost:5678}}"
KEY="${N8N_API_KEY:-}"

if [ -z "$KEY" ]; then
  echo "請設定 N8N_API_KEY（或在 .env 中設定後 source）。" >&2
  echo "例: export N8N_API_KEY=eyJhbGciOiJIUzI1NiIs..." >&2
  exit 1
fi

# 去掉尾端斜線
BASE="${BASE%/}"
API="$BASE/api/v1"

# 預設：觸發 Run Index Reporter（報到 Telegram）
RUN_REPORTER_NAME="OpenClaw - Run Index Reporter (Telegram) [Code Node Compatible]"

case "${1:-}" in
  list)
    curl -sS -H "X-N8N-API-KEY: $KEY" "$API/workflows" | jq '.data[] | {id, name, active}'
    ;;
  run)
    NAME_OR_ID="${2:-}"
    if [ -z "$NAME_OR_ID" ]; then
      echo "用法: $0 run <workflow 名稱或 id>" >&2
      exit 1
    fi
    # 若第二參數像 UUID 則當 id，否則當名稱查詢
    if [[ "$NAME_OR_ID" =~ ^[0-9a-fA-F-]{36}$ ]]; then
      WID="$NAME_OR_ID"
    else
      WID=$(curl -sS -H "X-N8N-API-KEY: $KEY" "$API/workflows" | jq -r --arg n "$NAME_OR_ID" '.data[] | select(.name == $n) | .id // empty')
      if [ -z "$WID" ]; then
        echo "找不到名稱為 \"$NAME_OR_ID\" 的 workflow。" >&2
        exit 1
      fi
    fi
    echo "觸發 workflow: $WID"
    curl -sS -X POST \
      -H "X-N8N-API-KEY: $KEY" \
      -H "Content-Type: application/json" \
      -d '{}' \
      "$API/workflows/$WID/run" | jq '.'
    ;;
  ""|report|觸發)
    WID=$(curl -sS -H "X-N8N-API-KEY: $KEY" "$API/workflows" | jq -r --arg n "$RUN_REPORTER_NAME" '.data[] | select(.name == $n) | .id // empty')
    if [ -z "$WID" ]; then
      echo "找不到 workflow「$RUN_REPORTER_NAME」，請先執行: $0 list" >&2
      exit 1
    fi
    echo "正在觸發 Run Index 報到 Telegram..."
    curl -sS -X POST \
      -H "X-N8N-API-KEY: $KEY" \
      -H "Content-Type: application/json" \
      -d '{}' \
      "$API/workflows/$WID/run" | jq -r '.data?.executionId // .executionId // "已觸發"'
    ;;
  *)
    echo "用法: $0 [list | run <名稱或 id>]" >&2
    echo "  不帶參數 = 觸發 Run Index 報到 Telegram" >&2
    exit 1
    ;;
esac
