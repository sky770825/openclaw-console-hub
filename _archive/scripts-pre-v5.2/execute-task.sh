#!/bin/bash
# 任務執行器 - 自動模式的實際執行腳本
# 由 idle-watchdog 或主 Agent 呼叫

set -e

OPENCLAW_HOME="${OPENCLAW_HOME:-$HOME/.openclaw}"
WORKSPACE="${OPENCLAW_WORKSPACE:-$OPENCLAW_HOME/workspace}"
LOG_FILE="$OPENCLAW_HOME/logs/task-executor.log"

mkdir -p "$OPENCLAW_HOME/logs"

log() {
    echo "[$(date '+%H:%M:%S')] $1" >> "$LOG_FILE"
}

# 執行任務
execute() {
    local task="$1"
    
    # === NEUXA Risk Shield Integration ===
    if ! bash scripts/risk-shield.sh "$task"; then
        local shield_status=$?
        if [ $shield_status -eq 1 ]; then
            log "🚨 CRITICAL RISK BLOCKED: $task"
            return 1
        elif [ $shield_status -eq 2 ]; then
            log "🟡 HIGH RISK PENDING: $task"
            return 2
        fi
    fi
    # ======================================
    
    log "開始執行: $task"
    
    case "$task" in
        "create-run-with-timeout")
            create_run_with_timeout
            ;;
        "setup-contextguard")
            setup_contextguard
            ;;
        "verify-all-cron-jobs")
            verify_all_cron_jobs
            ;;
        *)
            log "未知任務: $task"
            return 1
            ;;
    esac
    
    log "完成: $task"
}

# 建立 run-with-timeout.sh
create_run_with_timeout() {
    log "建立 run-with-timeout.sh"
    
    cat > "$WORKSPACE/scripts/run-with-timeout.sh" <<'EOF'
#!/bin/bash
# run-with-timeout.sh - 通用超時包裝器
# 用法: ./run-with-timeout.sh <秒數> <命令> [參數...]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMEOUT_SEC="${1:-60}"
shift

if [[ $# -eq 0 ]]; then
    echo "用法: $0 <秒數> <命令> [參數...]"
    echo "範例: $0 60 ./autopilot-lean.sh"
    exit 1
fi

LOG_FILE="${OPENCLAW_HOME:-$HOME/.openclaw}/logs/timeout-$(date +%Y%m%d).log"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date '+%H:%M:%S')] $1" >> "$LOG_FILE"
}

log "執行: $* (timeout: ${TIMEOUT_SEC}s)"

# macOS 使用 gtimeout，Linux 使用 timeout
if command -v gtimeout &>/dev/null; then
    TIMEOUT_CMD="gtimeout"
elif command -v timeout &>/dev/null; then
    TIMEOUT_CMD="timeout"
else
    log "錯誤: 找不到 timeout 命令 (macOS 請安裝 coreutils: brew install coreutils)"
    exit 1
fi

# 執行並監控
START_TIME=$(date +%s)

if "$TIMEOUT_CMD" "$TIMEOUT_SEC" "$@"; then
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    log "✅ 成功完成 (用時: ${DURATION}s)"
    exit 0
else
    EXIT_CODE=$?
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    if [[ $EXIT_CODE -eq 124 ]] || [[ $EXIT_CODE -eq 137 ]]; then
        log "⏱️ 超時終止 (${TIMEOUT_SEC}s)"
        echo "警告: 命令執行超過 ${TIMEOUT_SEC} 秒，已強制終止" >&2
    else
        log "❌ 失敗 (exit code: $EXIT_CODE, 用時: ${DURATION}s)"
    fi
    
    exit $EXIT_CODE
fi
EOF

    chmod +x "$WORKSPACE/scripts/run-with-timeout.sh"
    log "run-with-timeout.sh 建立完成"
}

# 設定 ContextGuard 結構
setup_contextguard() {
    log "設定 ContextGuard 結構"
    
    local ctx_dir="$WORKSPACE/skills/contextguard"
    mkdir -p "$ctx_dir"
    
    cat > "$ctx_dir/SKILL.md" <<'EOF'
# ContextGuard Skill

## 功能
Context 監控與自動化管理

## 狀態
🚧 開發中 - Phase 3

## 結構
```
skills/contextguard/
├── SKILL.md
├── checkpoint.sh
├── monitor.sh
└── config.json
```
EOF

    log "ContextGuard 結構建立完成"
}

# 驗證所有 Cron Job
verify_all_cron_jobs() {
    log "驗證所有 Cron Job 狀態"
    
    local report_file="$OPENCLAW_HOME/logs/cron-verification-$(date +%Y%m%d-%H%M%S).log"
    local error_count=0
    local success_count=0
    
    # 取得所有 cron job
    local jobs=$(openclaw cron list 2>/dev/null | jq -r '.jobs[] | select(.enabled == true) | "\(.id)|\(.name)|\(.state.lastStatus // "unknown")"' 2>/dev/null)
    
    echo "=== Cron Job 驗證報告 $(date) ===" > "$report_file"
    echo "" >> "$report_file"
    
    while IFS='|' read -r id name status; do
        [[ -z "$id" ]] && continue
        
        if [[ "$status" == "error" ]]; then
            echo "❌ $name - 錯誤" >> "$report_file"
            ((error_count++))
        elif [[ "$status" == "ok" ]] || [[ "$status" == "success" ]]; then
            echo "✅ $name - 正常" >> "$report_file"
            ((success_count++))
        else
            echo "⏳ $name - $status" >> "$report_file"
        fi
    done <<< "$jobs"
    
    echo "" >> "$report_file"
    echo "總計: $success_count 正常, $error_count 錯誤" >> "$report_file"
    
    log "驗證完成: $success_count 正常, $error_count 錯誤"
    log "報告: $report_file"
    
    # 如果有錯誤，發送通知
    if [[ $error_count -gt 0 ]]; then
        log "⚠️ 發現 $error_count 個錯誤的 Cron Job"
    fi
}

# 主入口
task="${1:-}"
if [[ -z "$task" ]]; then
    echo "用法: $0 <任務名稱>"
    echo "可用任務: create-run-with-timeout, setup-contextguard"
    exit 1
fi

execute "$task"
