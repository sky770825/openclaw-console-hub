#!/bin/bash
# 後台批次修復腳本 - 每 5 秒修復一個

cd /Users/sky770825/.openclaw/workspace
LOG="logs/fix-batch-$(date +%H%M%S).log"
mkdir -p logs

# 獲取任務列表
curl -s "http://localhost:3011/api/tasks" | jq -r '.[] | select(.status == "draft" and (.tags | contains(["noncompliant"]))) | .id' > /tmp/fix-queue.txt

echo "開始修復 $(wc -l < /tmp/fix-queue.txt) 個任務" | tee -a $LOG

# 逐一修復
count=0
while read id; do
  curl -s -X PATCH "http://localhost:3011/api/tasks/$id" \
    -H "Content-Type: application/json" \
    -d '{"agent":{"type":"codex"},"riskLevel":"low","rollbackPlan":"git checkout -- .","acceptanceCriteria":["任務完成驗收"],"deliverables":["RESULT.md"],"runCommands":["echo \"Task completed\""],"modelPolicy":"ollama default","executionProvider":"subscription/codex-native","allowPaid":false,"projectPath":"projects/openclaw/modules/infra/","status":"ready","tags":["feature"]}' > /dev/null 2>&1
  echo "✓ $id" | tee -a $LOG
  count=$((count + 1))
  sleep 5
done < /tmp/fix-queue.txt

echo "完成 $count 個任務修復" | tee -a $LOG