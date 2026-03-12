#!/bin/bash

# task-splitter.sh - 高階任務拆解工具 v1.3
# 用法: ./scripts/task-splitter.sh "任務描述"

if [ -z "$1" ]; then
    echo "用法: $0 \"高階任務描述\""
    exit 1
fi

export TASK_DESC="$1"

echo "# 任務拆解報告"
echo "## 原始任務描述"
echo "> $TASK_DESC"
echo ""
echo "## 建議執行清單"

recommend_agent() {
    local subtask="$1"
    
    # 邏輯判斷參考 AGENTS.md
    if [[ "$subtask" =~ "UI"|"CSS"|"React"|"前端"|"介面"|"Tailwind" ]]; then
        echo "L4 Cursor (前端/UI 專家)"
    elif [[ "$subtask" =~ "Docker"|"n8n"|"資料庫"|"基礎設施"|"系統架構"|"SOP"|"腳本"|"安全" ]]; then
        echo "L2 Claude Code (系統/技術長)"
    elif [[ "$subtask" =~ "搜尋"|"蒐集"|"網路" ]]; then
        echo "L3 Gemini Flash (輕量搜尋)"
    elif [[ "$subtask" =~ "翻譯"|"摘要"|"格式" ]]; then
        echo "Ollama qwen3:4b (快速處理)"
    elif [[ "$subtask" =~ "推理"|"debug"|"除錯"|"思考" ]]; then
        echo "Ollama deepseek-r1:8b (邏輯推理)"
    elif [[ "$subtask" =~ "報告"|"長文"|"撰寫" ]]; then
        echo "Ollama qwen2.5:14b (高品質產出)"
    else
        echo "L1 小蔡 (指揮/日常)"
    fi
}

# 使用 python3 拆解任務描述並輸出，透過環境變數傳遞以避開引號問題
python3 - <<'PYTHON_EOF' | while read -r trimmed_task; do
import re
import os

task_desc = os.environ.get('TASK_DESC', '')
# 使用標點符號與關鍵連接詞進行拆解
delimiters = r'[，。；,;]|並|然後|且'
subtasks = re.split(delimiters, task_desc)

for task in subtasks:
    task = task.strip()
    if task:
        print(task)
PYTHON_EOF
    if [ -n "$trimmed_task" ]; then
        agent=$(recommend_agent "$trimmed_task")
        echo "- [ ] $trimmed_task (推薦: $agent)"
    fi
done

echo ""
echo "---"
echo "*註：此拆解由 task-splitter.sh 根據關鍵詞初步生成，請 L1 指揮官複核後分派。*"
