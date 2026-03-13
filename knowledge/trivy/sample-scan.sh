#!/bin/bash
# Trivy 基礎安全掃描自動化腳本 (sample-scan.sh)
# 用途：掃描當前目錄，產出 JSON 報告，並檢查是否有嚴重 (CRITICAL) 漏洞

TARGET_DIR=${1:-"."}
REPORT_NAME="trivy-report-$(date +%Y%m%d).json"

echo "🔎 開始安全掃描：$TARGET_DIR"

# 1. 執行文件系統掃描
# --exit-code 1 表示如果發現嚴重漏洞，腳本將返回 1 (用於 CI/CD 阻斷)
# --severity CRITICAL,HIGH 僅關注高危險及以上的漏洞
trivy fs \
  --format json \
  --output "$REPORT_NAME" \
  --severity CRITICAL,HIGH \
  --exit-code 0 \
  "$TARGET_DIR"

if [ $? -eq 0 ]; then
    echo "✅ 掃描完成！報告已儲存至: $REPORT_NAME"
    
    # 2. 摘要統計 (使用 jq 解析，如果環境有安裝的話)
    if command -v jq &> /dev/null; then
        CRITICAL_COUNT=$(jq '[.Results[].Vulnerabilities[]? | select(.Severity=="CRITICAL")] | length' "$REPORT_NAME")
        HIGH_COUNT=$(jq '[.Results[].Vulnerabilities[]? | select(.Severity=="HIGH")] | length' "$REPORT_NAME")
        
        echo "📊 掃描摘要："
        echo "   - 嚴重 (CRITICAL): $CRITICAL_COUNT"
        echo "   - 高危 (HIGH): $HIGH_COUNT"
        
        if [ "$CRITICAL_COUNT" -gt 0 ]; then
            echo "⚠️ 警告：發現嚴重漏洞，請立即修復！"
        fi
    else
        echo "💡 提示：安裝 'jq' 可獲得更詳細的摘要報告。"
    fi
else
    echo "❌ 掃描過程中發生錯誤。"
    exit 1
fi
