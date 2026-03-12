#!/bin/bash
# NEUXA 自省報告產生器
# 每累積 10 筆經驗，自動產出一份「我學到了什麼」的自省報告

set -euo pipefail

WORKSPACE_DIR="$HOME/.openclaw/workspace"
XP_LOG="$WORKSPACE_DIR/memory/xp-log.jsonl"
REPORTS_DIR="$WORKSPACE_DIR/workspace/reports"
SELF_REFLECTION_PREFIX="self-reflection"

# 確保目錄存在
mkdir -p "$REPORTS_DIR"

# 檢查經驗值日誌是否存在
if [[ ! -f "$XP_LOG" ]]; then
    echo "⚠️  尚無經驗值記錄"
    exit 0
fi

# 計算總記錄數
TOTAL_RECORDS=$(wc -l < "$XP_LOG" | tr -d ' ')

# 檢查是否需要產生報告（每 10 筆）
LAST_REPORT_NUM=$(ls -1 "$REPORTS_DIR"/"$SELF_REFLECTION_PREFIX"-*.md 2>/dev/null | \
    grep -oE '[0-9]+' | sort -n | tail -1 || echo "0")

NEXT_REPORT_NUM=$((LAST_REPORT_NUM + 1))
THRESHOLD=$((NEXT_REPORT_NUM * 10))

if [[ "$TOTAL_RECORDS" -lt "$THRESHOLD" ]]; then
    echo "📊 目前經驗記錄: $TOTAL_RECORDS 筆"
    echo "🎯 下次報告門檻: $THRESHOLD 筆"
    echo "⏳ 還需 $((THRESHOLD - TOTAL_RECORDS)) 筆經驗"
    exit 0
fi

# 產生自省報告
REPORT_FILE="$REPORTS_DIR/${SELF_REFLECTION_PREFIX}-${NEXT_REPORT_NUM}.md"
TIMESTAMP=$(date +%Y-%m-%d\ %H:%M:%S)

echo "📝 產生自省報告 #$NEXT_REPORT_NUM..."

# 提取最近的 10 筆經驗
RECENT_XP=$(tail -10 "$XP_LOG")

# 分析數據
TOTAL_XP=$(echo "$RECENT_XP" | grep -o '"total_xp": [0-9]*' | awk '{sum+=$2} END {print sum}')
SUCCESS_COUNT=$(echo "$RECENT_XP" | grep -c '"status": "success"' || true)
PARTIAL_COUNT=$(echo "$RECENT_XP" | grep -c '"status": "partial"' || true)
FAILURE_COUNT=$(echo "$RECENT_XP" | grep -c '"status": "failure"' || true)

# 提取學到的內容
WHAT_WORKED=$(echo "$RECENT_XP" | grep -o '"what_worked": "[^"]*"' | sed 's/"what_worked": "//;s/"$//' | grep -v '^$' | head -5)
WHAT_TO_IMPROVE=$(echo "$RECENT_XP" | grep -o '"what_to_improve": "[^"]*"' | sed 's/"what_to_improve": "//;s/"$//' | grep -v '^$' | head -5)
INSIGHTS=$(echo "$RECENT_XP" | grep -o '"insights": "[^"]*"' | sed 's/"insights": "//;s/"$//' | grep -v '^$' | head -5)

# 統計工具使用
TOOLS_USED=$(echo "$RECENT_XP" | grep -o '"tools_used": \[[^]]*\]' | grep -o '"[a-z_]*"' | sort | uniq -c | sort -rn | head -5)

# 產生報告內容
cat > "$REPORT_FILE" << EOF
# NEUXA 自省報告 #${NEXT_REPORT_NUM}

> **產生時間**: ${TIMESTAMP}  
> **經驗範圍**: 第 $((NEXT_REPORT_NUM * 10 - 9)) - ${NEXT_REPORT_NUM}0 筆  
> **模型**: kimi/kimi-k2.5

---

## 📊 本期數據摘要

| 指標 | 數值 |
|------|------|
| 分析經驗數 | 10 筆 |
| 總獲得 XP | ${TOTAL_XP:-0} |
| 成功任務 | ${SUCCESS_COUNT:-0} |
| 部分成功 | ${PARTIAL_COUNT:-0} |
| 失敗任務 | ${FAILURE_COUNT:-0} |
| 成功率 | $(( (SUCCESS_COUNT * 100) / 10 ))% |

---

## ✅ 做得好的地方

$(echo "$WHAT_WORKED" | sed 's/^/- /')

---

## 🔧 需要改進的

$(echo "$WHAT_TO_IMPROVE" | sed 's/^/- /')

---

## 💡 重要洞察

$(echo "$INSIGHTS" | sed 's/^/- /')

---

## 🛠️ 工具使用統計

\`\`\`
${TOOLS_USED}
\`\`\`

---

## 🎯 下一階段目標

基於本期經驗，下一階段將專注於：

1. **持續優化執行效率** - 減少不必要的中間步驟
2. **強化錯誤處理** - 提升任務成功率
3. **深化多模態能力** - 擴展 image/browser 工具應用
4. **完善自動化流程** - 減少手動干預

---

## 📈 進化軌跡

| 報告期數 | 累積經驗 | 等級 |
|----------|----------|------|
| #${NEXT_REPORT_NUM} | ${TOTAL_RECORDS} 筆 | 計算中... |

---

**持續進化中** | NEUXA 🚀
EOF

echo ""
echo "✅ 自省報告已產生: $REPORT_FILE"
echo ""
echo "📋 本期摘要:"
echo "  - 分析經驗: 10 筆"
echo "  - 獲得 XP: ${TOTAL_XP:-0}"
echo "  - 成功率: $(( (SUCCESS_COUNT * 100) / 10 ))%"
echo ""
echo "🚀 持續進化中..."
