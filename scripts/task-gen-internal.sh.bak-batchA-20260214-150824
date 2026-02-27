#!/bin/bash
# task-gen-internal.sh - 內部優化掃描（Ollama + 直接回報版本）
# 每建立一個任務即發送通知（I/O 閉環模式）
set -e

SCRIPT_NAME="task-gen-internal"
LOCK_FILE="/tmp/${SCRIPT_NAME}.lock"
STATE_DIR="${HOME}/.openclaw/automation/state"
STATE_FILE="${STATE_DIR}/${SCRIPT_NAME}.json"
LOG_FILE="${HOME}/.openclaw/automation/logs/${SCRIPT_NAME}.log"
API_ENDPOINT="http://localhost:3011/api"
OLLAMA_URL="${OLLAMA_HOST:-http://localhost:11434}"
RUN_ID=$(date +%s%N)
IDEMPOTENCY_KEY="${SCRIPT_NAME}-$(date +%Y%m%d-%H)"

mkdir -p "${STATE_DIR}" "$(dirname "$LOG_FILE")"

AGENT="🧑‍💻 Codex"
MODEL_USED="ollama/qwen3:8b"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [${RUN_ID}] $1" | tee -a "$LOG_FILE"; }

notify_task_created() {
    local task_name="$1"
    local ready_count="$2"
    local model="$3"
    if command -v openclaw &> /dev/null; then
        openclaw message send -t "5819565005" -m "【新任務卡建立】內部優化

📋 任務: $task_name
🤖 指派代理: $AGENT
🧠 模型: $model
📊 Ready 欄位: $ready_count 張

任務已進入 Ready 欄位，等待執行。" --channel telegram 2>/dev/null || true
    fi
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
    local name="$1" problem="$2" expected="$3" criteria="$4" risk="$5" rollback="$6" source="$7" model="$8"
    
    local payload=$(jq -n \
        --arg name "$name" --arg problem "$problem" --arg expected "$expected" \
        --arg criteria "$criteria" --arg risk "$risk" --arg rollback "$rollback" \
        --arg agent "$AGENT" --arg source "$source" \
        '{name: $name, description: ("## 問題\n" + $problem + "\n\n## 預期產出\n" + $expected + "\n\n## 驗收條件\n" + $criteria), status: "ready", riskLevel: $risk, rollbackPlan: $rollback, assignedAgent: $agent, source: $source, acceptanceCriteria: $criteria}')
    
    local response=$(curl -s --max-time 10 -X POST "${API_ENDPOINT}/tasks" -H "Content-Type: application/json" -d "$payload" 2>/dev/null)
    local task_id=$(echo "$response" | jq -r '.id // empty' 2>/dev/null)
    
    if [[ -n "$task_id" ]]; then
        log "✅ 建立任務: $name (ID: $task_id)"
        local ready_count=$(count_ready_tasks)
        notify_task_created "$name" "$ready_count" "$model"
        return 0
    else
        log "⚠️ 建立任務失敗: $name"
        return 1
    fi
}

# 呼叫 Ollama 生成任務建議
generate_tasks_with_ollama() {
    local ready_count="$1"
    local prompt="你是一個系統優化專家。檢查以下項目並產生最多3個優化任務建議：

1. 系統：OpenClaw 自動化框架 (~/.openclaw/workspace/)
2. 技能：24個已安裝 skills (skills/)
3. 腳本：75個 bash 腳本 (scripts/)
4. 記憶庫：180個記憶文件 (memory/)

目前 Ready 欄位有 ${ready_count} 個任務。
若少於20個，優先補任務；若超過20個，產生高價值優化任務。

請用 JSON 格式回傳（只回傳 JSON，不要其他文字）：
[
  {
    \"name\": \"任務名稱\",
    \"problem\": \"要解決的問題\",
    \"expectedOutput\": \"預期產出\",
    \"acceptanceCriteria\": \"驗收條件\",
    \"riskLevel\": \"low|medium|high\",
    \"rollbackPlan\": \"回滾方案\"
  }
]"

    log "🤖 呼叫 Ollama (qwen3:8b) 生成任務建議..."
    
    local response=$(curl -s --max-time 60 "${OLLAMA_URL}/api/generate" \
        -H "Content-Type: application/json" \
        -d "{\"model\": \"qwen3:8b\", \"prompt\": $(echo "$prompt" | jq -Rs .), \"stream\": false}" 2>/dev/null)
    
    echo "$response" | jq -r '.response // empty' 2>/dev/null | jq -r '.[]? // empty' 2>/dev/null
}

