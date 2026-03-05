#!/bin/bash
# Crew Bot Workspace 定期清理腳本
# 用途：清理各 bot 的散落檔案和過期筆記

CREW_BASE="$HOME/.openclaw/workspace/crew"
BOTS="ayan agong ace ami ashang ashu"

for bot in $BOTS; do
  BOT_DIR="$CREW_BASE/$bot"

  # 1. 根目錄散落 .md → 移到 notes/（排除 MEMORY.md）
  find "$BOT_DIR" -maxdepth 1 -name "*.md" ! -name "MEMORY.md" -mtime +3 -exec mv {} "$BOT_DIR/notes/" \;

  # 2. notes/ 超過 30 天的檔案 → 刪除
  find "$BOT_DIR/notes" -type f -mtime +30 -delete 2>/dev/null

  # 3. memory-archive/ 超過 60 天 → 刪除
  find "$BOT_DIR/memory-archive" -type f -mtime +60 -delete 2>/dev/null

  # 4. 確保標準目錄結構存在
  mkdir -p "$BOT_DIR/notes" "$BOT_DIR/knowledge" "$BOT_DIR/memory-archive" "$BOT_DIR/inbox"
done

echo "[$(date)] Crew workspace cleanup done"
