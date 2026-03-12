#!/bin/bash
set -e
# 批次新增14個發想到小蔡發想審核中心

API_BASE="${OPENCLAW_TASKBOARD_URL:-http://localhost:3011}"

echo "📝 批次新增14個發想..."
echo ""

# 發想清單
ideas=(
  "AMBP Phase 4: 跨機器通信|支援多台機器上的 Agent 互相通信，遠程任務指派。驗收：WebSocket/HTTP 遠端協議、機器註冊、跨機任務轉發|am,infrastructure|6"
  "AMBP 消息持久化備份|自動備份 AMBP 訊息到 Supabase/S3，防止遺失。驗收：定期備份、一鍵恢復、歷史查詢|am,backup|4"
  "AMBP 效能優化|大量訊息處理優化，支援每秒千級訊息。驗收：壓力測試、佇列優化、記憶體管理|am,performance|5"
  "Agent 版本控制系統|類似 Git 但針對 AI Agent 任務，追蹤每次修改。驗收：版本歷史、差異比較、回滾功能|agent,vcs|8"
  "Agent 協作學習系統|Agent 從彼此執行歷史學習，自動優化策略。驗收：執行分析、策略推薦、自動調參|agent,ml|10"
  "多模態 Agent 支援|支援圖像、語音輸入，不只是文字。驗收：圖像分析任務、語音指令、多模態輸出|agent,multimodal|8"
  "Agent 決策樹視覺化|視覺化呈現 Agent 如何分解任務、做決策。驗收：互動式決策樹、時間軸、分支探索|agent,visualization|6"
  "即時協作模式|多人多 Agent 同時協作同一任務。驗收：即時同步、衝突解決、協作游標|collaboration,realtime|10"
  "Agent 成本追蹤儀表板|追蹤每個 Agent 的 Token 成本、執行時間。驗收：成本分類、預算警示、節省建議|cost,dashboard|5"
  "老蔡專屬 Agent 訓練|基於歷史偏好訓練專屬 Agent，更懂老蔡。驗收：偏好學習、自動推薦、個人化回應|personalization,training|12"
  "Agent 任務品質評分|自動評分 Agent 執行結果品質，給予反饋。驗收：品質指標、自動評分、改進建議|quality,evaluation|6"
  "Agent 技能市場整合|內建類似 ClawHub 的技能市場，一鍵安裝。驗收：技能瀏覽、一鍵安裝、版本管理|marketplace,skills|8"
  "語音指令系統|用語音直接指派任務給 Agent。驗收：語音辨識、指令解析、即時反饋|voice,ui|6"
  "Agent 自動除錯|Agent 遇到錯誤自動分析並修復。驗收：錯誤分類、自動修復、學習累積|debugging,automation|10"
)

success=0
failed=0

for idea in "${ideas[@]}"; do
  IFS='|' read -r title summary tags hours <<< "$idea"
  
  echo "新增: ${title}..."
  
  response=$(curl -s -X POST "${API_BASE}/api/openclaw/ideas" \
    -H "Content-Type: application/json" \
    -d "{
      \"id\": \"idea-$(date +%s)-${RANDOM}\",
      \"title\": \"${title}\",
      \"summary\": \"${summary}\",
      \"file_path\": \"docs/xiaocai-ideas/pending/${title// /-}.md\",
      \"status\": \"pending\",
      \"tags\": [\"$(echo $tags | sed 's/,/\",\"/g')\"]
    }" 2>&1)
  
  if echo "$response" | grep -q '"id"'; then
    echo "  ✅ 成功"
    ((success++))
  else
    echo "  ❌ 失敗: $response"
    ((failed++))
  fi
  
  sleep 0.5
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "批次新增完成: ${success} 成功, ${failed} 失敗"
echo ""
echo "📋 查看所有發想:"
echo "  curl http://localhost:3011/api/openclaw/ideas | jq '.'"
