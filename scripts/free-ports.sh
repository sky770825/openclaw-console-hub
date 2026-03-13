#!/usr/bin/env bash
# 關掉佔用 3009（前端）、3010、3011（後端）的 process，方便重新開 dev。
set -e
for port in 3009 3010 3011; do
  if lsof -ti :$port >/dev/null 2>&1; then
    echo "關閉 port $port ..."
    lsof -ti :$port | xargs kill -9 2>/dev/null || true
  fi
done
echo "3009 / 3010 / 3011 已釋放。可執行: npm run dev (前端) 與 cd server && npm run dev (後端)"
