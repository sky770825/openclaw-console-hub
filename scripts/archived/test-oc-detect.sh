#!/bin/bash
# 現場偵測機制測試腳本 (test-oc-detect.sh)

set -u

# 顏色定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}=== 測試 1: 直接執行 oc-detect.sh ===${NC}"
if ./scripts/oc-detect.sh | grep -q "Agent 現場偵測報告"; then
    echo -e "${GREEN}PASS: 成功生成報告${NC}"
else
    echo -e "${RED}FAIL: 未能生成報告${NC}"
fi

echo -e "\n${YELLOW}=== 測試 2: 透過 oc check 觸發 ===${NC}"
if ./scripts/oc.sh check | grep -q "🖥️ 系統資源"; then
    echo -e "${GREEN}PASS: oc check 整合成功${NC}"
else
    echo -e "${RED}FAIL: oc check 整合失敗${NC}"
fi

echo -e "\n${YELLOW}=== 測試 3: 自然語言指令測試 ===${NC}"
# 測試 "檢查一下現場"
if python3 ./scripts/oc-nli.py "檢查一下現場" | grep -q "解析成功"; then
    echo -e "${GREEN}PASS: 自然語言解析成功${NC}"
else
    echo -e "${RED}FAIL: 自然語言解析失敗${NC}"
fi

echo -e "\n${YELLOW}=== 測試 4: 模擬服務異常 (假連線測試) ===${NC}"
# 暫時修改 API URL 來測試 RED 燈號
# macOS 上的 sed -i 需要加上空字串參數
sed -i '' 's|TASKBOARD_API_URL="http://localhost:3011"|TASKBOARD_API_URL="http://localhost:9999"|' scripts/oc-detect.sh
if ./scripts/oc-detect.sh | grep -q "任務板後端 (Port 3011): 🔴 無法連線"; then
    echo -e "${GREEN}PASS: 異常偵測燈號正確${NC}"
else
    echo -e "${RED}FAIL: 異常偵測燈號錯誤${NC}"
fi
sed -i '' 's|TASKBOARD_API_URL="http://localhost:9999"|TASKBOARD_API_URL="http://localhost:3011"|' scripts/oc-detect.sh

echo -e "\n${YELLOW}測試完成。${NC}"
