#!/bin/bash
PROJECT_ROOT="/Users/caijunchang/openclaw任務面版設計"
REPORT_PATH=$1

echo "## OpenClaw 官網功能特色頁面：穩定度分析報告" > "$REPORT_PATH"
echo "產出時間: $(date)" >> "$REPORT_PATH"
echo "" >> "$REPORT_PATH"

analyze_stability() {
    local label=$1
    local pattern=$2
    local files=$3
    echo "### $label 檢查" >> "$REPORT_PATH"
    local count=0
    for f in $files; do
        local matches=$(grep -cE "$pattern" "$f" || true)
        if [ "$matches" -gt 0 ]; then
            echo "- \`$(basename "$f")\`: 發現 $matches 處相關實作" >> "$REPORT_PATH"
            count=$((count + matches))
        fi
    done
    if [ "$count" -eq 0 ]; then
        echo "- **警告**: 未在相關組件中發現 $label 實作，可能存在穩定性風險。" >> "$REPORT_PATH"
    fi
    echo "" >> "$REPORT_PATH"
}

# 取得文件清單
FILES=$(find "$PROJECT_ROOT/src" -type f \( -name "*Feature*" -o -name "*Landing*" \) | grep -E "\.(js|jsx|ts|tsx)$")

# 檢查項目 1: 錯誤捕捉 (Error Handling)
analyze_stability "錯誤捕捉 (try...catch/ErrorBoundary)" "catch|ErrorBoundary|onError" "$FILES"

# 檢查項目 2: 加載狀態 (Loading States)
analyze_stability "加載狀態 (loading/skeleton/Spinner)" "loading|isLoading|Skeleton|Spinner|Suspense" "$FILES"

# 檢查項目 3: 異步數據穩定性 (Async Safety)
analyze_stability "異步數據處理 (Async/Await)" "async|await|fetch|axios|\.then" "$FILES"

# 檢查項目 4: 資源釋放 (Memory Leak Prevention)
analyze_stability "副作用清理 (useEffect Cleanup)" "useEffect\(.*\s*=>\s*\{.*return\s*\(?\s*=>" "$FILES"

# 檢查項目 5: 控制台殘留 (Debug Logs)
echo "### 生產環境代碼清理檢查" >> "$REPORT_PATH"
LOG_COUNT=$(grep -r "console\.log" "$PROJECT_ROOT/src" --include="*Feature*" | wc -l || echo 0)
if [ "$LOG_COUNT" -gt 5 ]; then
    echo "- **提醒**: 發現 $LOG_COUNT 處 console.log，建議在生產版本中移除以優化性能。" >> "$REPORT_PATH"
else
    echo "- 檢查通過：console.log 殘留量低 ($LOG_COUNT)。" >> "$REPORT_PATH"
fi

echo "---" >> "$REPORT_PATH"
echo "穩定度建議：" >> "$REPORT_PATH"
echo "1. 確保所有外部資源加載都有對應的 Skeleton Screen，避免 Layout Shift。" >> "$REPORT_PATH"
echo "2. 功能特色頁面若包含複雜動畫，建議檢查 Web Vitals 中的 CLS 指標。" >> "$REPORT_PATH"
