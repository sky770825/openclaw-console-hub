#!/usr/bin/env bash
# bump-version.sh — 一鍵更新所有 6 處版本號
# 用法：
#   bash scripts/bump-version.sh patch   # 9.2.1 → 9.2.2（預設）
#   bash scripts/bump-version.sh minor   # 9.2.1 → 9.3.0
#   bash scripts/bump-version.sh major   # 9.2.1 → 10.0.0
#   bash scripts/bump-version.sh 9.3.0   # 直接指定版本號

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# 讀取當前版本
CURRENT=$(grep -m1 '"version"' package.json | sed 's/.*"\([0-9]*\.[0-9]*\.[0-9]*\)".*/\1/')
if [[ -z "$CURRENT" ]]; then
  echo "❌ 無法從 package.json 讀取版本號"
  exit 1
fi

IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"

# 計算新版本
MODE="${1:-patch}"
case "$MODE" in
  patch) NEW="$MAJOR.$MINOR.$((PATCH + 1))" ;;
  minor) NEW="$MAJOR.$((MINOR + 1)).0" ;;
  major) NEW="$((MAJOR + 1)).0.0" ;;
  [0-9]*.[0-9]*.[0-9]*) NEW="$MODE" ;;
  *)
    echo "❌ 用法：bash scripts/bump-version.sh [patch|minor|major|X.Y.Z]"
    exit 1
    ;;
esac

echo "📦 版本更新：v$CURRENT → v$NEW"
echo ""

TODAY=$(date +%Y-%m-%d)

# 1. package.json
sed -i "s/\"version\": \"$CURRENT\"/\"version\": \"$NEW\"/" package.json
echo "  ✅ 1/6 package.json"

# 2. server/package.json
sed -i "s/\"version\": \"$CURRENT\"/\"version\": \"$NEW\"/" server/package.json
echo "  ✅ 2/6 server/package.json"

# 3. server/src/index.ts
sed -i "s/version: '$CURRENT'/version: '$NEW'/" server/src/index.ts
echo "  ✅ 3/6 server/src/index.ts"

# 4. CLAUDE.md（兩處）
sed -i "s/v$CURRENT/v$NEW/g" CLAUDE.md
echo "  ✅ 4/6 CLAUDE.md"

# 5. MEMORY.md（header 第 3~4 行）
sed -i "s/v$CURRENT/v$NEW/g" MEMORY.md
sed -i "s/| $TODAY/| $TODAY/" MEMORY.md
echo "  ✅ 5/6 MEMORY.md"

# 6. HEARTBEAT.md（Server 版本行）
sed -i "s/v$CURRENT/v$NEW/g" HEARTBEAT.md
sed -i "s/最後更新：.*/最後更新：$TODAY/" HEARTBEAT.md
echo "  ✅ 6/6 HEARTBEAT.md"

echo ""
echo "🎉 全部 6 處已更新為 v$NEW"
echo ""
echo "下一步："
echo "  git add package.json server/package.json server/src/index.ts CLAUDE.md MEMORY.md HEARTBEAT.md"
echo "  git commit -m \"chore: bump version v$CURRENT → v$NEW\""
