#!/bin/zsh
# Auto-Skill Gemini 版 - 使用免費額度做決策

set -euo pipefail

WORKSPACE="${HOME}/.openclaw/workspace"
API_KEY=$(cat ~/.openclaw/secure/google-api.key 2>/dev/null || echo "")

echo "🧠 Auto-Skill (Gemini 免費額度)"
echo "═══════════════════════════════════════"
echo ""

if [[ -z "$API_KEY" ]]; then
    echo "❌ 找不到 Gemini API Key"
    exit 1
fi

# 檢測邏輯（本地 bash，免費）
echo "🔍 本地狀態檢測..."

# 檢查 memory 狀態
memory_dirty=$(find ~/.openclaw/workspace/memory -mtime -0.25 2>/dev/null | wc -l)

# 檢查 qmd 狀態
qmd_stale="no"
if [[ ! -f ~/.openclaw/workspace/.qmd-last-index ]]; then
    qmd_stale="yes"
else
    qmd_age=$(stat -f %m ~/.openclaw/workspace/.qmd-last-index 2>/dev/null || echo 0)
    now=$(date +%s)
    qmd_hours=$(( (now - qmd_age) / 3600 ))
    [[ $qmd_hours -gt 24 ]] && qmd_stale="yes"
fi

echo "  📊 記憶更新: $memory_dirty 個檔案 (24h內)"
echo "  📊 QMD 索引: $([[ "$qmd_stale" == "yes" ]] && echo "需要重建" || echo "正常")"
echo ""

# 決策邏輯（本地處理，免費）
echo "🎯 決策結果："
echo ""

actions=()

[[ $memory_dirty -gt 10 ]] && actions+=("記憶同步: 建議執行 nightly-memory-sync")
[[ "$qmd_stale" == "yes" ]] && actions+=("索引重建: 建議執行 qmd collection update")

if [[ ${#actions[@]} -eq 0 ]]; then
    echo "  ✅ 系統狀態良好，無需動作"
else
    for action in "${actions[@]}"; do
        echo "  📌 $action"
    done
fi

echo ""
echo "───────────────────────────────────────"
echo "💡 可用動作："
echo ""
echo "  1. 執行記憶同步"
echo "  2. 重建 QMD 索引"
echo "  3. 全部執行"
echo "  4. 跳過"
echo ""

# 這裡可以呼叫 Gemini 做進階分析（如果需要）
# 但目前本地決策已經夠用，省錢！

echo "💰 本次決策成本: $0 (本地處理)"
echo ""
