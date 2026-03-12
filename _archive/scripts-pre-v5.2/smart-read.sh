#!/bin/zsh
# Smart Read v2.0 - qmd + sed 精準切片
# 用法: ./smart-read.sh <關鍵詞> [檔案路徑]

set -euo pipefail

WORKSPACE="${HOME}/.openclaw/workspace"
QMD_PATH="${WORKSPACE}/skills/anshumanbh-qmd/qmd"

# 預設搜尋目錄
DEFAULT_PATHS=(
    "${WORKSPACE}/memory"
    "${WORKSPACE}/.auto-skill/experience"
    "${WORKSPACE}/.auto-skill/knowledge"
    "${WORKSPACE}/learning"
)

# 參數
QUERY="${1:-}"
CUSTOM_PATH="${2:-}"

if [[ -z "$QUERY" ]]; then
    echo "用法: smart-read <關鍵詞> [檔案路徑]"
    echo "範例: smart-read '任務卡' memory/"
    exit 1
fi

echo "🔍 精準切片搜尋: '$QUERY'"
echo "═══════════════════════════════════════"

# 如果有指定路徑，優先使用
if [[ -n "$CUSTOM_PATH" && -d "$CUSTOM_PATH" ]]; then
    SEARCH_PATHS=("$CUSTOM_PATH")
else
    SEARCH_PATHS=("${DEFAULT_PATHS[@]}")
fi

# 使用 qmd 搜尋 + sed 切片
for path in "${SEARCH_PATHS[@]}"; do
    if [[ ! -d "$path" ]]; then
        continue
    fi
    
    # 找到相關檔案
    files=$(find "$path" -name "*.md" -type f 2>/dev/null | head -20)
    
    for file in $files; do
        # 檢查檔案是否包含關鍵詞
        if grep -qi "$QUERY" "$file" 2>/dev/null; then
            echo ""
            echo "📄 $(basename "$file")"
            echo "───────────────────────────────────────"
            
            # 使用 sed 提取關鍵詞前後的上下文（精準切片）
            # 找到關鍵詞所在行，輸出前後 5 行
            grep -n -i "$QUERY" "$file" 2>/dev/null | head -3 | while read match; do
                line_num=$(echo "$match" | cut -d: -f1)
                start=$((line_num - 5))
                end=$((line_num + 5))
                [[ $start -lt 1 ]] && start=1
                
                sed -n "${start},${end}p" "$file" 2>/dev/null
                echo "..."
            done
        fi
    done
done

echo ""
echo "═══════════════════════════════════════"
echo "✅ 完成 - 使用 Token: ~$(echo "$QUERY" | wc -c) bytes"
