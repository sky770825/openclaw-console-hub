#!/bin/bash
# ═══════════════════════════════════════════════════════
#  OpenClaw Deputy Mode — Claude Code 暫代執行
#  暫代關閉 → 只跑巡檢（同 patrol）
#  暫代開啟 → 巡檢 + 自動執行 auto-ok 任務
# ═══════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_DIR/logs"
mkdir -p "$LOG_DIR"

TIMESTAMP=$(date '+%Y%m%d-%H%M%S')
LOG_FILE="$LOG_DIR/deputy-${TIMESTAMP}.log"
API_BASE="http://localhost:3011"
TG_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TG_CHAT="${TELEGRAM_CHAT_ID:-}"
DEPUTY_STATE="$PROJECT_DIR/.openclaw-deputy-mode.json"
DEPUTY_LAST="$PROJECT_DIR/.openclaw-deputy-last-run.json"
MAX_TASKS=3

# 載入 .env
if [ -f "$PROJECT_DIR/.env" ]; then
  set -a
  source "$PROJECT_DIR/.env"
  set +a
  TG_TOKEN="${TELEGRAM_BOT_TOKEN:-$TG_TOKEN}"
  TG_CHAT="${TELEGRAM_CHAT_ID:-$TG_CHAT}"
fi

log() { echo "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG_FILE"; }

notify_tg() {
  if [ -n "$TG_TOKEN" ] && [ -n "$TG_CHAT" ]; then
    curl -s -X POST "https://api.telegram.org/bot${TG_TOKEN}/sendMessage" \
      -H "Content-Type: application/json" \
      -d "{\"chat_id\":\"${TG_CHAT}\",\"text\":\"$1\",\"parse_mode\":\"HTML\"}" > /dev/null 2>&1 || true
  fi
}

log "═══ OpenClaw Deputy START ═══"

# ── 1. 檢查暫代模式 ──
ENABLED="False"
if [ -f "$DEPUTY_STATE" ]; then
  ENABLED=$(python3 -c "import json; print(json.load(open('$DEPUTY_STATE')).get('enabled', False))" 2>/dev/null || echo "False")
fi

if [ "$ENABLED" != "True" ]; then
  log "暫代模式關閉，只跑巡檢"
  bash "$SCRIPT_DIR/openclaw-auto-patrol.sh" 2>&1 | tee -a "$LOG_FILE" || true
  log "═══ OpenClaw Deputy END (patrol only) ═══"
  exit 0
fi

log "暫代模式開啟，開始巡檢 + 執行"

# ── 2. 先跑巡檢 ──
bash "$SCRIPT_DIR/openclaw-auto-patrol.sh" 2>&1 | tee -a "$LOG_FILE" || true

# ── 3. 拉取可執行任務 ──
log "篩選可自動執行的任務..."
TASKS_JSON=$(curl -s --max-time 10 "${API_BASE}/api/openclaw/tasks" 2>/dev/null || echo "[]")

