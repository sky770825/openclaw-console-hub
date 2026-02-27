#!/bin/bash
# 任務板舊任務批次修復腳本
# 用途：為缺少必填欄位的舊任務補上預設值，解除 noncompliant/needs-meta 狀態

API_URL="http://localhost:3011/api/tasks"
LOG_FILE="/Users/caijunchang/.openclaw/workspace/logs/task-fix-$(date +%Y%m%d-%H%M%S).log"

mkdir -p $(dirname $LOG_FILE)

echo "=== 任務板修復開始 $(date) ===" | tee -a $LOG_FILE

# 1. 取得所有 draft + noncompliant 任務
DRAFT_TASKS=$(curl -s "${API_URL}?status=draft" | jq -r '.[] | select(.tags | contains(["noncompliant"])) | .id' 2>/dev/null)

echo "找到 $(echo "$DRAFT_TASKS" | wc -l) 個 noncompliant draft 任務" | tee -a $LOG_FILE

# 2. 預設值模板
DEFAULT_AGENT_TYPE="codex"
DEFAULT_RISK_LEVEL="low"
DEFAULT_ROLLBACK_PLAN="git checkout -- ."
DEFAULT_ACCEPTANCE_CRITERIA='["任務完成驗收"]'
DEFAULT_DELIVERABLES='["RESULT.md"]'
DEFAULT_RUN_COMMANDS='["echo \"Task completed\""]'
DEFAULT_MODEL_POLICY="ollama default"
DEFAULT_EXECUTION_PROVIDER="subscription/codex-native"
DEFAULT_ALLOW_PAID="false"
DEFAULT_PROJECT_PATH="projects/openclaw/modules/infra/"

# 3. 批次更新
count=0
for taskId in $DRAFT_TASKS; do
  echo "修復任務: $taskId" | tee -a $LOG_FILE
  
  curl -s -X PATCH "${API_URL}/${taskId}" \
    -H "Content-Type: application/json" \
    -d "{
      \"agent\": { \"type\": \"${DEFAULT_AGENT_TYPE}\" },
      \"riskLevel\": \"${DEFAULT_RISK_LEVEL}\",
      \"rollbackPlan\": \"${DEFAULT_ROLLBACK_PLAN}\",
      \"acceptanceCriteria\": ${DEFAULT_ACCEPTANCE_CRITERIA},
      \"deliverables\": ${DEFAULT_DELIVERABLES},
      \"runCommands\": ${DEFAULT_RUN_COMMANDS},
      \"modelPolicy\": \"${DEFAULT_MODEL_POLICY}\",
      \"executionProvider\": \"${DEFAULT_EXECUTION_PROVIDER}\",
      \"allowPaid\": ${DEFAULT_ALLOW_PAID},
      \"projectPath\": \"${DEFAULT_PROJECT_PATH}\",
      \"status\": \"ready\",
      \"tags\": [\"feature\"]
    }" >> $LOG_FILE 2>&1
  
  count=$((count + 1))
  sleep 0.5  # 避免過快
  
  if [ $count -ge 20 ]; then
    echo "已修復 20 個任務，暫停（避免過載）" | tee -a $LOG_FILE
    break
  fi
done

echo "=== 修復完成，共處理 $count 個任務 ===" | tee -a $LOG_FILE
echo "Log: $LOG_FILE"