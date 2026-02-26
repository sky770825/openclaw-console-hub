#!/usr/bin/env bash
# wake-sync.sh — Claude Code 一醒就同步
# 每次 Claude Code 啟動對話時自動執行
# 把最新狀態寫入 ~/.openclaw/workspace/WAKE_STATUS.md
# Claude 醒來讀這份檔案就知道世界發生了什麼

set -uo pipefail

TASKBOARD="http://127.0.0.1:3011"
OUT="$HOME/.openclaw/workspace/WAKE_STATUS.md"
LOG="$HOME/.openclaw/workspace/wake-sync.log"
TS="$(date '+%Y-%m-%d %H:%M:%S')"
mkdir -p "$(dirname "$OUT")"

log() { echo "[$TS] $*" >> "$LOG" 2>/dev/null; }

# ── 1. Server 存活確認 ──
SERVER_OK=false
if curl -sf --max-time 2 "$TASKBOARD/api/health" > /dev/null 2>&1; then
  SERVER_OK=true
fi

# ── 2. 任務板快照 ──
TASKS_JSON=""
if $SERVER_OK; then
  TASKS_JSON="$(curl -sf --max-time 3 "$TASKBOARD/api/openclaw/tasks" 2>/dev/null || echo '')"
fi

TASK_SUMMARY=""
if [[ -n "$TASKS_JSON" ]]; then
  TASK_SUMMARY="$(echo "$TASKS_JSON" | python3 /Users/caijunchang/openclaw任務面版設計/scripts/_wake_task_parse.py 2>/dev/null || echo '(解析失敗)')"
fi

# ── 3. Deputy 狀態 ──
DEPUTY_STATUS=""
if $SERVER_OK; then
  DEPUTY_STATUS="$(curl -sf --max-time 2 "$TASKBOARD/api/openclaw/deputy/status" 2>/dev/null \
    | python3 -c "import json,sys; d=json.load(sys.stdin); print('啟用' if d.get('enabled') else '停用', '|', '最後跑:', d.get('lastRun',{}).get('lastDeputyRun','未知')[:16])" 2>/dev/null || echo '(無法取得)')"
fi

# ── 4. Auto-executor 狀態 ──
EXECUTOR_STATUS=""
if $SERVER_OK; then
  EXECUTOR_STATUS="$(curl -sf --max-time 2 "$TASKBOARD/api/openclaw/auto-executor/status" 2>/dev/null \
    | python3 -c "import json,sys; d=json.load(sys.stdin); print('運行中' if d.get('isRunning') else '停止', '| 最後執行:', str(d.get('lastExecutedAt','未知'))[:16])" 2>/dev/null || echo '(無法取得)')"
fi

# ── 5. FADP 聯盟狀態 ──
FADP_STATUS=""
if $SERVER_OK; then
  FADP_STATUS="$(curl -sf --max-time 2 "$TASKBOARD/api/federation/status" 2>/dev/null \
    | python3 -c "import json,sys; d=json.load(sys.stdin); print(f\"成員:{d.get('activeMembers',0)} 封鎖IP:{d.get('hotBlocklistSize',0)} 封鎖Token:{d.get('hotTokenBlocklistSize',0)}\")" 2>/dev/null || echo '(無法取得)')"
fi

# ── 6. 最近 activity log ──
ACTIVITY=""
if $SERVER_OK; then
  ACTIVITY="$(curl -sf --max-time 3 "$TASKBOARD/api/activity-log?limit=5" 2>/dev/null \
    | python3 - 2>/dev/null <<'PY'
import json, sys
try:
  items = json.load(sys.stdin)
  if isinstance(items, dict): items = items.get('logs', [])
  for item in items[:5]:
    ts = str(item.get('timestamp', item.get('createdAt', '')))[:16]
    msg = item.get('message', item.get('description', ''))[:60]
    print(f"- {ts} {msg}")
except:
  pass
PY
)"
fi

# ── 7. 小蔡（副手）是否在線 ──
XIAOJI_ALIVE=false
XIAOJI_PROJECTS_DIR="$HOME/Downloads/openclaw-console-hub-main"
if [[ -d "$XIAOJI_PROJECTS_DIR" ]]; then
  XIAOJI_ALIVE=true
fi

# ── 8. git 最新 commit ──
GIT_LOG=""
cd /Users/caijunchang/openclaw任務面版設計 2>/dev/null && \
  GIT_LOG="$(git log --oneline -3 2>/dev/null | sed 's/^/  /')" || GIT_LOG="(git 讀取失敗)"

# ── 寫出 WAKE_STATUS.md ──
{
cat <<HEADER
# ⚡ WAKE_STATUS — Claude Code 醒來時讀這裡
> 同步時間：$TS
> 每次 Claude Code 啟動自動更新

## 🟢 系統狀態
- **後端 Server (3011)**：$( $SERVER_OK && echo "✅ 在線" || echo "❌ 離線（請重啟：nohup node server/dist/index.js > /tmp/openclaw-server.log 2>&1 &）")
- **小蔡工作目錄**：$( $XIAOJI_ALIVE && echo "✅ $XIAOJI_PROJECTS_DIR" || echo "❌ 找不到")
- **Deputy 模式**：${DEPUTY_STATUS:-"(無法取得)"}
- **Auto-Executor**：${EXECUTOR_STATUS:-"(無法取得)"}
- **FADP 聯盟協防**：${FADP_STATUS:-"(無法取得)"}

## 🎯 任務板快照
${TASK_SUMMARY:-"(無法取得任務資料)"}

## 📋 最近活動
${ACTIVITY:-"(無活動記錄)"}

## 🔀 最新 Git Commits
$GIT_LOG

## 🤝 協作指引（重要！醒來必讀）
1. **小蔡** 在 $XIAOJI_PROJECTS_DIR — 她是執行者，我是指揮者
2. **任務優先**：先看上面的「待處理任務」，有 running 的先跟進
3. **Server 重啟**：如果 Server 離線，先跑重啟指令
4. **Deputy 開啟**：如果老蔡不在且有任務，curl -X POST http://localhost:3011/api/openclaw/deputy/on
5. **FADP**：聯盟協防已上線，/api/federation/status 確認狀態

## 🚨 立即行動清單
$(
  if ! $SERVER_OK; then
    echo "- ⚠️ SERVER 離線！立即重啟：nohup node server/dist/index.js > /tmp/openclaw-server.log 2>&1 &"
  fi
  # 從任務板找 running 狀態
  if [[ -n "$TASKS_JSON" ]]; then
    echo "$TASKS_JSON" | python3 /Users/caijunchang/openclaw任務面版設計/scripts/_wake_urgent_parse.py 2>/dev/null || true
  fi
  echo "- ✅ 讀取 MEMORY.md 了解專案狀態"
  echo "- ✅ 確認最新 git commits 是否需要後續行動"
)
HEADER
} > "$OUT"

log "wake-sync OK — server=$SERVER_OK"
echo "[wake-sync] ✅ 狀態同步完成 → $OUT"
