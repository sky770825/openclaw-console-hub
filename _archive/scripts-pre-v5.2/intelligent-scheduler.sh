#!/bin/bash

# ==============================================================================
# Intelligent Scheduler (智能調度器) v1.0
# Description: Resource-aware task scheduler for OpenClaw (M5 Mac 24GB)
# Features: CPU/RAM Monitoring, Priority Queue, Ollama Model Management, Gemini Quota Tracking
# ==============================================================================

# --- Configuration ---
LOG_DIR="logs/scheduler"
DATA_DIR="data/scheduler"
GEMINI_USAGE_FILE="$DATA_DIR/gemini_usage.json"
OLLAMA_API="http://localhost:11434/api"
RAM_TOTAL_GB=24
RAM_THRESHOLD_YELLOW=18  # 75%
RAM_THRESHOLD_RED=22     # 91%
GEMINI_DAILY_LIMIT=1500  # Example threshold
CPU_THRESHOLD_YELLOW=70
CPU_THRESHOLD_RED=90

mkdir -p "$LOG_DIR" "$DATA_DIR"

# --- 1. Resource Monitoring Logic ---

get_cpu_usage() {
    # MacOS specific CPU usage
    top -l 1 | grep "CPU usage" | awk '{print $3}' | sed 's/%//' | cut -d. -f1
}

get_ram_usage() {
    # MacOS RAM usage calculation
    local page_size=$(/usr/sbin/sysctl -n hw.pagesize 2>/dev/null || echo 4096)
    local vm_stats=$(vm_stat)
    
    local pages_active=$(echo "$vm_stats" | awk '/Pages active/ {print $3}' | sed 's/\.//')
    local pages_wired=$(echo "$vm_stats" | awk '/Pages wired down/ {print $4}' | sed 's/\.//')
    local pages_compressed=$(echo "$vm_stats" | awk '/Pages occupied by compressor/ {print $5}' | sed 's/\.//')
    
    # Wired is often in field 4, Compressed in 5 depending on OS version
    # Re-checking with more robust awk
    pages_active=$(echo "$vm_stats" | grep "Pages active" | awk '{print $3}' | tr -d '.')
    pages_wired=$(echo "$vm_stats" | grep "Pages wired down" | awk '{print $4}' | tr -d '.')
    pages_compressed=$(echo "$vm_stats" | grep "Pages occupied by compressor" | awk '{print $5}' | tr -d '.')
    
    # Fallback if fields shift
    [ -z "$pages_wired" ] && pages_wired=$(echo "$vm_stats" | grep "Pages wired down" | awk '{print $3}' | tr -d '.')
    [ -z "$pages_compressed" ] && pages_compressed=$(echo "$vm_stats" | grep "Pages occupied by compressor" | awk '/[0-9]/ {print $NF}' | tr -d '.')

    local used_bytes=$(awk -v p1="${pages_active:-0}" -v p2="${pages_wired:-0}" -v p3="${pages_compressed:-0}" -v ps="$page_size" 'BEGIN {print (p1 + p2 + p3) * ps}')
    local used_gb=$(awk -v b="$used_bytes" 'BEGIN {printf "%.0f", b / 1024 / 1024 / 1024}')
    
    echo "$used_gb"
}

check_resources() {
    local cpu=$(get_cpu_usage)
    local ram=$(get_ram_usage)
    
    echo "CPU: ${cpu}%, RAM: ${ram}GB / ${RAM_TOTAL_GB}GB"
    
    if [ "$ram" -ge "$RAM_THRESHOLD_RED" ] || [ "$cpu" -ge "$CPU_THRESHOLD_RED" ]; then
        echo "🔴 [CRITICAL] Resource pressure high! CPU: $cpu%, RAM: $ram GB"
        return 2
    elif [ "$ram" -ge "$RAM_THRESHOLD_YELLOW" ] || [ "$cpu" -ge "$CPU_THRESHOLD_YELLOW" ]; then
        echo "🟡 [WARNING] Resource reaching threshold. CPU: $cpu%, RAM: $ram GB"
        return 1
    fi
    return 0
}

# --- 2. Ollama Model Management ---

get_loaded_models() {
    curl -s "$OLLAMA_API/ps" | jq -r '.models[].name'
}

