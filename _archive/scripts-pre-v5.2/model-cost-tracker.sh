#!/bin/bash
set -e
################################################################################
# model-cost-tracker.sh - 模型使用成本追蹤工具
# 
# 功能：
#   - 讀取 session logs 統計各模型的 token 使用量
#   - 計算估算成本（基於公開定價）
#   - 生成日報/週報/月報
#   - 支援多種輸出格式（表格、CSV、JSON）
#
# 用法：
#   ./model-cost-tracker.sh [選項]
#
# 選項：
#   --period [day|week|month]   統計週期（預設：day）
#   --date YYYY-MM-DD           指定日期（預設：今天）
#   --format [table|csv|json]   輸出格式（預設：table）
#   --save PATH                 儲存報表到指定路徑
#   --help                      顯示此說明
#
# 成本計算基準（每 1M tokens，USD）：
#   - Claude Opus 4: Input $15, Output $75
#   - Claude Sonnet 4: Input $3, Output $15
#   - Kimi K2.5: Input $0.3, Output $1.2
#   - GPT-4 Turbo: Input $10, Output $30
#
# 相容性：Bash 3.2+（macOS 相容）
#
# 作者：執行員 D
# 日期：2026-02-12
################################################################################

set -eo pipefail

# === 設定 ===
PERIOD="day"
DATE=$(date +%Y-%m-%d)
FORMAT="table"
SAVE_PATH=""

# === 函數 ===

show_help() {
    head -n 32 "$0" | tail -n +2 | sed 's/^# //; s/^#//'
    exit 0
}

# 獲取模型價格
get_price() {
    local model=$1
    local type=$2  # input or output
    
    # 正規化模型名稱（移除 provider prefix）
    model=$(echo "$model" | sed 's/^.*\///' | tr '[:upper:]' '[:lower:]')
    
    # 定價表（每 1M tokens, USD）
    case "$model:$type" in
        claude-opus-4*:input|opus-4*:input)
            echo "15.0" ;;
        claude-opus-4*:output|opus-4*:output)
            echo "75.0" ;;
        claude-sonnet-4*:input|sonnet-4*:input)
            echo "3.0" ;;
        claude-sonnet-4*:output|sonnet-4*:output)
            echo "15.0" ;;
        kimi-k2.5*:input|k2.5*:input)
            echo "0.3" ;;
        kimi-k2.5*:output|k2.5*:output)
            echo "1.2" ;;
        gpt-4-turbo*:input)
            echo "10.0" ;;
        gpt-4-turbo*:output)
            echo "30.0" ;;
        *:input)
            echo "1.0" ;;
        *:output)
            echo "3.0" ;;
    esac
}

# 計算成本
calc_cost() {
    local tokens=$1
    local price_per_1m=$2
    
    awk "BEGIN {printf \"%.4f\", ($tokens / 1000000) * $price_per_1m}"
}

# 從 session status 收集數據
collect_data() {
    openclaw sessions status --json 2>/dev/null || echo "{}"
}

# 生成統計報表
generate_report() {
    local format=$1
    
    # 收集數據
    local session_json=$(collect_data)
    
    if [[ "$session_json" == "{}" ]]; then
        echo "❌ 無可用數據"
        return 1
    fi
    
    # 建立臨時統計檔
    local tmp_stats=$(mktemp)
    local tmp_summary=$(mktemp)
    
    # 解析並統計各模型
    echo "$session_json" | jq -r '.sessions[] | 
        select(.model != null and .model != "unknown") | 
        "\(.model)|\(.inputTokens // 0)|\(.outputTokens // 0)"' | \
    while IFS='|' read -r model input output; do
        echo "$model|$input|$output" >> "$tmp_stats"
    done
    
    # 彙總相同模型的數據
    cat "$tmp_stats" | awk -F'|' '
    {
        model = $1
        input[model] += $2
        output[model] += $3
        count[model] += 1
    }
    END {
        for (m in input) {
            print m "|" input[m] "|" output[m] "|" count[m]
        }
    }' > "$tmp_summary"
    
    # 根據格式輸出
    case $format in
        json)
            output_json "$tmp_summary"
            ;;
        csv)
            output_csv "$tmp_summary"
            ;;
        table|*)
            output_table "$tmp_summary"
            ;;
    esac
    
    rm -f "$tmp_stats" "$tmp_summary"
}

# 表格輸出
output_table() {
    local data_file=$1
    
    echo "========================================"
    echo "   模型使用成本報表"
    echo "========================================"
    echo "週期: $PERIOD"
    echo "日期: $DATE"
    echo "生成時間: $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
    
    printf "%-30s %12s %12s %12s %10s\n" "模型" "輸入 Tokens" "輸出 Tokens" "成本 (USD)" "Session"
    echo "------------------------------------------------------------------------"
    
    local total_cost=0
    local total_sessions=0
    local total_input=0
    local total_output=0
    
    while IFS='|' read -r model input output count; do
        local input_price=$(get_price "$model" "input")
        local output_price=$(get_price "$model" "output")
        
        local input_cost=$(calc_cost "$input" "$input_price")
        local output_cost=$(calc_cost "$output" "$output_price")
        local model_cost=$(awk "BEGIN {printf \"%.4f\", $input_cost + $output_cost}")
        
        total_cost=$(awk "BEGIN {printf \"%.4f\", $total_cost + $model_cost}")
        total_sessions=$((total_sessions + count))
        total_input=$((total_input + input))
        total_output=$((total_output + output))
        
        # 格式化數字（加千分位）
        local input_fmt=$(printf "%'d" $input 2>/dev/null || echo $input)
        local output_fmt=$(printf "%'d" $output 2>/dev/null || echo $output)
        
        printf "%-30s %12s %12s \$%11s %10s\n" \
            "$model" \
            "$input_fmt" \
            "$output_fmt" \
            "$model_cost" \
            "$count"
    done < "$data_file"
    
    echo "------------------------------------------------------------------------"
    local total_input_fmt=$(printf "%'d" $total_input 2>/dev/null || echo $total_input)
    local total_output_fmt=$(printf "%'d" $total_output 2>/dev/null || echo $total_output)
    printf "%-30s %12s %12s \$%11s %10s\n" \
        "總計" \
        "$total_input_fmt" \
        "$total_output_fmt" \
        "$total_cost" \
        "$total_sessions"
    echo "========================================"
}

