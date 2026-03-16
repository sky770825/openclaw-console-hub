#!/usr/bin/env bash
# session-sync.sh — 小蔡每次對話開始自動執行
# 同步老蔡最新代碼，確保小蔡工作在最新版本上

XIAOJI_DIR="/Users/sky770825/openclaw任務面版設計"
SYNC_FLAG="$XIAOJI_DIR/.claude/.sync-done-$(date +%Y%m%d)"

# 每天只同步一次（避免每個 tool call 都觸發）
if [ -f "$SYNC_FLAG" ]; then
  exit 0
fi

cd "$XIAOJI_DIR" || exit 0

# 靜默同步，不輸出到 stdout（避免干擾 Claude）
RESULT=$(git pull origin main 2>&1)
EXIT_CODE=$?

# 記錄到 log
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] session-sync: $RESULT" >> /tmp/xiaoji-sync.log

# 建立今日 flag，避免重複執行
touch "$SYNC_FLAG"

# 清理 7 天以上的 flag
find "$XIAOJI_DIR/.claude/" -name ".sync-done-*" -mtime +7 -delete 2>/dev/null

exit 0
