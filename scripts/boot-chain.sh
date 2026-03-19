#!/usr/bin/env bash
# boot-chain.sh — SessionStart hook 自動載入啟動鏈
# 輸出內容會注入到達爾的對話上下文中

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== 🚀 達爾啟動鏈載入中 ==="
echo ""

# 依 L0_BOOT.md 定義的順序載入
for file in L0_BOOT.md IDENTITY.md SOUL.md L1_CONTEXT.md PROJECTS.md; do
  filepath="$ROOT/$file"
  if [ -f "$filepath" ]; then
    echo "--- [$file] ---"
    cat "$filepath"
    echo ""
  else
    echo "--- [$file] ⚠️ 不存在，跳過 ---"
    echo ""
  fi
done

# 顯示當前版本
VERSION=$(grep -m1 '"version"' "$ROOT/package.json" | sed 's/.*"\([0-9]*\.[0-9]*\.[0-9]*\)".*/\1/' || echo "unknown")
echo "=== ✅ 啟動鏈載入完成 | v$VERSION ==="
