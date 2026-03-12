#!/bin/bash
# test-monitoring.sh - 監控系統測試案例

echo "=== 開始監控系統測試 ==="

# 1. 測試數據收集腳本是否存在
if [ -f "scripts/collect-metrics.sh" ]; then
    echo "✅ 收集腳本存在"
else
    echo "❌ 收集腳本缺失"
    exit 1
fi

# 2. 執行收集並檢查輸出檔案
./scripts/collect-metrics.sh
DATE=$(date +%Y-%m-%d)
if [ -s "data/metrics/metrics_$DATE.csv" ]; then
    echo "✅ 數據收集成功，CSV 檔案非空"
else
    echo "❌ 數據收集失敗或 CSV 檔案為空"
    exit 1
fi

# 3. 測試報告生成
./scripts/generate-dashboard.sh > /dev/null
if [ -f "reports/dashboard_$DATE.md" ]; then
    echo "✅ 報告生成成功"
else
    echo "❌ 報告生成失敗"
    exit 1
fi

# 4. 測試異常燈號邏輯 (模擬高負載數據)
echo "=== 模擬異常燈號測試 ==="
MOCK_FILE="data/metrics/metrics_mock.csv"
echo "timestamp,cpu_pct,ram_gb,ollama_loaded,gemini_calls,sessions,subagents" > "$MOCK_FILE"
echo "2026-02-17T99:99:99,95.0,23.5,5,1600,100,50" >> "$MOCK_FILE"

# 暫時修改 generate-dashboard.sh 以讀取 mock 檔案進行驗證
sed -i '' 's|METRICS_FILE="data/metrics/metrics_$DATE.csv"|METRICS_FILE="data/metrics/metrics_mock.csv"|' scripts/generate-dashboard.sh
./scripts/generate-dashboard.sh > mock_report.md

if grep -q "🔴" mock_report.md; then
    echo "✅ 異常燈號 (🔴) 觸發測試通過"
else
    echo "❌ 異常燈號 (🔴) 觸發失敗"
    exit 1
fi

# 還原腳本
sed -i '' 's|METRICS_FILE="data/metrics/metrics_mock.csv"|METRICS_FILE="data/metrics/metrics_$DATE.csv"|' scripts/generate-dashboard.sh
rm mock_report.md "$MOCK_FILE"

echo "=== 所有測試通過 ==="
