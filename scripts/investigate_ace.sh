#!/bin/bash
# This script searches for the identity of "阿策" (Ace) within the accessible project context.

PROJECT_ROOT="/Users/caijunchang/openclaw任務面版設計"
WORKSPACE_ROOT="/Users/caijunchang/.openclaw/workspace"
OUTPUT_FILE="/Users/caijunchang/.openclaw/workspace/reports/ace_identity_discovery.md"

echo "# 身份調查報告：阿策 (Ace)" > "$OUTPUT_FILE"
echo "生成時間: $(date)" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "## 1. 專案源代碼搜索結果" >> "$OUTPUT_FILE"
echo '```text' >> "$OUTPUT_FILE"
# Search for 阿策 in the project source, excluding hidden directories
grep -rn "阿策" "$PROJECT_ROOT" --exclude-dir=.git --exclude-dir=node_modules 2>/dev/null || echo "在專案源代碼中未找到 '阿策' 的直接提及。" >> "$OUTPUT_FILE"
echo '```' >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "## 2. 知識庫與工作區搜索結果" >> "$OUTPUT_FILE"
echo '```text' >> "$OUTPUT_FILE"
# Search in knowledge and reports
grep -rn "阿策" "$WORKSPACE_ROOT/knowledge" "$WORKSPACE_ROOT/reports" 2>/dev/null || echo "在工作區知識庫中未找到 '阿策' 的直接提及。" >> "$OUTPUT_FILE"
echo '```' >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "## 3. 關聯性分析" >> "$OUTPUT_FILE"
echo "根據初步搜尋，'阿策' 可能是一個口頭稱謂、開發者（小蔡）的特定角色化身（Persona），或是尚未在正式文檔中定義的新角色。" >> "$OUTPUT_FILE"
echo "目前的系統資訊多指向 '小蔡' (caijunchang) 與 'NEUXA' 專案本身。" >> "$OUTPUT_FILE"

echo "調查完成。"
