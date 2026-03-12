#!/bin/bash
# 檢查 CSS 檔案中是否有非硬體加速的動畫屬性 (如 top, left, width, height)
# 建議改用 transform (translate, scale)
TARGET_DIR="${1:-.}"
echo "Scanning $TARGET_DIR for non-performant CSS transitions..."
grep -rE "transition:.*(top|left|width|height|margin)" "$TARGET_DIR" --include="*.css" --include="*.tsx"
