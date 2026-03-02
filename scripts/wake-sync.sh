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

# ── 7. API 額度快速檢測 ──
GOOGLE_KEY="AIzaSyD0KfLJji1sgTK4anrL5VSnvc1GA2pN1Gk"
check_model() {
  local model="$1"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 \
    -X POST "https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_KEY}" \
    -H "Content-Type: application/json" \
    -d '{"contents":[{"parts":[{"text":"1"}]}]}' 2>/dev/null)
  if [[ "$code" == "200" ]]; then echo "✅ 有配額"
  elif [[ "$code" == "429" ]]; then echo "❌ 額度用盡"
  else echo "🟡 未知($code)"
  fi
}
QUOTA_25FLASH="$(check_model 'gemini-2.5-flash')"
QUOTA_3FLASH="$(check_model 'gemini-3-flash-preview')"
QUOTA_25PRO="$(check_model 'gemini-2.5-pro')"
CURRENT_MODEL="$(python3 -c "import json; d=json.load(open('$HOME/.openclaw/openclaw.json')); print(d['agents']['defaults']['model']['primary'])" 2>/dev/null || echo '未知')"

# ── 8. 小蔡（副手）是否在線 ──
XIAOJI_ALIVE=false
XIAOJI_PROJECTS_DIR="$HOME/Downloads/openclaw-console-hub-main"
if [[ -d "$XIAOJI_PROJECTS_DIR" ]]; then
  XIAOJI_ALIVE=true
fi

# ── 8b. NEUXA 最新動態 ──
NEUXA_MEMORY_DIR="$HOME/.openclaw/workspace/memory"
NEUXA_LATEST=""
NEUXA_GROWTH=""
NEUXA_REVIEW_PENDING=""
if [[ -d "$NEUXA_MEMORY_DIR" ]]; then
  # 最新 session 摘要（取最新檔案的前 5 行）
  LATEST_FILE=$(ls -t "$NEUXA_MEMORY_DIR"/2026-*.md 2>/dev/null | head -1)
  if [[ -n "$LATEST_FILE" ]]; then
    LATEST_NAME=$(basename "$LATEST_FILE")
    LATEST_TIME=$(stat -f '%Sm' -t '%H:%M' "$LATEST_FILE" 2>/dev/null || echo "?")
    NEUXA_LATEST="最新對話: $LATEST_NAME ($LATEST_TIME)"
  fi
  # GROWTH.md 最後更新
  if [[ -f "$HOME/.openclaw/workspace/GROWTH.md" ]]; then
    GROWTH_TIME=$(stat -f '%Sm' -t '%Y-%m-%d %H:%M' "$HOME/.openclaw/workspace/GROWTH.md" 2>/dev/null || echo "?")
    NEUXA_GROWTH="GROWTH.md 最後更新: $GROWTH_TIME"
  fi
fi
# review/pending 待審數量
PENDING_COUNT=$(ls -1 "$HOME/.openclaw/workspace/review/pending/"*.md 2>/dev/null | wc -l | tr -d ' ')
if [[ "$PENDING_COUNT" -gt 0 ]]; then
  NEUXA_REVIEW_PENDING="⚠️ $PENDING_COUNT 份待審文件在 review/pending/"
fi
# gateway 狀態
GW_PID=$(pgrep -f "openclaw-gateway" 2>/dev/null || echo "")
GW_STATUS="❌ 離線"
if [[ -n "$GW_PID" ]]; then
  GW_STATUS="✅ 運行中 (PID $GW_PID)"
  # 檢查 429 卡死
  RECENT_429=$(tail -50 "$HOME/.openclaw/logs/gateway.err.log" 2>/dev/null | grep -c "429" || echo 0)
  if [[ "$RECENT_429" -ge 5 ]]; then
    GW_STATUS="⚠️ 疑似 429 卡死 (PID $GW_PID, ${RECENT_429}x 429 errors)"
  fi
fi

# ── 9. git 最新 commit ──
GIT_LOG=""
cd /Users/caijunchang/openclaw任務面版設計 2>/dev/null && \
  GIT_LOG="$(git log --oneline -3 2>/dev/null | sed 's/^/  /')" || GIT_LOG="(git 讀取失敗)"

# ── 寫出 WAKE_STATUS.md ──
{
cat <<HEADER
# ⚡ WAKE_STATUS — Claude Code 醒來時讀這裡
> 同步時間：$TS
> 每次 Claude Code 啟動自動更新

## 🔋 API 額度表（自動檢測）

| Provider | 模型 | 免費配額 | 狀態 |
|----------|------|---------|------|
| Google | gemini-2.5-flash | 1500 req/day | ${QUOTA_25FLASH} |
| Google | gemini-3-flash-preview | 1000 req/day | ${QUOTA_3FLASH} |
| Google | gemini-2.5-pro | 50 req/day | ${QUOTA_25PRO} |
| Kimi | kimi-k2.5 | 免費無限 | ✅ 備援 |
| Google | gemini-embedding-001 | 向量 Embedding | ✅ 免費 |

> 🤖 **NEUXA 目前主模型**：\`${CURRENT_MODEL}\`
> ⚠️ 如果 NEUXA 不回應 → 改 openclaw.json \`agents.defaults.model.primary\` 再 kill -HUP \$(pgrep openclaw-gateway)

---

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

## 🧠 NEUXA 動態
- **Gateway**：${GW_STATUS}
- **${NEUXA_LATEST:-"(無最新對話)"}**
- **${NEUXA_GROWTH:-"(GROWTH.md 未找到)"}**
- **${NEUXA_REVIEW_PENDING:-"review/pending: 0 份待審"}**
- **NEUXA memory 目錄**：~/.openclaw/workspace/memory/（讀最新 .md 可銜接）

## 🤝 協作指引
1. **小蔡（NEUXA）** 的 Telegram bot 在運行中，記憶在 ~/.openclaw/workspace/memory/
2. **review/pending**：有待審文件就優先處理
3. **任務優先**：先看上面的「待處理任務」，有 running 的先跟進
4. **Server 重啟**：如果 Server 離線，用 launchctl stop/start com.openclaw.taskboard

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

# ── 9. 同步 CLAUDE.md 到小蔡工作目錄 ──
LAOCAI_CLAUDE="/Users/caijunchang/openclaw任務面版設計/CLAUDE.md"
XIAOJI_CLAUDE="/Users/caijunchang/Downloads/openclaw-console-hub-main/CLAUDE.md"
if [[ -f "$LAOCAI_CLAUDE" ]]; then
  if ! diff -q "$LAOCAI_CLAUDE" "$XIAOJI_CLAUDE" > /dev/null 2>&1; then
    cp "$LAOCAI_CLAUDE" "$XIAOJI_CLAUDE"
    log "CLAUDE.md synced to xiaoji"
  fi
fi

log "wake-sync OK — server=$SERVER_OK"
echo "[wake-sync] ✅ 狀態同步完成 → $OUT"
