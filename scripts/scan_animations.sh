#!/bin/bash
# 這是由阿研自動生成的動畫模式掃描工具
PROJECT_DIR="/Users/sky770825/openclaw任務面版設計"
echo "Scanning for Framer Motion usage..."
grep -r "framer-motion" "$PROJECT_DIR" --include="*.tsx" --include="*.ts" | head -n 20
echo "Scanning for CSS transitions..."
grep -r "transition-" "$PROJECT_DIR" --include="*.tsx" --include="*.css" | head -n 20
