#!/bin/bash
# Password Manager Skill - Installation Script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
TARGET_BIN="/usr/local/bin/password-manager"

echo "Installing Password Manager Skill..."
echo "Source: $SKILL_DIR"
echo "Target: $TARGET_BIN"

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "Warning: This skill is designed for macOS. Keychain integration may not work on other systems."
fi

# Check if target directory exists
if [[ ! -d "/usr/local/bin" ]]; then
    echo "Creating /usr/local/bin..."
    sudo mkdir -p /usr/local/bin
fi

# Create symlink
if [[ -L "$TARGET_BIN" ]]; then
    echo "Removing existing symlink..."
    rm "$TARGET_BIN"
elif [[ -f "$TARGET_BIN" ]]; then
    echo "Backing up existing file to $TARGET_BIN.backup..."
    mv "$TARGET_BIN" "$TARGET_BIN.backup"
fi

ln -s "$SCRIPT_DIR/password-manager" "$TARGET_BIN"
echo "✓ Created symlink: $TARGET_BIN"

# Make sure script is executable
chmod +x "$SCRIPT_DIR/password-manager"

# Test installation
echo ""
echo "Testing installation..."
if command -v password-manager &> /dev/null; then
    echo "✓ Password Manager is now available as 'password-manager'"
    echo ""
    echo "Usage examples:"
    echo "  password-manager generate -l 20     # 生成 20 字符密碼"
    echo "  password-manager check              # 檢查密碼強度"
    echo "  password-manager store -a github    # 儲存密碼"
    echo "  password-manager list               # 列出所有項目"
    echo ""
    echo "For more info: password-manager help"
else
    echo "✗ Installation failed. Please check your PATH."
    exit 1
fi
