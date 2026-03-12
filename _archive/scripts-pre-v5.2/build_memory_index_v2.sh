#!/usr/bin/env bash
# 記憶庫索引與分類系統建置腳本 v2
# 任務 ID: memory-index-20260214

set -e

MEMORY_DIR="${1:-memory}"
OUTPUT_INDEX="$MEMORY_DIR/INDEX-v2.md"
OUTPUT_JSON="$MEMORY_DIR/INDEX-v2.json"

echo "🔍 掃描記憶庫檔案..."

# 收集所有 md 和 json 檔案（排除索引本身）
find "$MEMORY_DIR" -type f \( -name "*.md" -o -name "*.json" \) | grep -v "INDEX-v2" | grep -v "/INDEX\." | sort > /tmp/memory_files.txt

TOTAL=$(wc -l < /tmp/memory_files.txt | tr -d ' ')
echo "📊 發現 $TOTAL 個檔案"

# 初始化分類檔案
for cat in decisions learnings tasks results specs system anchors checkpoints intelligence archive other; do
    > "/tmp/cat_$cat.txt"
    echo "0" > "/tmp/count_$cat.txt"
done

# 分類函數
classify_file() {
    local filepath="$1"
    local filename=$(basename "$filepath")
    local dir=$(dirname "$filepath")
    
    # 基於路徑分類
    if [[ "$filepath" == *"autopilot-results"* ]]; then
        if [[ "$filename" == S-*.md ]]; then
            echo "specs"
        elif [[ "$filename" == TASK-*.md ]] || [[ "$filename" == task-*.md ]] || [[ "$filename" == t[0-9]*.md ]]; then
            echo "tasks"
        elif [[ "$filename" == *"report"* ]] || [[ "$filename" == *"REPORT"* ]] || [[ "$filename" == *"execution"* ]]; then
            echo "results"
        elif [[ "$filename" == *"roadmap"* ]] || [[ "$filename" == *"pricing"* ]] || [[ "$filename" == *"launch"* ]] || [[ "$filename" == *"blueprint"* ]]; then
            echo "specs"
        else
            echo "results"
        fi
    elif [[ "$filepath" == *"anchors"* ]]; then
        echo "anchors"
    elif [[ "$filepath" == *"checkpoints"* ]]; then
        echo "checkpoints"
    elif [[ "$filepath" == *"intelligence"* ]]; then
        echo "intelligence"
    elif [[ "$filepath" == *"archived"* ]]; then
        echo "archive"
    elif [[ "$filepath" == *"scripts"* ]] || [[ "$filepath" == *"context-summaries"* ]]; then
        echo "system"
    elif [[ "$filename" == INDEX* ]] || [[ "$filename" == MEMORY* ]] || [[ "$filename" == *"state"* ]] || [[ "$filename" == *"config"* ]] || [[ "$filename" == *"budget"* ]]; then
        echo "system"
    elif [[ "$filename" == *strategy* ]] || [[ "$filename" == *decision* ]] || [[ "$filename" == *business-model* ]] || [[ "$filename" == *"auto-escalation"* ]] || [[ "$filename" == *"conversation-intelligence"* ]]; then
        echo "decisions"
    elif [[ "$filename" == *research* ]] || [[ "$filename" == *learn* ]] || [[ "$filename" == *study* ]] || [[ "$filename" == *"monitoring-sop"* ]] || [[ "$filename" == *"sop"* ]] || [[ "$filename" == *"market-scan"* ]]; then
        echo "learnings"
    elif [[ "$filename" == *result* ]] || [[ "$filename" == *report* ]] || [[ "$filename" == *summary* ]] || [[ "$filename" == *scan* ]] || [[ "$filename" == *"context-eval"* ]] || [[ "$filename" == *"cron-fix"* ]]; then
        echo "results"
    elif [[ "$filename" == *tasks* ]] || [[ "$filename" == *task-queue* ]] || [[ "$filename" == *action-plan* ]]; then
        echo "tasks"
    elif [[ "$filename" == 2026-??-??.md ]]; then
        echo "tasks"
    else
        echo "other"
    fi
}

# 解析檔案標題
extract_title() {
    local filepath="$1"
    local title=$(head -50 "$filepath" 2>/dev/null | grep -m1 "^# " | sed 's/^# //' | head -c 80 || echo "N/A")
    if [ -z "$title" ]; then
        title=$(head -5 "$filepath" 2>/dev/null | grep -m1 "." | head -c 80 || echo "N/A")
    fi
    echo "$title"
}

# 解析日期
extract_date() {
    local filepath="$1"
    local filename=$(basename "$filepath")
    
    if [[ "$filename" =~ ([0-9]{4}-[0-9]{2}-[0-9]{2}) ]]; then
        echo "${BASH_REMATCH[1]}"
    elif [[ "$filename" =~ t([0-9]{13}) ]]; then
        echo "2026-02-13"
    else
        echo "N/A"
    fi
}

# 開始分類
echo "📂 開始分類檔案..."

while IFS= read -r filepath; do
    category=$(classify_file "$filepath")
    title=$(extract_title "$filepath")
    date=$(extract_date "$filepath")
    
    # 寫入分類檔案
    echo "$date|$filepath|$title" >> "/tmp/cat_$category.txt"
    
    # 更新計數
    count=$(cat "/tmp/count_$category.txt")
    echo $((count + 1)) > "/tmp/count_$category.txt"
    
