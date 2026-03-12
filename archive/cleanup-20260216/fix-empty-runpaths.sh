#!/bin/bash
# 修復 runs 的 runPath 為空問題

cd /Users/caijunchang/.openclaw/workspace
API_URL="http://localhost:3011"
DATE=$(date +%Y-%m-%d)

echo "=== 修復 runs runPath 開始 ==="

# 獲取所有 runPath 為空的 runs
curl -s "${API_URL}/api/runs" | jq -r '.[] | select(.runPath == null or .runPath == "") | .id' > /tmp/fix-runs-queue.txt

count=0
while read runId; do
  # 生成預設 runPath
  runPath="projects/openclaw/runs/${DATE}/${runId}/"
  
  # PATCH 更新 runPath
  curl -s -X PATCH "${API_URL}/api/runs/${runId}" \
    -H "Content-Type: application/json" \
    -d "{\"runPath\": \"${runPath}\"}" > /dev/null 2>&1
  
  echo "✓ Fixed run: ${runId} -> ${runPath}"
  count=$((count + 1))
  
  # 每 10 個休息一下
  if [ $((count % 10)) -eq 0 ]; then
    echo "  已修復 ${count} 個..."
    sleep 1
  fi
done < /tmp/fix-runs-queue.txt

echo "=== 完成 ${count} 個 runs 修復 ==="
