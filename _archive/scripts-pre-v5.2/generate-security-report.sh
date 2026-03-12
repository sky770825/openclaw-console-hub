#!/bin/bash
# NEUXA Daily Security Report Generator
DATE=$(date +%Y%m%d)
REPORT_FILE="reports/security/SECURITY-REPORT-$DATE.md"

echo "# NEUXA Security & Traffic Report - $DATE" > $REPORT_FILE
echo "## 1. 流量精算數據" >> $REPORT_FILE
echo "- 總請求次數: $(cat logs/traffic/traffic-$DATE.jsonl 2>/dev/null | wc -l || echo 0)" >> $REPORT_FILE
echo "## 2. 風險偵測報告" >> $REPORT_FILE
echo "- 攔截攻擊次數: $(cat logs/risk/risk-$DATE.jsonl 2>/dev/null | wc -l || echo 0)" >> $REPORT_FILE
echo "- 嚴重警報次數: $(grep -c "CRITICAL" logs/risk/risk-$DATE.jsonl 2>/dev/null || echo 0)" >> $REPORT_FILE
