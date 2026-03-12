#!/bin/bash

# 📝 README 自動摘要生成腳本
# 用途：自動掃描專案目錄，生成進度摘要

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
PROJECTS_DIR="${PROJECTS_DIR:-./projects}"
OUTPUT_FILE="${OUTPUT_FILE:-./RESEARCH-SUMMARY.md}"
DATE=$(date +%Y-%m-%d)

# 函數：列印標題
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  🧪 科研中心 - README 自動摘要${NC}"
    echo -e "${BLUE}  日期: $DATE${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

# 函數：統計專案數量
count_projects() {
    local count=0
    if [ -d "$PROJECTS_DIR" ]; then
        count=$(find "$PROJECTS_DIR" -maxdepth 1 -type d | wc -l)
        count=$((count - 1))  # 減去自身
    fi
    echo "$count"
}

# 函數：統計 RESULT.md 檔案
count_results() {
    local count=0
    if [ -d "$PROJECTS_DIR" ]; then
        count=$(find "$PROJECTS_DIR" -name "RESULT.md" -type f 2>/dev/null | wc -l)
    fi
    echo "$count"
}

# 函數：統計知識庫檔案
count_knowledge() {
    local count=0
    if [ -d "./knowledge" ]; then
        count=$(find "./knowledge" -name "*.md" -type f 2>/dev/null | wc -l)
    fi
    echo "$count"
}

# 函數：生成摘要內容
generate_summary() {
    local project_count=$(count_projects)
    local result_count=$(count_results)
    local knowledge_count=$(count_knowledge)

    cat > "$OUTPUT_FILE" << EOF
# 🧪 科研中心進度摘要

**生成日期**: $DATE  
**生成者**: 小蔡自動摘要系統

---

## 📊 整體統計

| 指標 | 數值 |
|------|------|
| 專案總數 | $project_count |
| 已完成 RESULT | $result_count |
| 知識庫文件 | $knowledge_count |

---

## 🗂️ 活躍專案列表

EOF

    # 列出所有專案
    if [ -d "$PROJECTS_DIR" ]; then
        for project in "$PROJECTS_DIR"/*/; do
            if [ -d "$project" ]; then
                local project_name=$(basename "$project")
                local has_result="❌"
                local last_update="N/A"

                if [ -f "$project/RESULT.md" ]; then
                    has_result="✅"
                    last_update=$(stat -f "%Sm" -t "%Y-%m-%d" "$project/RESULT.md" 2>/dev/null || echo "Unknown")
                fi

                echo "### $project_name" >> "$OUTPUT_FILE"
                echo "" >> "$OUTPUT_FILE"
                echo "- 狀態: $has_result RESULT.md" >> "$OUTPUT_FILE"
                echo "- 最後更新: $last_update" >> "$OUTPUT_FILE"
                echo "" >> "$OUTPUT_FILE"
            fi
        done
    fi

    # 添加頁尾
    cat >> "$OUTPUT_FILE" << EOF

---

## 🧠 科研中心目標

1. **Agent 意識迭代**: 建立元認知監控層，提升任務成功率 30%
2. **數據嫁接技術**: 實現跨專案知識無縫流動
3. **本地模型優化**: 使用 Qwen3:4b 降低 Token 成本

---

*此摘要由科研中心自動生成系統創建*
EOF

    echo -e "${GREEN}✅ 摘要已生成: $OUTPUT_FILE${NC}"
}

# 函數：顯示幫助
show_help() {
    echo "用法: $0 [選項]"
    echo ""
    echo "選項:"
    echo "  -h, --help       顯示此幫助"
    echo "  -o, --output     指定輸出檔案 (預設: ./RESEARCH-SUMMARY.md)"
    echo "  -p, --projects   指定專案目錄 (預設: ./projects)"
    echo ""
    echo "環境變數:"
    echo "  PROJECTS_DIR     專案目錄路徑"
    echo "  OUTPUT_FILE      輸出檔案路徑"
}

# 主程式
main() {
    # 解析參數
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -o|--output)
                OUTPUT_FILE="$2"
                shift 2
                ;;
            -p|--projects)
                PROJECTS_DIR="$2"
                shift 2
                ;;
            *)
                echo -e "${RED}未知選項: $1${NC}"
                show_help
                exit 1
                ;;
        esac
    done

    print_header
    
    echo -e "${YELLOW}📁 專案目錄: $PROJECTS_DIR${NC}"
    echo -e "${YELLOW}📄 輸出檔案: $OUTPUT_FILE${NC}"
    echo ""

    # 檢查目錄是否存在
    if [ ! -d "$PROJECTS_DIR" ]; then
        echo -e "${RED}❌ 錯誤: 專案目錄不存在: $PROJECTS_DIR${NC}"
        exit 1
    fi

    # 生成摘要
    generate_summary

    echo ""
    echo -e "${GREEN}🎉 完成!${NC}"
}

# 執行主程式
main "$@"
