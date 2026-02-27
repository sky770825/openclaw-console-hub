#!/usr/bin/env bash

# 測試 oc.sh 的自然語言介面

OC="./scripts/oc.sh"

echo "==== 測試 1: 查詢指令 (Recall) ===="
$OC "幫我查一下如何備份資料庫"
echo ""

echo "==== 測試 2: 規劃指令 (Plan) ===="
$OC "計畫開發一個新的登入頁面"
echo ""

echo "==== 測試 3: 列表指令 (List) ===="
$OC "看下任務清單"
echo ""

echo "==== 測試 4: 新增指令 (Add) ===="
$OC "建立任務：寫週報"
echo ""

echo "==== 測試 5: 執行指令 (Run) ===="
$OC "執行任務 1"
echo ""

echo "==== 測試 6: 完成指令 (Done) ===="
$OC "標記完成 100"
echo ""

echo "==== 測試 7: 系統檢查 (Check) ===="
$OC "檢查系統狀態"
echo ""
