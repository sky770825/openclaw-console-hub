#!/bin/bash
# OpenClaw 系統自我診斷工具

echo "--- OpenClaw Doctor: Running Health Check ---"
DATE=$(date '+%Y-%m-%d %H:%M:%S')
echo "Timestamp: $DATE"

# 檢查唯讀源代碼區
if [ -d "/Users/caijunchang/openclaw任務面版設計" ]; then
    echo "[OK] Source directory is accessible."
else
    echo "[FAIL] Source directory NOT FOUND."
fi

# 檢查工作區寫入權限
WORKSPACE_DIRS=("/Users/caijunchang/.openclaw/workspace/scripts" "/Users/caijunchang/.openclaw/workspace/knowledge" "/Users/caijunchang/.openclaw/workspace/sandbox")
for dir in "${WORKSPACE_DIRS[@]}"; do
    if [ -w "$dir" ]; then
        echo "[OK] Directory is writable: $dir"
    else
        echo "[FAIL] Directory NOT writable: $dir"
    fi
done

# 檢查必備工具
TOOLS=("bash" "curl" "node" "python3" "jq" "sed" "awk" "grep" "find")
for tool in "${TOOLS[@]}"; do
    if command -v $tool >/dev/null 2>&1; then
        echo "[OK] Tool found: $tool"
    else
        echo "[FAIL] Tool MISSING: $tool"
    fi
done

echo "--- Diagnosis Complete ---"
