#!/usr/bin/env bash
set -e
# 把 OpenClaw 的問題與路徑送進 Cursor 對話（固定流程：喚起 → 開聊天 → 等開啟 → 座標點擊 → 貼上 → 送出）
#
# 用法:
#   ./scripts/send-to-cursor.sh "問題描述" "路徑1 路徑2"
#   echo "問題描述" | ./scripts/send-to-cursor.sh "" "路徑1"
#
# 自動化流程（METHOD=automation 時，預設）:
#   1. 喚起 Cursor (activate)
#   2. 按 Cmd+L 開啟聊天室
#   3. 等待聊天室開啟（延遲作為確認）
#   4. 在 .env.cursor 設定的座標上點擊（聊天輸入框）
#   5. Cmd+V 貼上、Enter 送出
#
# 環境變數:
#   SEND_TO_CURSOR_METHOD=automation （預設）上述固定流程，必須有 .env.cursor 座標
#   SEND_TO_CURSOR_METHOD=deeplink   改為用 cursor.com/link/prompt 預填（會有確認彈窗）
#   SEND_TO_CURSOR_MANUAL=1          只寫檔並開 Cursor，手動貼上
#   座標（必要）：.env.cursor 內 CURSOR_CHAT_CLICK_X、CURSOR_CHAT_CLICK_Y（用 get-cursor-chat-coordinates.sh 取得）

CURSOR_CLI="${CURSOR_CLI:-/Applications/Cursor.app/Contents/Resources/app/bin/cursor}"
WORKSPACE_DIR="${OPENCLAW_WORKSPACE:-$HOME/.openclaw/workspace}"
OUTPUT_FILE="${WORKSPACE_DIR}/cursor-chat-input.txt"
MANUAL="${SEND_TO_CURSOR_MANUAL:-0}"
# 預設一律用座標方式送出（.env.cursor 有座標則用絕對座標，否則用視窗右下偏移）
if [ -f "${WORKSPACE_DIR}/.env.cursor" ]; then
  . "${WORKSPACE_DIR}/.env.cursor"
fi
METHOD="${SEND_TO_CURSOR_METHOD:-automation}"
# Deeplink URL 過長時部分環境會失敗，超過此長度改走 automation 或只寫檔
DEEPLINK_MAX_LEN="${DEEPLINK_MAX_LEN:-1800}"

problem="${1:-}"
paths="${2:-}"

if [ -z "$problem" ] && [ ! -t 0 ]; then
  problem=$(cat)
fi

if [ -z "$paths" ]; then
  paths="$WORKSPACE_DIR"
fi

# 組出要送出的內文
message="這是 OpenClaw 的問題，請依路徑幫忙解決。

---
**問題：**
$problem

**路徑：**
$paths
---"

# 寫入檔案（不論用哪種方式都留一份）
echo "$message" > "$OUTPUT_FILE"

# 只寫檔 + 開 Cursor，不自動送
if [ "$MANUAL" = "1" ]; then
  if [ -x "$CURSOR_CLI" ]; then
    "$CURSOR_CLI" "$OUTPUT_FILE"
    echo "已寫入 $OUTPUT_FILE 並已開啟 Cursor。請手動將內容貼到對話視窗後送出。"
  else
    echo "已寫入 $OUTPUT_FILE。請手動開啟 Cursor 與該檔。"
  fi
  exit 0
fi

# ----- 方式一：Deeplink（推薦）-----
# 開啟 cursor.com/link/prompt?text=... 會讓 Cursor 預填對話內容，老蔡只需按 Enter 送出
use_deeplink() {
  local encoded
  encoded=$(printf '%s' "$message" | python3 -c "
import urllib.parse, sys
t = sys.stdin.read()
e = urllib.parse.quote(t, safe='')
print(e)
" 2>/dev/null)
  [ -z "$encoded" ] && return 1
  local url="https://cursor.com/link/prompt?text=${encoded}"
  if [ ${#url} -gt "$DEEPLINK_MAX_LEN" ]; then
    return 2
  fi
  open "$url" 2>/dev/null || return 1
  return 0
}

if [ "$METHOD" = "deeplink" ]; then
  use_deeplink
  r=$?
  if [ $r -eq 0 ]; then
    echo "已用 Cursor Deeplink 開啟，對話已預填。請在 Cursor 中確認內容後按 Enter 送出。"
    exit 0
  fi
  [ $r -eq 2 ] && echo "訊息較長，Deeplink URL 超過限制，改為自動貼上方式。"
fi

# ----- 方式二：剪貼簿 + AppleScript 點擊座標貼上並送出 -----
if ! (printf '%s' "$message" | pbcopy); then
  echo "已寫入 $OUTPUT_FILE，但 pbcopy 失敗。請手動開啟 Cursor 與該檔後貼上送出。"
  [ -x "$CURSOR_CLI" ] && "$CURSOR_CLI" "$OUTPUT_FILE"
  exit 1
fi

[ -f "${WORKSPACE_DIR}/.env.cursor" ] && . "${WORKSPACE_DIR}/.env.cursor"
USE_ABS_X="${CURSOR_CHAT_CLICK_X:-}"
USE_ABS_Y="${CURSOR_CHAT_CLICK_Y:-}"

# automation 時座標為必要
if [ "$METHOD" = "automation" ]; then
  if [ -z "$USE_ABS_X" ] || [ -z "$USE_ABS_Y" ]; then
    echo "錯誤：automation 需要聊天輸入框座標。請執行：" >&2
    echo "  ./scripts/get-cursor-chat-coordinates.sh" >&2
    echo "並將輸出的兩行寫入 ${WORKSPACE_DIR}/.env.cursor" >&2
    exit 1
  fi
fi

# 固定流程：喚起 Cursor → 開聊天室 → 等待開啟 → 座標點擊 → 貼上 → 送出
run_automation() {
  osascript <<APPLESCRIPT
-- 1. 喚起 Cursor
tell application "Cursor" to activate
delay 1.5

-- 2. 開聊天室 (Cmd+L)
tell application "System Events" to tell process "Cursor"
  keystroke "l" using command down
end tell

-- 3. 等待聊天室開啟（以延遲確認 UI 就緒）
delay 2.5

-- 4. 在座標點擊（聊天輸入框）
tell application "System Events" to tell process "Cursor"
  click at {$USE_ABS_X, $USE_ABS_Y}
end tell
delay 0.5

-- 5. 貼上、送出
tell application "System Events" to tell process "Cursor"
  keystroke "v" using command down
end tell
delay 0.4
tell application "System Events" to tell process "Cursor"
  key code 36
end tell
APPLESCRIPT
}

# 執行前再次確認座標（automation 與 deeplink 失敗 fallback 都需要）
if [ -z "$USE_ABS_X" ] || [ -z "$USE_ABS_Y" ]; then
  echo "錯誤：需要聊天輸入框座標。請執行 ./scripts/get-cursor-chat-coordinates.sh 並將輸出寫入 ${WORKSPACE_DIR}/.env.cursor" >&2
  exit 1
fi

if run_automation 2>/dev/null; then
  echo "已自動在 Cursor 對話視窗貼上並送出。請在 Cursor 中查看回覆。"
else
  echo "已寫入 $OUTPUT_FILE 並複製到剪貼簿。請在 Cursor 按 Cmd+L 後 Cmd+V 貼上、Enter 送出。"
  [ -x "$CURSOR_CLI" ] && "$CURSOR_CLI" "$WORKSPACE_DIR"
fi
