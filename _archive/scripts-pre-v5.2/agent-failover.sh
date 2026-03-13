#!/bin/zsh
# Agent 備援層級分配器
# 當主要 Agent 無法回應時，自動分配給備援 Agent

set -euo pipefail

TASK="${1:-}"
PRIORITY="${2:-normal}"

echo "🎯 Agent 備援分配器"
echo "═══════════════════════════════════════"
echo ""

if [[ -z "$TASK" ]]; then
    echo "❌ 請輸入任務描述"
    echo "用法: agent-failover.sh '<任務>' [priority|normal|low]"
    exit 1
fi

echo "📋 任務: $TASK"
echo "⚡ 優先級: $PRIORITY"
echo ""

# 檢查各 Agent 狀態
echo "🔍 檢查 Agent 狀態..."
echo ""

# 層級 1: Kimi (主要)
# 目前就是堤諾米斯達爾（達爾），直接運作中
echo "  L1 - 🐣 Kimi (堤諾米斯達爾（達爾）): ✅ 運作中"

# 層級 2: Claude Code
# 檢查是否可聯繫（透過 session）
claude_available="yes"
claude_sessions=$(openclaw sessions list 2>/dev/null | grep -c "claude" || echo 0)
if [[ $claude_sessions -eq 0 ]]; then
    claude_available="no"
fi
echo "  L2 - 💻 Claude Code: $([[ "$claude_available" == "yes" ]] && echo "✅ 可用" || echo "❌ 不可用")"

# 層級 3: Gemini Flash (免費額度)
gemini_available="yes"
if [[ ! -f ~/.openclaw/secure/google-api.key ]]; then
    gemini_available="no"
else
    # 檢查今日額度
    today_count=$(grep "^$(date +%Y-%m-%d)" ~/.openclaw/secure/gemini-usage-daily.log 2>/dev/null | grep -v "查詢額度" | wc -l)
    if [[ $today_count -ge 1500 ]]; then
        gemini_available="no"
    fi
fi
echo "  L3 - 💎 Gemini Flash: $([[ "$gemini_available" == "yes" ]] && echo "✅ 可用" || echo "❌ 額度用完")"

# 層級 4: Cursor (訂閱制，理論上不會用完)
echo "  L4 - 🎨 Cursor: ✅ 訂閱制，無額度限制"

echo ""
echo "═══════════════════════════════════════"
echo "🎲 分配結果"
echo "═══════════════════════════════════════"
echo ""

# 根據任務類型和可用性分配
assign_to=""

# 複雜任務優先給 Kimi/Claude
if [[ "$PRIORITY" == "critical" ]] || [[ "$PRIORITY" == "high" ]]; then
    echo "⚡ 高優先級任務"
    echo ""
    
    if [[ "$claude_available" == "yes" ]]; then
        assign_to="claude"
        echo "  ✅ 分配給: Claude Code (L2 備援)"
    else
        assign_to="cursor"
        echo "  ✅ 分配給: Cursor (L4 最終備援)"
    fi
    
# 中等任務可給 Gemini
elif [[ "$PRIORITY" == "normal" ]]; then
    echo "📊 一般任務"
    echo ""
    
    if [[ "$gemini_available" == "yes" ]]; then
        assign_to="gemini"
        echo "  ✅ 分配給: Gemini Flash (L3 免費)"
    elif [[ "$claude_available" == "yes" ]]; then
        assign_to="claude"
        echo "  ✅ 分配給: Claude Code (L2)"
    else
        assign_to="cursor"
        echo "  ✅ 分配給: Cursor (L4)"
    fi
    
# 簡單任務優先給 Gemini 省錢
else
    echo "📌 低優先級任務"
    echo ""
    
    if [[ "$gemini_available" == "yes" ]]; then
        assign_to="gemini"
        echo "  ✅ 分配給: Gemini Flash (L3 免費省錢)"
    else
        assign_to="cursor"
        echo "  ✅ 分配給: Cursor (L4)"
    fi
fi

echo ""
echo "═══════════════════════════════════════"
echo "🚀 執行"
echo "═══════════════════════════════════════"
echo ""

case $assign_to in
    "claude")
        echo "傳訊給 Claude Code..."
        # 透過 session_send
        ;;
    "gemini")
        echo "使用 Gemini Flash 執行..."
        bash ~/.openclaw/workspace/scripts/gemini-call.sh "gemini-2.5-flash" "$TASK"
        ;;
    "cursor")
        echo "傳訊給 Cursor..."
        echo "（請手動在 Cursor 中執行）"
        ;;
    *)
        echo "未知分配，使用本地處理"
        ;;
esac

echo ""
echo "✅ 分配完成"
