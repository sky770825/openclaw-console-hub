#!/bin/bash
# 堤諾米斯達爾（達爾）發想審核中心 - 一鍵新增發想腳本
# 使用方式: ./add-xiaocai-idea.sh "標題" "摘要" "標籤1,標籤2"

set -e

API_BASE="${OPENCLAW_TASKBOARD_URL:-http://localhost:3011}"

echo "📝 新增發想到堤諾米斯達爾（達爾）的發想審核中心..."

# 參數
title="${1:-}"
summary="${2:-}"
tags="${3:-feature}"

if [[ -z "$title" ]]; then
  echo "❌ 請提供標題"
  echo "使用方式: $0 \"標題\" \"摘要\" \"標籤1,標籤2\""
  exit 1
fi

# 產生 ID
id="idea-$(date +%s)"

# 產生檔案路徑
file_path="docs/xiaocai-ideas/pending/${id}.md"

# 呼叫 API
response=$(curl -s -X POST "${API_BASE}/api/openclaw/ideas" \
  -H "Content-Type: application/json" \
  -d "{
    \"id\": \"${id}\",
    \"title\": \"${title}\",
    \"summary\": \"${summary}\",
    \"file_path\": \"${file_path}\",
    \"status\": \"pending\",
    \"tags\": [\"$(echo $tags | sed 's/,/\",\"/g')\"]
  }")

# 檢查結果
if echo "$response" | grep -q '"id"'; then
  echo "✅ 發想新增成功！"
  echo "$response" | jq -r '{id, number, title, status}' 2>/dev/null || echo "$response"
  
  # 建立 Markdown 檔案
  mkdir -p "docs/xiaocai-ideas/pending"
  cat > "${file_path}" << EOF
# ${title}

**編號**: $(echo "$response" | jq -r '.number // "待定"')  
**狀態**: 🟡 待審核  
**提出者**: 堤諾米斯達爾（達爾）  
**標籤**: ${tags}  
**建立時間**: $(date '+%Y-%m-%d %H:%M:%S')

## 摘要
${summary}

## 詳細說明
(待補充)

## 驗收標準
- [ ] (待補充)

## 審核記錄
- 待審核
EOF
  
  echo ""
  echo "📄 Markdown 檔案已建立: ${file_path}"
else
  echo "❌ 新增失敗:"
  echo "$response"
  exit 1
fi
