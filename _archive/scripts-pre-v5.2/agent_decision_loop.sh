#!/bin/bash

# Agent 決策介入循環示範腳本
SESSION_ID="session_$(date +%Y%m%d_%H%M%S)"

echo "🚀 開始執行任務：[範例] 系統自動化部署策略"

# 步驟 1: 建立決策點
echo "🧠 Agent 正在思考方案..."
OUTPUT=$(python3 scripts/decision_tree.py create)
DECISION_ID=$(echo "$OUTPUT" | grep "DECISION_ID:" | cut -d':' -f2)

# 顯示可視化介面
echo "----------------------------------------"
echo "$OUTPUT" | sed '1,1d' # 去掉 DECISION_ID 行
echo "----------------------------------------"

# 步驟 2: 模擬等待介入
echo "📝 [主人介入專區] 請輸入你的指令 (y/n/自定義):"
# 在自動化腳本中，這裡會暫停等待讀取檔案或標準輸入
# 這裡我們模擬讀取一個名為 INTERVENTION.txt 的檔案
echo "Waiting for INTERVENTION.txt..."
touch INTERVENTION.txt
echo "請將指令寫入 INTERVENTION.txt 後儲存"

# 循環等待檔案內容變更
while [ ! -s INTERVENTION.txt ]; do
  sleep 2
done

USER_INPUT=$(cat INTERVENTION.txt)
echo "📥 收到主人指令: $USER_INPUT"

# 步驟 3: 套用介入並更新狀態
python3 scripts/decision_tree.py intervene "$DECISION_ID" "$USER_INPUT"

# 步驟 4: 根據介入結果執行
STATUS=$(python3 -c "import json; print(json.load(open('memory/decisions/test-session_$DECISION_ID.json'))['intervention']['status'])")

if [ "$STATUS" == "approved" ]; then
  echo "✅ 指令已確認，開始執行推薦方案：Python"
elif [ "$STATUS" == "rejected" ]; then
  echo "❌ 指令被拒絕，停止執行。"
else
  echo "🔄 指令已修正，Agent 將根據新參數調整行為：$USER_INPUT"
fi

# 清理
rm INTERVENTION.txt
