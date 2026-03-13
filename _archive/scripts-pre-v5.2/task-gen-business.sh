#!/bin/bash
# task-gen-business.sh - 商業模式掃描（non-sandbox 版本）
# 每建立一個任務即發送通知（I/O 閉環模式）
set -e

SCRIPT_NAME="task-gen-business"
LOCK_FILE="/tmp/${SCRIPT_NAME}.lock"
STATE_DIR="${HOME}/.openclaw/automation/state"
STATE_FILE="${STATE_DIR}/${SCRIPT_NAME}.json"
LOG_FILE="${HOME}/.openclaw/automation/logs/${SCRIPT_NAME}.log"
API_ENDPOINT="http://localhost:3011/api"
RUN_ID=$(date +%s%N)
IDEMPOTENCY_KEY="${SCRIPT_NAME}-$(date +%Y%m%d-%H)"

mkdir -p "${STATE_DIR}" "$(dirname "$LOG_FILE")"

AGENT="codex"
MODEL="bash/template"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [${RUN_ID}] $1" | tee -a "$LOG_FILE"
}

notify_task_created() {
    return 0  # muted (index-only)
}


acquire_lock() {
    if ! mkdir "$LOCK_FILE" 2>/dev/null; then
        log "🔒 已有其他實例執行中，跳過"
        exit 0
    fi
    trap 'rm -rf "$LOCK_FILE"' EXIT
}

check_idempotency() {
    if [[ -f "$STATE_FILE" ]]; then
        LAST_KEY=$(jq -r '.lastIdempotencyKey // ""' "$STATE_FILE" 2>/dev/null || echo "")
        if [[ "$LAST_KEY" == "$IDEMPOTENCY_KEY" ]]; then
            log "✅ 本小時已執行過 (key: $IDEMPOTENCY_KEY)，跳過"
            exit 0
        fi
    fi
}

update_state() {
    local status="$1" summary="$2"
    echo "{\"lastIdempotencyKey\":\"$IDEMPOTENCY_KEY\",\"lastStatus\":\"$status\",\"lastSummary\":\"$summary\",\"lastRunAt\":\"$(date -Iseconds)\"}" > "$STATE_FILE"
}

wait_for_api() {
    local retries=0
    while ! curl -s --max-time 3 "${API_ENDPOINT}/tasks" > /dev/null 2>&1; do
        retries=$((retries + 1))
        if [[ $retries -ge 3 ]]; then
            log "❌ API 無法連線，放棄執行"
            update_state "error" "API unavailable"
            exit 1
        fi
        log "⏳ 等待 API... (${retries}/3)"
        sleep 1
    done
}

count_ready_tasks() {
    curl -s --max-time 5 "${API_ENDPOINT}/tasks" 2>/dev/null | \
        jq '[.[] | select(.status == "ready")] | length' 2>/dev/null || echo "0"
}

create_task_and_notify() {
    local name="$1" problem="$2" expected="$3" criteria="$4" risk="$5" rollback="$6" source="$7"

    local projectPath="projects/business-poc/modules/growth/"
    local payload=$(jq -n         --arg name "$name"         --arg problem "$problem"         --arg expected "$expected"         --arg criteria "$criteria"         --arg risk "$risk"         --arg rollback "$rollback"         --arg projectPath "$projectPath"         --arg agentType "codex"         --arg executionProvider "subscription/codex-native"         --arg modelPolicy "default=ollama/qwen3:8b; dev=subscription/codex-native|subscription/cursor-auto; paid requires allowPaid=true"         --arg tag "$source"         '{
          name: $name,
          description: ("## 問題
" + $problem + "

## 預期產出
" + $expected + "

## 驗收條件
" + $criteria),
          status: "ready",
          tags: [$tag],
          riskLevel: $risk,
          rollbackPlan: $rollback,
          acceptanceCriteria: [$criteria],
          deliverables: ["README.md", ".env.example", "docs/runbook.md", "src/"],
          runCommands: [
            "cd /Users/sky770825/openclaw任務面版設計",
            "ls -la " + $projectPath,
            "# implement under " + $projectPath,
            "# write RESULT.md under runs/<date>/<run_id>/RESULT.md"
          ],
          projectPath: $projectPath,
          agent: {type: $agentType},
          allowPaid: false,
          executionProvider: $executionProvider,
          modelPolicy: $modelPolicy
        }')

    local response=$(curl -s --max-time 15 -X POST "${API_ENDPOINT}/tasks" -H "Content-Type: application/json" -d "$payload" 2>/dev/null)
    local task_id=$(echo "$response" | jq -r '.id // empty' 2>/dev/null)

    if [[ -n "$task_id" ]]; then
        log "✅ 建立任務: $name (ID: $task_id)"
        local ready_count=$(count_ready_tasks)
        notify_task_created "$name" "$ready_count"
        return 0
    else
        log "⚠️ 建立任務失敗: $name | resp: $response"
        return 1
    fi
}


# ===== 主邏輯 =====
log "🚀 開始執行商業模式掃描 (run: $RUN_ID)"

acquire_lock
wait_for_api

ready_count=$(count_ready_tasks)
log "📊 目前 Ready 任務: $ready_count"

if [[ "$ready_count" -ge 20 ]]; then
  check_idempotency
else
  log "⚠️ Ready 任務 < 20，忽略 idempotency（仍有 24h 去重保護）"
fi

tasks_created=0

# Task 1: 住商不動產
create_task_and_notify \
    "住商不動產楊梅店 - 數位leads生成系統" \
    "目前業務開發依賴傳統方式，需要建立自動化leads收集與追蹤系統" \
    "建立完整的潛在客戶收集→分類→追蹤→成交的自動化流程" \
    "1. 設定表單自動同步到CRM 2. 建立LINE Bot自動回覆 3. 設定追蹤提醒" \
    "low" "停用自動化腳本，回到手動管理" "business-model" && tasks_created=$((tasks_created + 1))

# Task 2: 飲料店
create_task_and_notify \
    "飲料店 - 外送平台整合與會員忠誠系統" \
    "UberEats/Foodpanda訂單無法累積會員點數，需要整合多平台建立統一會員系統" \
    "建立跨平台的會員識別與點數累積系統，提升回購率" \
    "1. 整合外送平台訂單 2. 建立手機號碼識別機制 3. 自動發放點數通知" \
    "medium" "暫停點數發放，手動補償" "business-model" && tasks_created=$((tasks_created + 1))

# Task 3: 普特斯
create_task_and_notify \
    "普特斯防霾紗窗 - 電商平台與供應鏈預測" \
    "電商庫存與實體門市庫存未連動，常發生超賣或缺貨" \
    "建立統一庫存管理與銷售預測系統，優化進貨節奏" \
    "1. 整合各平台庫存數據 2. 建立低庫存預警 3. 銷售趨勢預測報告" \
    "low" "回到各平台獨立管理庫存" "business-model" && tasks_created=$((tasks_created + 1))

summary="建立 $tasks_created 個商業任務卡 | Ready: $(count_ready_tasks)"
log "✅ 完成: $summary"
update_state "ok" "$summary"

# 最後總結通知
if command -v openclaw &> /dev/null && [[ $tasks_created -gt 0 ]]; then
    openclaw message send -t "5819565005" -m "【商業模式掃描完成】

✅ 本輪共建立 $tasks_created 個任務卡
🤖 指派代理: $AGENT
🧠 模型: $MODEL
📊 目前 Ready 欄位: $(count_ready_tasks) 張" --channel telegram 2>/dev/null || true
fi

echo "$summary"