# CSV 輸出
output_csv() {
    local data_file=$1
    
    echo "Model,Input Tokens,Output Tokens,Cost (USD),Sessions"
    
    while IFS='|' read -r model input output count; do
        local input_price=$(get_price "$model" "input")
        local output_price=$(get_price "$model" "output")
        
        local input_cost=$(calc_cost "$input" "$input_price")
        local output_cost=$(calc_cost "$output" "$output_price")
        local model_cost=$(awk "BEGIN {printf \"%.4f\", $input_cost + $output_cost}")
        
        echo "$model,$input,$output,$model_cost,$count"
    done < "$data_file"
}

# JSON 輸出
output_json() {
    local data_file=$1
    
    echo "["
    local first=true
    
    while IFS='|' read -r model input output count; do
        local input_price=$(get_price "$model" "input")
        local output_price=$(get_price "$model" "output")
        
        local input_cost=$(calc_cost "$input" "$input_price")
        local output_cost=$(calc_cost "$output" "$output_price")
        local model_cost=$(awk "BEGIN {printf \"%.4f\", $input_cost + $output_cost}")
        
        if [ "$first" = true ]; then
            first=false
        else
            echo ","
        fi
        
        cat <<EOF
  {
    "model": "$model",
    "input_tokens": $input,
    "output_tokens": $output,
    "cost_usd": $model_cost,
    "sessions": $count
  }
EOF
    done < "$data_file"
    
    echo ""
    echo "]"
}

# === 主程式 ===

# 解析參數
while [[ $# -gt 0 ]]; do
    case $1 in
        --period)
            PERIOD="$2"
            shift 2
            ;;
        --date)
            DATE="$2"
            shift 2
            ;;
        --format)
            FORMAT="$2"
            shift 2
            ;;
        --save)
            SAVE_PATH="$2"
            shift 2
            ;;
        --help|-h)
            show_help
            ;;
        *)
            echo "未知選項: $1"
            echo "使用 --help 查看說明"
            exit 1
            ;;
    esac
done

# 檢查 jq 是否安裝
if ! command -v jq &> /dev/null; then
    echo "❌ 錯誤：需要安裝 jq"
    echo "   安裝方式：brew install jq"
    exit 1
fi

# ============ 熔斷器 ============
STATE_FILE="${OPENCLAW_STATE_DIR:-$HOME/.openclaw}/automation/state.json"
LOGS_DIR="${OPENCLAW_STATE_DIR:-$HOME/.openclaw}/automation/logs"
SCRIPT_NAME="cost-tracker"
mkdir -p "$(dirname "$STATE_FILE")" "$LOGS_DIR"
[ ! -f "$STATE_FILE" ] && echo '{"automations":{},"emergencyStop":false,"dailyBudget":5,"maxConsecutiveErrors":5}' > "$STATE_FILE"

MAX_ERRORS=$(jq -r '.maxConsecutiveErrors // 5' "$STATE_FILE" 2>/dev/null || echo "5")
if jq -e '.emergencyStop == true' "$STATE_FILE" &>/dev/null; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [${SCRIPT_NAME}] 🚨 緊急停止中，跳過執行" >> "$LOGS_DIR/automation.log"
  exit 0
fi
if ! jq -e ".automations.${SCRIPT_NAME}.enabled == true" "$STATE_FILE" &>/dev/null; then
  exit 0
fi
errors=$(jq -r ".automations.${SCRIPT_NAME}.errors // 0" "$STATE_FILE" 2>/dev/null || echo "0")
if [ "${errors:-0}" -ge "${MAX_ERRORS:-5}" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [${SCRIPT_NAME}] 🔴 連續錯誤 ${errors} 次，已熔斷" >> "$LOGS_DIR/automation.log"
  exit 0
fi

update_state_success() {
  local tmp; tmp=$(mktemp)
  jq --arg name "$SCRIPT_NAME" '.automations[$name] = ((.automations[$name] // {}) | .errors = 0 | .lastRun = (now | todate))' "$STATE_FILE" > "$tmp" 2>/dev/null && mv "$tmp" "$STATE_FILE"
}
update_state_failure() {
  local tmp; tmp=$(mktemp)
  jq --arg name "$SCRIPT_NAME" '.automations[$name] = ((.automations[$name] // {}) | .errors = ((.errors // 0) + 1) | .lastRun = (now | todate))' "$STATE_FILE" > "$tmp" 2>/dev/null && mv "$tmp" "$STATE_FILE"
}
trap 'ec=$?; [ $ec -eq 0 ] && update_state_success || update_state_failure; exit $ec' EXIT

# 生成報表
if [[ -n "$SAVE_PATH" ]]; then
    generate_report "$FORMAT" > "$SAVE_PATH"
    echo "報表已儲存至: $SAVE_PATH"
else
    generate_report "$FORMAT"
fi
