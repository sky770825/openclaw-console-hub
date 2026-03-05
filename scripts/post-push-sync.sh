#!/usr/bin/env bash
# post-push-sync.sh
# 老蔡這邊每次 git push 後自動觸發，讓小蔡本地目錄即時同步。
# 由 Claude Code PostToolUse hook 呼叫。

MAIN_DIR="/Users/caijunchang/openclaw任務面版設計"
XIAOJI_DIR="/Users/caijunchang/openclaw任務面版設計"
LOG="/tmp/openclaw-sync.log"

# 只有 git push 成功時才觸發（hook 從 stdin 讀取 tool result）
# 這裡直接執行，由呼叫端的 matcher 篩選
timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

cd "$XIAOJI_DIR" 2>/dev/null || {
  echo "[$timestamp] ERROR: xiaoji dir not found" >> "$LOG"
  exit 0
}

# 同步 origin → 小蔡本地
result=$(git pull origin main --rebase 2>&1)
code=$?

echo "[$timestamp] post-push-sync: exit=$code | $result" >> "$LOG"

# 同步完也推到 xiaoji remote（靜默）
git push xiaoji main >> "$LOG" 2>&1 &

exit 0
