#!/bin/bash
# collect-metrics.sh - 數據收集腳本
# 收集 CPU, RAM, Ollama 狀態, Gemini 用量與 OpenClaw Session 統計

DATA_DIR="data/metrics"
mkdir -p "$DATA_DIR"
TIMESTAMP=$(date +%Y-%m-%dT%H:%M:%S)
DATE=$(date +%Y-%m-%d)

# 1. 系統性能 (CPU/RAM)
get_cpu() {
    top -l 1 | grep "CPU usage" | awk '{print $3}' | sed 's/%//'
}
get_ram() {
    local vm_stats=$(vm_stat)
    local page_size=$(/usr/sbin/sysctl -n hw.pagesize 2>/dev/null || echo 4096)
    local active=$(echo "$vm_stats" | grep "Pages active" | awk '{print $3}' | tr -d '.')
    local wired=$(echo "$vm_stats" | grep "Pages wired down" | awk '{print $4}' | tr -d '.')
    local compressed=$(echo "$vm_stats" | grep "Pages occupied by compressor" | awk '{print $5}' | tr -d '.')
    echo "($active + $wired + $compressed) * $page_size / 1024 / 1024 / 1024" | bc -l | xargs printf "%.2f"
}

CPU_USAGE=$(get_cpu)
RAM_USAGE=$(get_ram)

# 2. Ollama 狀態
OLLAMA_MODELS=$(curl -s http://localhost:11434/api/ps | jq -r '.models | length' 2>/dev/null || echo 0)

# 3. Gemini 用量 (從 scheduler 資料讀取)
GEMINI_USAGE=$(jq -r ".[\"$DATE\"] // 0" data/scheduler/gemini_usage.json 2>/dev/null || echo 0)

# 4. OpenClaw Session 統計
SESSION_DATA=$(openclaw sessions status --json 2>/dev/null || echo "{}")
SESSION_COUNT=$(echo "$SESSION_DATA" | jq '.sessions | length' 2>/dev/null || echo 0)
SUBAGENT_COUNT=$(echo "$SESSION_DATA" | jq '[.sessions[] | select(.key | contains("subagent"))] | length' 2>/dev/null || echo 0)

# 寫入時序數據 (CSV)
LOG_FILE="$DATA_DIR/metrics_$DATE.csv"
if [ ! -f "$LOG_FILE" ]; then
    echo "timestamp,cpu_pct,ram_gb,ollama_loaded,gemini_calls,sessions,subagents" > "$LOG_FILE"
fi
echo "$TIMESTAMP,$CPU_USAGE,$RAM_USAGE,$OLLAMA_MODELS,$GEMINI_USAGE,$SESSION_COUNT,$SUBAGENT_COUNT" >> "$LOG_FILE"

echo "Metrics collected at $TIMESTAMP"
