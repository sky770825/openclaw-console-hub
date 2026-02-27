#!/bin/bash
# generate-dashboard.sh - 報告生成與儀表板顯示

DATE=$(date +%Y-%m-%d)
METRICS_FILE="data/metrics/metrics_$DATE.csv"
REPORT_FILE="reports/dashboard_$DATE.md"

# 閾值設定
CPU_WARN=70
CPU_CRIT=90
RAM_WARN=18
RAM_CRIT=22
GEMINI_WARN=1000
GEMINI_CRIT=1500

if [ ! -f "$METRICS_FILE" ]; then
    echo "❌ 找不到今日數據檔案: $METRICS_FILE"
    exit 1
fi

# 讀取最後一筆數據
LATEST=$(tail -n 1 "$METRICS_FILE")
IFS=',' read -r ts cpu ram ollama gemini sessions subagents <<< "$LATEST"

# 狀態判斷函數
get_status_icon() {
    local val=$1
    local warn=$2
    local crit=$3
    if (( $(echo "$val >= $crit" | bc -l) )); then
        echo "🔴"
    elif (( $(echo "$val >= $warn" | bc -l) )); then
        echo "🟡"
    else
        echo "🟢"
    fi
}

CPU_STATUS=$(get_status_icon "$cpu" "$CPU_WARN" "$CPU_CRIT")
RAM_STATUS=$(get_status_icon "$ram" "$RAM_WARN" "$RAM_CRIT")
GEMINI_STATUS=$(get_status_icon "$gemini" "$GEMINI_WARN" "$GEMINI_CRIT")

# 生成 Markdown 報告
cat <<EOF > "$REPORT_FILE"
# 🚀 OpenClaw 系統性能與成本監控儀表板
更新時間: $ts

## 📊 系統核心性能
| 指標 | 當前數值 | 狀態 | 閾值 (警告/臨界) |
| :--- | :--- | :--- | :--- |
| **CPU 使用率** | $cpu% | $CPU_STATUS | $CPU_WARN% / $CPU_CRIT% |
| **RAM 使用量** | $ram GB | $RAM_STATUS | $RAM_WARN / $RAM_CRIT GB |
| **活動 Sessions** | $sessions | - | - |
| **子代理並行數** | $subagents | - | - |

## 💰 成本與資源利用
| 指標 | 當前數值 | 狀態 | 每日限制/建議 |
| :--- | :--- | :--- | :--- |
| **Gemini API 呼叫** | $gemini | $GEMINI_STATUS | $GEMINI_WARN / $GEMINI_CRIT |
| **Ollama 已加載模型** | $ollama | - | 建議 < 3 |

## 📝 運行摘要
$(if [ "$CPU_STATUS" != "🟢" ] || [ "$RAM_STATUS" != "🟢" ]; then echo "> ⚠️ **警告**: 系統資源壓力較大，建議檢查異常進程。"; fi)
$(if [ "$GEMINI_STATUS" == "🔴" ]; then echo "> 🛑 **注意**: Gemini 額度即將耗盡，系統將優先切換至本地 Ollama。"; fi)

---
*自動生成於 OpenClaw L2 Claude Code*
EOF

echo "Dashboard generated: $REPORT_FILE"
# 在終端機顯示預覽
cat "$REPORT_FILE"