# 預設任務（當 Ollama 無法連線時使用）
use_default_tasks() {
    log "⚠️ Ollama 無回應，使用預設任務"
    echo '[
        {"name": "監控腳本去重與統一框架建立", "problem": "8個監控腳本有60%重複代碼，維護困難", "expectedOutput": "建立統一監控框架，合併重複邏輯", "acceptanceCriteria": "1. 建立統一監控模板 2. 整合8個腳本為框架+插件 3. 減少50%代碼量", "riskLevel": "medium", "rollbackPlan": "保留原腳本備份，出問題可切回"},
        {"name": "Memory 索引系統建立", "problem": "180個記憶文件無統一索引，搜尋困難", "expectedOutput": "自動化索引系統，支援快速檢索", "acceptanceCriteria": "1. 建立記憶索引結構 2. 自動標籤分類 3. 搜尋回應時間<1秒", "riskLevel": "low", "rollbackPlan": "索引與原文件分離，不影響原檔"},
        {"name": "技能 README 補齊計畫", "problem": "24個技能中有6個缺少 README 文件", "expectedOutput": "補齊6個技能文件，統一格式", "acceptanceCriteria": "1. 完成6個README 2. 統一格式模板 3. 加入使用範例", "riskLevel": "low", "rollbackPlan": "文件修改可透過git還原"}
    ]' | jq -r '.[]'
}

# ===== 主邏輯 =====
log "🚀 內部優化掃描開始 (Ollama: qwen3:8b)"
acquire_lock
check_idempotency
wait_for_api

ready_count=$(count_ready_tasks)
log "📊 目前 Ready 任務: $ready_count"

# 取得任務建議（Ollama 或預設）
tasks_json=$(generate_tasks_with_ollama "$ready_count" 2>/dev/null || echo "")

if [[ -z "$tasks_json" ]]; then
    tasks_json=$(use_default_tasks)
    MODEL_USED="bash/template (Ollama fallback)"
fi

# 建立任務
tasks_created=0

while IFS= read -r task; do
    [[ -z "$task" ]] && continue
    
    name=$(echo "$task" | jq -r '.name // empty')
    problem=$(echo "$task" | jq -r '.problem // empty')
    expected=$(echo "$task" | jq -r '.expectedOutput // empty')
    criteria=$(echo "$task" | jq -r '.acceptanceCriteria // empty')
    risk=$(echo "$task" | jq -r '.riskLevel // "low"')
    rollback=$(echo "$task" | jq -r '.rollbackPlan // "停用功能"')
    
    [[ -z "$name" ]] && continue
    
    create_task_and_notify "$name" "$problem" "$expected" "$criteria" "$risk" "$rollback" "internal-optimization" "$MODEL_USED" && tasks_created=$((tasks_created + 1))
done <<< "$tasks_json"

summary="建立 $tasks_created 個內部優化任務 | Ready: $(count_ready_tasks)"
log "✅ 完成: $summary"
update_state "ok" "$summary"

# 最後總結通知
if command -v openclaw &> /dev/null && [[ $tasks_created -gt 0 ]]; then
    openclaw message send -t "5819565005" -m "【內部優化掃描完成】

✅ 本輪共建立 $tasks_created 個任務卡
🤖 指派代理: $AGENT
🧠 模型: $MODEL_USED
📊 目前 Ready 欄位: $(count_ready_tasks) 張" --channel telegram 2>/dev/null || true
fi

echo "$summary"
