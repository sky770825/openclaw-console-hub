#!/bin/bash
# 檢測專案中是否符合 Linear/Vercel 的開發規範
PROJECT_DIR="/Users/caijunchang/openclaw任務面版設計"

echo "--- 效能最佳實踐檢測器 ---"

# 1. 檢查是否有過大的圖片（非向量）
echo "[1] 檢查靜態資源..."
find "$PROJECT_DIR/public" -type f \( -name "*.png" -o -name "*.jpg" \) -size +500k 2>/dev/null | xargs ls -lh || echo "✅ 無大型點陣圖資源"

# 2. 檢查是否有使用 Framer Motion 或相似庫
if grep -q "framer-motion" "$PROJECT_DIR/package.json" 2>/dev/null; then
    echo "✅ 已整合 Framer Motion (Linear 風格動畫)"
else
    echo "⚠️ 建議整合 framer-motion 以提升動畫質感"
fi

# 3. 檢查 Next.js Image 組件使用
if grep -r "from 'next/image'" "$PROJECT_DIR/src" 2>/dev/null | grep -q ".tsx"; then
    echo "✅ 已使用 next/image 優化"
else
    echo "⚠️ 檢測到可能未使用 next/image，請注意 CLS 效能"
fi

echo "--- 檢測結束 ---"
