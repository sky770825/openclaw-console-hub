#!/bin/bash
# cursor-task-launcher.sh - 自動啟動 Cursor 任務
# 讀取任務檔案，準備提示詞，開啟 Cursor

set -euo pipefail

WORKSPACE="${HOME}/.openclaw/workspace"
TASKS_DIR="${WORKSPACE}/tasks"

usage() {
    echo "用法: $0 <task-id|task-name>"
    echo ""
    echo "範例:"
    echo "  $0 phase2-safety     # 開啟 Phase 2 任務"
    echo "  $0 1                 # 開啟 task_0001"
    echo ""
    exit 1
}

# 檢查參數
if [[ $# -lt 1 ]]; then
    usage
fi

TASK_INPUT="$1"

# 尋找任務檔案
find_task_file() {
    local input="$1"
    local task_file=""
    
    # 嘗試直接匹配檔案名
    if [[ -f "${TASKS_DIR}/${input}.md" ]]; then
        echo "${TASKS_DIR}/${input}.md"
        return 0
    fi
    
    # 嘗試匹配 task_XXXX.md 格式
    if [[ "$input" =~ ^[0-9]+$ ]]; then
        task_file="${TASKS_DIR}/task_$(printf "%04d" $input).md"
        if [[ -f "$task_file" ]]; then
            echo "$task_file"
            return 0
        fi
    fi
    
    # 搜尋部分匹配
    task_file=$(find "$TASKS_DIR" -name "*${input}*.md" -type f 2>/dev/null | head -1)
    if [[ -n "$task_file" && -f "$task_file" ]]; then
        echo "$task_file"
        return 0
    fi
    
    return 1
}

# 讀取任務摘要
extract_task_summary() {
    local file="$1"
    local title=$(grep "^# " "$file" 2>/dev/null | head -1 | sed 's/^# //')
    local goal=$(grep -A 5 "^## 目標" "$file" 2>/dev/null | head -6)
    
    echo "## 任務：${title}"
    echo ""
    echo "${goal}"
}

# 主程式
main() {
    echo "🔍 尋找任務：$TASK_INPUT"
    
    local task_file
    task_file=$(find_task_file "$TASK_INPUT") || {
        echo "❌ 找不到任務：$TASK_INPUT"
        echo ""
        echo "可用的任務："
        ls -1 "${TASKS_DIR}"/*.md 2>/dev/null | xargs -n1 basename | sed 's/\.md$//' | head -10
        exit 1
    }
    
    echo "✅ 找到任務檔案：$(basename "$task_file")"
    
    # 準備提示詞檔案
    local prompt_file="/tmp/cursor-task-$(date +%s).md"
    
    cat > "$prompt_file" << 'EOF'
# Cursor 任務執行請求

請依照以下規格執行任務：

EOF
    
    # 加入任務內容
    cat "$task_file" >> "$prompt_file"
    
    cat >> "$prompt_file" << EOF

---

## 執行要求

1. 請仔細閱讀上述規格
2. 依照規格中的程式碼範例實作
3. 確保所有「驗收標準」都被滿足
4. 完成後更新任務狀態

**工作目錄**：${WORKSPACE}
**任務檔案**：${task_file}

請開始執行。
EOF
    
    echo ""
    echo "🚀 啟動 Cursor..."
    
    # 開啟 Cursor（先開工作區，再開提示詞檔案）
    cursor "$WORKSPACE" "$prompt_file" 2>/dev/null || {
        echo "⚠️  Cursor CLI 無法使用，嘗試 open 命令..."
        open -a Cursor "$WORKSPACE"
        open -a Cursor "$prompt_file"
    }
    
    echo ""
    echo "✅ Cursor 已開啟"
    echo "📄 提示詞檔案：$prompt_file"
    echo ""
    echo "💡 提示：在 Cursor 聊天框輸入 @${task_file##*/} 可直接引用任務檔案"
}

main