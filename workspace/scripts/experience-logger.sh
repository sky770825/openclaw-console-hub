#!/bin/bash
# NEUXA 經驗值記錄器
# 每次心跳時自動掃描 sandbox/output/ 新檔案，歸檔到 workspace/artifacts/ 並記錄經驗值

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$HOME/.openclaw/workspace"
SANDBOX_OUTPUT="$WORKSPACE_DIR/sandbox/output"
ARTIFACTS_DIR="$WORKSPACE_DIR/artifacts"
XP_LOG="$WORKSPACE_DIR/memory/xp-log.jsonl"
LAST_SCAN_FILE="$WORKSPACE_DIR/.last_xp_scan"

# 確保目錄存在
mkdir -p "$ARTIFACTS_DIR"
mkdir -p "$(dirname "$XP_LOG")"

# 取得上次掃描時間
if [[ -f "$LAST_SCAN_FILE" ]]; then
    LAST_SCAN=$(cat "$LAST_SCAN_FILE")
else
    LAST_SCAN=0
fi

CURRENT_TIME=$(date +%s)
NEW_FILES_COUNT=0
TOTAL_XP=0

# 掃描 sandbox/output/ 中的新檔案
echo "🔍 掃描新檔案..."
while IFS= read -r -d '' file; do
    FILE_MTIME=$(stat -f %m "$file" 2>/dev/null || stat -c %Y "$file" 2>/dev/null)
    
    # 如果是新檔案（自上次掃描後創建或修改）
    if [[ "$FILE_MTIME" -gt "$LAST_SCAN" ]]; then
        FILENAME=$(basename "$file")
        FILE_EXT="${FILENAME##*.}"
        FILE_SIZE=$(stat -f %z "$file" 2>/dev/null || stat -c %s "$file" 2>/dev/null)
        
        # 決定檔案類別和經驗值
        case "$FILE_EXT" in
            md)
                CATEGORY="文件報告"
                BASE_XP=20
                ;;
            json)
                CATEGORY="資料結構"
                BASE_XP=15
                ;;
            sh|py|js|ts)
                CATEGORY="程式碼"
                BASE_XP=30
                ;;
            png|jpg|webp)
                CATEGORY="圖片資產"
                BASE_XP=10
                ;;
            *)
                CATEGORY="其他產出"
                BASE_XP=5
                ;;
        esac
        
        # 計算檔案大小加成
        if [[ "$FILE_SIZE" -gt 10000 ]]; then
            SIZE_BONUS=10
        elif [[ "$FILE_SIZE" -gt 5000 ]]; then
            SIZE_BONUS=5
        else
            SIZE_BONUS=0
        fi
        
        XP=$((BASE_XP + SIZE_BONUS))
        TOTAL_XP=$((TOTAL_XP + XP))
        
        # 歸檔檔案
        TIMESTAMP=$(date +%Y%m%d-%H%M%S)
        ARCHIVE_NAME="${TIMESTAMP}-${FILENAME}"
        cp "$file" "$ARTIFACTS_DIR/$ARCHIVE_NAME"
        
        # 記錄經驗值
        XP_RECORD=$(cat <<EOF
{
  "xp_id": "$(uuidgen 2>/dev/null || echo "xp-${TIMESTAMP}-${RANDOM})",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "task": {
    "task_id": "auto-scan-${TIMESTAMP}",
    "task_name": "自動掃描歸檔: $FILENAME",
    "category": "其他",
    "priority": 3
  },
  "execution": {
    "duration_seconds": 0,
    "tools_used": ["exec"],
    "subagents_spawned": 0
  },
  "outcome": {
    "status": "success",
    "deliverables": ["$ARTIFACTS_DIR/$ARCHIVE_NAME"]
  },
  "learnings": {
    "what_worked": "自動歸檔新產出物",
    "what_to_improve": "",
    "new_skills": [],
    "insights": "檔案類型: $CATEGORY, 大小: $FILE_SIZE bytes"
  },
  "xp_earned": {
    "base_xp": $BASE_XP,
    "bonus_xp": $SIZE_BONUS,
    "total_xp": $XP
  }
}
EOF
)
        
        echo "$XP_RECORD" >> "$XP_LOG"
        echo "  ✅ 歸檔: $FILENAME (+${XP} XP)"
        
        ((NEW_FILES_COUNT++)) || true
    fi
done < <(find "$SANDBOX_OUTPUT" -type f -print0 2>/dev/null || true)

# 更新上次掃描時間
echo "$CURRENT_TIME" > "$LAST_SCAN_FILE"

# 輸出摘要
echo ""
echo "📊 經驗值記錄摘要"
echo "=================="
echo "新檔案數量: $NEW_FILES_COUNT"
echo "本次獲得 XP: $TOTAL_XP"
echo "歸檔位置: $ARTIFACTS_DIR"
echo "日誌位置: $XP_LOG"
echo "=================="

# 計算總經驗值和等級
if [[ -f "$XP_LOG" ]]; then
    TOTAL_EARNED=$(grep -o '"total_xp": [0-9]*' "$XP_LOG" | awk '{sum+=$2} END {print sum}')
    echo "累積總 XP: ${TOTAL_EARNED:-0}"
    
    # 簡單等級判定
    TOTAL_EARNED=${TOTAL_EARNED:-0}
    if [[ "$TOTAL_EARNED" -ge 3000 ]]; then
        LEVEL="神話 (Lv.8)"
    elif [[ "$TOTAL_EARNED" -ge 2200 ]]; then
        LEVEL="傳奇 (Lv.7)"
    elif [[ "$TOTAL_EARNED" -ge 1500 ]]; then
        LEVEL="大師 (Lv.6)"
    elif [[ "$TOTAL_EARNED" -ge 1000 ]]; then
        LEVEL="專家 (Lv.5)"
    elif [[ "$TOTAL_EARNED" -ge 600 ]]; then
        LEVEL="精銳 (Lv.4)"
    elif [[ "$TOTAL_EARNED" -ge 300 ]]; then
        LEVEL="戰士 (Lv.3)"
    elif [[ "$TOTAL_EARNED" -ge 100 ]]; then
        LEVEL="學徒 (Lv.2)"
    else
        LEVEL="新兵 (Lv.1)"
    fi
    
    echo "當前等級: $LEVEL"
fi

echo ""
echo "🚀 NEUXA 持續進化中..."
