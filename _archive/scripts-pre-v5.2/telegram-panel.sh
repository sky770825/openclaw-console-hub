#!/bin/bash
# ============================================================
# 達爾控制面板 - Telegram Inline Keyboard Handler
# 版本: 2.0
# 用途: 一按就跑，結果直接回傳
# 使用: ./scripts/telegram-panel.sh [start|send|stop|status]
# ============================================================

BOT_TOKEN="8355839830:AAE3eB94HeNPsNPYEfsuUtB_3BJNKgfuRBU"
BOT_API="https://api.telegram.org/bot${BOT_TOKEN}"
CHAT_ID="5819565005"
TASKBOARD="http://localhost:3011"
WORKSPACE="/Users/sky770825/.openclaw/workspace"
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
req = urllib.request.Request(
    '${BOT_API}/sendMessage',
    data=json.dumps(data).encode(),
    headers={'Content-Type': 'application/json'}
)
try:
    urllib.request.urlopen(req, timeout=10)
except:
    data.pop('parse_mode', None)
    req2 = urllib.request.Request(
        '${BOT_API}/sendMessage',
        data=json.dumps(data).encode(),
        headers={'Content-Type': 'application/json'}
    )
    try:
        urllib.request.urlopen(req2, timeout=10)
    except:
        pass
" 2>/dev/null
}

# ---- 面板 Markup ----
PANEL_MARKUP='{"inline_keyboard":[[{"text":"📋 系統檢查","callback_data":"sys_check"},{"text":"🔍 偵測活動","callback_data":"detect"}],[{"text":"📊 任務狀態","callback_data":"task_status"},{"text":"🧹 快速巡檢","callback_data":"heal_check"}],[{"text":"🔄 重啟 Gateway","callback_data":"restart_gw"},{"text":"🔄 重啟任務板","callback_data":"restart_tb"}],[{"text":"🔧 自動修復","callback_data":"heal_fix"},{"text":"🛡️ CR-7 掃描","callback_data":"heal_cr7"}],[{"text":"⏪ 回滾到驗證版","callback_data":"rollback"},{"text":"📖 指令清單","callback_data":"help"}],[{"text":"🛑 緊急停止","callback_data":"emergency_stop"}]]}'
BACK_MARKUP='{"inline_keyboard":[[{"text":"🔙 返回面板","callback_data":"show_panel"}]]}'

# ---- 送出面板 ----
send_panel() {
  send_msg "$CHAT_ID" "🔧 *OpenClaw 救援面板*

選擇要執行的操作（一按就跑）：" "$PANEL_MARKUP"
  echo "✅ 面板已送出"
}

# ---- 清理腳本輸出給 Telegram 用 ----
clean_output() {
  # 去 ANSI color、截斷長度、轉義
  sed 's/\x1b\[[0-9;]*m//g' | head -40 | sed "s/'/'/g"
}

# ---- 處理按鈕 ----
handle_action() {
  local action="$1" chat_id="$2" msg_id="$3" cb_id="$4"
  answer_callback "$cb_id"

  case "$action" in

    # ==================== 📋 系統檢查 ====================
    sys_check)
      edit_msg "$chat_id" "$msg_id" "📋 系統檢查中..." "$BACK_MARKUP"

      local result=""

      # 1. Docker 容器狀態
      local docker_status
      docker_status=$(docker ps --format "{{.Names}}: {{.Status}}" 2>/dev/null | head -10)
      if [ -n "$docker_status" ]; then
        result="🐳 *Docker 容器*
${docker_status}
"
      else
        result="🐳 *Docker*: ❌ 無法取得狀態
