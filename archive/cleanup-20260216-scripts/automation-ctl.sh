#!/bin/bash
################################################################################
# automation-ctl.sh - 統一控制所有自動化腳本的開關、狀態、日誌
#
# 用法：
#   ./automation-ctl.sh status              # 顯示所有自動化狀態
#   ./automation-ctl.sh enable <name|all>   # 啟用自動化
#   ./automation-ctl.sh disable <name|all>  # 停用自動化
#   ./automation-ctl.sh run <name> [args]   # 單次觸發執行
#   ./automation-ctl.sh logs <name> [--tail N]  # 查看日誌
#   ./automation-ctl.sh health              # 健康檢查總覽
#   ./automation-ctl.sh task phase3        # 快速開啟 Phase 3
#   ./automation-ctl.sh task 1              # 開啟 task 1（phase1）
################################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TASKS_DIR="${WORKSPACE_ROOT}/tasks"
STATE_FILE="${OPENCLAW_STATE_DIR:-$HOME/.openclaw}/automation/state.json"
LOGS_DIR="${OPENCLAW_STATE_DIR:-$HOME/.openclaw}/automation/logs"

# 自動化名稱 → 腳本對應（用函數兼容 bash 3.x）
get_script_for() {
  case "$1" in
    autopilot)    echo "autopilot-lean.sh" ;;
    monitor)      echo "unified-monitor.sh" ;;
    checkpoint)   echo "checkpoint.sh" ;;
    budget)       echo "daily-budget-tracker.sh" ;;
    cost-tracker) echo "model-cost-tracker.sh" ;;
    recovery)     echo "openclaw-recovery.sh" ;;
    autoExecutor) echo "auto-executor-lean.sh" ;;
    *)            echo "" ;;
  esac
}

AUTOMATION_NAMES="autopilot monitor checkpoint budget cost-tracker recovery autoExecutor"

# 顏色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# === 輔助函數 ===

ensure_state() {
  local dir
  dir="$(dirname "$STATE_FILE")"
  mkdir -p "$dir" "$LOGS_DIR"
  if [[ ! -f "$STATE_FILE" ]]; then
    echo '{"automations":{},"emergencyStop":false,"dailyBudget":5,"maxConsecutiveErrors":5}' > "$STATE_FILE"
  fi
}

get_automations() {
  jq -r '.automations | keys[]' "$STATE_FILE" 2>/dev/null || echo ""
}

is_enabled() {
  local name="$1"
  jq -r --arg n "$name" '.automations[$n].enabled // false' "$STATE_FILE" 2>/dev/null
}

# === 子命令 ===

cmd_status() {
  ensure_state
  echo "=== 自動化狀態 ==="
  echo ""

  local emergency
  emergency=$(jq -r '.emergencyStop // false' "$STATE_FILE" 2>/dev/null)
  if [[ "$emergency" == "true" ]]; then
    echo -e "${RED}⚠️  EMERGENCY STOP 已啟用${NC}"
    echo ""
  fi

  for name in autopilot monitor checkpoint budget cost-tracker recovery autoExecutor; do
    local enabled last_run errors
    enabled=$(jq -r --arg n "$name" '.automations[$n].enabled // false' "$STATE_FILE" 2>/dev/null)
    last_run=$(jq -r --arg n "$name" '.automations[$n].lastRun // "never"' "$STATE_FILE" 2>/dev/null)
    errors=$(jq -r --arg n "$name" '.automations[$n].errors // 0' "$STATE_FILE" 2>/dev/null)

    local script
    script=$(get_script_for "$name")
    if [[ -z "$script" ]]; then
      continue
    fi

    local status_color status_text
    if [[ "$enabled" == "true" ]]; then
      status_color="$GREEN"
      status_text="ENABLED "
    else
      status_color="$RED"
      status_text="DISABLED"
    fi

    printf "  %-12s  %b%-7s%b  lastRun: %-24s  errors: %s  (%s)\n" \
      "$name" "$status_color" "$status_text" "$NC" "$last_run" "$errors" "$script"
  done

  echo ""
  echo "dailyBudget: \$$(jq -r '.dailyBudget // 5' "$STATE_FILE")"
  echo "maxConsecutiveErrors: $(jq -r '.maxConsecutiveErrors // 5' "$STATE_FILE")"
}

