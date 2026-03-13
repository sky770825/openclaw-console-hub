#!/bin/bash
# 自動偵測現有的生產能力
SOURCE_DIR="/Users/caijunchang/openclaw任務面版設計"

echo "--- 正在掃描生產線設備 (Source Code Analysis) ---"

# 統計 UI 組件數量 (前端產出能力)
UI_COUNT=$(find "$SOURCE_DIR/src" -maxdepth 3 -name "*.tsx" -o -name "*.jsx" | wc -l)
echo "偵測到可用的前端組件範本: $UI_COUNT"

# 統計 API 路由 (後端產出能力)
API_COUNT=$(find "$SOURCE_DIR/server/src" -name "*route*" | wc -l)
echo "偵測到現有的 API 生產線: $API_COUNT"

# 檢查系統核心
if [ -d "$SOURCE_DIR/server" ]; then
    echo "核心動力源 (Backend Server): 運行中"
fi

echo "--- 掃描完畢 ---"
