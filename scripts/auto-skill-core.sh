#!/bin/zsh
# Auto-Skill Decision Layer - 自動決策核心
# 決策邏輯：分析當前狀態 → 決定下一步 → 觸發相應 Skill

set -euo pipefail

WORKSPACE="${HOME}/.openclaw/workspace"
AUTO_SKILL_LOG="${WORKSPACE}/logs/auto-skill.log"
METRICS_FILE="${WORKSPACE}/.auto-skill-metrics.json"

# 確保目錄存在
mkdir -p "${WORKSPACE}/logs"
mkdir -p "${WORKSPACE}/memory/auto-skill"

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$AUTO_SKILL_LOG"
}

# ============================================
# 1. 狀態檢測模組
# ============================================

detect_context_pressure() {
    # 檢查當前 session 的 context 壓力
    local session_file="${WORKSPACE}/.current-session"
    if [[ -f "$session_file" ]]; then
        local msg_count=$(cat "$session_file" | wc -l)
        if [[ $msg_count -gt 50 ]]; then
            echo "high"
        elif [[ $msg_count -gt 30 ]]; then
            echo "medium"
        else
            echo "low"
        fi
    else
        echo "unknown"
    fi
}

detect_memory_dirty() {
    # 檢查 memory 是否需要同步
    local memory_dir="${WORKSPACE}/memory"
    local last_sync_file="${WORKSPACE}/.last-memory-sync"
    
    if [[ ! -f "$last_sync_file" ]]; then
        echo "dirty"
        return
    fi
    
    local last_sync=$(stat -f %m "$last_sync_file" 2>/dev/null || stat -c %Y "$last_sync_file" 2>/dev/null || echo 0)
    local now=$(date +%s)
    local hours_since=$(( (now - last_sync) / 3600 ))
    
    if [[ $hours_since -gt 6 ]]; then
        echo "dirty"
    else
        echo "clean"
    fi
}

detect_qmd_stale() {
    # 檢查 qmd index 是否過期
    local last_index="${WORKSPACE}/.qmd-last-index"
    
    if [[ ! -f "$last_index" ]]; then
        echo "stale"
        return
    fi
    
    local last_time=$(stat -f %m "$last_index" 2>/dev/null || stat -c %Y "$last_index" 2>/dev/null || echo 0)
    local now=$(date +%s)
    local hours_since=$(( (now - last_time) / 3600 ))
    
    if [[ $hours_since -gt 12 ]]; then
        echo "stale"
    else
        echo "fresh"
    fi
}

# ============================================
# 2. 決策引擎
# ============================================

make_decision() {
    local context_pressure=$(detect_context_pressure)
    local memory_state=$(detect_memory_dirty)
    local qmd_state=$(detect_qmd_stale)
    
    log "狀態檢測: context=$context_pressure, memory=$memory_state, qmd=$qmd_state"
    
    # 決策矩陣
    local actions=()
    
    # P0: Context 壓力高 → 產生交接摘要
    if [[ "$context_pressure" == "high" ]]; then
        actions+=("generate-handoff")
    fi
    
    # P1: Memory dirty → 夜間同步
    if [[ "$memory_state" == "dirty" ]]; then
        actions+=("nightly-sync")
    fi
    
    # P2: QMD stale → 重建索引
    if [[ "$qmd_state" == "stale" ]]; then
        actions+=("rebuild-qmd")
    fi
    
    # P3: 定期 Reflect（每 10 次對話）
    local reflect_count=$(cat "${WORKSPACE}/.reflect-counter" 2>/dev/null || echo 0)
    if [[ $reflect_count -ge 10 ]]; then
        actions+=("trigger-reflect")
        echo 0 > "${WORKSPACE}/.reflect-counter"
    else
        echo $((reflect_count + 1)) > "${WORKSPACE}/.reflect-counter"
    fi
    
    echo "${actions[@]}"
}

# ============================================
# 3. 執行模組
# ============================================

execute_action() {
    local action=$1
    
    case "$action" in
        "generate-handoff")
            log "執行: 產生交接摘要"
            bash "${WORKSPACE}/../openclaw任務面版設計/scripts/handoff-generator.sh" 2>/dev/null || \
                echo "Handoff 腳本未找到"
            ;;
            
        "nightly-sync")
            log "執行: 記憶夜間同步"
            bash "${WORKSPACE}/../openclaw任務面版設計/scripts/nightly-memory-sync.sh" 2>/dev/null || \
                echo "Nightly sync 腳本未找到"
            touch "${WORKSPACE}/.last-memory-sync"
            ;;
            
        "rebuild-qmd")
            log "執行: 重建 QMD 索引"
            if command -v qmd &> /dev/null; then
                qmd collection update docs 2>/dev/null || true
                qmd collection update memory 2>/dev/null || true
                touch "${WORKSPACE}/.qmd-last-index"
            else
                log "警告: qmd 未安裝"
            fi
            ;;
            
        "trigger-reflect")
            log "執行: 觸發自我反思"
            # 標記需要 reflect，由下次對話時處理
            touch "${WORKSPACE}/.pending-reflect"
            ;;
            
        *)
            log "未知動作: $action"
            ;;
    esac
}

# ============================================
# 主程式
# ============================================

main() {
    log "=== Auto-Skill 決策引擎啟動 ==="
    
    local decisions=$(make_decision)
    
    if [[ -z "$decisions" ]]; then
        log "狀態良好，無需執行動作"
        echo -e "${GREEN}✓ 系統狀態良好${NC}"
    else
        log "決策結果: $decisions"
        for action in ${decisions[@]}; do
            execute_action "$action"
        done
        echo -e "${GREEN}✓ 已執行動作: $decisions${NC}"
    fi
    
    log "=== Auto-Skill 完成 ==="
}

# 根據參數執行
case "${1:-run}" in
    "run")
        main
        ;;
    "status")
        echo "Context 壓力: $(detect_context_pressure)"
        echo "Memory 狀態: $(detect_memory_dirty)"
        echo "QMD 狀態: $(detect_qmd_stale)"
        ;;
    "force-sync")
        log "強制執行所有同步"
        execute_action "nightly-sync"
        execute_action "rebuild-qmd"
        ;;
    *)
        echo "用法: $0 [run|status|force-sync]"
        exit 1
        ;;
esac
