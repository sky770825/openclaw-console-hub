#!/usr/bin/env bash
# 通用 Autopilot 任務日誌記錄器
# 供所有 Autopilot 任務使用

set -euo pipefail

WORKSPACE="${HOME}/.openclaw/workspace"
TASK_LOG="${WORKSPACE}/memory/autopilot-results/task-history.md"

# 使用方式：
# ./log-autopilot-task.sh "任務名稱" "狀態" "摘要"
# 例如：./log-autopilot-task.sh "向量索引" "成功" "檔案:223 | Chunks:3378"

TASK_NAME=${1:-"未知任務"}
STATUS=${2:-"完成"}
SUMMARY=${3:-""}

# 狀態 emoji
case $STATUS in
    "成功"|"完成") STATUS_EMOJI="✅" ;;
    "失敗") STATUS_EMOJI="❌" ;;
    "警告") STATUS_EMOJI="⚠️" ;;
    *) STATUS_EMOJI="ℹ️" ;;
esac

# 確保目錄存在
mkdir -p "$(dirname "$TASK_LOG")"

# 如果檔案不存在，創建標題
if [[ ! -f "$TASK_LOG" ]]; then
    cat > "$TASK_LOG" <<'HEADER'
# Autopilot 任務歷史

> 自動維護 - 記錄所有 Autopilot 執行的任務

## 最近任務

HEADER
fi

# 追加記錄
TMP_FILE=$(mktemp)
cat > "$TMP_FILE" <<RECORD

### $(date "+%Y-%m-%d %H:%M:%S") - ${TASK_NAME}
- ${STATUS_EMOJI} 狀態：${STATUS}
- 📝 摘要：${SUMMARY}
RECORD

# 插入到「## 最近任務」後面
awk '/## 最近任務/ {print; system("cat '"$TMP_FILE"'"); next} 1' "$TASK_LOG" > "${TASK_LOG}.tmp"
mv "${TASK_LOG}.tmp" "$TASK_LOG"
rm "$TMP_FILE"

echo "✅ 已記錄任務：${TASK_NAME}"
