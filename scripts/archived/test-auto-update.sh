#!/usr/bin/env bash
# 測試自動更新系統

set -euo pipefail

echo "🧪 測試自動更新系統"
echo "============================================================"

WORKSPACE="$HOME/.openclaw/workspace"
CORE_MD="$WORKSPACE/CORE.md"
VERSIONS_DIR="$WORKSPACE/core/.versions"

# Step 1: 備份當前版本
echo "📦 Step 1: 測試版本備份..."

if [[ -f "$CORE_MD" ]]; then
    TIMESTAMP=$(date '+%Y%m%d-%H%M%S')
    mkdir -p "$VERSIONS_DIR"
    cp "$CORE_MD" "$VERSIONS_DIR/CORE-$TIMESTAMP.md"
    echo "✅ 備份完成: CORE-$TIMESTAMP.md"
else
    echo "⚠️  CORE.md 不存在"
fi

# Step 2: 更新版本號
echo ""
echo "🔢 Step 2: 測試版本號更新..."

CURRENT_VERSION=$(cat "$WORKSPACE/core/.version" 2>/dev/null || echo "1.0")
echo "   當前版本: $CURRENT_VERSION"

MAJOR=$(echo "$CURRENT_VERSION" | cut -d. -f1)
MINOR=$(echo "$CURRENT_VERSION" | cut -d. -f2)
MINOR=$((MINOR + 1))
NEW_VERSION="$MAJOR.$MINOR"

echo "$NEW_VERSION" > "$WORKSPACE/core/.version"
echo "   新版本: $NEW_VERSION"
echo "✅ 版本更新完成"

# Step 3: 更新 ACTIVE-CONTEXT.md
echo ""
echo "📝 Step 3: 測試 ACTIVE-CONTEXT 更新..."

cat > "$WORKSPACE/core/ACTIVE-CONTEXT.md" <<'EOF'
# Active Context - 當前進行中事項

> **最後更新**: $(date '+%Y-%m-%d %H:%M:%S')
> **自動更新**: 每次對話結束

---

## 🔄 進行中任務

- [ ] 測試自動更新系統

---

## ✅ 最近完成（測試）

- [x] 向量索引系統建立
- [x] CORE.md 建立

---

**下次對話提示**:
- 測試自動更新系統是否正常運作？
EOF

# 執行變數替換
TEMP_FILE=$(mktemp)
eval "cat > \"$TEMP_FILE\" <<'EOFEVAL'
$(cat "$WORKSPACE/core/ACTIVE-CONTEXT.md")
EOFEVAL"
mv "$TEMP_FILE" "$WORKSPACE/core/ACTIVE-CONTEXT.md"

echo "✅ ACTIVE-CONTEXT.md 更新完成"

# Step 4: 更新 CORE.md
echo ""
echo "📄 Step 4: 測試 CORE.md 更新..."

# 讀取 ACTIVE-CONTEXT 內容
ACTIVE_CONTENT=$(cat "$WORKSPACE/core/ACTIVE-CONTEXT.md")

cat > "$CORE_MD" <<EOF
# CORE.md - 核心記憶（自動更新）

> **版本**: v$NEW_VERSION
> **最後更新**: $(date '+%Y-%m-%d %H:%M:%S')
> **自動更新**: 每次對話結束時執行

---

## 🔄 當前狀態（Active Context）

> 來源：\`core/ACTIVE-CONTEXT.md\`

$ACTIVE_CONTENT

---

**版本歷史**: \`core/.versions/\`（保留最近 30 個版本）
**自動更新**: 由 \`scripts/update-core-memory-with-versioning.sh\` 執行
EOF

echo "✅ CORE.md 更新完成（版本 $NEW_VERSION）"

# Step 5: 檢查結果
echo ""
echo "🔍 Step 5: 驗證結果..."
echo ""

echo "📊 版本資訊："
echo "   版本號檔案: $(cat "$WORKSPACE/core/.version")"
echo "   備份數量: $(ls -1 "$VERSIONS_DIR"/CORE-*.md 2>/dev/null | wc -l | tr -d ' ')"
echo ""

echo "📁 檔案大小："
ls -lh "$CORE_MD" | awk '{print "   CORE.md: " $5}'
ls -lh "$WORKSPACE/core/ACTIVE-CONTEXT.md" | awk '{print "   ACTIVE-CONTEXT.md: " $5}'
echo ""

echo "✅ 自動更新系統測試完成！"
echo ""
echo "下一步："
echo "  1. 查看 CORE.md: cat $CORE_MD"
echo "  2. 查看備份: ls -lh $VERSIONS_DIR/"
echo "  3. 測試版本對比: ./scripts/compare-and-learn.sh"
