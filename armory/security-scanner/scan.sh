#!/bin/bash
# Security Scanner v0.1 - Execution Script

# 檢查是否提供了 URL
if [ -z "$1" ]; then
  echo "錯誤：請提供一個 Git 倉庫的 URL。"
  echo "用法: $0 <repo_url>"
  exit 1
fi

REPO_URL="$1"

echo "正在使用 Trivy 掃描倉庫: $REPO_URL ..."

# 執行 Trivy Docker 命令進行掃描
# 我們假設 Trivy 的 Docker 映像檔在執行環境中是可用的
# 使用 --rm 會在容器結束後自動刪除它
docker run --rm aquasec/trivy:latest repo "$REPO_URL"

echo "掃描完成。"
