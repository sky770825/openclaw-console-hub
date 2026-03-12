#!/bin/bash
# context-monitor.sh - Context 使用量監控與 handoff 生成
# 當 context > 60% 提醒，> 75% 強制生成 handoff

WORKSPACE="${HOME}/.openclaw/workspace"
HANDOFF_DIR="${WORKSPACE}/tasks/handoff"
SPEC_FILE="${WORKSPACE}/docs/AUTOMATION-WORKFLOW-SPEC.md"
INDEX_FILE="${WORKSPACE}/tasks/TASK-INDEX.md"

mkdir -p "$HANDOFF_DIR"

# 取得目前 context 使用量（從 session_status 或估算）
get_context_usage() {
    # 這裡可以從實際 API 取得，目前用估算
    # 假設已使用 70%（測試用）
    echo "70"
}

# 生成 handoff 檔案
generate_handoff() {
    local timestamp=$(date +%Y%m%d-%H%M)
    local handoff_file="${HANDOFF_DIR}/${timestamp}.md"
    
    cat > "$handoff_file" << EOF
# Handoff: ${timestamp}

## 對話摘要
- **時間**: $(date '+%Y-%m-%d %H:%M:%S')
- **Context 使用率**: $(get_context_usage)%
- **觸發原因**: Context > 75%，強制生成 handoff

## 當前進行中的任務
$(grep -E '"status":"(in_progress|running)"' "${WORKSPACE}/tasks/task-index.jsonl" 2>/dev/null | tail -5 | jq -r '.taskName // "N/A"' || echo "無進行中任務")

## 關鍵決策
- 自動化工作流規範已建立: \`docs/AUTOMATION-WORKFLOW-SPEC.md\`
- 標準閉環 SOP v1.0 已生效
- 所有 Ready 任務指派代理改為 🧑‍💻 Codex

## 待辦事項
- [ ] 執行「住商不動產楊梅店 - 數位 Leads 生成系統」（已暫停，待確認後繼續）
- [ ] 監控其他 Ready 任務執行狀況
- [ ] 每週回顧模型成本效益

## 重要檔案路徑
- 規範文件: \`docs/AUTOMATION-WORKFLOW-SPEC.md\`
- 任務索引: \`tasks/TASK-INDEX.md\`
- 詳細索引: \`tasks/task-index.jsonl\`
- 交接檔案: \`tasks/handoff/\`

## 繼續執行方式
1. 讀取本 handoff 檔案
2. 確認當前任務狀態
3. 使用 \`/new\` 開啟新對話
4. 載入必要的背景檔案

---
*自動生成於 $(date -Iseconds)*
EOF

    echo "$handoff_file"
}

# 檢查 context 使用量
check_context() {
    local usage=$(get_context_usage)
    
    if [[ $usage -gt 75 ]]; then
        echo "⚠️ Context 使用率 ${usage}% > 75%，強制生成 handoff..."
        local handoff_file=$(generate_handoff)
        echo "✅ Handoff 已生成: $handoff_file"
        echo "🔄 請使用 /new 開啟新對話並載入交接檔案"
        
        # 發送通知（如果設定）
        if command -v openclaw &> /dev/null; then
            openclaw message send -t "5819565005" -m "【Context 告警】

使用率: ${usage}%
已超過 75% 門檻，強制生成 handoff。

📄 Handoff: ${handoff_file}
📝 規範文件: docs/AUTOMATION-WORKFLOW-SPEC.md
📊 任務索引: tasks/TASK-INDEX.md

請使用 /new 開啟新對話。" --channel telegram 2>/dev/null || true
        fi
        
        return 1  # 需要開新對話
    elif [[ $usage -gt 60 ]]; then
        echo "⚡ Context 使用率 ${usage}% > 60%，建議準備 handoff"
        return 0  # 警告但繼續
    else
        echo "✅ Context 使用率 ${usage}%，正常範圍"
        return 0
    fi
}

# 主執行
case "${1:-check}" in
    check)
        check_context
        ;;
    generate)
        generate_handoff
        ;;
    *)
        echo "用法: $0 [check|generate]"
        exit 1
        ;;
esac