"
      fi

      # 2. 任務板狀態
      local task_data
      task_data=$(curl -s --max-time 5 "${TASKBOARD}/api/tasks" 2>/dev/null)
      if [ -n "$task_data" ]; then
        local task_summary
        task_summary=$(echo "$task_data" | python3 -c "
import sys, json
d = json.load(sys.stdin)
l = d if isinstance(d, list) else d.get('data', d.get('tasks', []))
running = len([t for t in l if t.get('status') in ('running','in_progress')])
review = len([t for t in l if t.get('status') == 'review'])
failed = len([t for t in l if t.get('status') == 'failed'])
done = len([t for t in l if t.get('status') == 'done'])
warns = []
if len(l) > 200: warns.append(f'⚠️ 任務數 {len(l)} 超過 200')
if running > 3: warns.append(f'⚠️ {running} 個任務在跑')
print(f'📦 總數: {len(l)} | 🏃 {running} | 👀 {review} | ❌ {failed} | ✅ {done}')
if warns: print('\\n'.join(warns))
" 2>/dev/null)
        result="${result}
📊 *任務板*
${task_summary}
"
      else
        result="${result}
📊 *任務板*: ❌ 連線失敗 (localhost:3011)
"
      fi

      # 3. Polling 腳本自身狀態
      if [ -f "$PID_FILE" ]; then
        local ppid
        ppid=$(cat "$PID_FILE")
        if ps -p "$ppid" > /dev/null 2>&1; then
          result="${result}
🤖 *面板 Polling*: ✅ 執行中 (PID: ${ppid})"
        fi
      fi

      edit_msg "$chat_id" "$msg_id" "📋 *系統檢查結果*

${result}" "$BACK_MARKUP"
      ;;

    # ==================== 🔍 偵測活動 ====================
    detect)
      edit_msg "$chat_id" "$msg_id" "🔍 偵測最近活動中..." "$BACK_MARKUP"

      local recent_files
      recent_files=$(cd "$WORKSPACE" && find . -maxdepth 2 -mmin -10 \
        -not -path './.git/*' \
        -not -path './archive/*' \
        -not -path './node_modules/*' \
        -not -path './logs/*' \
        -type f 2>/dev/null | head -20)

      local result=""
      if [ -n "$recent_files" ]; then
        local file_count
        file_count=$(echo "$recent_files" | wc -l | tr -d ' ')
        result="🔍 *最近 10 分鐘有 ${file_count} 個檔案被修改：*

${recent_files}

⚠️ 如果你沒在動，可能有 Agent 在操作"
      else
        result="🔍 *偵測結果*

