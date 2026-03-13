#!/bin/bash
SOURCE_DIR="/Users/sky770825/openclaw任務面版設計"
REPORT_FILE=$1

echo "# 任務面版系統檢查報告 (Task Board Audit Report)" > "$REPORT_FILE"
echo "檢查時間: $(date)" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "## 1. 專案結構概覽" >> "$REPORT_FILE"
if [ -d "$SOURCE_DIR" ]; then
    echo "- 專案路徑: $SOURCE_DIR" >> "$REPORT_FILE"
    echo "- 總檔案數: $(find "$SOURCE_DIR" -type f | grep -v "node_modules" | grep -v ".git" | wc -l)" >> "$REPORT_FILE"
    echo "- 前端檔案數 (src/): $(find "$SOURCE_DIR/src" -type f 2>/dev/null | wc -l || echo 0)" >> "$REPORT_FILE"
    echo "- 後端檔案數 (server/src/): $(find "$SOURCE_DIR/server/src" -type f 2>/dev/null | wc -l || echo 0)" >> "$REPORT_FILE"
else
    echo "❌ 錯誤: 找不到專案原始碼目錄。" >> "$REPORT_FILE"
    exit 1
fi

echo "" >> "$REPORT_FILE"
echo "## 2. 依賴項分析 (package.json)" >> "$REPORT_FILE"

check_package_json() {
    local dir=$1
    local name=$2
    if [ -f "$dir/package.json" ]; then
        echo "### $name" >> "$REPORT_FILE"
        echo "- **名稱**: $(jq -r '.name' "$dir/package.json")" >> "$REPORT_FILE"
        echo "- **版本**: $(jq -r '.version' "$dir/package.json")" >> "$REPORT_FILE"
        echo "- **主要腳本**:" >> "$REPORT_FILE"
        jq -r '.scripts | to_entries[] | "  - \(.key): \(.value)"' "$dir/package.json" >> "$REPORT_FILE"
    else
        echo "### $name: 未找到 package.json" >> "$REPORT_FILE"
    fi
}

check_package_json "$SOURCE_DIR" "前端專案"
check_package_json "$SOURCE_DIR/server" "後端專案"

echo "" >> "$REPORT_FILE"
echo "## 3. 程式碼潛在問題掃描 (Static Analysis)" >> "$REPORT_FILE"

scan_pattern() {
    local pattern=$1
    local description=$2
    local count=$(grep -r "$pattern" "$SOURCE_DIR" --exclude-dir={node_modules,.git,dist} | wc -l)
    echo "- **$description ($pattern)**: $count 處" >> "$REPORT_FILE"
    if [ "$count" -gt 0 ]; then
        echo "  <details><summary>點擊展開詳情</summary>" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
        echo "\`\`\`" >> "$REPORT_FILE"
        grep -r "$pattern" "$SOURCE_DIR" --exclude-dir={node_modules,.git,dist} | head -n 10 >> "$REPORT_FILE"
        [ "$count" -gt 10 ] && echo "... (還有 $((count-10)) 處)" >> "$REPORT_FILE"
        echo "\`\`\`" >> "$REPORT_FILE"
        echo "</details>" >> "$REPORT_FILE"
    fi
}

scan_pattern "TODO" "待辦事項"
scan_pattern "FIXME" "修復標記"
scan_pattern "console.log" "Debug 輸出"
scan_pattern "localhost:" "硬編碼本地位址"
scan_pattern "any" "TypeScript 'any' 類型使用"

echo "" >> "$REPORT_FILE"
echo "## 4. 關鍵文件完整性檢查" >> "$REPORT_FILE"
files_to_check=(
    "src/App.tsx"
    "src/main.tsx"
    "server/src/index.ts"
    ".env.example"
    "tsconfig.json"
)

for f in "${files_to_check[@]}"; do
    if [ -f "$SOURCE_DIR/$f" ]; then
        echo "- [x] $f 存在" >> "$REPORT_FILE"
    else
        echo "- [ ] $f **缺失**" >> "$REPORT_FILE"
    fi
done

echo "" >> "$REPORT_FILE"
echo "## 5. 後端 API 定義掃描 (Express/Koa routes)" >> "$REPORT_FILE"
echo "掃描 server/src 中的路由定義..." >> "$REPORT_FILE"
echo "\`\`\`" >> "$REPORT_FILE"
grep -rE "\.(get|post|put|delete|patch)\(" "$SOURCE_DIR/server/src" 2>/dev/null | head -n 15 >> "$REPORT_FILE" || echo "未發現路由定義" >> "$REPORT_FILE"
echo "\`\`\`" >> "$REPORT_FILE"

echo "" >> "$REPORT_FILE"
echo "---" >> "$REPORT_FILE"
echo "結論: 檢查完成。請參閱上述詳情以評估「任務版」是否存在問題。" >> "$REPORT_FILE"
