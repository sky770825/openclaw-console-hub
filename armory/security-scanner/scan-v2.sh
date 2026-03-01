#!/bin/bash
# Security Scanner v0.2.2 - Fix Write Permission

export PATH="$PATH:/opt/homebrew/bin:/usr/local/bin"
TARGET="${1:-.}"

echo "🚀 神盾計畫：啟動安全掃描..."

if [ -d "$TARGET" ]; then
  ABS_TARGET="$(cd "$TARGET" && pwd)"
  echo "📂 掃描本地目錄: $ABS_TARGET"
  
  if [ -f "$ABS_TARGET/package.json" ]; then
    echo "📦 偵測到 Node.js 專案，執行 npm audit..."
    cd "$ABS_TARGET" && npm audit --json > security-report-npm.json
  fi

  echo "🛡️ 執行 Trivy 掃描 (移除 :ro 以便寫入報告)..."
  # 這裡移除 :ro，讓報告能寫回目錄
  docker run --rm -v "$ABS_TARGET:/scan" aquasec/trivy:latest fs /scan --format json --output /scan/security-report-trivy.json
  echo "✅ 掃描完成。"
else
  exit 1
fi