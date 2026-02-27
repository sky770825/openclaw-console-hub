#!/usr/bin/env bash
# NEUXA 老蔡決策同步引擎 (Boss Decision Sync)
# 用法: ./sync-boss-decisions.sh "決策內容" "關聯任務ID" "狀態"

CONTENT="$1"
TASK_ID="${2:-N/A}"
STATUS="${3:-Approved}"

# 從環境變數讀取配置
URL=$(grep "SUPABASE_URL" ../.env | cut -d'=' -f2)
KEY=$(grep "SUPABASE_SERVICE_ROLE_KEY" ../.env | cut -d'=' -f2)

if [ -z "$URL" ] || [ -z "$KEY" ]; then
    echo "Supabase configuration not found."
    exit 1
fi

# 推送到 boss_decisions 表
curl -X POST "${URL}/rest/v1/boss_decisions" \
  -H "apikey: ${KEY}" \
  -H "Authorization: Bearer ${KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d "{
    \"content\": \"$CONTENT\",
    \"task_id\": \"$TASK_ID\",
    \"status\": \"$STATUS\",
    \"source\": \"L1-NEUXA-Sync\"
  }"

echo "Decision persisted to Supabase Audit Trail."
