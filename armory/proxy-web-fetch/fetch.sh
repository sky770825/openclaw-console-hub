#!/bin/bash
# Proxy Web Fetch v0.1 - Execution Script

# 檢查是否提供了 URL
if [ -z "$1" ]; then
  echo "錯誤：請提供一個 URL。"
  echo "用法: $0 <url>"
  exit 1
fi

URL="$1"
PROXY_OPTIONS=""

# 優先使用 HTTPS_PROXY，其次是 HTTP_PROXY
if [ ! -z "$HTTPS_PROXY" ]; then
  PROXY_OPTIONS="-x $HTTPS_PROXY"
  echo "正在使用 HTTPS 代理: $HTTPS_PROXY"
elif [ ! -z "$HTTP_PROXY" ]; then
  PROXY_OPTIONS="-x $HTTP_PROXY"
  echo "正在使用 HTTP 代理: $HTTP_PROXY"
else
  echo "未檢測到代理，將直接連線。"
fi

echo "正在抓取 URL: $URL ..."

# 執行 curl 命令，如果 PROXY_OPTIONS 不為空，則會啟用代理
# -L 處理重定向, -s 靜默模式, -S 顯示錯誤
curl -sS -L $PROXY_OPTIONS "$URL"

echo "抓取完成。"