cmd_enable() {
  local target="${1:-}"
  if [[ -z "$target" ]]; then
    echo "用法: $0 enable <name|all>"
    exit 1
  fi

  ensure_state

  if [[ "$target" == "all" ]]; then
    for name in $AUTOMATION_NAMES; do
      jq --arg n "$name" '.automations[$n] = ((.automations[$n] // {}) | .enabled = true)' "$STATE_FILE" > "${STATE_FILE}.tmp" && mv "${STATE_FILE}.tmp" "$STATE_FILE"
    done
    jq '.emergencyStop = false' "$STATE_FILE" > "${STATE_FILE}.tmp" && mv "${STATE_FILE}.tmp" "$STATE_FILE"
    echo "✅ 已啟用所有自動化，emergencyStop=false"
  else
    if [[ -z "$(get_script_for "$target")" ]]; then
      echo "❌ 未知自動化: $target"
      exit 1
    fi
    jq --arg n "$target" '.automations[$n] = ((.automations[$n] // {}) | .enabled = true)' "$STATE_FILE" > "${STATE_FILE}.tmp" && mv "${STATE_FILE}.tmp" "$STATE_FILE"
    echo "✅ 已啟用: $target"
  fi
}

cmd_disable() {
  local target="${1:-}"
  if [[ -z "$target" ]]; then
    echo "用法: $0 disable <name|all>"
    exit 1
  fi

  ensure_state

  if [[ "$target" == "all" ]]; then
    for name in $AUTOMATION_NAMES; do
      jq --arg n "$name" '.automations[$n] = ((.automations[$n] // {}) | .enabled = false)' "$STATE_FILE" > "${STATE_FILE}.tmp" && mv "${STATE_FILE}.tmp" "$STATE_FILE"
    done
    jq '.emergencyStop = true' "$STATE_FILE" > "${STATE_FILE}.tmp" && mv "${STATE_FILE}.tmp" "$STATE_FILE"
    echo "✅ 已停用所有自動化，emergencyStop=true"
  else
    if [[ -z "$(get_script_for "$target")" ]]; then
      echo "❌ 未知自動化: $target"
      exit 1
    fi
    jq --arg n "$target" '.automations[$n] = ((.automations[$n] // {}) | .enabled = false)' "$STATE_FILE" > "${STATE_FILE}.tmp" && mv "${STATE_FILE}.tmp" "$STATE_FILE"
    echo "✅ 已停用: $target"
  fi
}

cmd_run() {
  local name="${1:-}"
  shift || true
  if [[ -z "$name" ]]; then
    echo "用法: $0 run <name> [args...]"
    exit 1
  fi

  local script
  script=$(get_script_for "$name")
  if [[ -z "$script" ]]; then
    echo "❌ 未知自動化: $name"
    exit 1
  fi

  local script_path="$SCRIPT_DIR/$script"
  if [[ ! -f "$script_path" ]]; then
    echo "❌ 腳本不存在: $script_path"
    exit 1
  fi

  echo "執行: $script_path $*"
  exec bash "$script_path" "$@"
}

cmd_logs() {
  local name="${1:-}"
  local tail_n=""
  shift || true

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --tail)
        tail_n="$2"
        shift 2
        ;;
      *)
        shift
        ;;
    esac
  done

  if [[ -z "$name" ]]; then
    echo "用法: $0 logs <name> [--tail N]"
    echo "可用日誌："
    for n in $AUTOMATION_NAMES; do
      local logfile="$LOGS_DIR/${n}.log"
      [[ -f "$logfile" ]] && echo "  $n"
    done
    exit 1
  fi

  local logfile="$LOGS_DIR/${name}.log"
  if [[ ! -f "$logfile" ]]; then
    echo "❌ 日誌不存在: $logfile"
    exit 1
  fi

  if [[ -n "$tail_n" ]]; then
    tail -n "$tail_n" "$logfile"
  else
    cat "$logfile"
  fi
}

