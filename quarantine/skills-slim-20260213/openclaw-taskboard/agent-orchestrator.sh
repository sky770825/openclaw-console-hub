#!/bin/bash
# OpenClaw Agent 指揮範例腳本
# 展示如何透過任務板調度 Cursor Agent 和 CoDEX

TASKBOARD_URL="${OPENCLAW_TASKBOARD_URL:-http://localhost:3011}"

echo "🤖 OpenClaw Agent 指揮中心 - 範例腳本"
echo "====================================="
echo ""

# ============================================
# 範例 1: 建立並執行 Cursor Agent 任務
# ============================================
create_cursor_task() {
    local task_title="$1"
    local working_dir="$2"
    local prompt="$3"
    
    echo "📝 建立 Cursor 任務: $task_title"
    
    curl -s -X POST "$TASKBOARD_URL/api/openclaw/tasks" \
        -H "Content-Type: application/json" \
        -d "{
            \"id\": \"cursor-$(date +%s)\",
            \"name\": \"$task_title\",
            \"description\": \"$prompt\",
            \"status\": \"ready\",
            \"cat\": \"refactor\",
            \"agent\": {
                \"type\": \"cursor\",
                \"config\": {
                    \"approval\": \"suggest\",
                    \"timeout\": 600,
                    \"maxRetries\": 2
                }
            },
            \"context\": {
                \"workingDir\": \"$working_dir\",
                \"files\": []
            },
            \"auto\": false
        }" | jq .
}

# ============================================
# 範例 2: 建立 CoDEX 任務
# ============================================
create_codex_task() {
    local task_title="$1"
    local working_dir="$2"
    local prompt="$3"
    
    echo "📝 建立 CoDEX 任務: $task_title"
    
    curl -s -X POST "$TASKBOARD_URL/api/openclaw/tasks" \
        -H "Content-Type: application/json" \
        -d "{
            \"id\": \"codex-$(date +%s)\",
            \"name\": \"$task_title\",
            \"description\": \"$prompt\",
            \"status\": \"ready\",
            \"cat\": \"analyze\",
            \"agent\": {
                \"type\": \"codex\",
                \"config\": {
                    \"approval\": \"auto-suggest\",
                    \"timeout\": 900
                }
            },
            \"context\": {
                \"workingDir\": \"$working_dir\"
            },
            \"auto\": false
        }" | jq .
}

# ============================================
# 範例 3: 建立工作流（多步驟任務）
# ============================================
create_workflow() {
    local workflow_name="$1"
    local project_dir="$2"
    
    echo "🔄 建立工作流: $workflow_name"
    
    # 步驟 1: 分析程式碼
    local task1_id="wf-$(date +%s)-1"
    curl -s -X POST "$TASKBOARD_URL/api/openclaw/tasks" \
        -H "Content-Type: application/json" \
        -d "{
            \"id\": \"$task1_id\",
            \"name\": \"步驟1: 分析程式碼品質\",
            \"description\": \"分析 $project_dir 的程式碼品質和潛在問題\",
            \"status\": \"ready\",
            \"cat\": \"analyze\",
            \"agent\": {\"type\": \"cursor\"},
            \"context\": {\"workingDir\": \"$project_dir\"}
        }" > /dev/null
    
    # 步驟 2: 建立測試（依賴步驟1）
    local task2_id="wf-$(date +%s)-2"
    curl -s -X POST "$TASKBOARD_URL/api/openclaw/tasks" \
        -H "Content-Type: application/json" \
        -d "{
            \"id\": \"$task2_id\",
            \"name\": \"步驟2: 建立測試檔案\",
            \"description\": \"根據分析結果建立對應測試\",
            \"status\": \"ready\",
            \"cat\": \"feature\",
            \"agent\": {\"type\": \"cursor\"},
            \"context\": {\"workingDir\": \"$project_dir\"},
            \"workflow\": {\"dependsOn\": [\"$task1_id\"]}
        }" > /dev/null
    
    # 步驟 3: 重構（依賴步驟2）
    local task3_id="wf-$(date +%s)-3"
    curl -s -X POST "$TASKBOARD_URL/api/openclaw/tasks" \
        -H "Content-Type: application/json" \
        -d "{
            \"id\": \"$task3_id\",
            \"name\": \"步驟3: 重構程式碼\",
            \"description\": \"執行重構並確保測試通過\",
            \"status\": \"ready\",
            \"cat\": \"refactor\",
            \"agent\": {\"type\": \"codex\"},
            \"context\": {\"workingDir\": \"$project_dir\"},
            \"workflow\": {\"dependsOn\": [\"$task2_id\"]}
        }" > /dev/null
    
    echo "✅ 工作流建立完成:"
    echo "   - $task1_id (分析)"
    echo "   - $task2_id (測試) ← 依賴 $task1_id"
    echo "   - $task3_id (重構) ← 依賴 $task2_id"
}

