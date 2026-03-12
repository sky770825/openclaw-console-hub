#!/bin/bash
# OpenClaw Workspace Export Tool
WORKSPACE_BASE="/Users/sky770825/.openclaw/workspace"
OUTPUT_PATH="./openclaw_workspace_backup.tar.gz"

echo "📦 正在打包 OpenClaw 工作區核心資產 (不包含敏感金鑰)..."

tar -czf "$OUTPUT_PATH" \
  -C "$WORKSPACE_BASE" \
  scripts \
  knowledge \
  armory \
  skills \
  proposals \
  reports

echo "✅ 打包完成: $OUTPUT_PATH"
echo "請將此檔案複製到新設備的相同目錄結構下。"
