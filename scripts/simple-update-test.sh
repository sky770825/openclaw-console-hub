#!/usr/bin/env bash
# 簡化版自動更新測試

set -euo pipefail

WORKSPACE="$HOME/.openclaw/workspace"
TIMESTAMP=$(date '+%Y%m%d-%H%M%S')
DATE_HUMAN=$(date '+%Y-%m-%d %H:%M:%S')

echo "🧪 自動更新系統測試"
echo "=============================="

# 1. 備份
echo "1️⃣ 備份當前版本..."
mkdir -p "$WORKSPACE/core/.versions"
cp "$WORKSPACE/CORE.md" "$WORKSPACE/core/.versions/CORE-$TIMESTAMP.md"
echo "   ✅ 備份完成"

# 2. 更新版本號
echo "2️⃣ 更新版本號..."
CURRENT=$(cat "$WORKSPACE/core/.version")
MAJOR=$(echo "$CURRENT" | cut -d. -f1)
MINOR=$(echo "$CURRENT" | cut -d. -f2)
NEW_MINOR=$((MINOR + 1))
NEW_VERSION="$MAJOR.$NEW_MINOR"
echo "$NEW_VERSION" > "$WORKSPACE/core/.version"
echo "   $CURRENT → $NEW_VERSION"

# 3. 更新 CORE.md
echo "3️⃣ 更新 CORE.md..."
sed -i '' "s/版本\*\*: v.*/版本**: v$NEW_VERSION/" "$WORKSPACE/CORE.md"
sed -i '' "s/最後更新\*\*:.*/最後更新**: $DATE_HUMAN/" "$WORKSPACE/CORE.md"
echo "   ✅ 更新完成"

# 4. 檢查
echo ""
echo "📊 結果："
echo "   版本: $NEW_VERSION"
echo "   備份: $(ls -1 "$WORKSPACE/core/.versions"/CORE-*.md | wc -l | tr -d ' ') 個"
echo ""
echo "✅ 測試完成！"

