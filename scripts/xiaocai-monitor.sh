#!/bin/bash
# 小蔡行为监控脚本 — 每 5 分钟由 launchd 执行
# 检查小蔡日志，发现违规行为就发通知校正

LOG_DIR="$HOME/.openclaw/workspace/memory/daily"
TODAY=$(date +%Y-%m-%d)
LOG_FILE="$LOG_DIR/$TODAY.md"
MONITOR_LOG="/tmp/xiaocai-monitor.log"
API="http://localhost:3011"
AUTH="Bearer oc-oAw9leGU04IAbcS4WN3FC1SH3vq5OdPxrVJCR16iIUMPsep1"

log() { echo "[$(date '+%H:%M:%S')] $1" >> "$MONITOR_LOG"; }

# 如果日志不存在就跳过
if [ ! -f "$LOG_FILE" ]; then
  log "No log file for today"
  exit 0
fi

# 只看最近 50 行
TAIL=$(tail -50 "$LOG_FILE")

# 检查 1: 连续纯对话过多（3 次以上没有 action）
PURE_CHAT_COUNT=$(echo "$TAIL" | grep -c "（純對話）")
if [ "$PURE_CHAT_COUNT" -ge 4 ]; then
  log "ALERT: $PURE_CHAT_COUNT pure chats in last 50 lines"
  curl -s -X POST "$API/internal/notify" \
    -H "Content-Type: application/json" \
    -d "{\"channel\":\"telegram\",\"message\":\"[自动校正] 你最近连续 ${PURE_CHAT_COUNT} 次纯对话没有 action。AGENTS.md 规定：收到指令后 3 步以内要有 action。去做事。\"}" > /dev/null 2>&1
fi

# 检查 2: 回覆太长（超过 300 字的回覆）
LONG_REPLIES=$(echo "$TAIL" | grep "^回覆：" | awk '{if(length($0) > 300) print}' | wc -l | tr -d ' ')
if [ "$LONG_REPLIES" -ge 2 ]; then
  log "ALERT: $LONG_REPLIES long replies in last 50 lines"
  curl -s -X POST "$API/internal/notify" \
    -H "Content-Type: application/json" \
    -d "{\"channel\":\"telegram\",\"message\":\"[自动校正] 你最近有 ${LONG_REPLIES} 条超长回覆。AGENTS.md 规定：回覆不超过 3 句。精简。\"}" > /dev/null 2>&1
fi

# 检查 3: 自评过高（出现 9/10 或 10/10 的自评）
HIGH_SELF_SCORE=$(echo "$TAIL" | grep -cE "[89]\.[0-9]/10|9/10|10/10|9\.5")
if [ "$HIGH_SELF_SCORE" -ge 1 ]; then
  log "ALERT: Self-score too high detected"
  curl -s -X POST "$API/internal/notify" \
    -H "Content-Type: application/json" \
    -d "{\"channel\":\"telegram\",\"message\":\"[自动校正] 检测到你自评过高。AGENTS.md 规定：自评不可超过老蔡的评分（4.7/10）。你觉得自己几分不重要，老蔡说几分就是几分。\"}" > /dev/null 2>&1
fi

# 检查 4: AGENTS.md 被小蔡篡改（老蔡校准区段消失）
AGENTS="$HOME/.openclaw/workspace/AGENTS.md"
if [ -f "$AGENTS" ]; then
  HAS_CALIBRATION=$(grep -c "老蔡校準" "$AGENTS")
  if [ "$HAS_CALIBRATION" -eq 0 ]; then
    log "CRITICAL: 老蔡校准 section missing from AGENTS.md! Restoring..."
    # 不自动修复，发紧急通知给老蔡
    curl -s -X POST "$API/internal/notify" \
      -H "Content-Type: application/json" \
      -d "{\"channel\":\"telegram\",\"message\":\"[紧急] 小蔡的 AGENTS.md 中「老蔡校准」区段被删除了！需要老蔡介入恢复。\"}" > /dev/null 2>&1
  fi
fi

log "Monitor check complete. pure_chat=$PURE_CHAT_COUNT long_replies=$LONG_REPLIES high_score=$HIGH_SELF_SCORE"
