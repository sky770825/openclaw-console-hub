#!/bin/bash
# scripts/log-rotate.sh
# 日誌自動輪轉：旋轉、壓縮並清理舊日誌
# 每天由 launchd 自動執行，或手動 bash scripts/log-rotate.sh

LOG_DIR="$HOME/.openclaw/automation/logs"
REPORT_DIR="$HOME/.openclaw/workspace/reports"
MAX_DAYS=7
MAX_SIZE_MB=20
TIMESTAMP=$(date +'%Y%m%d%H%M%S')

echo "[log-rotate] $(date +'%Y-%m-%d %H:%M:%S') 開始日誌輪轉"

# 輪轉單一檔案（保留最後 1000 行）
rotate_file() {
  local file="$1"
  local max_mb="${2:-$MAX_SIZE_MB}"
  [ ! -f "$file" ] && return

  local size_mb=$(du -m "$file" 2>/dev/null | awk '{print $1}')
  if [ "$size_mb" -gt "$max_mb" ]; then
    local rotated="${file}.${TIMESTAMP}"
    tail -1000 "$file" > "${file}.tmp"
    mv "$file" "$rotated"
    mv "${file}.tmp" "$file"
    gzip -f "$rotated" 2>/dev/null
    echo "[log-rotate] $(basename $file): ${size_mb}MB -> rotated + gzipped"
  fi
}

# 主要日誌
rotate_file "${LOG_DIR}/taskboard.log" 20
rotate_file "${LOG_DIR}/taskboard-error.log" 10

# 群組聊天日誌
rotate_file "${REPORT_DIR}/group_chat_log.md" 5

# 清理超過 MAX_DAYS 天的壓縮檔
for dir in "$LOG_DIR" "$REPORT_DIR"; do
  [ -d "$dir" ] && find "$dir" -type f -name "*.gz" -mtime +${MAX_DAYS} -delete 2>/dev/null
done

echo "[log-rotate] 完成"