done < /tmp/memory_files.txt

echo "✅ 分類完成"

# 生成 Markdown 索引
echo "📝 生成 INDEX-v2.md..."

cat > "$OUTPUT_INDEX" << 'HEADER'
# 記憶庫索引 v2 (Memory Index v2)
> 自動生成索引 | 分類系統 v2.0 | 重建: `./scripts/build_memory_index_v2.sh`

```
╔════════════════════════════════════════════════════════════╗
║  快速導航                                                  ║
╠════════════════════════════════════════════════════════════╣
║  [decisions](#-decisions)  |  [learnings](#-learnings)    ║
║  [tasks](#-tasks)          |  [results](#-results)        ║
║  [specs](#-specs)          |  [system](#-system)          ║
╚════════════════════════════════════════════════════════════╝
```

---

## 📊 統計概覽

| 類別 | 檔案數 | 說明 |
|------|--------|------|
HEADER

for cat in decisions learnings tasks results specs system anchors checkpoints intelligence archive other; do
    count=$(cat "/tmp/count_$cat.txt" 2>/dev/null || echo 0)
    case $cat in
        decisions) desc="戰略決策與方向調整" ;;
        learnings) desc="技術學習與知識累積" ;;
        tasks) desc="任務記錄與執行追蹤" ;;
        results) desc="執行結果與報告" ;;
        specs) desc="技術規格與產品設計" ;;
        system) desc="系統檔案與配置" ;;
        anchors) desc="錨點檔案（完整上下文）" ;;
        checkpoints) desc="會話檢查點" ;;
        intelligence) desc="情報收集與分析" ;;
        archive) desc="已歸檔檔案" ;;
        other) desc="其他未分類" ;;
    esac
    echo "| [$cat](#-$cat) | $count | $desc |" >> "$OUTPUT_INDEX"
done

echo "" >> "$OUTPUT_INDEX"
echo "**總計: $TOTAL 個檔案**" >> "$OUTPUT_INDEX"
echo "" >> "$OUTPUT_INDEX"

# 生成各類別詳細索引
for cat in decisions learnings tasks results specs system anchors checkpoints intelligence archive other; do
    count=$(cat "/tmp/count_$cat.txt" 2>/dev/null || echo 0)
    [ "$count" -eq 0 ] && continue
    
    echo "" >> "$OUTPUT_INDEX"
    echo "## 📁 $cat ($count files)" >> "$OUTPUT_INDEX"
    echo "" >> "$OUTPUT_INDEX"
    echo "| 日期 | 檔案路徑 | 標題 |" >> "$OUTPUT_INDEX"
    echo "|------|----------|------|" >> "$OUTPUT_INDEX"
    
    # 排序並輸出
    sort -r "/tmp/cat_$cat.txt" | while IFS='|' read -r date filepath title; do
        echo "| $date | \`$filepath\` | $title |" >> "$OUTPUT_INDEX"
    done
done

echo "" >> "$OUTPUT_INDEX"
echo "---" >> "$OUTPUT_INDEX"
echo "*Generated: $(date '+%Y-%m-%d %H:%M:%S')* | Task: memory-index-20260214" >> "$OUTPUT_INDEX"

# 生成 JSON 索引
echo "📝 生成 INDEX-v2.json..."

echo "[" > "$OUTPUT_JSON"
first=true

for cat in decisions learnings tasks results specs system anchors checkpoints intelligence archive other; do
    count=$(cat "/tmp/count_$cat.txt" 2>/dev/null || echo 0)
    [ "$count" -eq 0 ] && continue
    
    sort -r "/tmp/cat_$cat.txt" | while IFS='|' read -r date filepath title; do
        if [ "$first" = true ]; then
            first=false
        else
            echo "," >> "$OUTPUT_JSON"
        fi
        
        # 轉義特殊字符
        title_escaped=$(echo "$title" | sed 's/"/\\"/g' | tr '\n' ' ')
        fpath_escaped=$(echo "$filepath" | sed 's/"/\\"/g')
        
        echo "  {" >> "$OUTPUT_JSON"
        echo "    \"category\": \"$cat\"," >> "$OUTPUT_JSON"
        echo "    \"file\": \"$fpath_escaped\"," >> "$OUTPUT_JSON"
        echo "    \"title\": \"$title_escaped\"," >> "$OUTPUT_JSON"
        echo "    \"date\": \"$date\"" >> "$OUTPUT_JSON"
        echo -n "  }" >> "$OUTPUT_JSON"
    done
done

echo "" >> "$OUTPUT_JSON"
echo "]" >> "$OUTPUT_JSON"

# 輸出統計
echo ""
echo "📈 分類統計:"
echo "  ┌─────────────┬─────┐"
for cat in decisions learnings tasks results specs system anchors checkpoints intelligence archive other; do
    count=$(cat "/tmp/count_$cat.txt" 2>/dev/null || echo 0)
    printf "  │ %-11s │ %3d │\n" "$cat" "$count"
done
echo "  ├─────────────┼─────┤"
printf "  │ %-11s │ %3d │\n" "TOTAL" "$TOTAL"
echo "  └─────────────┴─────┘"
echo ""
echo "✅ 索引生成完成!"
echo "   📄 $OUTPUT_INDEX"
echo "   📄 $OUTPUT_JSON"

# 清理臨時檔案
rm -f /tmp/memory_files.txt /tmp/cat_*.txt /tmp/count_*.txt
