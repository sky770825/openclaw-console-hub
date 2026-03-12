#!/bin/bash
# 小蔡指令系統：自主排解、拒絕卡關診斷工具

REPORT_PATH="/Users/caijunchang/.openclaw/workspace/reports/diagnosis_$(date +%Y%m%d_%H%M%S).report"
SRC="/Users/caijunchang/openclaw任務面版設計"

echo "==========================================" | tee -a "$REPORT_PATH"
echo "  [阿秘] 執行老蔡核心指令：自主排解診斷" | tee -a "$REPORT_PATH"
echo "  時間: $(date)" | tee -a "$REPORT_PATH"
echo "==========================================" | tee -a "$REPORT_PATH"

# A. 檢查關鍵檔案完整性
echo "--- [1/4] 專案結構掃描 ---" | tee -a "$REPORT_PATH"
CRITICAL_FILES=("package.json" "server/package.json" "src/main.tsx" "server/src/index.ts")
for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$SRC/$file" ]; then
        echo "✅ 關鍵檔案存在: $file" | tee -a "$REPORT_PATH"
    else
        echo "⚠️ 缺失關鍵檔案: $file" | tee -a "$REPORT_PATH"
    fi
done

# B. 檢查依賴狀態
echo -e "\n--- [2/4] 依賴與版本檢查 ---" | tee -a "$REPORT_PATH"
echo "Node Version: $(node -v)" | tee -a "$REPORT_PATH"
if [ -d "$SRC/node_modules" ]; then
    echo "✅ Root node_modules 已安裝" | tee -a "$REPORT_PATH"
else
    echo "❌ Root node_modules 缺失 (需執行 npm install)" | tee -a "$REPORT_PATH"
fi

# C. 檢查通訊端口 (拒絕卡關：防止端口衝突)
echo -e "\n--- [3/4] 端口佔用診斷 ---" | tee -a "$REPORT_PATH"
PORTS=(3000 3001 5173 8000 8080)
for port in "${PORTS[@]}"; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        PID=$(lsof -t -i:$port)
        echo "⚠️ 端口 $port 被 PID $PID 佔用，可能導致啟動失敗" | tee -a "$REPORT_PATH"
    else
        echo "✅ 端口 $port 狀態良好 (可用)" | tee -a "$REPORT_PATH"
    fi
done

# D. 掃描源碼中的阻塞標記
echo -e "\n--- [4/4] 掃描程式碼阻塞標籤 (TODO/FIXME) ---" | tee -a "$REPORT_PATH"
grep -rnE "TODO|FIXME|TEMP|BUG" "$SRC/src" "$SRC/server/src" 2>/dev/null | head -n 15 | tee -a "$REPORT_PATH" || echo "未發現顯式阻塞標籤" | tee -a "$REPORT_PATH"

echo -e "\n==========================================" | tee -a "$REPORT_PATH"
echo "  診斷完成。請參閱報表: $REPORT_PATH" | tee -a "$REPORT_PATH"
echo "==========================================" | tee -a "$REPORT_PATH"