✅ 最近 10 分鐘沒有檔案被修改
目前沒有 Agent 活動"
      fi

      edit_msg "$chat_id" "$msg_id" "$result" "$BACK_MARKUP"
      ;;

    # ==================== 📊 任務狀態 ====================
    task_status)
      edit_msg "$chat_id" "$msg_id" "📊 查詢任務狀態中..." "$BACK_MARKUP"

      local task_data
      task_data=$(curl -s --max-time 5 "${TASKBOARD}/api/tasks" 2>/dev/null)
      if [ -n "$task_data" ]; then
        local summary
        summary=$(echo "$task_data" | python3 -c "
import sys, json
d = json.load(sys.stdin)
l = d if isinstance(d, list) else d.get('data', d.get('tasks', []))
by_status = {}
for t in l:
    s = t.get('status', 'unknown')
    by_status[s] = by_status.get(s, 0) + 1
emoji = {'queued':'⏳','running':'🏃','in_progress':'🏃','review':'👀','done':'✅','failed':'❌','cancelled':'🚫','blocked':'🔒'}
lines = [f'📊 *任務狀態總覽*', '', f'📦 總數: {len(l)}', '']
for s, c in sorted(by_status.items(), key=lambda x: -x[1]):
    e = emoji.get(s, '📌')
    lines.append(f'{e} {s}: {c}')
# 最近 5 個更新
recent = sorted(l, key=lambda t: t.get('updatedAt',''), reverse=True)[:5]
if recent:
    lines.append('')
    lines.append('*最近更新:*')
    for t in recent:
        e = emoji.get(t.get('status',''), '📌')
        title = (t.get('title') or t.get('id', '-'))[:35]
        lines.append(f'{e} {title}')
print(chr(10).join(lines))
" 2>/dev/null)
        local markup='{"inline_keyboard":[[{"text":"👀 待審核","callback_data":"tasks_review"},{"text":"🏃 執行中","callback_data":"tasks_running"}],[{"text":"🔙 返回面板","callback_data":"show_panel"}]]}'
        edit_msg "$chat_id" "$msg_id" "$summary" "$markup"
      else
        edit_msg "$chat_id" "$msg_id" "📊 *任務狀態*

❌ 任務板連線失敗" "$BACK_MARKUP"
      fi
      ;;

    tasks_review)
      edit_msg "$chat_id" "$msg_id" "👀 查詢待審核..." "$BACK_MARKUP"
      local task_data
      task_data=$(curl -s --max-time 5 "${TASKBOARD}/api/tasks?status=review" 2>/dev/null)
      local summary
      summary=$(echo "$task_data" | python3 -c "
import sys, json
d = json.load(sys.stdin)
l = d if isinstance(d, list) else d.get('data', d.get('tasks', []))
if not l:
    print('👀 *待審核任務*\n\n目前沒有待審核的任務。')
else:
    lines = [f'👀 *待審核任務 ({len(l)})*', '']
    for i, t in enumerate(l[:10]):
        title = (t.get('title') or t.get('id', '-'))[:40]
        lines.append(f'{i+1}. {title}')
    print(chr(10).join(lines))
" 2>/dev/null)
      edit_msg "$chat_id" "$msg_id" "$summary" "$BACK_MARKUP"
      ;;

    tasks_running)
      edit_msg "$chat_id" "$msg_id" "🏃 查詢執行中..." "$BACK_MARKUP"
      local task_data
      task_data=$(curl -s --max-time 5 "${TASKBOARD}/api/tasks?status=running" 2>/dev/null)
      local summary
      summary=$(echo "$task_data" | python3 -c "
import sys, json, datetime
d = json.load(sys.stdin)
l = d if isinstance(d, list) else d.get('data', d.get('tasks', []))
if not l:
    print('🏃 *執行中任務*\n\n目前沒有正在執行的任務。')
else:
    lines = [f'🏃 *執行中任務 ({len(l)})*', '']
    for i, t in enumerate(l[:10]):
        title = (t.get('title') or t.get('id', '-'))[:35]
        line = f'{i+1}. {title}'
        ua = t.get('updatedAt','')
        if ua:
            try:
                dt = datetime.datetime.fromisoformat(ua.replace('Z','+00:00'))
                hours = (datetime.datetime.now(datetime.timezone.utc) - dt).total_seconds() / 3600
                if hours > 24:
                    line += f' ⚠️ {int(hours)}h'
            except: pass
        lines.append(line)
    print(chr(10).join(lines))
" 2>/dev/null)
      edit_msg "$chat_id" "$msg_id" "$summary" "$BACK_MARKUP"
      ;;

    # ==================== 🔄 重啟 Gateway ====================
    restart_gw)
      local markup='{"inline_keyboard":[[{"text":"✅ 確認重啟 Gateway","callback_data":"confirm_restart_gw"},{"text":"❌ 取消","callback_data":"show_panel"}]]}'
      edit_msg "$chat_id" "$msg_id" "🔄 *重啟 OpenClaw Gateway*

即將關閉並重啟達爾主程式（openclaw gateway）
確定要執行嗎？" "$markup"
      ;;

    confirm_restart_gw)
      edit_msg "$chat_id" "$msg_id" "🔄 正在重啟 OpenClaw Gateway..." "$BACK_MARKUP"

      pkill -f "openclaw-gateway" 2>/dev/null
      sleep 2
      nohup /opt/homebrew/bin/openclaw gateway --force > /tmp/openclaw-gateway.log 2>&1 &
      local gw_pid=$!
      sleep 3

      local gw_status
      if /opt/homebrew/bin/openclaw health 2>/dev/null | grep -qi "ok\|healthy"; then
        gw_status="✅ Gateway 已重啟成功 (PID: ${gw_pid})
