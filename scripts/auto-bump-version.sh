#!/usr/bin/env bash
# auto-bump-version.sh
# 每天自動遞增 patch 版本號，commit 並 push。
# 由 macOS launchd 每天 00:01 觸發。

MAIN_DIR="/Users/sky770825/Desktop/大額/openclaw任務面版設計"
LOG="/tmp/openclaw-version-bump.log"
BUMP_FLAG="$MAIN_DIR/.claude/.version-bumped-$(date +%Y%m%d)"

timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# 今天已 bump 過就跳過
if [ -f "$BUMP_FLAG" ]; then
  echo "[$timestamp] already bumped today, skip" >> "$LOG"
  exit 0
fi

cd "$MAIN_DIR" || exit 1

# 讀取目前版本（從 package.json）
CURRENT=$(node -e "console.log(require('./package.json').version)" 2>/dev/null)
if [ -z "$CURRENT" ]; then
  echo "[$timestamp] ERROR: cannot read version" >> "$LOG"
  exit 1
fi

# 遞增 patch (e.g. 2.1.0 → 2.1.1)
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"
PATCH=$((PATCH + 1))
NEW_VERSION="$MAJOR.$MINOR.$PATCH"

echo "[$timestamp] bumping $CURRENT → $NEW_VERSION" >> "$LOG"

# 更新 package.json
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.version = '$NEW_VERSION';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"

# 更新 server/package.json
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('server/package.json', 'utf8'));
pkg.version = '$NEW_VERSION';
fs.writeFileSync('server/package.json', JSON.stringify(pkg, null, 2) + '\n');
"

# 更新 server/src/index.ts 的 version 字串
sed -i '' "s/version: '[0-9]*\.[0-9]*\.[0-9]*'/version: '$NEW_VERSION'/" server/src/index.ts 2>/dev/null

# 重新 build server
cd server && npm run build >> "$LOG" 2>&1; cd ..

# commit & push
git add package.json server/package.json server/src/index.ts server/dist/index.js 2>/dev/null
git commit -m "chore: daily version bump $CURRENT → $NEW_VERSION [$(date +%Y-%m-%d)]

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>" >> "$LOG" 2>&1

git push origin main >> "$LOG" 2>&1

# 建立今日 flag
touch "$BUMP_FLAG"
# 清理 14 天以上的 flag
find "$MAIN_DIR/.claude/" -name ".version-bumped-*" -mtime +14 -delete 2>/dev/null

# 觸發小蔡同步
bash "$MAIN_DIR/scripts/post-push-sync.sh"

echo "[$timestamp] done: $NEW_VERSION" >> "$LOG"
