#!/bin/bash
# cursor-automation.sh - Cursor GUI 自動化（AppleScript）
# 配合 automation-ctl.sh task 使用，實現一鍵啟動任務

set -euo pipefail

WORKSPACE="${HOME}/.openclaw/workspace"
TASKS_DIR="${WORKSPACE}/tasks"

# 用法
usage() {
    echo "用法: $0 <task-file-or-phase>"
    echo ""
    echo "範例:"
    echo "  $0 phase3              # 執行 Phase 3"
    echo "  $0 phase2-safety       # 執行 Phase 2"
    echo "  $0 task_0001           # 執行 task 1"
    echo ""
    exit 1
}

# 尋找任務檔案
find_task_file() {
    local input="$1"
    
    # 直接匹配
    if [[ -f "${TASKS_DIR}/${input}.md" ]]; then
        echo "${TASKS_DIR}/${input}.md"
        return 0
    fi
    
    # phase 數字轉換
    if [[ "$input" =~ ^phase([123])$ ]]; then
        local num="${BASH_REMATCH[1]}"
        if [[ -f "${TASKS_DIR}/phase${num}.md" ]]; then
            echo "${TASKS_DIR}/phase${num}.md"
            return 0
        fi
    fi
    
    # 搜尋部分匹配
    local found
    found=$(find "$TASKS_DIR" -name "*${input}*.md" -type f 2>/dev/null | head -1)
    if [[ -n "$found" && -f "$found" ]]; then
        echo "$found"
        return 0
    fi
    
    return 1
}

# 生成執行提示詞
generate_prompt() {
    local task_file="$1"
    local task_name
    task_name=$(basename "$task_file" .md)
    
    cat << EOF
請執行以下任務：

$(cat "$task_file")

---

## 執行要求

1. 請仔細閱讀上述規格
2. 依照規格中的程式碼範例實作
3. 確保所有「驗收標準」都被滿足
4. 完成後更新任務狀態

**工作目錄**: ${WORKSPACE}
**任務檔案**: ${task_file}

請開始執行。
EOF
}

# 檢查輔助功能權限
check_accessibility() {
    if ! osascript -e 'tell application "System Events" to return name of first process' &>/dev/null; then
        echo "⚠️  需要輔助功能權限"
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "📋 設定步驟："
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "1. 開啟「系統設定」> 「隱私權與安全性」> 「輔助功能」"
        echo ""
        echo "2. 點擊左下角的鎖頭解鎖（需要密碼）"
        echo ""
        echo "3. 找到「終端機」或「iTerm」，勾選啟用"
        echo "   （如果沒看到，點「+」手動加入）"
        echo ""
        echo "4. 重新執行這個命令"
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "💡 暫時替代方案（已自動複製提示詞）："
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "   Cmd+Tab 切換到 Cursor"
        echo "   Cmd+Shift+L 開新聊天"
        echo "   Cmd+V 貼上提示詞"
        echo "   Enter 送出"
        echo ""
        return 1
    fi
    return 0
}

# 使用 AppleScript 自動化 Cursor
automate_cursor() {
    local prompt="$1"
    local task_name="$2"
    
    echo "🚀 啟動 Cursor 自動化..."
    
    # 將提示詞放入剪貼簿（無論如何都先複製）
    echo "$prompt" | pbcopy
    
    # 檢查權限
    if ! check_accessibility; then
        echo ""
        echo "✅ 提示詞已複製到剪貼簿"
        return 0
    fi
    
    # 執行 AppleScript
    if osascript << 'APPLESCRIPT'
-- Cursor 自動化腳本
tell application "Cursor"
    activate
    delay 0.5
end tell

tell application "System Events"
    tell process "Cursor"
        -- 等待 Cursor 啟動
        delay 1
        
        -- 開新聊天 (Cmd+Shift+L)
        keystroke "l" using {shift down, command down}
        delay 0.5
        
        -- 貼上提示詞 (Cmd+V)
        keystroke "v" using command down
        delay 0.3
        
        -- 送出 (Return)
        keystroke return
    end tell
end tell
APPLESCRIPT
    then
        echo "✅ 已自動開啟 Cursor 並送出任務: $task_name"
    else
        echo "⚠️  自動化失敗，但提示詞已複製到剪貼簿"
        echo "   請手動在 Cursor 中貼上 (Cmd+V)"
    fi
}

# 主程式
main() {
    [[ $# -lt 1 ]] && usage
    
    local input="$1"
    echo "🔍 尋找任務: $input"
    
    local task_file
    if ! task_file=$(find_task_file "$input"); then
        echo "❌ 找不到任務: $input"
        echo ""
        echo "可用的任務:"
        ls -1 "${TASKS_DIR}"/*.md 2>/dev/null | xargs -n1 basename | sed 's/\.md$//' | head -10
        exit 1
    fi
    
    echo "✅ 找到任務: $(basename "$task_file")"
    echo "📝 生成提示詞..."
    
    local prompt
    prompt=$(generate_prompt "$task_file")
    
    # 執行自動化
    automate_cursor "$prompt" "$(basename "$task_file" .md)"
    
    echo ""
    echo "💡 Cursor 應該已經開始執行任務"
    echo "   請檢查 Cursor 視窗確認"
}

main "$@"