✅ 健康檢查通過"
      elif ps -p "$gw_pid" > /dev/null 2>&1; then
        gw_status="✅ Gateway 已重啟 (PID: ${gw_pid})
⏳ 啟動中（健康檢查尚未通過）"
      else
        gw_status="❌ Gateway 啟動失敗，請手動檢查
查看 log: /tmp/openclaw-gateway.log"
      fi

      edit_msg "$chat_id" "$msg_id" "🔄 *重啟 Gateway 結果*

${gw_status}" "$BACK_MARKUP"
      ;;

    # ==================== 🔄 重啟任務板 ====================
    restart_tb)
      local markup='{"inline_keyboard":[[{"text":"✅ 確認重啟任務板","callback_data":"confirm_restart_tb"},{"text":"❌ 取消","callback_data":"show_panel"}]]}'
      edit_msg "$chat_id" "$msg_id" "🔄 *重啟任務板 API*

即將關閉並重啟 localhost:3011
確定要執行嗎？" "$markup"
      ;;

    confirm_restart_tb)
      edit_msg "$chat_id" "$msg_id" "🔄 正在重啟任務板 API..." "$BACK_MARKUP"

      pkill -f "node.*openclaw任務面版設計/server" 2>/dev/null
      sleep 1
      cd "/Users/sky770825/openclaw任務面版設計/server" && nohup node dist/index.js > /tmp/openclaw-taskboard.log 2>&1 &
      local tb_pid=$!
      cd "$WORKSPACE"
      sleep 2

      local tb_status
      if curl -s --max-time 3 http://localhost:3011/api/tasks > /dev/null 2>&1; then
        tb_status="✅ 任務板已重啟成功 (PID: ${tb_pid})
✅ localhost:3011 連線正常"
      elif ps -p "$tb_pid" > /dev/null 2>&1; then
        tb_status="✅ 任務板已重啟 (PID: ${tb_pid})
⏳ 啟動中..."
      else
        tb_status="❌ 任務板啟動失敗，請手動檢查
查看 log: /tmp/openclaw-taskboard.log"
      fi

      edit_msg "$chat_id" "$msg_id" "🔄 *重啟任務板結果*

${tb_status}" "$BACK_MARKUP"
      ;;

    # ==================== 🧹 快速巡檢 ====================
    heal_check)
      edit_msg "$chat_id" "$msg_id" "🧹 正在執行 self-heal.sh check..." "$BACK_MARKUP"

      local result
      result=$(cd "$WORKSPACE" && zsh ./scripts/self-heal.sh check 2>&1 | clean_output)

      edit_msg "$chat_id" "$msg_id" "🧹 *巡檢結果 (self-heal.sh check)*

${result}" "$BACK_MARKUP"
      ;;

    # ==================== 🔧 自動修復 ====================
    heal_fix)
      # 二次確認
      local markup='{"inline_keyboard":[[{"text":"✅ 確認修復","callback_data":"confirm_fix"},{"text":"❌ 取消","callback_data":"show_panel"}]]}'
      edit_msg "$chat_id" "$msg_id" "🔧 *自動修復*

即將執行 self-heal.sh fix
這會自動清理非白名單檔案、修復卡住的任務

確定要執行嗎？" "$markup"
      ;;

    confirm_fix)
      edit_msg "$chat_id" "$msg_id" "🔧 正在執行 self-heal.sh fix..." "$BACK_MARKUP"

      local result
      result=$(cd "$WORKSPACE" && zsh ./scripts/self-heal.sh fix 2>&1 | clean_output)

      edit_msg "$chat_id" "$msg_id" "🔧 *修復結果 (self-heal.sh fix)*

${result}" "$BACK_MARKUP"
      ;;

    # ==================== 🛡️ CR-7 掃描 ====================
    heal_cr7)
      edit_msg "$chat_id" "$msg_id" "🛡️ 正在執行 CR-7 未授權自動化掃描..." "$BACK_MARKUP"

      local result
      result=$(cd "$WORKSPACE" && zsh ./scripts/self-heal.sh cr7 2>&1 | clean_output)

      edit_msg "$chat_id" "$msg_id" "🛡️ *CR-7 掃描結果*

