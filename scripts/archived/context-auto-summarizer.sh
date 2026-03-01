#!/bin/bash
# Context Auto-Summarizer with Ollama
# 自動摘要舊對話，建立索引，節省 tokens

set -euo pipefail

# 配置
WORKSPACE="${HOME}/.openclaw/workspace"
SESSIONS_DIR="${HOME}/.openclaw"
CONTEXT_THRESHOLD=50  # 超過 50% 觸發摘要
OLLAMA_MODEL="qwen2.5:14b"
SUMMARY_DIR="${WORKSPACE}/memory/context-summaries"
INDEX_FILE="${SUMMARY_DIR}/index.json"
LOCK_FILE="/tmp/context-summarizer.lock"

# 避免重複執行
if [ -f "$LOCK_FILE" ]; then
    PID=$(cat "$LOCK_FILE" 2>/dev/null || echo "")
    if [ -n "$PID" ] && ps -p "$PID" > /dev/null 2>&1; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] 已在執行中 (PID: $PID)，跳過"
        exit 0
    fi
fi
echo $$ > "$LOCK_FILE"
trap "rm -f $LOCK_FILE" EXIT

# 確保目錄存在
mkdir -p "$SUMMARY_DIR"

# 取得當前 session 資訊
get_current_session() {
    # 找最新的 main session jsonl（包括子目錄）
    find ${SESSIONS_DIR}/agents/main/sessions -name "*.jsonl" -type f 2>/dev/null | xargs ls -t 2>/dev/null | head -1
}

# 計算 context 使用率
check_context_usage() {
    local session_file="$1"
    if [ ! -f "$session_file" ]; then
        echo "0"
        return
    fi
    
    # 估算行數（每行約 500-1000 tokens）
    local lines=$(wc -l < "$session_file" 2>/dev/null || echo "0")
    local estimated_tokens=$((lines * 700))
    local context_window=131072  # kimi k2.5
    local usage=$((estimated_tokens * 100 / context_window))
    
    echo "$usage"
}

# 摘要對話（使用 Ollama）
summarize_with_ollama() {
    local content="$1"
    
    # 檢查 Ollama 是否可用
    if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo "Ollama 未啟動，使用本地摘要"
        echo "對話內容預覽: ${content:0:200}..."
        return
    fi
    
    # 呼叫 Ollama 進行摘要（帶超時）
    local prompt="請用繁體中文摘要以下對話內容，保留關鍵決策、行動項目和重要資訊。控制在 200 字內：

$content"
    
    local summary=$(timeout 30 curl -s http://localhost:11434/api/generate \
        -H "Content-Type: application/json" \
        -d "{
            \"model\": \"$OLLAMA_MODEL\",
            \"prompt\": $(echo "$prompt" | jq -Rs .),
            \"stream\": false,
            \"options\": {
                \"temperature\": 0.3,
                \"num_predict\": 300
            }
        }" 2>/dev/null | jq -r '.response' 2>/dev/null || echo "")
    
    if [ -z "$summary" ]; then
        echo "Ollama 摘要超時或失敗，使用本地摘要"
        echo "對話內容預覽: ${content:0:200}..."
    else
        echo "$summary"
    fi
}

# 提取關鍵字建立索引
extract_keywords() {
    local summary="$1"
    # 簡單提取名詞（這裡用簡化版）
    echo "$summary" | grep -oE '[一-龥]{2,}' | sort | uniq -c | sort -rn | head -10 | awk '{print $2}' | tr '\n' ',' | sed 's/,$//'
}

# 執行摘要
main() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Context Auto-Summarizer 啟動"
    
    local session_file=$(get_current_session)
    if [ -z "$session_file" ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] 找不到 session 檔案"
        exit 1
    fi
    
    local usage=$(check_context_usage "$session_file")
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 當前 Context 使用率: ${usage}%"
    
    if [ "$usage" -lt "$CONTEXT_THRESHOLD" ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] 未達閾值 (${CONTEXT_THRESHOLD}%)，不需摘要"
        exit 0
    fi
    
    # 讀取舊對話（前 70% 的行）
    local total_lines=$(wc -l < "$session_file")
    local cutoff_line=$((total_lines * 70 / 100))
    
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 準備摘要前 $cutoff_line 行對話"
    
    # 提取對話內容（OpenClaw 格式: type=message）
    local old_content=$(head -n "$cutoff_line" "$session_file" | \
        jq -r 'select(.type == "message" and .message.role != "system") | "\(.message.role): \(.message.content[0].text[:300])"' 2>/dev/null | \
        tail -100 | head -50)
    
    if [ -z "$old_content" ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] 無法提取對話內容"
        exit 1
    fi
    
    # 執行摘要
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 呼叫 Ollama 進行摘要..."
    local summary=$(summarize_with_ollama "$old_content")
    
    if [ -z "$summary" ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Ollama 摘要失敗"
        exit 1
    fi
    
    # 建立摘要檔案
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local summary_file="${SUMMARY_DIR}/summary_${timestamp}.md"
    
    cat > "$summary_file" << EOF
# Context 摘要 - $(date '+%Y-%m-%d %H:%M:%S')

## 原始對話範圍
- Session: $(basename "$session_file")
- 行數: 1-${cutoff_line} / ${total_lines}
- 觸發使用率: ${usage}%

## 摘要內容
$summary

## 關鍵字
$(extract_keywords "$summary")

## 原始檔案
${session_file}

---
*自動生成 by context-auto-summarizer.sh*
EOF
    
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 摘要已儲存: $summary_file"
    
    # 更新索引
    local keywords=$(extract_keywords "$summary")
    jq -n \
        --arg timestamp "$timestamp" \
        --arg file "$summary_file" \
        --arg keywords "$keywords" \
        --arg usage "$usage" \
        '{timestamp: $timestamp, file: $file, keywords: $keywords, usage: $usage}' >> "${INDEX_FILE}.tmp"
    
    # 保留最近 50 筆索引
    tail -50 "${INDEX_FILE}.tmp" > "$INDEX_FILE" 2>/dev/null || true
    rm -f "${INDEX_FILE}.tmp"
    
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 索引已更新: $INDEX_FILE"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 完成！預計可節省 ~$((cutoff_line * 700 / 1000))k tokens"
}

main "$@"
