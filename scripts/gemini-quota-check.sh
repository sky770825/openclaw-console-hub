#!/bin/zsh
# 每日免費額度監控與自動切換
# 優先使用 Gemini 免費額度，不夠時 fallback 到 Kimi

set -euo pipefail

CONFIG_DIR="${HOME}/.openclaw/secure"
LOG_FILE="${CONFIG_DIR}/gemini-usage-daily.log"

echo "💰 每日免費額度監控"
echo "═══════════════════════════════════════"
echo ""

# 讀取今日使用量
if [[ -f "$LOG_FILE" ]]; then
    today_count=$(grep "^$(date +%Y-%m-%d)" "$LOG_FILE" | wc -l)
else
    today_count=0
fi

# Gemini 免費額度限制 (大約值)
FREE_TIER_RPM=15        # 每分鐘請求數
FREE_TIER_RPD=1500      # 每天請求數

echo "📊 今日 Gemini 使用統計"
echo ""
echo "  已使用: $today_count 次"
echo "  免費上限: $FREE_TIER_RPD 次/天"
echo "  剩餘額度: $((FREE_TIER_RPD - today_count)) 次"
echo ""

usage_percent=$(( today_count * 100 / FREE_TIER_RPD ))

if [[ $usage_percent -lt 30 ]]; then
    echo "🟢 額度充足 ($(usage_percent)%)"
    echo "   建議：多用 Gemini 處理簡單任務"
elif [[ $usage_percent -lt 70 ]]; then
    echo "🟡 額度中等 ($(usage_percent)%)"
    echo "   建議：繼續使用 Gemini"
elif [[ $usage_percent -lt 90 ]]; then
    echo "🟠 額度偏低 ($(usage_percent)%)"
    echo "   建議：保留給重要任務"
else
    echo "🔴 額度緊張 ($(usage_percent)%)"
    echo "   建議：切換到 Kimi"
fi

echo ""
echo "═══════════════════════════════════════"
echo "💡 建議使用策略"
echo "═══════════════════════════════════════"
echo ""
echo "  Gemini (免費) 適合："
echo "    ✅ 簡單摘要"
echo "    ✅ 翻譯"
echo "    ✅ 格式轉換"
echo "    ✅ 基礎問答"
echo "    ✅ 程式碼檢查"
echo ""
echo "  Kimi (付費) 適合："
echo "    💎 複雜推理"
echo "    💎 深度分析"
echo "    💎 創意寫作"
echo "    💎 重要決策"
echo ""

# 記錄本次查詢
echo "$(date '+%Y-%m-%d %H:%M:%S') 查詢額度" >> "$LOG_FILE"

echo "═══════════════════════════════════════"
echo ""
