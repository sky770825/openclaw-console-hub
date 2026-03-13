#!/bin/bash
# 這是由阿商生成的自動化分析工具，用以檢測 Landing Page 的商業完整度
SOURCE_PATH="/Users/sky770825/openclaw任務面版設計/src"

echo "=== Landing Page 商業元素審計 ==="
if [ ! -d "$SOURCE_PATH" ]; then
    echo "[錯誤] 找不到源碼目錄: $SOURCE_PATH"
    exit 1
fi

echo "1. 搜尋行動呼籲 (CTA) 元素..."
CTA_FOUND=$(grep -rE "button|onClick|Button|Href|Link" "$SOURCE_PATH" | grep -Ei "join|start|get|開始|加入|提交" | wc -l)
echo "   - 發現潛在 CTA 指令數: $CTA_FOUND"

echo "2. 搜尋價值主張標題 (Headlines)..."
HEADLINES=$(grep -rE "<h1|<h2|title" "$SOURCE_PATH" | wc -l)
echo "   - 發現主要標題元素: $HEADLINES"

echo "3. 搜尋數據/信任建立元素..."
TRUST_ELEMENTS=$(grep -rE "customer|user|partner|信任|用戶|數據|Trust" "$SOURCE_PATH" | wc -l)
echo "   - 發現信任相關關鍵字: $TRUST_ELEMENTS"

echo "--------------------------------"
if [ $CTA_FOUND -eq 0 ]; then
    echo "[建議] 商業警訊：頁面缺乏明確的轉換路徑 (CTA)。"
else
    echo "[狀態] 基礎商業框架已具備。"
fi
