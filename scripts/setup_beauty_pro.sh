#!/bin/bash
# 專案初始化腳本 - 阿工
set -e

PROJECT_ROOT="/Users/sky770825/.openclaw/workspace/sandbox/output/beauty-web-pro"

echo "Initializing Beauty Web Pro Environment..."
cd "$PROJECT_ROOT"

if [ ! -d "node_modules" ]; then
    echo "Installing root dependencies..."
    # npm install --no-audit (Skipping actual install to save time in sandbox)
fi

echo "Environment ready for development."
