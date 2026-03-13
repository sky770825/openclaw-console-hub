#!/bin/bash
# scripts/log-rotate.sh
# 日誌自動旋轉腳本：旋轉、壓縮並清理舊日誌

LOG_DIR="/Users/sky770825/.openclaw/logs"
MAX_DAYS=14
MAX_SIZE_MB=50
TIMESTAMP=$(date +'%Y%m%d%H%M%S')

echo "🔄 開始執行日誌旋轉 - $(date +'%Y-%m-%d %H:%M:%S')"

if [ ! -d "$LOG_DIR" ]; then
    echo "❌ 找不到日誌目錄: $LOG_DIR"
    exit 1
fi

# 1. 處理大於指定大小的日誌
find "$LOG_DIR" -type f -name "*.log" -size +"${MAX_SIZE_MB}M" | while read -r log_file; do
    echo "📏 檔案過大 (>50MB): $log_file，正在旋轉並壓縮..."
    mv "$log_file" "${log_file}.${TIMESTAMP}.old"
    gzip "${log_file}.${TIMESTAMP}.old"
    touch "$log_file"
    echo "✅ 已將 $log_file 旋轉並壓縮為 ${log_file}.${TIMESTAMP}.old.gz"
done

# 2. 壓縮現有的 .old 檔案（如果還沒壓縮）
find "$LOG_DIR" -type f -name "*.old" -exec gzip {} \; 2>/dev/null

# 3. 刪除超過指定天數的舊檔案
echo "🗑️ 正在清理超過 $MAX_DAYS 天的舊檔案..."
find "$LOG_DIR" -type f \( -name "*.gz" -o -name "*.jsonl" -o -name "*.old" \) -mtime +$MAX_DAYS -exec rm -v {} \;

echo "🏁 日誌旋轉完成"
echo "-----------------------------------"
