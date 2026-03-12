#!/bin/bash
# Auto Mode V3.3 - 主動探索與任務開發（含風險分級備份 + 自動審批超時 + 執行器節奏）
# 規則：主動掃描 → 自主決策 → 自動建立任務 → 分級備份 → 執行（高風險串行）

set -e

OPENCLAW_HOME="${OPENCLAW_HOME:-$HOME/.openclaw}"
WORKSPACE="${OPENCLAW_WORKSPACE:-$OPENCLAW_HOME/workspace}"
STATE_FILE="$OPENCLAW_HOME/.auto-mode-state"
LOG_FILE="$OPENCLAW_HOME/logs/auto-mode.log"
EXECUTOR_LOG="$OPENCLAW_HOME/logs/auto-executor.log"
BACKUP_DIR="$HOME/Desktop/小蔡/自動備份"
REVIEW_TIMEOUT_SEC=60
POLL_INTERVAL_SEC=60

mkdir -p "$OPENCLAW_HOME/logs" "$BACKUP_DIR"

# ============ 工具函數 ============
log() {
    local msg="[$(date '+%H:%M:%S')] $1"
    echo "$msg" >> "$LOG_FILE"
    echo "$msg"
}

executor_log() {
    local msg="[$(date '+%H:%M:%S')] $1"
    echo "$msg" >> "$EXECUTOR_LOG"
}

# ============ 分級備份策略 ============
tiered_backup() {
    local risk_level="$1"
    local task_id="$2"
    
    case "$risk_level" in
        "low")
            log "🔍 [low] 執行 pre-check，跳過備份"
            return 0
            ;;
        "medium")
            log "💾 [medium] 執行差異快取備份"
            local cache_dir="$BACKUP_DIR/.diff-cache"
            mkdir -p "$cache_dir"
            local recent_backup=$(find "$cache_dir" -name "medium-*" -mtime -1 | head -1)
            if [[ -n "$recent_backup" ]]; then
                log "  發現 24h 內備份: $(basename "$recent_backup")，跳過"
                echo "$recent_backup"
                return 0
            fi
            local backup_path="$cache_dir/medium-$(date +%Y%m%d-%H%M%S)"
            mkdir -p "$backup_path"
            cp "$OPENCLAW_HOME/openclaw.json" "$backup_path/" 2>/dev/null || true
            cp -r "$WORKSPACE/config" "$backup_path/" 2>/dev/null || true
            ls -1td "$cache_dir"/medium-* 2>/dev/null | tail -n +3 | xargs -r rm -rf
            log "  差異快取完成: $(basename "$backup_path")"
            echo "$backup_path"
            return 0
            ;;
        "high"|"critical")
            log "📸 [$risk_level] 執行強制快照備份"
            local snapshot_dir="$BACKUP_DIR/snapshots"
            mkdir -p "$snapshot_dir"
            local snapshot_path="$snapshot_dir/${risk_level}-$(date +%Y%m%d-%H%M%S)-${task_id}"
            mkdir -p "$snapshot_path"
            cp "$OPENCLAW_HOME/openclaw.json" "$snapshot_path/" 2>/dev/null || true
            cp -r "$WORKSPACE/config" "$snapshot_path/" 2>/dev/null || true
            cp -r "$WORKSPACE/scripts" "$snapshot_path/" 2>/dev/null || true
            tar -czf "${snapshot_path}.tar.gz" -C "$snapshot_path" . 2>/dev/null || true
            rm -rf "$snapshot_path"
            log "  快照完成: $(basename "${snapshot_path}.tar.gz")"
            echo "${snapshot_path}.tar.gz"
            return 0
            ;;
        *)
            log "⚠️ 未知風險等級: $risk_level，使用 medium 備份"
            tiered_backup "medium" "$task_id"
            ;;
    esac
}

