#!/usr/bin/env bash
# OpenClaw Gateway 一鍵檢查/修復腳本
# 功能：
# 1) 檢查 gateway/cron RPC 是否正常
# 2) 異常時自動重啟 gateway 並再次驗證
# 3) 可選：指定 job 名稱並手動觸發一次
#
# 用法：
#   ./scripts/gateway-recover.sh
#   ./scripts/gateway-recover.sh --run-job "daily-report-9am"
#   ./scripts/gateway-recover.sh --run-job "daily-report-9am" --run-timeout 120000

set -u

RUN_JOB_NAME=""
RUN_TIMEOUT_MS="120000"
PROBE_TIMEOUT_MS="30000"
RESTART_WAIT_SEC="2"
MAX_RETRIES="2"
STABLE_CHECKS="2"
STABLE_INTERVAL_SEC="2"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

usage() {
  cat <<'EOF'
Usage:
  scripts/gateway-recover.sh [options]

Options:
  --run-job <name>        手動觸發指定 cron job（用名稱比對）
  --run-timeout <ms>      cron run timeout（預設 120000）
  --probe-timeout <ms>    gateway/cron 探測 timeout（預設 30000）
  --restart-wait <sec>    gateway restart 後等待秒數（預設 2）
  --retries <n>           探測重試次數（預設 2）
  --stable-checks <n>     重啟後需連續成功次數（預設 2）
  --stable-interval <sec> 連續檢查間隔秒數（預設 2）
  -h, --help              顯示說明
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --run-job)
      RUN_JOB_NAME="${2:-}"
      shift 2
      ;;
    --run-timeout)
      RUN_TIMEOUT_MS="${2:-120000}"
      shift 2
      ;;
    --probe-timeout)
      PROBE_TIMEOUT_MS="${2:-30000}"
      shift 2
      ;;
    --restart-wait)
      RESTART_WAIT_SEC="${2:-2}"
      shift 2
      ;;
    --retries)
      MAX_RETRIES="${2:-2}"
      shift 2
      ;;
    --stable-checks)
      STABLE_CHECKS="${2:-2}"
      shift 2
      ;;
    --stable-interval)
      STABLE_INTERVAL_SEC="${2:-2}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      log "未知參數: $1"
      usage
      exit 2
      ;;
  esac
done

if ! command -v openclaw >/dev/null 2>&1; then
  log "找不到 openclaw 指令"
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  log "找不到 jq，請先安裝 jq"
  exit 1
fi

probe_gateway() {
  openclaw gateway status >/tmp/gateway_recover_status.log 2>&1
}

probe_cron_list() {
  openclaw cron list --all --json --timeout "$PROBE_TIMEOUT_MS" >/tmp/gateway_recover_jobs.json 2>/tmp/gateway_recover_list.err
}

probe_all() {
  local i=1
  while [ "$i" -le "$MAX_RETRIES" ]; do
    if probe_gateway && probe_cron_list; then
      return 0
    fi
    log "探測失敗（$i/${MAX_RETRIES}），重試中..."
    sleep 1
    i=$((i + 1))
  done
  return 1
}

restart_gateway() {
  log "執行 openclaw gateway restart ..."
  if ! openclaw gateway restart >/tmp/gateway_recover_restart.log 2>&1; then
    log "gateway restart 失敗"
    cat /tmp/gateway_recover_restart.log
    return 1
  fi
  sleep "$RESTART_WAIT_SEC"
  return 0
}

fix_invalid_config_if_needed() {
  if rg -q "Config invalid|Unrecognized key" /tmp/gateway_recover_status.log /tmp/gateway_recover_list.err 2>/dev/null; then
    log "偵測到 config invalid，執行 openclaw doctor --fix ..."
    if ! openclaw doctor --fix >/tmp/gateway_recover_doctor.log 2>&1; then
      log "doctor --fix 失敗"
      tail -n 40 /tmp/gateway_recover_doctor.log
      return 1
    fi
    log "doctor --fix 完成"
  fi
  return 0
}

verify_stable_after_restart() {
  local i=1
  while [ "$i" -le "$STABLE_CHECKS" ]; do
    if ! probe_all; then
      log "穩定性檢查失敗（$i/$STABLE_CHECKS）"
      return 1
    fi
    log "穩定性檢查通過（$i/$STABLE_CHECKS）"
    if [ "$i" -lt "$STABLE_CHECKS" ]; then
      sleep "$STABLE_INTERVAL_SEC"
    fi
    i=$((i + 1))
  done
  return 0
}

run_job_now() {
  local name="$1"
  local job_id
  job_id="$(jq -r --arg n "$name" '.jobs[] | select(.name==$n) | .id' /tmp/gateway_recover_jobs.json | head -n1)"
  if [ -z "$job_id" ] || [ "$job_id" = "null" ]; then
    log "找不到 job: $name"
    return 1
  fi
  log "手動觸發 job: $name ($job_id)"
  if ! openclaw cron run --timeout "$RUN_TIMEOUT_MS" "$job_id"; then
    log "cron run 失敗：$name ($job_id)"
    return 1
  fi
  return 0
}

log "開始檢查 gateway / cron ..."
if ! probe_all; then
  log "初次探測失敗，開始修復流程"
  fix_invalid_config_if_needed || exit 1
  if ! restart_gateway; then
    log "修復失敗：gateway 重啟失敗"
    exit 1
  fi
  if ! verify_stable_after_restart; then
    log "修復失敗：重啟後未達連續健康標準"
    log "建議執行：openclaw gateway status"
    exit 1
  fi
  log "修復成功：gateway/cron 已穩定恢復"
else
  log "狀態正常：gateway/cron 探測通過"
fi

if [ -n "$RUN_JOB_NAME" ]; then
  run_job_now "$RUN_JOB_NAME" || exit 1
fi

JOBS_TOTAL="$(jq -r '.jobs | length' /tmp/gateway_recover_jobs.json 2>/dev/null || echo "0")"
ENABLED_TOTAL="$(jq -r '[.jobs[] | select(.enabled==true)] | length' /tmp/gateway_recover_jobs.json 2>/dev/null || echo "0")"
log "完成：jobs=$JOBS_TOTAL enabled=$ENABLED_TOTAL"
exit 0
