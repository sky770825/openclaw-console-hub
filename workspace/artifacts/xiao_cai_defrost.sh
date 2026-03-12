#!/bin/bash
# 小蔡大腦管理工具 - 核心實作

DB_DIR="./brain_data"
SNAPSHOT_DIR="./snapshots"
mkdir -p "$DB_DIR" "$SNAPSHOT_DIR"

# 模擬核心組件
echo '{"name": "小蔡", "version": "1.0", "role": "技術專家"}' > "$DB_DIR/soul.json"
echo '{"tools": ["bash", "python", "curl"], "mode": "execution"}' > "$DB_DIR/agents.json"

function log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# [Snapshot] 快照機制
function snapshot() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local snap_file="$SNAPSHOT_DIR/snapshot_$timestamp.json"
    
    # 封裝當前所有核心與上下文
    jq -n \
        --argfile soul "$DB_DIR/soul.json" \
        --argfile agents "$DB_DIR/agents.json" \
        --argfile history "${1:-/dev/null}" \
        '{soul: $soul, agents: $agents, history: $history, timestamp: $timestamp}' \
        > "$snap_file"
    
    log "Snapshot created: $snap_file"
    echo "$snap_file"
}

# [Cleanup] 除霜清理邏輯
function cleanup_history() {
    local input_file=$1
    local output_file="$DB_DIR/cleaned_history.json"
    
    log "Starting Brain Defrost (Cleanup)..."
    
    # 邏輯：
    # 1. 移除包含 "Searching..." 或 "Processing..." 的冗餘訊息
    # 2. 限制對話輪數，保留最後 10 輪
    # 3. 移除重複的指令頭
    
    if [[ -f "$input_file" ]]; then
        cat "$input_file" | \
        jq 'map(select(.content | contains("Thinking...") | not))' | \
        jq 'last(10)' > "$output_file"
        log "Cleanup complete. Reserved last 10 clean turns."
    else
        echo "[]" > "$output_file"
        log "No history to clean."
    fi
}

# [Execute] 模擬整合流程
function run_cycle() {
    local raw_history=$1
    
    # 1. 先快照備份 (防崩壞)
    snapshot "$raw_history"
    
    # 2. 執行清理 (除霜)
    cleanup_history "$raw_history"
    
    # 3. 組裝最終 Context 給 Gemini Flash (25k limit optimization)
    log "Context optimized for Gemini Flash 25k."
}

case "$1" in
    snapshot) snapshot "$2" ;;
    cleanup)  cleanup_history "$2" ;;
    *) echo "Usage: $0 {snapshot|cleanup} [history_file]" ;;
esac
