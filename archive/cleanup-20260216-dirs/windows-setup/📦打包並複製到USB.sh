#!/bin/zsh
# 打包 Windows 安裝包

set -e

echo "📦 打包 Windows 安裝包"
echo "═══════════════════════════════════════"

SETUP_DIR="$HOME/.openclaw/workspace/windows-setup"
DATE=$(date +%Y%m%d)
PACKAGE_NAME="openclaw-windows-setup-${DATE}"

# 打包
cd "$SETUP_DIR/.."
tar czf "${PACKAGE_NAME}.tar.gz" windows-setup/

# 移動到桌面
mv "${PACKAGE_NAME}.tar.gz" "$HOME/Desktop/"

echo ""
echo "✅ 打包完成！"
echo ""
echo "檔案位置: ~/Desktop/${PACKAGE_NAME}.tar.gz"
echo ""
echo "═══════════════════════════════════════"
echo "下一步:"
echo ""
echo "  1. 把這個 .tar.gz 檔案複製到 USB"
echo "  2. 插到 Windows 電腦"
echo "  3. 解壓縮到 C:\\openclaw-setup\\"
echo "  4. 按照 README.txt 安裝"
echo ""
echo "═══════════════════════════════════════"
