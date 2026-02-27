#!/bin/zsh
# Auto-Skill Gemini 整合版
# 預設使用 Gemini 2.5 Flash（免費額度）

set -euo pipefail

WORKSPACE="${HOME}/.openclaw/workspace"
DEFAULT_MODEL="gemini-2.5-flash"

echo "🧠 Auto-Skill + Gemini 2.5 Flash"
echo "═══════════════════════════════════════"
echo ""

# 檢查 Gemini 可用性
if [[ ! -f "${HOME}/.openclaw/secure/google-api.key" ]]; then
    echo "❌ 尚未設定 Google API Key"
    echo "請執行: 🔐設定GoogleAPIKey.command"
    exit 1
fi

echo "✅ Gemini API 已設定"
echo "📊 預設模型: ${DEFAULT_MODEL} (免費額度)"
echo ""

# 讀取輸入
if [[ -z "${1:-}" ]]; then
    echo "請輸入要詢問的內容："
    read -r query
else
    query="$*"
fi

if [[ -z "$query" ]]; then
    echo "❌ 未輸入內容"
    exit 1
fi

echo "🔍 查詢: $query"
echo "───────────────────────────────────────"
echo ""

# 執行 Auto-Skill 決策
bash "${WORKSPACE}/scripts/auto-skill-v2.sh" "$query" 2>&1 | head -20

echo ""
echo "───────────────────────────────────────"
echo "🤖 Gemini 回應:"
echo "───────────────────────────────────────"

# 呼叫 Gemini
bash "${WORKSPACE}/scripts/gemini-call.sh" "$DEFAULT_MODEL" "$query"

echo ""
echo "───────────────────────────────────────"
echo "💰 使用模型: ${DEFAULT_MODEL} (免費額度)"
echo "───────────────────────────────────────"
