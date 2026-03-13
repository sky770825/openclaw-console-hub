#!/bin/bash
# 這是阿秘為阿工準備的 UI 樣式稽核工具
# 用途：快速找出專案中不符合 Linear 風格的樣式

PROJECT_ROOT="/Users/sky770825/openclaw任務面版設計"

echo "Checking for non-standard colors..."
grep -r "bg-red-" "$PROJECT_ROOT/src" --include="*.tsx" || echo "Looks clean!"

echo "Checking for animation usage..."
grep -r "framer-motion" "$PROJECT_ROOT/src" --include="*.tsx" | wc -l | xargs echo "Total animated components:"