TASK_LIST=$(echo "$TASKS_JSON" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    tasks = data if isinstance(data, list) else data.get('tasks', data.get('data', []))
    # 讀取暫代配置
    try:
        cfg = json.load(open('$DEPUTY_STATE'))
    except:
        cfg = {}
    allowed = set(cfg.get('allowedTags', ['auto-ok']))
    excluded = set(cfg.get('excludeTags', []))
    max_t = cfg.get('maxTasksPerRun', $MAX_TASKS)

    auto = []
    for t in tasks:
        status = t.get('status', '')
        if status not in ('queued', 'ready'):
            continue
        tags = set(t.get('tags') or [])
        if not (tags & allowed):
            continue
        if tags & excluded:
            continue
        auto.append(t)
        if len(auto) >= max_t:
            break

    for t in auto:
        print(json.dumps({
            'id': t.get('id', ''),
            'name': t.get('name', ''),
            'description': t.get('description', '')[:500]
        }, ensure_ascii=False))
except Exception as e:
    import sys as s
    print(f'ERROR: {e}', file=s.stderr)
" 2>/dev/null || echo "")

TASK_COUNT=$(echo "$TASK_LIST" | grep -c '^{' 2>/dev/null || echo "0")
log "找到 $TASK_COUNT 個可自動執行的任務"

if [ "$TASK_COUNT" -eq 0 ]; then
  log "沒有可執行的任務"
  notify_tg "🤖 <b>暫代巡檢完成</b> $(date '+%m/%d %H:%M')

📋 沒有可自動執行的任務
💡 標記任務 tag 為 <code>auto-ok</code> 即可啟用自動執行"
  echo "{\"lastDeputyRun\":\"$(date -u '+%Y-%m-%dT%H:%M:%SZ')\",\"tasksExecuted\":0,\"results\":[]}" > "$DEPUTY_LAST"
  log "═══ OpenClaw Deputy END (no tasks) ═══"
  exit 0
fi

# ── 4. 找到 Claude Code CLI ──
CLAUDE_BIN=""
for p in /Users/caijunchang/.cursor/extensions/anthropic.claude-code-*/resources/native-binary/claude; do
  if [ -x "$p" ]; then
    CLAUDE_BIN="$p"
  fi
done

if [ -z "$CLAUDE_BIN" ]; then
  # fallback: fnm 安裝的 claude
  if command -v claude &>/dev/null; then
    CLAUDE_BIN="claude"
  else
    log "找不到 Claude Code CLI，無法執行任務"
    notify_tg "⚠️ <b>暫代警報</b>：找不到 Claude Code CLI，無法自動執行"
    exit 1
  fi
fi
log "使用 Claude CLI: $CLAUDE_BIN"

# ── 5. 逐個執行任務 ──
RESULTS=""
SUCCESS_COUNT=0
FAIL_COUNT=0

while IFS= read -r task_json; do
  [ -z "$task_json" ] && continue
  echo "$task_json" | python3 -c "import json,sys; json.load(sys.stdin)" 2>/dev/null || continue

  TASK_ID=$(echo "$task_json" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
  TASK_NAME=$(echo "$task_json" | python3 -c "import sys,json; print(json.load(sys.stdin)['name'])")
  TASK_DESC=$(echo "$task_json" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('description','')[:300])")

  log "── 執行任務: $TASK_NAME ($TASK_ID) ──"

  # 更新狀態為 in_progress
  curl -s -X PATCH "${API_BASE}/api/openclaw/tasks/${TASK_ID}" \
    -H 'Content-Type: application/json' \
    -d '{"status":"in_progress"}' > /dev/null 2>&1 || true

  # 組裝 prompt
  PROMPT="你是 OpenClaw 暫代 Agent，在 $PROJECT_DIR 工作目錄下。

請執行以下任務：
任務名稱：${TASK_NAME}
任務說明：${TASK_DESC}

規則：
1. 只做確定安全的修改
2. 不要修改 .env 檔案
3. 不要刪除任何檔案
4. 不要執行 git push
5. 完成後簡要說明做了什麼"

  # 執行 Claude Code headless（限制 10 輪對話、5 分鐘超時）
  TASK_LOG="$LOG_DIR/deputy-task-${TASK_ID}-${TIMESTAMP}.log"
  timeout 300 "$CLAUDE_BIN" --print --max-turns 10 "$PROMPT" > "$TASK_LOG" 2>&1
  EXIT_CODE=$?

  TAIL_OUTPUT=$(tail -20 "$TASK_LOG" 2>/dev/null || echo "(no output)")

  if [ $EXIT_CODE -eq 0 ]; then
    log "✅ 任務完成: $TASK_NAME"
    curl -s -X PATCH "${API_BASE}/api/openclaw/tasks/${TASK_ID}" \
      -H 'Content-Type: application/json' \
      -d '{"status":"done"}' > /dev/null 2>&1 || true
    RESULTS="${RESULTS}
✅ ${TASK_NAME}"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  else
    log "❌ 任務失敗 (exit=$EXIT_CODE): $TASK_NAME"
    # 失敗不改狀態，保持 in_progress 讓老蔡處理
    RESULTS="${RESULTS}
❌ ${TASK_NAME}（exit=$EXIT_CODE）"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi

done <<< "$TASK_LIST"

# ── 6. 發送 Telegram 摘要 ──
SUMMARY="🤖 <b>暫代執行完成</b> $(date '+%m/%d %H:%M')

📊 結果：✅ ${SUCCESS_COUNT} 成功 / ❌ ${FAIL_COUNT} 失敗
${RESULTS}

📝 詳細日誌：logs/deputy-${TIMESTAMP}.log"

notify_tg "$SUMMARY"
log "$SUMMARY"

# ── 7. 寫入執行記錄 ──
python3 -c "
import json, datetime
rec = {
    'lastDeputyRun': datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),
    'tasksExecuted': $SUCCESS_COUNT + $FAIL_COUNT,
    'success': $SUCCESS_COUNT,
    'failed': $FAIL_COUNT,
}
json.dump(rec, open('$DEPUTY_LAST', 'w'), indent=2)
" 2>/dev/null || true

log "═══ OpenClaw Deputy END ═══"
