#!/bin/bash
set -e

# 1. 定義路徑與變數
PROJECT_ROOT="/Users/sky770825/openclaw任務面版設計/server"
SCRIPT_PATH="/Users/sky770825/.openclaw/workspace/scripts/verify-qualitygate-fix.sh"
REPORT_DIR="/Users/sky770825/.openclaw/workspace/reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="$REPORT_DIR/typecheck_report_$TIMESTAMP.log"

# 2. 確保目錄存在
mkdir -p "$REPORT_DIR"
mkdir -p "/Users/sky770825/.openclaw/workspace/scripts"

# 3. 如果本腳本不在目標位置，則寫入一份備份到 scripts 目錄（符合 Quality Standards）
if [ "$0" != "$SCRIPT_PATH" ]; then
    cat "$0" > "$SCRIPT_PATH"
    chmod +x "$SCRIPT_PATH"
fi

echo "--- TypeScript Type Verification Start ---"
echo "Target: $PROJECT_ROOT"
echo "Target File: src/executor-agents.ts"

# 4. 進入專案目錄
if [ ! -d "$PROJECT_ROOT" ]; then
    echo "錯誤: 找不到專案路徑 $PROJECT_ROOT"
    exit 1
fi

cd "$PROJECT_ROOT"

# 5. 執行型別檢查
# 這裡使用 set +e 是為了即使檢查失敗也能產生報告並輸出結果
echo "正在執行 npx tsc --noEmit..."
set +e
npx tsc --noEmit > "$REPORT_FILE" 2>&1
EXIT_CODE=$?
set -e

# 6. 輸出檢查結果並存檔
echo "--- TSC Output Result ---"
if [ $EXIT_CODE -eq 0 ]; then
    echo "Result: SUCCESS (No type errors found)"
    echo "型別檢查通過！" >> "$REPORT_FILE"
else
    echo "Result: FAILURE (Type errors found)"
    cat "$REPORT_FILE"
fi
echo "--- End of Output ---"
echo "詳細報告已存至: $REPORT_FILE"

# 7. 最終總結
if [ $EXIT_CODE -eq 0 ]; then
    echo "TASK_COMPLETE: QualityGate 修復驗證成功。/Users/sky770825/openclaw任務面版設計/server/src/executor-agents.ts 的型別修復符合規範，npx tsc 無回傳錯誤。"
else
    echo "TASK_COMPLETE: QualityGate 修復驗證失敗。npx tsc 偵測到型別錯誤，請檢查報告內容以進行修正。"
    exit $EXIT_CODE
fi