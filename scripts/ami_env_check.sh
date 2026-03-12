#!/bin/bash
echo "--- 阿秘環境檢查工具 ---"
echo "檢查目錄權限..."
DIRS=("/Users/caijunchang/.openclaw/workspace/sandbox" "/Users/caijunchang/.openclaw/workspace/scripts" "/Users/caijunchang/.openclaw/workspace/reports")
for dir in "${DIRS[@]}"; do
    if [ -w "$dir" ]; then
        echo "[OK] 寫入權限: $dir"
    else
        echo "[FAIL] 無寫入權限: $dir"
    fi
done

echo "檢查關鍵限制區域 (應僅限讀取)..."
SOURCE="/Users/caijunchang/openclaw任務面版設計"
if [ -d "$SOURCE" ]; then
    echo "[OK] 專案源碼可讀取: $SOURCE"
    FILE_COUNT=$(find "$SOURCE" -maxdepth 2 | wc -l)
    echo "     找到約 $FILE_COUNT 個項目"
fi
echo "--- 檢查完成 ---"
