#!/usr/bin/env bash
# 簡化版版本對比

set -euo pipefail

WORKSPACE="$HOME/.openclaw/workspace"
VERSIONS_DIR="$WORKSPACE/core/.versions"
LEARNING_DIR="$WORKSPACE/learning"

echo "🔍 版本對比分析"
echo "================================"

# 取得最近兩個版本
LATEST=$(ls -t "$VERSIONS_DIR"/CORE-*.md 2>/dev/null | head -1)
PREVIOUS=$(ls -t "$VERSIONS_DIR"/CORE-*.md 2>/dev/null | head -2 | tail -1)

if [[ -z "$LATEST" ]] || [[ -z "$PREVIOUS" ]]; then
    echo "⚠️  版本不足，需要至少 2 個版本"
    exit 0
fi

echo "前版本: $(basename "$PREVIOUS")"
echo "新版本: $(basename "$LATEST")"
echo ""

# 使用 diff 比較
echo "📊 變更摘要："
echo ""

DIFF_OUTPUT=$(diff -u "$PREVIOUS" "$LATEST" || true)

# 統計新增和刪除行數
ADDED=$(echo "$DIFF_OUTPUT" | grep "^+" | grep -v "^+++" | wc -l | tr -d ' ')
REMOVED=$(echo "$DIFF_OUTPUT" | grep "^-" | grep -v "^---" | wc -l | tr -d ' ')

echo "➕ 新增行數: $ADDED"
echo "➖ 刪除行數: $REMOVED"
echo ""

# 顯示主要變更
echo "🔧 主要變更："
echo "$DIFF_OUTPUT" | grep -E "^\+|^-" | grep -v "^+++\|^---\|最後更新\|版本" | head -20

echo ""
echo "✅ 版本對比完成"
echo ""
echo "💡 學習建議："

if [[ $ADDED -gt $((REMOVED * 2)) ]]; then
    echo "  - ⚠️ 新增內容過多，可能導致記憶膨脹"
elif [[ $REMOVED -gt $((ADDED * 2)) ]]; then
    echo "  - ✅ 成功精簡內容，保持記憶清晰"
else
    echo "  - ✅ 變更適中，記憶保持平衡"
fi

# 建立學習記錄
mkdir -p "$LEARNING_DIR"

if [[ ! -f "$LEARNING_DIR/00-evolution-log.md" ]]; then
    cat > "$LEARNING_DIR/00-evolution-log.md" <<'EOF'
# 小蔡進化日誌

> 記錄每次版本更新的改進與學習

---

EOF
fi

# 追加記錄
cat >> "$LEARNING_DIR/00-evolution-log.md" <<EOF

## $(date '+%Y-%m-%d %H:%M:%S')

**版本對比**: $(basename "$PREVIOUS") → $(basename "$LATEST")

### 變更統計
- ➕ 新增: $ADDED 行
- ➖ 刪除: $REMOVED 行

### 本次學習重點
（待補充）

---

EOF

echo ""
echo "📚 學習記錄已追加到: $LEARNING_DIR/00-evolution-log.md"
