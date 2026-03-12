#!/bin/bash
# 这是一个用于快速检测 UI 组件动画属性的脚本
PROJECT_PATH="/Users/caijunchang/openclaw任務面版設計"
echo "正在扫描 TSX 组件中的 Framer Motion 交互..."
grep -r "whileHover\|whileTap\|layoutId" "$PROJECT_PATH/src" --include="*.tsx"
