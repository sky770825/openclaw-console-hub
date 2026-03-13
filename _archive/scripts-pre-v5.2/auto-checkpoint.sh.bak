#!/bin/bash
# auto-checkpoint.sh — Context 監控 + 自幹偵測 v2.0
# 由 Gateway 定期呼叫（每 5 分鐘），或 cron 觸發
# 功能：
#   1. Context 使用率監控（原有）
#   2. Session 膨脹偵測（新增）
#   3. 自幹行為偵測（新增）— 連續 web_search 攔截

SESSIONS_DIR="$HOME/.openclaw/agents/main/sessions"
WORKSPACE="${OPENCLAW_WORKSPACE:-$HOME/.openclaw/workspace}"
LOG_FILE="$WORKSPACE/logs/auto-checkpoint.log"

mkdir -p "$(dirname "$LOG_FILE")"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"; }

# ============================================================
# 1. Context 使用率監控（原有邏輯）
# ============================================================
CONTEXT_USAGE=$(openclaw status 2>/dev/null | grep -o "Context: [0-9]*k/[0-9]*k" | grep -o "[0-9]*k" | head -1 | tr -d 'k')
TOTAL=$(openclaw status 2>/dev/null | grep -o "Context: [0-9]*k/[0-9]*k" | grep -o "/[0-9]*k" | tr -d '/k')

if [ -n "$CONTEXT_USAGE" ] && [ -n "$TOTAL" ]; then
  PERCENTAGE=$((CONTEXT_USAGE * 100 / TOTAL))

  if [ $PERCENTAGE -ge 80 ]; then
    log "🔴 Context ${PERCENTAGE}% — 自動 checkpoint"
    "$WORKSPACE/scripts/checkpoint.sh" create "auto-context-$(date '+%m%d-%H%M')" "自動存檔" 2>/dev/null
  elif [ $PERCENTAGE -ge 70 ]; then
    log "🟡 Context ${PERCENTAGE}% — 建議開新對話"
  fi
fi

# ============================================================
# 2. Session 膨脹偵測
# ============================================================
SESSION_WARN=204800   # 200KB
SESSION_CRIT=512000   # 500KB

for f in $(find "$SESSIONS_DIR" -name "*.jsonl" -mmin -30 2>/dev/null); do
  size=$(wc -c < "$f" | tr -d '[:space:]')
  base=$(basename "$f")

  if [ "$size" -ge "$SESSION_CRIT" ]; then
    log "🔴 Session 膨脹: $base (${size} bytes) — 可能卡死，建議重啟 Gateway"
  elif [ "$size" -ge "$SESSION_WARN" ]; then
    log "🟡 Session 偏大: $base (${size} bytes) — 接近危險區"
  fi
done

# ============================================================
# 3. 自幹行為偵測（連續 web_search 攔截）
# ============================================================
for f in $(find "$SESSIONS_DIR" -name "*.jsonl" -mmin -15 2>/dev/null); do
  base=$(basename "$f")

  # 計算最近 session 的 web_search 次數
  search_count=$(grep -c '"web_search"\|"brave_search"\|"tavily"\|"WebSearch"' "$f" 2>/dev/null || echo "0")
  # 計算連續 tool_call 次數（沒有 user message 中斷的）
  tool_count=$(grep -c '"toolCall"\|"tool_call"' "$f" 2>/dev/null || echo "0")

  if [ "$search_count" -gt 5 ]; then
    log "🔴 自幹警報: $base — $search_count 次搜尋！應該用 sessions_spawn 子派"
    # 嘗試透過 Gateway 插入系統訊息提醒小蔡
    session_id="${base%.jsonl}"
    openclaw gateway call agent.interrupt \
      --session "$session_id" \
      --message "⛔ 自幹偵測：你已連續搜尋 ${search_count} 次。立即停止，改用 sessions_spawn 子派。你是指揮官不是工兵。" \
      2>/dev/null || true
  elif [ "$search_count" -gt 2 ]; then
    log "🟡 自幹傾向: $base — $search_count 次搜尋，接近觸發上限"
  fi

  if [ "$tool_count" -gt 30 ]; then
    log "🟡 工具過載: $base — $tool_count 次 toolCall，context 消耗快"
  fi
done

# ============================================================
# 4. 記憶清理 (Memory Vacuum)
# ============================================================
log "🧹 執行 Memory Vacuum..."
bash "$WORKSPACE/scripts/memory-vacuum.sh" >> "$LOG_FILE" 2>&1

log "✅ auto-checkpoint 檢查完成"