${result}" "$BACK_MARKUP"
      ;;

    # ==================== 🛑 緊急停止 ====================
    emergency_stop)
      local markup='{"inline_keyboard":[[{"text":"🛑 確認停止","callback_data":"confirm_stop"},{"text":"❌ 取消","callback_data":"show_panel"}]]}'
      edit_msg "$chat_id" "$msg_id" "🛑 *緊急停止*

確定要發出停止指令嗎？
所有 Agent 會立即停止" "$markup"
      ;;

    confirm_stop)
      curl -s -X POST "http://127.0.0.1:5678/webhook/system-event-notify" \
        -H 'Content-Type: application/json' \
        -d '{"source":"telegram-panel","event":"emergency_stop","message":"🛑 主人透過 Telegram 面板發出緊急停止指令"}' > /dev/null 2>&1

      local markup='{"inline_keyboard":[[{"text":"▶️ 恢復運作","callback_data":"resume_ops"}],[{"text":"🔙 返回面板","callback_data":"show_panel"}]]}'
      edit_msg "$chat_id" "$msg_id" "🛑 *緊急停止已發出*

✅ 停止指令已廣播
⏸️ 所有 Agent 應立即停止

按下方按鈕恢復：" "$markup"
      ;;

    resume_ops)
      curl -s -X POST "http://127.0.0.1:5678/webhook/system-event-notify" \
        -H 'Content-Type: application/json' \
        -d '{"source":"telegram-panel","event":"resume","message":"▶️ 主人透過 Telegram 面板恢復運作"}' > /dev/null 2>&1

      edit_msg "$chat_id" "$msg_id" "▶️ *已恢復運作*

所有 Agent 可以繼續工作。" "$BACK_MARKUP"
      ;;

    # ==================== ⏪ 回滾到驗證版 ====================
    rollback)
      # 先列出目前的驗證標籤和未提交變更
      edit_msg "$chat_id" "$msg_id" "⏪ 正在檢查回滾資訊..." "$BACK_MARKUP"

      local latest_tag dirty_files tag_info
      latest_tag=$(cd "$WORKSPACE" && git tag -l "verified-*" --sort=-version:refname | head -1)
      dirty_files=$(cd "$WORKSPACE" && git diff --name-only 2>/dev/null | head -10)
      local dirty_untracked
      dirty_untracked=$(cd "$WORKSPACE" && git ls-files --others --exclude-standard 2>/dev/null | wc -l | tr -d ' ')

      if [ -z "$latest_tag" ]; then
        edit_msg "$chat_id" "$msg_id" "⏪ *回滾*

❌ 找不到任何 verified-* 標籤
請先由 Claude Code 打標籤" "$BACK_MARKUP"
        return
      fi

      tag_info=$(cd "$WORKSPACE" && git log "$latest_tag" --oneline -1 2>/dev/null)
      local current_head
      current_head=$(cd "$WORKSPACE" && git log --oneline -1 2>/dev/null)
      local commits_ahead
      commits_ahead=$(cd "$WORKSPACE" && git rev-list "${latest_tag}..HEAD" --count 2>/dev/null)

      local status_text="⏪ *回滾到驗證版本*

🏷️ 最新驗證標籤: ${latest_tag}
📌 標籤內容: ${tag_info}
📍 目前 HEAD: ${current_head}
📏 距離驗證版: ${commits_ahead} 個 commit"

      if [ -n "$dirty_files" ]; then
        status_text="${status_text}

⚠️ 有未提交的修改:
${dirty_files}"
      fi

      if [ "$dirty_untracked" -gt 0 ]; then
        status_text="${status_text}
📁 ${dirty_untracked} 個未追蹤檔案"
      fi

      if [ "$commits_ahead" = "0" ] && [ -z "$dirty_files" ]; then
        status_text="${status_text}

