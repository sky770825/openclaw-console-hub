#!/bin/bash
# ContextGuard Skill 安裝腳本

set -e

echo "🔧 安裝 ContextGuard Skill..."

# 檢查 OpenClaw 環境
if [ ! -f "package.json" ]; then
    echo "❌ 錯誤：請在 OpenClaw 根目錄執行此腳本"
    exit 1
fi

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo "📁 Skill 目錄: $SKILL_DIR"

# 編譯 TypeScript
echo "📦 編譯 TypeScript..."
cd "$SKILL_DIR"
if command -v tsc &> /dev/null; then
    tsc
else
    echo "⚠️ 警告: TypeScript 編譯器未安裝，跳過編譯"
fi

# 註冊 Skill
echo "📝 註冊 Skill..."
mkdir -p "$SKILL_DIR/../../.openclaw/skills"
ln -sf "$SKILL_DIR" "$SKILL_DIR/../../.openclaw/skills/contextguard" 2>/dev/null || true

echo "✅ ContextGuard Skill 安裝完成！"
echo ""
echo "使用方法："
echo "  /context status    - 查看 context 狀態"
echo "  /context optimize  - 執行優化建議"
echo "  /context dashboard - 成本儀表板"
