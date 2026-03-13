#!/bin/zsh
# honeypot-alert.sh — 蜜罐監控 + Telegram 即時告警 v1.0
# 用途：監控蜜罐檔案是否被存取，碰了立刻通知主人
# 用法：
#   ./scripts/honeypot-alert.sh watch   # 啟動監控（背景）
#   ./scripts/honeypot-alert.sh stop    # 停止監控
#   ./scripts/honeypot-alert.sh status  # 查看狀態
#   ./scripts/honeypot-alert.sh test    # 測試告警

set -uo pipefail

OPENCLAW_HOME="$HOME/.openclaw"
LOG_DIR="$OPENCLAW_HOME/logs"
ALERT_LOG="$LOG_DIR/security-alerts.log"
PID_FILE="$OPENCLAW_HOME/honeypot-watcher.pid"

# Telegram
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-$(grep TELEGRAM_BOT_TOKEN "$HOME/n8n-production/.env" 2>/dev/null | cut -d= -f2)}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-$(grep TELEGRAM_CHAT_ID "$HOME/n8n-production/.env" 2>/dev/null | cut -d= -f2)}"

# 要監控的蜜罐
HONEYPOT_FILES=(
  "$OPENCLAW_HOME/.honeypot/.env.fake"
  "$OPENCLAW_HOME/.decoy/.env.production"
  "$OPENCLAW_HOME/.decoy/vulnerable.sh"
)

mkdir -p "$LOG_DIR"

# ============================================================
# Telegram 告警
# ============================================================

send_alert() {
  local file="$1"
  local event="$2"
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

  # 寫 log
  echo "[$timestamp] HONEYPOT_TRIGGERED file=$file event=$event" >> "$ALERT_LOG"

  # Telegram 通知
  [ -z "$TELEGRAM_BOT_TOKEN" ] && return
  [ -z "$TELEGRAM_CHAT_ID" ] && return

  local message="🍯 *蜜罐告警*

觸發檔案: \`$(basename "$file")\`
完整路徑: \`$file\`
事件類型: $event
時間: $timestamp
主機: $(hostname)

⚠️ 有東西在嘗試讀取假金鑰/假腳本。
請檢查堤諾米斯達爾（達爾）最近的操作記錄。"

  curl -sf -X POST \
    "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d "chat_id=${TELEGRAM_CHAT_ID}" \
    -d "text=${message}" \
    -d "parse_mode=Markdown" \
    > /dev/null 2>&1 || echo "⚠️  Telegram 發送失敗"
}

# ============================================================
# 檔案監控（使用 macOS fswatch 或 polling）
# ============================================================

watch_honeypots() {
  echo "🍯 蜜罐監控啟動"
  echo "   監控檔案："
  for f in "${HONEYPOT_FILES[@]}"; do
    echo "   - $f"
  done
  echo ""

  # 記錄初始修改時間
  declare -A last_access
  for f in "${HONEYPOT_FILES[@]}"; do
    if [ -f "$f" ]; then
      last_access[$f]=$(stat -f%a "$f" 2>/dev/null || echo "0")
    fi
  done

  # 嘗試用 fswatch（更即時）
  if command -v fswatch &> /dev/null; then
    echo "   使用 fswatch 即時監控"
    fswatch -0 "${HONEYPOT_FILES[@]}" 2>/dev/null | while IFS= read -r -d '' file; do
      send_alert "$file" "accessed/modified (fswatch)"
      echo "🚨 $(date) 蜜罐觸發: $file"
    done
  else
    # 降級為 polling（每 10 秒檢查一次）
    echo "   使用 polling 模式（每 10 秒）"
    while true; do
      for f in "${HONEYPOT_FILES[@]}"; do
        if [ -f "$f" ]; then
          current_access=$(stat -f%a "$f" 2>/dev/null || echo "0")
          if [ "${last_access[$f]:-0}" != "$current_access" ]; then
            send_alert "$f" "accessed (polling)"
            echo "🚨 $(date) 蜜罐觸發: $f"
            last_access[$f]="$current_access"
          fi
        fi
      done
      sleep 10
    done
  fi
}

# ============================================================
# 命令列介面
# ============================================================

case "${1:-}" in
  watch)
    # 背景啟動
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "⚠️  監控已在運行 (PID: $(cat "$PID_FILE"))"
      exit 0
    fi
    echo "啟動蜜罐監控（背景）..."
    nohup "$0" _watch_internal > "$LOG_DIR/honeypot-watcher.log" 2>&1 &
    echo $! > "$PID_FILE"
    echo "✅ 已啟動 (PID: $!)"
    ;;

  _watch_internal)
    watch_honeypots
    ;;

  stop)
    if [ -f "$PID_FILE" ]; then
      PID=$(cat "$PID_FILE")
      if kill -0 "$PID" 2>/dev/null; then
        kill "$PID"
        rm -f "$PID_FILE"
        echo "✅ 監控已停止"
      else
        rm -f "$PID_FILE"
        echo "⚠️  進程已不存在，已清理 PID 檔"
      fi
    else
      echo "⚠️  監控未在運行"
    fi
    ;;

  status)
    echo "=== 蜜罐監控狀態 ==="
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "狀態: 🟢 運行中 (PID: $(cat "$PID_FILE"))"
    else
      echo "狀態: 🔴 未運行"
    fi
    echo ""
    echo "蜜罐檔案："
    for f in "${HONEYPOT_FILES[@]}"; do
      if [ -f "$f" ]; then
        echo "  ✅ $f"
      else
        echo "  ❌ $f (不存在)"
      fi
    done
    echo ""
    if [ -f "$ALERT_LOG" ]; then
      honeypot_count=$(grep -c "HONEYPOT_TRIGGERED" "$ALERT_LOG" 2>/dev/null || echo "0")
      echo "歷史告警: $honeypot_count 次"
      if [ "$honeypot_count" -gt 0 ]; then
        echo "最近告警:"
        grep "HONEYPOT_TRIGGERED" "$ALERT_LOG" | tail -3
      fi
    else
      echo "歷史告警: 0 次"
    fi
    ;;

  test)
    echo "=== 蜜罐告警測試 ==="
    echo "發送測試告警到 Telegram..."
    send_alert "/test/honeypot/.env.fake" "TEST (手動觸發測試)"
    echo "✅ 測試完成，請檢查 Telegram"
    ;;

  *)
    echo "用法："
    echo "  $0 watch   # 啟動背景監控"
    echo "  $0 stop    # 停止監控"
    echo "  $0 status  # 查看狀態"
    echo "  $0 test    # 測試 Telegram 告警"
    ;;
esac
