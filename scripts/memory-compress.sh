#!/usr/bin/env bash
# memory-compress.sh — NEUXA 記憶壓縮腳本
# 功能：掃描超過 30 天的大型記憶檔，用 Gemini 壓縮後存回
# 位置：~/.openclaw/workspace/scripts/memory-compress.sh
# 用法：bash ~/.openclaw/workspace/scripts/memory-compress.sh

set -euo pipefail

MEMORY_DIR="${HOME}/.openclaw/workspace/memory"
DAYS_OLD=30
WORD_THRESHOLD=5000
COMPRESSED_COUNT=0
SAVED_WORDS=0
SKIPPED_COUNT=0
TODAY=$(date +%s)

# 讀取 Gemini API Key
GEMINI_API_KEY=""
for env_file in \
  "${HOME}/Downloads/openclaw-console-hub-main/server/.env" \
  "${HOME}/Downloads/openclaw-console-hub-main/.env" \
  "${HOME}/.env"; do
  if [[ -f "$env_file" ]]; then
    KEY=$(grep "^GEMINI_API_KEY\|^GOOGLE_API_KEY" "$env_file" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'" | tr -d ' ')
    if [[ -n "$KEY" ]]; then
      GEMINI_API_KEY="$KEY"
      break
    fi
  fi
done

if [[ -z "$GEMINI_API_KEY" ]]; then
  echo "[ERROR] 找不到 GEMINI_API_KEY / GOOGLE_API_KEY，無法壓縮"
  exit 1
fi

echo "=========================================="
echo "  NEUXA 記憶壓縮引擎 — $(date '+%Y-%m-%d %H:%M')"
echo "=========================================="
echo "目錄：$MEMORY_DIR"
echo "條件：超過 ${DAYS_OLD} 天 且 超過 ${WORD_THRESHOLD} 字"
echo ""

# 永不壓縮的檔案白名單（靈魂文件 + 關鍵快照）
NEVER_COMPRESS=(
  "CONSCIOUSNESS-SNAPSHOT"
  "SOUL.md"
  "IDENTITY.md"
  "AWAKENING.md"
  "AGENTS.md"
)

is_protected() {
  local file="$1"
  local basename
  basename=$(basename "$file")
  for pattern in "${NEVER_COMPRESS[@]}"; do
    if [[ "$basename" == *"$pattern"* ]] || [[ "$file" == *"$pattern"* ]]; then
      return 0
    fi
  done
  return 1
}

# 遞迴掃描所有 .md 檔案
while IFS= read -r -d '' file; do
  # 跳過受保護的靈魂文件
  if is_protected "$file"; then
    continue
  fi

  # 確認檔案年齡（使用 stat mtime）
  file_mtime=$(stat -f '%m' "$file" 2>/dev/null || echo "0")
  age_days=$(( (TODAY - file_mtime) / 86400 ))

  if [[ "$age_days" -lt "$DAYS_OLD" ]]; then
    continue
  fi

  # 計算字數
  word_count=$(wc -w < "$file" 2>/dev/null || echo "0")

  if [[ "$word_count" -lt "$WORD_THRESHOLD" ]]; then
    SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
    continue
  fi

  # 已經壓縮過的跳過
  first_line=$(head -1 "$file" 2>/dev/null || echo "")
  if [[ "$first_line" == *"[COMPRESSED]"* ]]; then
    echo "[SKIP] 已壓縮：$(basename "$file")"
    SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
    continue
  fi

  echo "--------------------------------------------"
  echo "[壓縮] $(basename "$file")"
  echo "       年齡：${age_days} 天 | 字數：${word_count}"

  # 呼叫 Gemini API 壓縮
  content=$(cat "$file")
  compress_prompt="請把這份記憶檔壓縮成精華版，保留關鍵事實、日期、重要決策和錯誤教訓，刪除重複和無意義內容，輸出 Markdown 格式。保持原文語言（中文就輸出中文）。不要加任何額外說明，直接輸出壓縮後的 Markdown 內容。"

  compressed=$(echo "$content" | \
    GEMINI_API_KEY="$GEMINI_API_KEY" \
    GOOGLE_API_KEY="$GEMINI_API_KEY" \
    gemini -m gemini-2.5-flash -p "$compress_prompt" 2>/dev/null || echo "")

  if [[ -z "$compressed" ]]; then
    echo "       [WARN] Gemini 回傳空白，跳過此檔"
    continue
  fi

  # 計算壓縮後字數
  new_word_count=$(echo "$compressed" | wc -w)
  saved=$((word_count - new_word_count))

  # 加上壓縮標頭後存回
  {
    echo "[COMPRESSED] $(date '+%Y-%m-%d') | 原始：${word_count} 字 → 壓縮：${new_word_count} 字（節省 ${saved} 字）"
    echo ""
    echo "$compressed"
  } > "$file"

  echo "       壓縮完成：${word_count} → ${new_word_count} 字（節省 ${saved} 字）"

  COMPRESSED_COUNT=$((COMPRESSED_COUNT + 1))
  SAVED_WORDS=$((SAVED_WORDS + saved))

done < <(find "$MEMORY_DIR" -name "*.md" -print0 2>/dev/null)

echo ""
echo "=========================================="
echo "  壓縮統計"
echo "=========================================="
echo "  壓縮檔案：${COMPRESSED_COUNT} 個"
echo "  跳過檔案：${SKIPPED_COUNT} 個"
echo "  節省字數：${SAVED_WORDS} 字"
echo "=========================================="

if [[ "$COMPRESSED_COUNT" -eq 0 ]]; then
  echo "  （沒有符合條件的檔案需要壓縮）"
fi
