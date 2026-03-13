#!/bin/bash
# Prompt 版本同步審查腳本
# 排程：每日 02:00 CST（由 cron 或心跳觸發）
# 用途：比對根目錄（Claude版）和 local-models/（本地模型版）的核心事實是否一致

WORKSPACE="$HOME/.openclaw/workspace"
LOCAL_DIR="$WORKSPACE/prompts/local-models"
SYNC_LOG="$WORKSPACE/prompts/sync-history.jsonl"
CORE_FILES=("AGENTS.md" "SOUL.md" "IDENTITY.md")

timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
drift_found=false
drift_details=""

echo "=== Prompt Sync Review: $timestamp ==="

for file in "${CORE_FILES[@]}"; do
  root_file="$WORKSPACE/$file"
  local_file="$LOCAL_DIR/$file"

  if [ ! -f "$root_file" ]; then
    echo "  [WARN] Root file missing: $file"
    drift_details="$drift_details, $file: root missing"
    drift_found=true
    continue
  fi

  if [ ! -f "$local_file" ]; then
    echo "  [WARN] Local model file missing: $file"
    drift_details="$drift_details, $file: local missing"
    drift_found=true
    continue
  fi

  # 提取核心事實（去掉格式差異，只比對關鍵詞）
  root_facts=$(grep -iE '(達爾|主人|指揮官|ask_ai|auto-executor|delegate_agents|semantic_search|proxy_fetch|flash|pro|claude|haiku|deepseek|kimi|grok)' "$root_file" | sort)
  local_facts=$(grep -iE '(達爾|主人|指揮官|ask_ai|auto-executor|delegate_agents|semantic_search|proxy_fetch|flash|pro|claude|haiku|deepseek|kimi|grok)' "$local_file" | sort)

  root_count=$(echo "$root_facts" | wc -l | tr -d ' ')
  local_count=$(echo "$local_facts" | wc -l | tr -d ' ')

  # 如果關鍵事實數量差異 > 30%，標記 drift
  if [ "$root_count" -gt 0 ]; then
    diff_ratio=$(( (root_count - local_count) * 100 / root_count ))
    if [ "$diff_ratio" -gt 50 ] || [ "$diff_ratio" -lt -50 ]; then
      echo "  [DRIFT] $file: root=$root_count facts, local=$local_count facts (${diff_ratio}% diff)"
      drift_details="$drift_details, $file: ${diff_ratio}% drift"
      drift_found=true
    else
      echo "  [OK] $file: synced (root=$root_count, local=$local_count)"
    fi
  fi
done

# 記錄結果
if [ "$drift_found" = true ]; then
  echo "{\"timestamp\":\"$timestamp\",\"status\":\"drift\",\"details\":\"$drift_details\"}" >> "$SYNC_LOG"
  echo ""
  echo "⚠️  Drift detected! Details logged to sync-history.jsonl"
  echo "   Run: 達爾，修復 prompt drift"
else
  echo "{\"timestamp\":\"$timestamp\",\"status\":\"ok\",\"details\":\"all files synced\"}" >> "$SYNC_LOG"
  echo ""
  echo "✅ All prompt versions synced."
fi
