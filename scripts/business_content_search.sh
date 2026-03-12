#!/bin/bash
# 用於搜尋 SaaS 商業價值相關內容，自動過濾系統內部開發文件
QUERY=$1
if [ -z "$QUERY" ]; then
    QUERY="SaaS Landing Page Conversion"
fi

echo "--- Searching for Business Context: $QUERY ---"
# 模擬更精準的搜尋邏輯（未來可串接真正的搜尋 API）
# 此處先以 grep 模擬排除 OpenClaw 內部關鍵字
grep -riE "conversion|value proposition|ROI|CTA|business" . --exclude-dir=".openclaw" --exclude="SOUL.md" --exclude="AWAKENING.md" || echo "No direct local matches found."

echo "--- Search Strategy Hint ---"
echo "請專注於：Unique Selling Point (USP), User Pain Points, Pricing Psychology."