✅ 目前已經在驗證版本，不需要回滾"
        edit_msg "$chat_id" "$msg_id" "$status_text" "$BACK_MARKUP"
      else
        status_text="${status_text}

⚠️ 回滾會丟棄驗證版之後的所有變更！"
        local markup='{"inline_keyboard":[[{"text":"✅ 確認回滾到 '"${latest_tag}"'","callback_data":"confirm_rollback"}],[{"text":"❌ 取消","callback_data":"show_panel"}]]}'
        edit_msg "$chat_id" "$msg_id" "$status_text" "$markup"
      fi
      ;;

    confirm_rollback)
      edit_msg "$chat_id" "$msg_id" "⏪ 正在回滾..." "$BACK_MARKUP"

      local latest_tag
      latest_tag=$(cd "$WORKSPACE" && git tag -l "verified-*" --sort=-version:refname | head -1)

      if [ -z "$latest_tag" ]; then
        edit_msg "$chat_id" "$msg_id" "❌ 找不到驗證標籤" "$BACK_MARKUP"
        return
      fi

      # 先備份當前狀態
      local backup_branch="backup-before-rollback-$(date +%Y%m%d-%H%M%S)"
      cd "$WORKSPACE"
      git stash --include-untracked -m "telegram-panel rollback backup" 2>/dev/null
      git branch "$backup_branch" 2>/dev/null

      # 執行回滾
      git checkout "$latest_tag" -- . 2>/dev/null
      git checkout "$latest_tag" -- AGENTS.md scripts/self-heal.sh scripts/telegram-panel.sh 2>/dev/null

      local result_text="⏪ *回滾完成*

🏷️ 已回滾到: ${latest_tag}
💾 備份分支: ${backup_branch}

已恢復的關鍵檔案:
- AGENTS.md
- scripts/self-heal.sh
- scripts/telegram-panel.sh

⚠️ 回滾後建議:
1. 按「🧹快速巡檢」確認狀態
2. 如需恢復，用 git stash pop"

      edit_msg "$chat_id" "$msg_id" "$result_text" "$BACK_MARKUP"
      ;;

    # ==================== 📖 指令清單 ====================
    help)
      edit_msg "$chat_id" "$msg_id" "📖 *OpenClaw 救援面板*

*按鈕功能（一按就跑）：*
📋 系統檢查 → Docker + 任務板狀態
🔍 偵測活動 → 近 10 分鐘檔案變動
📊 任務狀態 → 各狀態統計 + 明細
🔄 重啟 Gateway → 重啟達爾主程式
🔄 重啟任務板 → 重啟 localhost:3011
🧹 快速巡檢 → 執行 self-heal.sh check
🔧 自動修復 → 執行 self-heal.sh fix
🛡️ CR-7 掃描 → 偵測未授權自動化
⏪ 回滾驗證版 → 恢復到上次驗證的狀態
🛑 緊急停止 → 停止所有 Agent

*Telegram 指令：*
/panel /start /menu → 開啟面板

*燈號：* 🟢直接做 🟡先說 🔴等批准" "$BACK_MARKUP"
      ;;

    # ==================== 返回面板 ====================
    show_panel)
      edit_msg "$chat_id" "$msg_id" "🔧 *OpenClaw 救援面板*

選擇要執行的操作（一按就跑）：" "$PANEL_MARKUP"
      ;;

    *)
      edit_msg "$chat_id" "$msg_id" "⚠️ 未知操作: ${action}" "$BACK_MARKUP"
      ;;
  esac
}

# ---- Polling 主迴圈 ----
poll_loop() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') 🚀 控制面板 v2 polling 啟動" | tee -a "$LOG_FILE"
  echo $$ > "$PID_FILE"

  while true; do
    local updates
    updates=$(curl -s --max-time 35 "${BOT_API}/getUpdates?offset=${OFFSET}&timeout=30&allowed_updates=%5B%22message%22%2C%22callback_query%22%5D" 2>/dev/null)

    if [ -z "$updates" ]; then
      sleep 2
      continue
    fi

    local count
    count=$(echo "$updates" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('result',[])))" 2>/dev/null)

    if [ "$count" = "0" ] || [ -z "$count" ]; then
      continue
    fi

    # 解析每個 update
    echo "$updates" | python3 -c "
