#!/usr/bin/env bash
set -e
# 取得「Cursor 聊天輸入框」的螢幕座標，供 send-to-cursor.sh 使用（自動化貼到正確位置）
#
# 使用方式：
#   1. 先開啟 Cursor，並用 Cmd+L 打開聊天側欄。
#   2. 執行：./scripts/get-cursor-chat-coordinates.sh
#   3. 在 5 秒內把滑鼠移到「聊天輸入框」（要貼上的那格）中央，不要點擊。
#   4. 腳本會輸出座標，例如：CURSOR_CHAT_CLICK_X=1450  CURSOR_CHAT_CLICK_Y=520
#   5. 把這兩行寫進 ~/.openclaw/workspace/.env.cursor 或 export 後，send-to-cursor.sh 會用這組座標點擊。
#
# 之後執行 send-to-cursor.sh 時會自動點擊該座標再貼上、送出。

echo "請在 5 秒內把滑鼠移到 Cursor 的「聊天輸入框」中央（要貼訊息的那一格）..."
sleep 5
# 用 Swift 取得滑鼠座標（螢幕左上為原點）；AppleScript 在某些 macOS 無法取得 position of mouse
raw=$(swift -e '
import AppKit
let loc = NSEvent.mouseLocation
let main = NSScreen.screens.first ?? NSScreen.main ?? NSScreen.screens[0]
let height = main.frame.height
let y = height - loc.y
print(Int(loc.x), Int(y))
' 2>/dev/null)
# 格式為 "x y"
read -r cx cy <<< "$raw"
echo ""
if [ -z "$cx" ] || [ -z "$cy" ]; then
  echo "無法取得座標。請確認已授予「輔助使用」權限給終端機或 Cursor。"
  exit 1
fi
echo "請將以下內容存成 ~/.openclaw/workspace/.env.cursor（或 export 到環境），之後 send-to-cursor.sh 會用這組座標點擊聊天輸入區："
echo "CURSOR_CHAT_CLICK_X=$cx"
echo "CURSOR_CHAT_CLICK_Y=$cy"
