#!/bin/zsh
# 智能 AI 助手 - 自動選擇最省錢的模型

set -euo pipefail

WORKSPACE="${HOME}/.openclaw/workspace"
PROMPT="${1:-}"

echo "🤖 智能 AI 助手 (自動選模型)"
echo "═══════════════════════════════════════"
echo ""

if [[ -z "$PROMPT" ]]; then
    read -r "?請輸入你的問題: " PROMPT
fi

if [[ -z "$PROMPT" ]]; then
    echo "❌ 未輸入問題"
    exit 1
fi

echo "🔍 分析問題複雜度..."
echo ""

# 簡單判斷問題類型
is_simple="no"

# 簡單問題特徵
if [[ "$PROMPT" =~ ^(什麼|多少|怎麼|誰|哪裡|何時) ]] && [[ ${#PROMPT} -lt 50 ]]; then
    is_simple="yes"
fi

if [[ "$PROMPT" =~ (翻譯|摘要|轉換|格式) ]]; then
    is_simple="yes"
fi

if [[ "$PROMPT" =~ (解釋|說明|介紹) ]] && [[ ${#PROMPT} -lt 100 ]]; then
    is_simple="yes"
fi

# 複雜問題特徵
if [[ "$PROMPT" =~ (分析|比較|評估|建議|策略|規劃|設計) ]]; then
    is_simple="no"
fi

if [[ ${#PROMPT} -gt 200 ]]; then
    is_simple="no"
fi

# 檢查 Gemini 額度
CONFIG_DIR="${HOME}/.openclaw/secure"
LOG_FILE="${CONFIG_DIR}/gemini-usage-daily.log"
today_count=$(grep "^$(date +%Y-%m-%d)" "$LOG_FILE" 2>/dev/null | grep -v "查詢額度" | wc -l)
FREE_TIER_RPD=1500
usage_percent=$(( today_count * 100 / FREE_TIER_RPD ))

echo "📊 Gemini 今日已用: $today_count / $FREE_TIER_RPD ($(usage_percent)%)"
echo ""

# 選擇模型
if [[ "$is_simple" == "yes" ]] && [[ $usage_percent -lt 80 ]]; then
    MODEL="gemini-2.5-flash"
    COST="免費"
    echo "✅ 判斷: 簡單問題 + 額度充足"
    echo "🤖 選擇: Gemini 2.5 Flash (免費)"
else
    MODEL="kimi-k2.5"
    COST="付費"
    if [[ $usage_percent -ge 80 ]]; then
        echo "⚠️  判斷: Gemini 額度快用完"
    else
        echo "💎 判斷: 複雜問題"
    fi
    echo "🤖 選擇: Kimi K2.5 (付費)"
fi

echo ""
echo "───────────────────────────────────────"
echo "💬 問題: $PROMPT"
echo "───────────────────────────────────────"
echo ""

# 執行查詢
if [[ "$MODEL" == "gemini-2.5-flash" ]]; then
    API_KEY=$(cat ~/.openclaw/secure/google-api.key 2>/dev/null)
    RESPONSE=$(curl -s -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}" \
        -H "Content-Type: application/json" \
        -d "{\"contents\":[{\"parts\":[{\"text\":\"${PROMPT//\"/\\\"}\"}]}],\"generationConfig\":{\"temperature\":0.7,\"maxOutputTokens\":1024}}")
    echo "$RESPONSE" | jq -r '.candidates[0].content.parts[0].text' 2>/dev/null
    # 記錄使用
    echo "$(date '+%Y-%m-%d %H:%M:%S') Gemini查詢" >> "$LOG_FILE"
else
    echo "（請手動用 Kimi 詢問此問題）"
    echo "因為 Kimi 是目前對話的主要模型"
fi

echo ""
echo "───────────────────────────────────────"
echo "💰 本次花費: $COST"
echo "───────────────────────────────────────"
