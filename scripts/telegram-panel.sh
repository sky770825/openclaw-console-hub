#!/bin/bash
source /Users/caijunchang/.env 2>/dev/null
# ============================================================
# 小蔡控制面板 - Telegram Inline Keyboard Handler
# 版本: 2.0
# 用途: 一按就跑，結果直接回傳
# 使用: ./scripts/telegram-panel.sh [start|send|stop|status]
# ============================================================

BOT_TOKEN="${TELEGRAM_BOT_TOKEN}"
BOT_API="https://api.telegram.org/bot${BOT_TOKEN}"
CHAT_ID="5819565005"
TASKBOARD="http://localhost:3011"
WORKSPACE="/Users/caijunchang/.openclaw/workspace"
PID_FILE="${WORKSPACE}/.telegram-panel.pid"
LOG_FILE="${WORKSPACE}/logs/telegram-panel.log"
OFFSET=0

mkdir -p "${WORKSPACE}/logs"

# ---- 工具函式 ----
answer_callback() {
  curl -s -X POST "${BOT_API}/answerCallbackQuery" \
    -H 'Content-Type: application/json' \
    -d "{\"callback_query_id\": \"$1\"}" > /dev/null 2>&1
}

# 用 python3 安全送出訊息（避免 shell 特殊字元問題）
edit_msg() {
  local chat_id="$1" msg_id="$2" text="$3" markup="$4"
  python3 -c "
import json, urllib.request
data = {
    'chat_id': ${chat_id},
    'message_id': ${msg_id},
    'text': '''${text}''',
    'parse_mode': 'Markdown'
}
markup = '''${markup}'''
if markup:
    data['reply_markup'] = json.loads(markup)
req = urllib.request.Request(
    '${BOT_API}/editMessageText',
    data=json.dumps(data).encode(),
    headers={'Content-Type': 'application/json'}
)
try:
    urllib.request.urlopen(req, timeout=10)
except Exception as e:
    # Markdown 解析失敗時改用純文字
    data.pop('parse_mode', None)
    req2 = urllib.request.Request(
        '${BOT_API}/editMessageText',
        data=json.dumps(data).encode(),
        headers={'Content-Type': 'application/json'}
    )
    try:
        urllib.request.urlopen(req2, timeout=10)
    except:
        pass
" 2>/dev/null
}

send_msg() {
  local chat_id="$1" text="$2" markup="$3"
  python3 -c "
import json, urllib.request
data = {
    'chat_id': ${chat_id},
    'text': '''${text}''',
    'parse_mode': 'Markdown'
}
markup = '''${markup}'''
if markup:
    data['reply_markup'] = json.loads(markup)
req = ur切換了