#!/bin/bash
# log-analyzer.sh - DebugMaster 核心日誌分析工具 v0.1
#
# 功能: 分析指定的日誌檔案，提供錯誤、警告和關鍵字統計。
#
# 用法: ./log-analyzer.sh <log_file_path> [--keywords=word1,word2]
#
# 範例:
#   ./log-analyzer.sh /var/log/system.log
#   ./log-analyzer.sh ~/.openclaw/logs/gateway.log --keywords=timeout,failed,404

set -euo pipefail

# --- 參數與設定 ---
LOG_FILE="${1:-}"
KEYWORDS=""

# 解析關鍵字參數
for arg in "$@"; do
  case $arg in
    --keywords=*)
      KEYWORDS="${arg#*=}"
      shift
      ;;
  esac
done

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# --- 輸入驗證 ---
if [[ -z "$LOG_FILE" || ! -f "$LOG_FILE" ]]; then
    echo -e "${RED}錯誤: 請提供一個有效的日誌檔案路徑。${NC}"
    echo "用法: $0 <log_file_path> [--keywords=word1,word2]"
    exit 1
fi

# --- 主程式 ---
echo -e "${BLUE}===== DebugMaster 日誌分析報告 =====${NC}"
echo "分析目標: $LOG_FILE"
echo "報告時間: $(date)"
echo ""

# 1. 基本統計
echo "--- 1. 基本統計 ---"
TOTAL_LINES=$(wc -l < "$LOG_FILE" | tr -d ' ')
echo "總行數: $TOTAL_LINES"
echo ""

# 2. 嚴重性計數
echo "--- 2. 嚴重性計數 (不分大小寫) ---"
ERROR_COUNT=$(grep -ci "error" "$LOG_FILE")
WARN_COUNT=$(grep -ci "warn" "$LOG_FILE")
FATAL_COUNT=$(grep -ci "fatal" "$LOG_FILE")

echo -e "致命錯誤 (Fatal): ${RED}${FATAL_COUNT}${NC}"
echo -e "一般錯誤 (Error): ${RED}${ERROR_COUNT}${NC}"
echo -e "警告 (Warning): ${YELLOW}${WARN_COUNT}${NC}"
echo ""

# 3. Top 5 錯誤訊息
echo "--- 3. Top 5 錯誤訊息 ---"
if [ "$ERROR_COUNT" -gt 0 ]; then
    grep -i "error" "$LOG_FILE" | \
    sed -E 's/([0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2})|request_id: [a-zA-Z0-9_]+//g' | \
    sort | \
    uniq -c | \
    sort -nr | \
    head -n 5 | \
    awk '{printf("  %s %s\n", $1, substr($0, length($1)+1))}'
else
    echo "未發現錯誤訊息。"
fi
echo ""

# 4. 自訂關鍵字搜尋
if [ -n "$KEYWORDS" ]; then
    echo "--- 4. 自訂關鍵字搜尋 ---"
    IFS=',' read -ra ADDR <<< "$KEYWORDS"
    for keyword in "${ADDR[@]}"; do
        COUNT=$(grep -ci "$keyword" "$LOG_FILE")
        echo "關鍵字 '$keyword': $COUNT 次"
    done
    echo ""
fi

echo -e "${BLUE}===== 分析完畢 =====${NC}"

exit 0