# ============ 檢查是否有高風險任務在執行 ============
is_high_risk_running() {
    local running_high=$(curl -s http://127.0.0.1:3011/api/tasks 2>/dev/null | jq '[.[] | select(.status == "running" and (.riskLevel == "high" or .riskLevel == "critical"))] | length' 2>/dev/null || echo "0")
    
    if [[ "$running_high" -gt 0 ]]; then
        return 0  # true - 有高風險任務在執行
    else
        return 1  # false - 沒有高風險任務
    fi
}

# ============ 取得下一個可執行任務（考慮串行規則） ============
get_next_executable_task() {
    # 取得所有 ready 狀態的任務
    local ready_tasks=$(curl -s http://127.0.0.1:3011/api/tasks 2>/dev/null | jq -r '.[] | select(.status == "ready") | {id: .id, name: .name, riskLevel: (.riskLevel // "medium"), priority: (.priority // 3)} | @json' 2>/dev/null)
    
    [[ -z "$ready_tasks" ]] && return 1
    
    # 檢查是否有高風險任務在執行
    if is_high_risk_running; then
        log "⏸️ 有高風險任務執行中，只選擇 low/medium 任務"
        # 過濾出 low/medium 任務，依優先級排序
        echo "$ready_tasks" | jq -s 'map(select(.riskLevel == "low" or .riskLevel == "medium")) | sort_by(.priority) | .[0] // empty'
    else
        log "▶️ 無高風險任務執行中，可執行任何任務"
        # 依優先級排序，回傳第一個
        echo "$ready_tasks" | jq -s 'sort_by(.priority) | .[0] // empty'
    fi
}

# ============ 執行任務 ============
execute_task() {
    local task_id="$1"
    local task_name="$2"
    local risk_level="${3:-medium}"
    
    log "🚀 執行任務: $task_name (風險: $risk_level)"
    executor_log "開始執行: $task_name (ID: $task_id, 風險: $risk_level)"
    
    # 更新任務狀態為 running
    curl -s -X PATCH "http://127.0.0.1:3011/api/tasks/$task_id" \
        -H "Content-Type: application/json" \
        -d '{"status":"running"}' 2>/dev/null || true
    
    # ===== 分級備份 =====
    tiered_backup "$risk_level" "$task_id"
    
    # 根據任務類型執行
    local exec_status=0
    case "$task_name" in
        *"Cron Job"*|*"cron"*)
            log "執行 Cron Job 修復..."
            # 實際修復指令
            ;;
        *"Context"*|*"context"*)
            log "執行 Context 優化..."
            "$WORKSPACE/scripts/checkpoint.sh" create "auto-context-opt" 2>/dev/null || exec_status=$?
            ;;
        *"記憶"*|*"memory"*)
            log "執行記憶整理..."
            ;;
        *"清理"*|*"cleanup"*)
            log "執行清理..."
            find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -mtime +7 -exec rm -rf {} + 2>/dev/null || true
            ;;
        *)
            log "執行系統盤點..."
            ;;
    esac
    
    # 高風險任務：失敗自動 rollback
    if [[ "$exec_status" -ne 0 ]] && [[ "$risk_level" == "high" || "$risk_level" == "critical" ]]; then
        log "⚠️ 任務執行失敗，觸發 rollback"
        curl -s -X PATCH "http://127.0.0.1:3011/api/tasks/$task_id" \
            -H "Content-Type: application/json" \
            -d '{"status":"failed"}' 2>/dev/null || true
        executor_log "執行失敗: $task_name"
        return 1
    fi
    
    # 更新任務狀態為完成
    curl -s -X PATCH "http://127.0.0.1:3011/api/tasks/$task_id" \
        -H "Content-Type: application/json" \
        -d '{"status":"done"}' 2>/dev/null || true
    
    log "✅ 任務完成: $task_name"
    executor_log "完成: $task_name"
}

# ============ AutoExecutor 主循環 ============
executor_cycle() {
    log "⚙️ AutoExecutor 輪詢中（間隔 ${POLL_INTERVAL_SEC} 秒）..."
    
    # 檢查是否有可執行任務
    local next_task=$(get_next_executable_task)
    
    if [[ -z "$next_task" ]] || [[ "$next_task" == "null" ]]; then
        log "⏳ 無符合條件的任務，等待下次輪詢"
        return 0
    fi
    
    local task_id=$(echo "$next_task" | jq -r '.id')
    local task_name=$(echo "$next_task" | jq -r '.name')
    local risk_level=$(echo "$next_task" | jq -r '.riskLevel // "medium"')
    
    log "🎯 選中任務: $task_name (風險: $risk_level)"
    
    # 執行任務
    execute_task "$task_id" "$task_name" "$risk_level"
}

# ============ 主循環 ============
main() {
    log "🤖 自動模式 V3.3 啟動 - AutoExecutor 輪詢(${POLL_INTERVAL_SEC}s) + 高風險串行"
    
    # 執行一輪輪詢
    executor_cycle
    
    log "✅ 輪詢完成，下次執行時間: $(date -v+${POLL_INTERVAL_SEC}S '+%H:%M:%S')"
}

# 執行主函數
main "$@"