unload_model() {
    local model_name=$1
    echo "Unloading model: $model_name"
    # Ollama unloads if keep_alive is 0
    curl -s -X POST "$OLLAMA_API/generate" -d "{\"model\": \"$model_name\", \"keep_alive\": 0}" > /dev/null
}

smart_load_model() {
    local target_model=$1
    local ram_used=$(get_ram_usage)
    
    # Simple heuristic: if target model is not loaded and RAM is tight, unload others
    local loaded=$(get_loaded_models)
    
    if echo "$loaded" | grep -q "$target_model"; then
        echo "Model $target_model already loaded."
        return 0
    fi
    
    if [ "$ram_used" -ge "$RAM_THRESHOLD_YELLOW" ]; then
        echo "🟡 [Ollama] RAM tight ($ram_used GB), unloading other models before loading $target_model..."
        for m in $loaded; do
            unload_model "$m"
        done
    fi
    
    echo "Loading model: $target_model"
    # Pre-warm
    curl -s -X POST "$OLLAMA_API/generate" -d "{\"model\": \"$target_model\"}" > /dev/null &
}

# --- 3. Gemini Quota Tracking ---

track_gemini_call() {
    local model=$1
    local date=$(date +%Y-%m-%d)
    
    if [ ! -f "$GEMINI_USAGE_FILE" ]; then
        echo "{}" > "$GEMINI_USAGE_FILE"
    fi
    
    # Update count
    local current_count=$(jq -r ".[\"$date\"] // 0" "$GEMINI_USAGE_FILE")
    local new_count=$((current_count + 1))
    
    local updated_json=$(jq ".[\"$date\"] = $new_count" "$GEMINI_USAGE_FILE")
    echo "$updated_json" > "$GEMINI_USAGE_FILE"
    
    echo "Gemini Call Tracked: $model (Daily Total: $new_count)"
    
    if [ "$new_count" -ge "$GEMINI_DAILY_LIMIT" ]; then
        echo "🟡 [Gemini] WARNING: Daily call threshold reached ($new_count / $GEMINI_DAILY_LIMIT)"
    fi
}

# --- 4. Task Queue & Dispatcher (Logic Blueprint) ---

# WorkTree Integration
process_worktree() {
    local tree_id=$1
    echo "Processing WorkTree: $tree_id"
    
    local ready_nodes=$(./scripts/worktree-manager.sh ready "$tree_id")
    
    if [ -z "$ready_nodes" ]; then
        echo "No ready nodes for Tree $tree_id."
        return
    fi

    for node_id in $ready_nodes; do
        # Get engine hint from tree json
        local engine=$(jq -r ".nodes[\"$node_id\"].engine_hint" "worktrees/tasks/$tree_id.json")
        ./scripts/async-dispatcher.sh dispatch "$tree_id" "$node_id" "$engine"
    done
}

dispatch_task() {
    local task_name=$1
    local priority=$2 # 1 (High) to 5 (Low)
    local preferred_engine=$3 # ollama:model_name or gemini:model_name
    
    echo "--- Dispatching Task: $task_name (Priority: $priority) ---"
    
    # Resource Check
    check_resources
    local status=$?
    
    if [ $status -eq 2 ] && [ "$priority" -gt 2 ]; then
        echo "🔴 Task Deferred: Resource critical and priority ($priority) not high enough."
        return 1
    fi
    
    # Engine Selection & Prep
    if [[ $preferred_engine == ollama:* ]]; then
        local model=${preferred_engine#ollama:}
        smart_load_model "$model"
    elif [[ $preferred_engine == gemini:* ]]; then
        track_gemini_call "$preferred_engine"
    fi
    
    echo "🟢 Task $task_name ready for execution on $preferred_engine"
    return 0
}

# --- Command Line Interface ---

case "$1" in
    monitor)
        check_resources
        ;;
    track-gemini)
        track_gemini_call "$2"
        ;;
    load-ollama)
        smart_load_model "$2"
        ;;
    dispatch)
        dispatch_task "$2" "$3" "$4"
        ;;
    worktree)
        process_worktree "$2"
        ;;
    *)
        echo "Usage: $0 {monitor|track-gemini <model>|load-ollama <model>|dispatch <name> <priority> <engine>|worktree <tree_id>}"
        exit 1
        ;;
esac