# ============================================
# 範例 4: 執行任務並監控
# ============================================
run_and_monitor() {
    local task_id="$1"
    
    echo "▶️ 執行任務: $task_id"
    
    # 啟動任務
    curl -s -X POST "$TASKBOARD_URL/api/openclaw/tasks/$task_id/run" \
        -H "Content-Type: application/json"
    
    echo ""
    echo "⏳ 監控中... (按 Ctrl+C 停止)"
    
    # 監控狀態
    while true; do
        local status=$(curl -s "$TASKBOARD_URL/api/openclaw/tasks/$task_id" | jq -r '.status')
        local progress=$(curl -s "$TASKBOARD_URL/api/openclaw/tasks/$task_id" | jq -r '.progress // 0')
        
        echo -ne "\r   狀態: $status | 進度: $progress%"
        
        if [[ "$status" == "done" || "$status" == "failed" ]]; then
            echo ""
            echo "✅ 任務完成!"
            break
        fi
        
        sleep 5
    done
}

# ============================================
# 範例 5: Agent 執行器（實際呼叫 Cursor/CoDEX）
# ============================================
execute_cursor_agent() {
    local task_id="$1"
    local working_dir="$2"
    local prompt="$3"
    
    echo "🤖 執行 Cursor Agent..."
    echo "   任務: $task_id"
    echo "   目錄: $working_dir"
    echo "   提示: $prompt"
    echo ""
    
    # 更新任務狀態為執行中
    curl -s -X PATCH "$TASKBOARD_URL/api/openclaw/tasks/$task_id" \
        -H "Content-Type: application/json" \
        -d '{"status": "running", "progress": 10}' > /dev/null
    
    # 執行 Cursor Agent（使用 --force 自動應用變更）
    cd "$working_dir" || exit 1
    
    # 記錄輸出
    local output_file="/tmp/cursor-$task_id.log"
    
    if agent -p "$prompt" --force --output-format json 2>&1 | tee "$output_file"; then
        # 成功
        curl -s -X PATCH "$TASKBOARD_URL/api/openclaw/tasks/$task_id" \
            -H "Content-Type: application/json" \
            -d "{
                \"status\": \"done\",
                \"progress\": 100,
                \"execution\": {
                    \"endedAt\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
                    \"output\": \"$(cat "$output_file" | head -100)\" 
                }
            }" > /dev/null
        echo "✅ Cursor Agent 執行成功"
    else
        # 失敗
        curl -s -X PATCH "$TASKBOARD_URL/api/openclaw/tasks/$task_id" \
            -H "Content-Type: application/json" \
            -d "{
                \"status\": \"failed\",
                \"execution\": {
                    \"error\": \"Cursor Agent 執行失敗\",
                    \"output\": \"$(cat "$output_file" | head -100)\"
                }
            }" > /dev/null
        echo "❌ Cursor Agent 執行失敗"
    fi
    
    rm -f "$output_file"
}

execute_codex_agent() {
    local task_id="$1"
    local working_dir="$2"
    local prompt="$3"
    
    echo "🤖 執行 CoDEX Agent..."
    
    # 更新任務狀態
    curl -s -X PATCH "$TASKBOARD_URL/api/openclaw/tasks/$task_id" \
        -H "Content-Type: application/json" \
        -d '{"status": "running", "progress": 10}' > /dev/null
    
    # 執行 CoDEX
    cd "$working_dir" || exit 1
    
    local output_file="/tmp/codex-$task_id.log"
    
    if codex "$prompt" --approval-mode auto-suggest 2>&1 | tee "$output_file"; then
        curl -s -X PATCH "$TASKBOARD_URL/api/openclaw/tasks/$task_id" \
            -H "Content-Type: application/json" \
            -d "{
                \"status\": \"done\",
                \"progress\": 100,
                \"execution\": {
                    \"endedAt\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
                    \"output\": \"$(cat "$output_file" | head -100)\"
                }
            }" > /dev/null
        echo "✅ CoDEX 執行成功"
    else
        curl -s -X PATCH "$TASKBOARD_URL/api/openclaw/tasks/$task_id" \
            -H "Content-Type: application/json" \
            -d "{
                \"status\": \"failed\",
                \"execution\": {
                    \"error\": \"CoDEX 執行失敗\"
                }
            }" > /dev/null
        echo "❌ CoDEX 執行失敗"
    fi
    
    rm -f "$output_file"
}

# ============================================
# 主選單
# ============================================
show_menu() {
    echo ""
    echo "請選擇要執行的範例:"
    echo ""
    echo "1) 建立 Cursor 任務 - 分析程式碼品質"
    echo "2) 建立 CoDEX 任務 - 複雜重構"
    echo "3) 建立工作流 - 分析→測試→重構"
    echo "4) 執行任務並監控"
    echo "5) 直接執行 Cursor Agent (測試用)"
    echo "q) 退出"
    echo ""
}

# 處理參數
case "${1:-menu}" in
    cursor|1)
        create_cursor_task \
            "分析程式碼品質" \
            "$(pwd)" \
            "分析這個專案的程式碼品質，找出潛在問題和改進建議"
        ;;
    codex|2)
        create_codex_task \
            "重構核心模組" \
            "$(pwd)" \
            "重構 src/core 目錄下的程式碼，提高可維護性"
        ;;
    workflow|3)
        create_workflow \
            "完整重構流程" \
            "$(pwd)"
        ;;
    run|4)
        echo -n "請輸入任務 ID: "
        read task_id
        run_and_monitor "$task_id"
        ;;
    exec|5)
        execute_cursor_agent \
            "test-$(date +%s)" \
            "$(pwd)" \
            "列出這個目錄的檔案結構"
        ;;
    menu|*)
        show_menu
        ;;
esac
