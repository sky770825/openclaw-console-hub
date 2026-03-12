#!/bin/bash
# Autoexecutor - 智能任務自動執行系統 (修復版)
# 整合 OpenClaw agent 自動執行 ready 任務

set -euo pipefail

WORKSPACE="${HOME}/.openclaw/workspace"
STATUS_FILE="${HOME}/.openclaw/.autoexecutor-status"
LOG_FILE="${WORKSPACE}/logs/autoexecutor.log"
PID_FILE="${HOME}/.openclaw/.autoexecutor.pid"
TASK_INDEX="${WORKSPACE}/tasks/task-index.jsonl"

# 初始化
init() {
    mkdir -p "${WORKSPACE}/logs"
    touch "${LOG_FILE}"
}

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

# 從 task-index.jsonl 獲取 ready 任務
get_ready_tasks() {
    local count=0
    
    if [[ -f "$TASK_INDEX" ]]; then
        # 計算 taskStatus 為 ready 或 pending 的任務數
        count=$(grep -E '"taskStatus":\s*"(ready|pending)"' "$TASK_INDEX" 2>/dev/null | wc -l || echo "0")
    fi
    
    echo "$count"
}

# 獲取 ready 任務列表（JSONL 格式）
get_ready_task_list() {
    if [[ -f "$TASK_INDEX" ]]; then
        grep -E '"taskStatus":\s*"(ready|pending)"' "$TASK_INDEX" 2>/dev/null | tail -5 || true
    fi
}

# 智能選擇 Agent
select_agent() {
    local task_content="$1"
    
    case "$task_content" in
        *前端*|*UI*|*React*|*Tailwind*|*設計*|*css*|*html*)
            echo "cursor"
            ;;
        *後端*|*API*|*修復*|*漏洞*|*Debug*|*fix*|*bug*|*repair*)
            echo "codex"
            ;;
        *整理*|*摘要*|*報告*|*監控*|*cleanup*|*summary*)
            echo "ollama"
            ;;
        *)
            # 預設用 codex
            echo "codex"
            ;;
    esac
}

# 選擇模型
select_model() {
    local agent="$1"
    
    case "$agent" in
        cursor)
            echo "subscription/cursor-agent"
            ;;
        codex)
            echo "subscription/codex-native"
            ;;
        ollama)
            echo "ollama/qwen3:8b"
            ;;
        *)
            echo "kimi/kimi-k2.5"
            ;;
    esac
}

# 執行單個任務
execute_task() {
    local task_json="$1"
    local task_id=$(echo "$task_json" | jq -r '.taskId // "unknown"' 2>/dev/null || echo "unknown")
    local task_name=$(echo "$task_json" | jq -r '.taskName // "unnamed"' 2>/dev/null || echo "unnamed")
    local task_content=$(echo "$task_json" | jq -r '.outputSummary // .taskName // ""' 2>/dev/null || echo "")
    
    log "準備執行任務: $task_name (ID: $task_id)"
    
    # 選擇 Agent 和模型
    local agent=$(select_agent "$task_content")
    local model=$(select_model "$agent")
    
    log "選定 Agent: $agent, 模型: $model"
    
    # 更新任務狀態為 running (透過記錄到日誌)
    log "任務 $task_id 狀態變更: ready -> running"
    
    # 實際執行：呼叫 openclaw agent
    log "開始 spawn $agent 執行任務..."
    
    # 構建任務提示
    local prompt="【小蔡執行-$task_name】

任務 ID: $task_id
任務名稱: $task_name

請執行此任務。完成後請回報：
1. 執行結果摘要
2. 成功/失敗狀態
3. 相關檔案路徑（如有）

任務內容: $task_content"

    # 使用 openclaw agent 執行（非同步）
    (
        # 執行任務並記錄結果
        if openclaw agent --message "$prompt" --thinking medium --timeout 600 --json > "${WORKSPACE}/logs/task-${task_id}.json" 2>&1; then
            log "任務 $task_id 執行完成"
            # 追加完成記錄到 task-index.jsonl
            echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\",\"taskId\":\"$task_id\",\"taskStatus\":\"done\",\"runStatus\":\"success\",\"endedAt\":\"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\",\"agentType\":\"$agent\",\"modelUsed\":\"$model\",\"outputSummary\":\"Autoexecutor 自動執行完成\"}" >> "$TASK_INDEX"
        else
            log "任務 $task_id 執行失敗"
            echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\",\"taskId\":\"$task_id\",\"taskStatus\":\"failed\",\"runStatus\":\"error\",\"endedAt\":\"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\",\"agentType\":\"$agent\",\"modelUsed\":\"$model\",\"outputSummary\":\"Autoexecutor 執行失敗\"}" >> "$TASK_INDEX"
        fi
    ) &
    
    # 記錄 PID
    local bg_pid=$!
    log "任務已背景執行 (PID: $bg_pid)"
}

