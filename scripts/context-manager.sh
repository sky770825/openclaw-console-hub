#!/bin/bash
################################################################################
# context-manager.sh - Context 用量檢查與自動 compact
#
# 用法：
#   ./context-manager.sh --auto    # 自動模式：檢查 context 使用量，超過 70% 建議 compact
#   ./context-manager.sh --check   # 只檢查，不做動作
#   ./context-manager.sh --report  # 輸出詳細報告
################################################################################

set -euo pipefail

WORKSPACE="${OPENCLAW_WORKSPACE:-$HOME/.openclaw/workspace}"
CHECKPOINT_SCRIPT="$WORKSPACE/scripts/checkpoint.sh"
LOG_FILE="${OPENCLAW_STATE_DIR:-$HOME/.openclaw}/automation/logs/context.log"
DEFAULT_SESSION="agent:main:main"
THRESHOLD_WARN=70
THRESHOLD_CRITICAL=85

# === 日誌 ===

ctx_log() {
  local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $*"
  echo "$msg" | tee -a "$LOG_FILE"
}

# === 取得 session 的 context 使用率 ===

get_context_usage() {
  local session_key="${1:-$DEFAULT_SESSION}"
  local json_data

  json_data=$(openclaw sessions --json 2>/dev/null || echo "{}")

  if [[ "$json_data" == "{}" ]] || [[ -z "$json_data" ]]; then
    echo ""
    return 1
  fi

  local pair
  pair=$(echo "$json_data" | jq -r --arg k "$session_key" '
    .sessions[]? | select(.key == $k) | "\(.totalTokens // 0) \(.contextTokens // 0)"
  ' 2>/dev/null | head -1)

  if [[ -z "$pair" ]]; then
    echo ""
    return 1
  fi

  local total context
  total=$(echo "$pair" | awk '{print $1}')
  context=$(echo "$pair" | awk '{print $2}')

  if [[ "$context" == "0" ]]; then
    echo ""
    return 1
  fi

  local usage
  usage=$(awk "BEGIN {printf \"%.2f\", ($total / $context) * 100}")
  echo "$usage"
}

# === 取得主 session 詳情 ===

get_main_session_info() {
  openclaw sessions --json 2>/dev/null | jq -r --arg k "$DEFAULT_SESSION" '
    .sessions[]? | select(.key == $k) | {
      key, totalTokens, contextTokens, model,
      usage: (if .contextTokens > 0 then ((.totalTokens / .contextTokens) * 100 | tostring) else "0" end)
    }
  ' 2>/dev/null || echo "{}"
}

# === --check：只檢查 ===

cmd_check() {
  mkdir -p "$(dirname "$LOG_FILE")"
  ctx_log "檢查 mode: 檢查 context 使用量"

  local usage
  usage=$(get_context_usage "$DEFAULT_SESSION")

  if [[ -z "$usage" ]]; then
    ctx_log "無法獲取主 session ($DEFAULT_SESSION) 資訊"
    echo "❌ 無法獲取 session 資訊 (可能無活躍 session)"
    return 1
  fi

  echo "Context 使用率: ${usage}% (主 session: $DEFAULT_SESSION)"
  ctx_log "使用率: ${usage}%"
}

# === --report：詳細報告 ===

cmd_report() {
  mkdir -p "$(dirname "$LOG_FILE")"

  echo "=========================================="
  echo "  Context 詳細報告"
  echo "  $(date '+%Y-%m-%d %H:%M:%S')"
  echo "=========================================="
  echo ""

  local json_data
  json_data=$(openclaw sessions --json 2>/dev/null || echo "{}")

  if [[ "$json_data" == "{}" ]]; then
    echo "無 session 資料"
    return 1
  fi

  echo "主 session ($DEFAULT_SESSION):"
  local info
  info=$(echo "$json_data" | jq -r --arg k "$DEFAULT_SESSION" '
    .sessions[]? | select(.key == $k) | "  totalTokens: \(.totalTokens // 0)\n  contextTokens: \(.contextTokens // 0)\n  model: \(.model // "unknown")\n  usage: " + (if .contextTokens > 0 then ((.totalTokens / .contextTokens) * 100 | tostring) + "%" else "N/A" end)
  ' 2>/dev/null)
  if [[ -n "$info" ]]; then
    echo "$info"
  else
    echo "  (無資料)"
  fi

  echo ""
  echo "其他 sessions (前 5 個):"
  echo "$json_data" | jq -r '
    .sessions[]? | select(.key != "agent:main:main") | "  \(.key): \(.totalTokens // 0)/\(.contextTokens // 0) tokens"
  ' 2>/dev/null | head -5

  echo ""
  echo "=========================================="
}

# === --auto：自動模式 ===

cmd_auto() {
  mkdir -p "$(dirname "$LOG_FILE")"
  ctx_log "Auto mode: 檢查 context 使用量，超過 ${THRESHOLD_WARN}% 建議 compact"

  local usage
  usage=$(get_context_usage "$DEFAULT_SESSION")

  if [[ -z "$usage" ]]; then
    ctx_log "無法獲取主 session 資訊"
    echo "❌ 無法獲取 session 資訊"
    return 1
  fi

  ctx_log "使用率: ${usage}%"
  echo "Context 使用率: ${usage}%"

  local usage_int
  usage_int=$(echo "$usage" | cut -d. -f1)

  if [[ $usage_int -ge $THRESHOLD_CRITICAL ]]; then
    ctx_log "⚠️ 警告：使用率超過 ${THRESHOLD_CRITICAL}%，強烈建議執行 compact/checkpoint"
    echo "⚠️  使用率超過 ${THRESHOLD_CRITICAL}%，強烈建議執行 checkpoint 或 /new"
    if [[ -f "$CHECKPOINT_SCRIPT" ]]; then
      ctx_log "執行 checkpoint..."
      bash "$CHECKPOINT_SCRIPT" >> "$LOG_FILE" 2>&1 || true
    fi
  elif [[ $usage_int -ge $THRESHOLD_WARN ]]; then
    ctx_log "⚠️ 使用率超過 ${THRESHOLD_WARN}%，建議 compact"
    echo "⚠️  使用率超過 ${THRESHOLD_WARN}%，建議執行: ./scripts/checkpoint.sh 或 /new"
  else
    ctx_log "✅ 使用率正常"
    echo "✅ 使用率正常"
  fi
}

# === 主程式 ===

main() {
  case "${1:-}" in
    --auto)
      cmd_auto
      ;;
    --check)
      cmd_check
      ;;
    --report)
      cmd_report
      ;;
    *)
      echo "用法: $0 {--auto|--check|--report}"
      echo ""
      echo "  --auto    自動模式：檢查使用量，超過 70% 建議 compact，超過 85% 寫入警告"
      echo "  --check   只檢查，不做動作"
      echo "  --report  輸出詳細報告"
      exit 1
      ;;
  esac
}

main "$@"
