#!/bin/bash
# =============================================================================
# 記憶反思啟動腳本 (Memory Reflection Bootstrapper) v1.0
# 用途：調度每日/每週記憶反思任務，整合智能召回與資源監控
# 執行者：L2 Claude Code
# =============================================================================

set -euo pipefail

# --- 配置 ---
WORKSPACE="/Users/caijunchang/.openclaw/workspace"
SCRIPTS_DIR="${WORKSPACE}/scripts"
MEMORY_DIR="${WORKSPACE}/memory"
OLLAMA_URL="http://localhost:11434"
# 資源閾值 (CPU 負載 & 記憶體使用率)
CPU_THRESHOLD=85
MEM_THRESHOLD=80

# --- 顏色與符號 ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'
CHECK_MARK="✅"
WARNING_SIGN="⚠️"
YELLOW_LIGHT="🟡"

log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# --- 1. 資源監控 ---
check_resources() {
    log "正在檢查系統資源..."
    
    # 使用 ps 和 awk 獲取 CPU 負載 (macOS 備選方案)
    local cpu_usage=$(ps -A -o %cpu | awk '{s+=$1} END {print s}')
    # 獲取核心數
    local cpu_cores=$(/usr/sbin/sysctl -n hw.ncpu 2>/dev/null || getconf _NPROCESSORS_ONLN)
    # 標準化為百分比 (所有核心總和)
    local cpu_percent=$(echo "scale=2; $cpu_usage / $cpu_cores" | bc)
    
    # 獲取記憶體使用率 (macOS)
    local mem_used_gb=$(/usr/bin/vm_stat | perl -ne '/page size of (\d+) bytes/ && ($s=$1); /Pages active:\s+(\d+)/ && ($a=$1); /Pages wired down:\s+(\d+)/ && ($w=$1); /Pages occupied by compressor:\s+(\d+)/ && ($c=$1); END { printf "%.2f", ($a+$w+$c)*$s/1024/1024/1024 }')
    local mem_total_gb=$(/usr/sbin/sysctl -n hw.memsize 2>/dev/null || echo "16" | awk '{print $1/1024/1024/1024}') # 默認 16GB 如果 sysctl 失敗
    if [ -z "$mem_total_gb" ]; then mem_total_gb=16; fi
    
    local mem_usage=$(echo "scale=2; ($mem_used_gb / $mem_total_gb) * 100" | bc)

    log "CPU 使用率: ${cpu_percent}% (閾值: ${CPU_THRESHOLD}%)"
    log "記憶體使用率: ${mem_usage}% (閾值: ${MEM_THRESHOLD}%)"

    if (( $(echo "$cpu_percent > $CPU_THRESHOLD" | bc -l) )) || (( $(echo "$mem_usage > $MEM_THRESHOLD" | bc -l) )); then
        log "${YELLOW_LIGHT} ${WARNING_SIGN} 資源緊張！CPU: ${cpu_usage}%, MEM: ${mem_usage}%${NC}"
        # 發送 Telegram 通知 (透過現有的監控腳本或 curl)
        send_telegram_alert "資源警告 (記憶反思): CPU ${cpu_usage}%, MEM ${mem_usage}%。任務將以低優先權運行。"
        return 1
    fi
    return 0
}

send_telegram_alert() {
    local msg="$1"
    if [[ -f "${HOME}/.openclaw/config/telegram.env" ]]; then
        source "${HOME}/.openclaw/config/telegram.env"
        curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
            -d "chat_id=${TELEGRAM_CHAT_ID}" \
            -d "text=${YELLOW_LIGHT} ${msg}" > /dev/null
    fi
}

# --- 2. 智能召回獲取歷史數據 ---
fetch_context() {
    local type="$1" # daily or weekly
    local query=""
    
    if [ "$type" == "daily" ]; then
        query="過去 24 小時的重要任務、決策與學到的教訓"
    else
        query="過去 7 天的關鍵進展、系統架構改動、成本優化與核心決策"
    fi
    
    log "正在透過智能召回獲取 $type 上下文: \"$query\""
    # 調用 smart-recall.py 並將結果保存到臨時文件
    python3 "${SCRIPTS_DIR}/smart-recall.py" "$query" --limit 10 > "/tmp/reflection_context_${type}.txt"
}

# --- 3. 執行反思流程 ---
run_reflection() {
    local type="$1"
    local model="qwen2.5:14b" # 反思需要高品質模型
    
    # 如果資源緊張，降級使用 8b 模型
    if ! check_resources; then
        model="qwen3:8b"
        log "資源受限，降級使用模型: $model"
    fi

    log "啟動 $type 反思任務，使用模型: $model"
    
    # 準備提示詞
    local context=$(cat "/tmp/reflection_context_${type}.txt")
    local prompt="你是一位高級系統架構師與個人助理 L2 Claude Code。請根據以下歷史數據進行 $type 反思：\n\n$context\n\n要求：\n1. 總結關鍵成就與進展。\n2. 識別潛在的風險與瓶頸。\n3. 提供 3 個具體的優化建議。\n4. 更新 MEMORY.md 的 Active Context。"

    # 調用 Ollama
    local start_time=$(date +%s)
    
    # 調用 Ollama API
    local response=$(curl -s -m 120 "${OLLAMA_URL}/api/generate" \
        -d "{\"model\":\"$model\",\"prompt\":\"$prompt\",\"stream\":false}" | jq -r '.response // empty')

    if [ -z "$response" ] || [ "$response" == "null" ]; then
        log "${RED}${WARNING_SIGN} Ollama 回應為空或出錯！請檢查模型 $model 是否正確載入。${NC}"
        response="[錯誤] 無法生成反思內容。請檢查 Ollama 服務狀態或模型可用性。"
    fi

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # 保存結果
    local result_file="${MEMORY_DIR}/reflections/${type}-$(date +%Y-%m-%d).md"
    mkdir -p "${MEMORY_DIR}/reflections"
    echo -e "# $type 反思報告 - $(date +%Y-%m-%d)\n\n## 耗時: ${duration}s\n## 模型: ${model}\n\n$response" > "$result_file"
    
    log "${CHECK_MARK} $type 反思完成！結果已保存至: $result_file"
}

# --- 4. 主流程 ---
MAIN_TYPE="${1:-daily}"

log "--- 記憶反思任務啟動 ($MAIN_TYPE) ---"
fetch_context "$MAIN_TYPE"
run_reflection "$MAIN_TYPE"
log "--- 任務結束 ---"