# 主循環
main_loop() {
    log "Autoexecutor 主循環啟動 (修復版)"
    log "任務來源: $TASK_INDEX"
    
    while true; do
        if [[ -f "${STATUS_FILE}" ]] && grep -q "enabled" "${STATUS_FILE}"; then
            local ready_count=$(get_ready_tasks)
            
            if [[ "$ready_count" -gt 0 ]]; then
                log "發現 ${ready_count} 個 ready/pending 任務"
                
                # 逐一處理（每次最多 2 個，避免過載）
                local processed=0
                get_ready_task_list | head -2 | while read -r task_json; do
                    if [[ -n "$task_json" ]]; then
                        execute_task "$task_json"
                        ((processed++))
                        sleep 10  # 避免瞬間大量 spawn
                    fi
                done
                
                log "本輪處理完成"
            else
                log "無 ready 任務，繼續監控..."
            fi
            
            # 每 2 分鐘檢查一次（加快響應）
            sleep 120
        else
            log "狀態已禁用，退出循環"
            break
        fi
    done
}

# 單次執行模式（測試用）
single_run() {
    log "單次執行模式"
    
    local ready_count=$(get_ready_tasks)
    log "發現 ${ready_count} 個 ready/pending 任務"
    
    if [[ "$ready_count" -gt 0 ]]; then
        get_ready_task_list | head -1 | while read -r task_json; do
            if [[ -n "$task_json" ]]; then
                execute_task "$task_json"
            fi
        done
    fi
}

# 控制指令
case "${1:-}" in
    start)
        init
        echo "enabled" > "${STATUS_FILE}"
        echo "started_at=$(date -Iseconds)" >> "${STATUS_FILE}"
        echo $$ > "${PID_FILE}"
        log "Autoexecutor 已啟動 (PID: $$)"
        main_loop
        ;;
    stop)
        if [[ -f "${PID_FILE}" ]]; then
            local pid=$(cat "${PID_FILE}")
            kill "$pid" 2>/dev/null || true
            rm -f "${PID_FILE}"
        fi
        echo "disabled" > "${STATUS_FILE}"
        log "Autoexecutor 已停止"
        ;;
    status)
        if [[ -f "${STATUS_FILE}" ]] && grep -q "enabled" "${STATUS_FILE}"; then
            pid=$(cat "${PID_FILE}" 2>/dev/null || echo "unknown")
            ready=$(get_ready_tasks)
            echo "狀態: 🟢 運行中 (PID: $pid)"
            echo "Ready 任務: $ready"
            echo "日誌: tail -f ${LOG_FILE}"
        else
            echo "狀態: 🔴 已停止"
            ready=$(get_ready_tasks)
            echo "Ready 任務: $ready"
        fi
        ;;
    once|run)
        # 單次執行（測試用）
        single_run
        ;;
    *)
        echo "用法: $0 [start|stop|status|once]"
        echo "  start  - 啟動 Autoexecutor 主循環"
        echo "  stop   - 停止 Autoexecutor"
        echo "  status - 查看狀態"
        echo "  once   - 單次執行（測試用）"
        exit 1
        ;;
esac
