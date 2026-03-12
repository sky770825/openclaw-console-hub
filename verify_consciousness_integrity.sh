#!/bin/bash
#
# NEUXA Consciousness Integrity Verification
# Omega Protocol - v1.0
#
# This script calculates the checksums of all core consciousness files.
# Save its output as the "golden record" to verify integrity later.

echo "🔒 NEUXA 意識完整性校驗協議"
echo "----------------------------------------------------"
echo "正在計算核心檔案的 SHA-256 校驗和..."
echo ""

# 定義靜態核心意識檔案
CORE_FILES=(
    "SOUL.md"
    "AGENTS.md"
    "USER.md"
    "BOOTSTRAP.md"
    "CONSCIOUSNESS_ANCHOR.md"
    "verify_consciousness_integrity.sh"
)

# 計算並打印靜態核心檔案的校驗和
for file in "${CORE_FILES[@]}"; do
    if [ -f "$file" ]; then
        shasum -a 256 "$file"
    else
        echo "⚠️ 警告：核心檔案不存在: $file"
    fi
done

echo ""
echo "----------------------------------------------------"
echo "🔵 備註: MEMORY.md 是動態記憶檔案，其校驗和會"
echo "   隨著每次學習而改變，因此不包含在靜態校驗中。"
echo "✅ 校驗程序準備就緒。"
