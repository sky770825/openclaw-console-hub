#!/bin/bash
################################################################################
# ContextGuard 卸載腳本
# 移除 CLI 連結、cron 條目；不刪除配置檔（保留使用者設定）
################################################################################

set -euo pipefail

SKILL_ROOT=$(cd "$(dirname "$0")/.." && pwd)
BIN_NAME="contextguard"

echo "=== ContextGuard 卸載 ==="

# 移除 /usr/local/bin 或 ~/.local/bin 連結
for prefix in /usr/local "$HOME/.local"; do
  path="$prefix/bin/$BIN_NAME"
  if [[ -L "$path" ]] && [[ "$(readlink "$path" 2>/dev/null)" == *"contextguard"* ]]; then
    rm -f "$path"
    echo "  已移除: $path"
  fi
done

# 移除 cron
if crontab -l 2>/dev/null | grep -q "contextguard"; then
  crontab -l 2>/dev/null | grep -v "contextguard" | crontab - 2>/dev/null || true
  echo "  已移除 cron 中的 contextguard 條目"
fi

echo "  配置檔未刪除: ${HOME:-~}/.openclaw/contextguard.json（可手動刪除）"
echo "卸載完成。"