cmd_health() {
  echo "=== 健康檢查總覽 ==="
  echo ""

  # 1. state.json
  if [[ -f "$STATE_FILE" ]]; then
    echo -e "  ${GREEN}✓${NC} state.json 存在"
  else
    echo -e "  ${RED}✗${NC} state.json 不存在"
  fi

  # 2. 腳本存在性
  for name in $AUTOMATION_NAMES; do
    local script
    script=$(get_script_for "$name")
    local script_path="$SCRIPT_DIR/$script"
    if [[ -f "$script_path" ]]; then
      echo -e "  ${GREEN}✓${NC} $name → $script"
    else
      echo -e "  ${YELLOW}⚠${NC} $name → $script (不存在)"
    fi
  done

  # 3. openclaw 可執行
  if command -v openclaw &>/dev/null; then
    echo -e "  ${GREEN}✓${NC} openclaw CLI 可用"
  else
    echo -e "  ${RED}✗${NC} openclaw CLI 未找到"
  fi

  # 4. jq 可執行
  if command -v jq &>/dev/null; then
    echo -e "  ${GREEN}✓${NC} jq 可用"
  else
    echo -e "  ${RED}✗${NC} jq 未找到 (必要)"
  fi

  echo ""
}

# phase/task 編號 → 檔名
get_task_file() {
  local arg="$1"
  case "$arg" in
    phase1|1) echo "phase1-script-merge.md" ;;
    phase2|2) echo "phase2-safety.md" ;;
    phase3|3) echo "phase3.md" ;;
    *) echo "" ;;
  esac
}

cmd_task() {
  local target="${1:-}"
  if [[ -z "$target" ]]; then
    echo "用法: $0 task <phase1|phase2|phase3|1|2|3>"
    echo ""
    echo "  快速開啟任務檔："
    echo "    task phase3  或  task 3   →  Phase 3"
    echo "    task phase2  或  task 2   →  Phase 2"
    echo "    task phase1  或  task 1   →  Phase 1 / task 1"
    exit 1
  fi

  local fname
  fname=$(get_task_file "$target")
  if [[ -z "$fname" ]]; then
    echo "❌ 未知 phase/task: $target（可用: phase1|phase2|phase3|1|2|3）"
    exit 1
  fi

  local path="$TASKS_DIR/$fname"
  if [[ ! -f "$path" ]]; then
    if [[ "$fname" == "phase3.md" ]]; then
      mkdir -p "$TASKS_DIR"
      printf '# Phase 3\n\n> 待補充目標與任務。\n' > "$path"
      echo "✅ 已建立 $path"
    else
      echo "❌ 任務檔不存在: $path"
      exit 1
    fi
  fi

  # 開啟任務檔案並複製提示詞到剪貼簿
  echo "📝 任務檔案: $path"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "💡 請在 Cursor Agent Mode 中執行："
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "1. 按 Cmd+Shift+L 開新聊天"
  echo "2. 確認處於 Agent Mode"
  echo "3. 貼上提示詞（已複製到剪貼簿）"
  echo ""
  
  # 生成並複製提示詞
  generate_task_prompt "$path" | pbcopy 2>/dev/null || true
  
  # 開啟檔案
  if [[ "$(uname)" == "Darwin" ]]; then
    open "$path"
  elif command -v xdg-open &>/dev/null; then
    xdg-open "$path"
  fi
}

# === 主程式 ===

main() {
  local subcmd="${1:-}"
  shift 2>/dev/null || true

  case "${subcmd:-}" in
    status)
      cmd_status
      ;;
    enable)
      cmd_enable "$@"
      ;;
    disable)
      cmd_disable "$@"
      ;;
    run)
      cmd_run "$@"
      ;;
    logs)
      cmd_logs "$@"
      ;;
    health)
      cmd_health
      ;;
    task)
      cmd_task "$@"
      ;;
    *)
      echo "用法: $0 {status|enable|disable|run|logs|health|task} [args...]"
      echo ""
      echo "  status              顯示所有自動化狀態"
      echo "  enable <name|all>   啟用自動化"
      echo "  disable <name|all>  停用自動化"
      echo "  run <name> [args]   單次觸發執行"
      echo "  logs <name> [--tail N]  查看日誌"
      echo "  health              健康檢查總覽"
      echo "  task <phaseN|N>     快速開啟 Phase/任務檔（phase1|phase2|phase3|1|2|3）"
      exit 1
      ;;
  esac
}

main "$@"