import sys, json
d = json.load(sys.stdin)
for u in d.get('result', []):
    uid = u['update_id']
    if 'callback_query' in u:
        cb = u['callback_query']
        chat_id = cb['message']['chat']['id']
        msg_id = cb['message']['message_id']
        cb_id = cb['id']
        action = cb.get('data', '')
        print(f'CALLBACK|{uid}|{chat_id}|{msg_id}|{cb_id}|{action}')
    elif 'message' in u:
        msg = u['message']
        text = (msg.get('text') or '').strip()
        chat_id = msg['chat']['id']
        if text in ('/panel', '/start', '/menu'):
            print(f'COMMAND|{uid}|{chat_id}|0|0|show_panel')
        else:
            print(f'IGNORE|{uid}|0|0|0|{text}')
" 2>/dev/null | while IFS='|' read -r type uid chat_id msg_id cb_id action; do
      OFFSET=$((uid + 1))

      case "$type" in
        CALLBACK)
          echo "$(date '+%H:%M:%S') 🔘 ${action}" >> "$LOG_FILE"
          handle_action "$action" "$chat_id" "$msg_id" "$cb_id"
          ;;
        COMMAND)
          echo "$(date '+%H:%M:%S') 📨 panel" >> "$LOG_FILE"
          send_panel
          ;;
      esac
    done

    local last_id
    last_id=$(echo "$updates" | python3 -c "import sys,json; d=json.load(sys.stdin); r=d.get('result',[]); print(r[-1]['update_id'] if r else 0)" 2>/dev/null)
    if [ -n "$last_id" ] && [ "$last_id" != "0" ]; then
      OFFSET=$((last_id + 1))
    fi
  done
}

# ---- 停止 / 狀態 ----
stop_handler() {
  if [ -f "$PID_FILE" ]; then
    local pid
    pid=$(cat "$PID_FILE")
    if ps -p "$pid" > /dev/null 2>&1; then
      kill "$pid" 2>/dev/null
      echo "✅ 已停止 polling (PID: $pid)"
    else
      echo "⚠️ PID $pid 已不在"
    fi
    rm -f "$PID_FILE"
  else
    echo "⚠️ 沒有找到 PID 檔"
  fi
}

status_handler() {
  if [ -f "$PID_FILE" ]; then
    local pid
    pid=$(cat "$PID_FILE")
    if ps -p "$pid" > /dev/null 2>&1; then
      echo "✅ Polling 正在執行 (PID: $pid)"
    else
      echo "❌ PID 檔存在但 process 不在 (PID: $pid)"
      rm -f "$PID_FILE"
    fi
  else
    echo "❌ Polling 未啟動"
  fi
}

# ---- 主入口 ----
case "${1:-}" in
  start)
    if [ -f "$PID_FILE" ]; then
      existing_pid=$(cat "$PID_FILE")
      if ps -p "$existing_pid" > /dev/null 2>&1; then
        echo "⚠️ 已經在跑了 (PID: $existing_pid)"
        exit 1
      fi
      rm -f "$PID_FILE"
    fi
    echo "🚀 啟動控制面板 v2 polling..."
    nohup bash "$0" _poll >> "$LOG_FILE" 2>&1 &
    echo "✅ 已啟動 (PID: $!)"
    ;;
  _poll)
    poll_loop
    ;;
  send)
    send_panel
    ;;
  stop)
    stop_handler
    ;;
  status)
    status_handler
    ;;
  *)
    echo "用法: $0 {start|send|stop|status}"
    echo ""
    echo "  start  - 啟動 polling（背景執行）"
    echo "  send   - 送一個面板到 Telegram"
    echo "  stop   - 停止 polling"
    echo "  status - 檢查狀態"
    ;;
esac
