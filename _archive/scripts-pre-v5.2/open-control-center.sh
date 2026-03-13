#!/bin/bash
set -e
# OpenClaw 中控台快速啟動器

echo "🎛️ 啟動 OpenClaw 中控台..."
echo ""

# 開啟 Terminal 中控台
osascript << 'APPLESCRIPT'
tell application "Terminal"
    activate
    do script "\"$HOME/Desktop/達爾/中控台/🎛️中控台.command\""
end tell
APPLESCRIPT

echo "✅ 中控台已啟動"
echo ""
echo "同時開啟網頁版..."
open "$HOME/Desktop/達爾/中控台/中控台.html" 2>/dev/null

