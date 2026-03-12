#!/usr/bin/env bash
set -e
# 記憶庫快速搜尋腳本
# Usage: ./scripts/memory_search.sh [category|all|recent|date] [keyword] [end_date]

MEMORY_DIR="${MEMORY_DIR:-memory}"
INDEX_FILE="$MEMORY_DIR/INDEX-v2.json"

# 顯示使用說明
usage() {
    echo "記憶庫快速搜尋 (Quick Memory Search)"
    echo ""
    echo "用法:"
    echo "  $0 <類別> <關鍵字>      - 搜尋特定類別"
    echo "  $0 all <關鍵字>         - 搜尋所有檔案"
    echo "  $0 recent [N]           - 顯示最近 N 個檔案 (預設 10)"
    echo "  $0 date <開始> <結束>   - 依日期範圍搜尋"
    echo "  $0 stats                - 顯示統計"
    echo ""
    echo "類別: decisions, learnings, tasks, results, specs, system, anchors, checkpoints, intelligence, archive"
    echo ""
    echo "範例:"
    echo "  $0 specs insightpulse    # 搜尋 insightpulse 相關規格"
    echo "  $0 all autopilot         # 搜尋所有 autopilot 相關檔案"
    echo "  $0 recent 20             # 顯示最近 20 個檔案"
    echo "  $0 date 2026-02-10 2026-02-14  # 搜尋日期範圍"
}

# 檢查索引存在
if [ ! -f "$INDEX_FILE" ]; then
    echo "❌ 索引檔案不存在: $INDEX_FILE"
    echo "請先執行: ./scripts/build_memory_index_v2.sh"
    exit 1
fi

# 解析參數
COMMAND="${1:-}"
KEYWORD="${2:-}"
END_DATE="${3:-}"

# 無參數顯示說明
if [ -z "$COMMAND" ]; then
    usage
    exit 0
fi

# 統計功能
if [ "$COMMAND" = "stats" ]; then
    echo "📊 記憶庫統計"
    echo ""
    echo "各類別檔案數:"
    grep -o '"category": "[^"]*"' "$INDEX_FILE" | sed 's/"category": "//;s/"$//' | sort | uniq -c | sort -rn | while read count cat; do
        printf "  %-15s: %3d\n" "$cat" "$count"
    done
    echo ""
    total=$(grep -c '"file"' "$INDEX_FILE")
    echo "總計: $total 個檔案"
    exit 0
fi

# 最近檔案
if [ "$COMMAND" = "recent" ]; then
    limit="${KEYWORD:-10}"
    echo "📅 最近 $limit 個檔案"
    echo ""
    echo "| 日期 | 類別 | 檔案 | 標題 |"
    echo "|------|------|------|------|"
    
    # 使用 grep 和 sed 解析 JSON（簡易版）
    grep -E '"(category|file|title|date)":' "$INDEX_FILE" | paste - - - - | \
    sed 's/.*"category": "\([^"]*\)".*"file": "\([^"]*\)".*"title": "\([^"]*\)".*"date": "\([^"]*\)".*/\4|\1|\2|\3/' | \
    grep -v "N/A" | sort -r | head -$limit | while IFS='|' read date cat file title; do
        echo "| $date | $cat | \`$file\` | $title |"
    done
    exit 0
fi

# 日期範圍搜尋
if [ "$COMMAND" = "date" ]; then
    start_date="$KEYWORD"
    end_date="${END_DATE:-$start_date}"
    
    if [ -z "$start_date" ]; then
        echo "❌ 請提供開始日期"
        exit 1
    fi
    
    echo "📅 日期範圍: $start_date ~ $end_date"
    echo ""
    echo "| 日期 | 類別 | 檔案 | 標題 |"
    echo "|------|------|------|------|"
    
    grep -E '"(category|file|title|date)":' "$INDEX_FILE" | paste - - - - | \
    sed 's/.*"category": "\([^"]*\)".*"file": "\([^"]*\)".*"title": "\([^"]*\)".*"date": "\([^"]*\)".*/\4|\1|\2|\3/' | \
    awk -F'|' -v start="$start_date" -v end="$end_date" '$1 >= start && $1 <= end' | \
    sort -r | while IFS='|' read date cat file title; do
        echo "| $date | $cat | \`$file\` | $title |"
    done
    exit 0
fi

# 關鍵字搜尋
category="$COMMAND"
search_term="$KEYWORD"

if [ -z "$search_term" ]; then
    echo "❌ 請提供搜尋關鍵字"
    exit 1
fi

echo "🔍 搜尋: '$search_term'"
if [ "$category" != "all" ]; then
    echo "   類別: $category"
fi
echo ""

# 執行搜尋
echo "| 日期 | 類別 | 檔案 | 標題 |"
echo "|------|------|------|------|"

if [ "$category" = "all" ]; then
    # 搜尋所有類別
    grep -i "$search_term" "$INDEX_FILE" | grep -E '"(category|file|title|date)":' | paste - - - - | \
    sed 's/.*"category": "\([^"]*\)".*"file": "\([^"]*\)".*"title": "\([^"]*\)".*"date": "\([^"]*\)".*/\4|\1|\2|\3/' | \
    sort -r | while IFS='|' read date cat file title; do
        echo "| $date | $cat | \`$file\` | $title |"
    done
else
    # 搜尋特定類別
    grep -E '"(category|file|title|date)":' "$INDEX_FILE" | paste - - - - | \
    sed 's/.*"category": "\([^"]*\)".*"file": "\([^"]*\)".*"title": "\([^"]*\)".*"date": "\([^"]*\)".*/\4|\1|\2|\3/' | \
    grep "|$category|" | grep -i "$search_term" | \
    sort -r | while IFS='|' read date cat file title; do
        echo "| $date | $cat | \`$file\` | $title |"
    done
fi

echo ""
echo "✅ 搜尋完成"
