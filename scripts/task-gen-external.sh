#!/bin/bash
# task-gen-external.sh - 外部情報掃描（non-sandbox 版本）
# 每建立一個任務即發送通知（I/O 閉環模式）
set -e

SCRIPT_NAME="task-gen-external"
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

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [${RUN_ID}] $1" | tee -a "$LOG_FILE"; }

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
        [[ "$LAST_KEY" == "$IDEMPOTENCY_KEY" ]] && { log "✅ 本小時已執行過，跳過"; exit 0; }
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
        [[ $retries -ge 3 ]] && { log "❌ API 無法連線"; update_state "error" "API unavailable"; exit 1; }
        sleep 1
    done
}

count_ready_tasks() {
    curl -s --max-time 5 "${API_ENDPOINT}/tasks" 2>/dev/null | \
        jq '[.[] | select(.status == "ready")] | length' 2>/dev/null || echo "0"
}

create_task_and_notify() {
    local name="$1" problem="$2" expected="$3" criteria="$4" risk="$5" rollback="$6" source="$7"

    local projectPath="projects/external-radar/modules/scan/"
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
            "cd /Users/caijunchang/openclaw任務面版設計",
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


log "🚀 外部情報掃描開始"
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

create_task_and_notify \
    "評估 OpenAI GPT-5 API 應用機會" \
    "GPT-5 即將發布，需評估對現有自動化流程的影響與應用機會" \
    "完成 GPT-5 功能評估報告，列出可優化的現有流程" \
    "1. 研究 GPT-5 新功能 2. 比對現有流程 3. 提出 3 個優化建議" \
    "low" "維持現有 GPT-4 方案" "external-intel" && tasks_created=$((tasks_created + 1))

create_task_and_notify \
    "監控競品 AI 自動化產品動態" \
    "主要競品（如 n8n、Make、Zapier）近期有功能更新，需持續追蹤" \
    "每週產出競品功能比較摘要，識別差異化機會" \
    "1. 追蹤 3 大競品更新 2. 比較功能差異 3. 提出應對策略" \
    "low" "暫停競品追蹤" "external-intel" && tasks_created=$((tasks_created + 1))

create_task_and_notify \
    "AI Agent 市場趨勢與變現模式研究" \
    "AI Agent 市場快速發展，需了解最新變現模式與商業機會" \
    "完成 AI Agent 市場趨勢報告，識別 2-3 個可切入的商業模式" \
    "1. 搜尋市場報告 2. 分析變現案例 3. 提出商業模式建議" \
    "medium" "暫緩市場擴張計畫" "external-intel" && tasks_created=$((tasks_created + 1))

summary="建立 $tasks_created 個外部情報任務 | Ready: $(count_ready_tasks)"
log "✅ 完成: $summary"
update_state "ok" "$summary"

# 最後總結通知
if command -v openclaw &> /dev/null && [[ $tasks_created -gt 0 ]]; then
    openclaw message send -t "5819565005" -m "【外部情報掃描完成】

✅ 本輪共建立 $tasks_created 個任務卡
🤖 指派代理: $AGENT
🧠 模型: $MODEL
📊 目前 Ready 欄位: $(count_ready_tasks) 張" --channel telegram 2>/dev/null || true
fi

echo "$summary"
