#!/usr/bin/env bash
#
# monitor-unified.sh - Unified monitoring wrapper for OpenClaw tooling
#
# Features:
# - --type={agent|context|dashboard|system|all}
# - --json output
# - Robust error handling + per-check timeout

set -euo pipefail
IFS=$'\n\t'

SCRIPT_NAME="$(basename "$0")"

OPENCLAW_SCRIPTS_DIR="${OPENCLAW_SCRIPTS_DIR:-$HOME/.openclaw/workspace/scripts}"
DEFAULT_TIMEOUT_SECS="${MONITOR_TIMEOUT_SECS:-4}"

usage() {
  cat <<'EOF'
Usage:
  monitor-unified.sh --type={agent|context|dashboard|system|all} [--json] [--timeout-secs=N]
  monitor-unified.sh --help

Options:
  --type=...            Which monitor(s) to run.
                        agent     OpenClaw agent status
                        context   Context usage monitor
                        dashboard Dashboard monitor (dashboard-monitor.sh)
                        system    System health/resources check
                        all       Run all checks
  --json                Emit JSON output (default: plain text table).
  --timeout-secs=N      Per-check timeout in seconds (default: 4 or $MONITOR_TIMEOUT_SECS).
  --help, -h            Show this help.

Environment:
  OPENCLAW_SCRIPTS_DIR  Path to OpenClaw scripts (default: $HOME/.openclaw/workspace/scripts)
  MONITOR_TIMEOUT_SECS  Default per-check timeout (overridden by --timeout-secs)

Exit codes:
  0  All requested checks succeeded (or warnings only)
  1  One or more checks failed
  2  Invalid arguments / usage error
EOF
}

die() {
  echo "ERROR: $*" >&2
  exit 2
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

now_ms() {
  # macOS date has no %N; fall back to seconds resolution if needed.
  if date +%s%3N >/dev/null 2>&1; then
    date +%s%3N
  else
    echo "$(( $(date +%s) * 1000 ))"
  fi
}

run_with_timeout() {
  # Usage: run_with_timeout <timeout_secs> <stdout_file> <stderr_file> -- <cmd...>
  local timeout_secs="$1"
  local stdout_file="$2"
  local stderr_file="$3"
  shift 3
  [[ "${1:-}" == "--" ]] || die "Internal error: run_with_timeout missing -- delimiter"
  shift 1

  need_cmd python3

  python3 - "$timeout_secs" "$stdout_file" "$stderr_file" "$@" <<'PY'
import subprocess, sys, time

timeout = float(sys.argv[1])
stdout_path = sys.argv[2]
stderr_path = sys.argv[3]
cmd = sys.argv[4:]

t0 = time.time()
timed_out = False
try:
  p = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=timeout)
  rc = p.returncode
  out = p.stdout
  err = p.stderr
except subprocess.TimeoutExpired as e:
  timed_out = True
  rc = 124
  out = e.stdout or ""
  err = (e.stderr or "") + f"\nTIMEOUT after {timeout:.1f}s\n"

with open(stdout_path, "w", encoding="utf-8", errors="replace") as f:
  f.write(out)
with open(stderr_path, "w", encoding="utf-8", errors="replace") as f:
  f.write(err)

dur_ms = int((time.time() - t0) * 1000)
print(f"{rc}\t{dur_ms}\t{1 if timed_out else 0}")
PY
}

declare -a REQUESTED_TYPES=()
OUTPUT_JSON=0
TYPE=""
TIMEOUT_SECS="$DEFAULT_TIMEOUT_SECS"

for arg in "$@"; do
  case "$arg" in
    --type=*)
      TYPE="${arg#--type=}"
      ;;
    --type)
      die "--type requires a value (use --type=...)"
      ;;
    --json)
      OUTPUT_JSON=1
      ;;
    --timeout-secs=*)
      TIMEOUT_SECS="${arg#--timeout-secs=}"
      ;;
    --timeout-secs)
      die "--timeout-secs requires a value (use --timeout-secs=N)"
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      die "Unknown argument: $arg"
      ;;
  esac
done

if [[ -z "$TYPE" ]]; then
  die "Missing required --type={agent|context|dashboard|system|all}"
fi

case "$TYPE" in
  agent|context|dashboard|system)
    REQUESTED_TYPES=("$TYPE")
    ;;
  all)
    REQUESTED_TYPES=(agent context dashboard system)
    ;;
  *)
    die "Invalid --type: $TYPE (expected agent|context|dashboard|system|all)"
    ;;
esac

if ! [[ "$TIMEOUT_SECS" =~ ^[0-9]+([.][0-9]+)?$ ]]; then
  die "Invalid --timeout-secs: $TIMEOUT_SECS"
fi

TMP_DIR="$(mktemp -d)"
cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT

manifest_tsv="$TMP_DIR/manifest.tsv"
: > "$manifest_tsv"

resolve_check_cmd() {
  local t="$1"
  local json="$2"
  case "$t" in
    agent)
      echo -n "bash"
      echo -n $'\t'"$OPENCLAW_SCRIPTS_DIR/agent-status.sh"
      echo -n $'\t'"--compact"
      ;;
    context)
      echo -n "bash"
      echo -n $'\t'"$OPENCLAW_SCRIPTS_DIR/context-monitor.sh"
      echo -n $'\t'"check"
      ;;
    dashboard)
      echo -n "bash"
      echo -n $'\t'"$OPENCLAW_SCRIPTS_DIR/dashboard-monitor.sh"
      ;;
    system)
      echo -n "bash"
      echo -n $'\t'"$OPENCLAW_SCRIPTS_DIR/recovery/health-check.sh"
      if [[ "$json" -eq 1 ]]; then
        echo -n $'\t'"--json"
      fi
      ;;
    *)
      return 1
      ;;
  esac
}

check_script_exists() {
  local path="$1"
  [[ -f "$path" ]] || die "Missing script: $path (set OPENCLAW_SCRIPTS_DIR to override)"
}

start_all() {
  local json="$1"

  for t in "${REQUESTED_TYPES[@]}"; do
    local cmd_tsv
    cmd_tsv="$(resolve_check_cmd "$t" "$json")" || die "Internal error: unknown type $t"

    local -a cmd=()
    IFS=$'\t' read -r -a cmd <<<"$cmd_tsv"

    # Validate referenced script paths early for clearer errors.
    # cmd[0] is bash; cmd[1] is script path.
    check_script_exists "${cmd[1]}"

    local out="$TMP_DIR/${t}.stdout"
    local err="$TMP_DIR/${t}.stderr"
    local meta="$TMP_DIR/${t}.meta"

    (
      run_with_timeout "$TIMEOUT_SECS" "$out" "$err" -- "${cmd[@]}" >"$meta"
    ) &

    # Record planned command + output locations. Fill rc/duration later from meta.
    local cmd_joined
    cmd_joined="$(IFS=' '; printf '%s' "${cmd[*]}")"
    printf "%s\t%s\t%s\t%s\t%s\t%s\t%s\n" \
      "$t" \
      "$cmd_joined" \
      "$out" \
      "$err" \
      "$meta" \
      "PENDING" \
      "PENDING" >>"$manifest_tsv"
  done

  wait

  # Post-process manifest to include rc/duration/timeout.
  local updated="$TMP_DIR/manifest.updated.tsv"
  : > "$updated"
  while IFS=$'\t' read -r t cmd_str out err meta rc dur; do
    if [[ ! -s "$meta" ]]; then
      # Should not happen unless python3 missing (caught earlier) or unexpected failure.
      echo -e "255\t0\t0" >"$meta"
    fi
    local meta_line
    meta_line="$(cat "$meta" 2>/dev/null || true)"
    local m_rc m_dur m_to
    m_rc="$(printf "%s" "$meta_line" | awk -F'\t' '{print $1}')"
    m_dur="$(printf "%s" "$meta_line" | awk -F'\t' '{print $2}')"
    m_to="$(printf "%s" "$meta_line" | awk -F'\t' '{print $3}')"
    printf "%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n" \
      "$t" "$cmd_str" "$out" "$err" "$m_rc" "$m_dur" "$m_to" "$meta" >>"$updated"
  done <"$manifest_tsv"
  mv "$updated" "$manifest_tsv"
}

emit_plain() {
  local any_fail=0

  printf "Unified Monitor (%s)\n" "$(date -Iseconds 2>/dev/null || date)"
  printf "Type: %s\n\n" "$TYPE"

  printf "%-10s %-7s %-10s %s\n" "TYPE" "STATUS" "DUR_MS" "MESSAGE"
  printf "%-10s %-7s %-10s %s\n" "----" "------" "------" "-------"

  while IFS=$'\t' read -r t cmd_str out err rc dur to meta; do
    local status="OK"
    if [[ "$rc" != "0" ]]; then
      status="FAIL"
      any_fail=1
    fi
    if [[ "$to" == "1" ]]; then
      status="TIMEOUT"
      any_fail=1
    fi

    local msg=""
    if [[ -s "$out" ]]; then
      msg="$(head -n 1 "$out" | tr '\r' ' ' | sed 's/[[:space:]]\+/ /g' | sed 's/^ *//; s/ *$//')"
    fi
    if [[ -z "$msg" && -s "$err" ]]; then
      msg="$(head -n 1 "$err" | tr '\r' ' ' | sed 's/[[:space:]]\+/ /g' | sed 's/^ *//; s/ *$//')"
    fi

    printf "%-10s %-7s %-10s %s\n" "$t" "$status" "$dur" "$msg"
  done <"$manifest_tsv"

  printf "\n"

  # Detail blocks (stdout + stderr)
  while IFS=$'\t' read -r t cmd_str out err rc dur to meta; do
    printf "[%s] cmd: %s\n" "$t" "$cmd_str"
    if [[ -s "$out" ]]; then
      printf "%s\n" "$(cat "$out")"
    fi
    if [[ -s "$err" ]]; then
      printf "[%s] stderr:\n" "$t"
      printf "%s\n" "$(cat "$err")"
    fi
    printf "\n"
  done <"$manifest_tsv"

  return "$any_fail"
}

emit_json() {
  need_cmd python3
  python3 - "$TYPE" "$manifest_tsv" <<'PY'
import json, sys, datetime

req_type = sys.argv[1]
manifest = sys.argv[2]

results = []
any_fail = False

with open(manifest, "r", encoding="utf-8", errors="replace") as f:
  for line in f:
    line = line.rstrip("\n")
    if not line:
      continue
    # t, cmd_str, out, err, rc, dur, to, meta
    parts = line.split("\t")
    if len(parts) < 7:
      continue
    t, cmd_str, out_path, err_path, rc_s, dur_s, to_s = parts[:7]
    try:
      rc = int(rc_s)
    except Exception:
      rc = 255
    try:
      dur_ms = int(dur_s)
    except Exception:
      dur_ms = 0
    timed_out = (to_s == "1")

    def slurp(path):
      try:
        with open(path, "r", encoding="utf-8", errors="replace") as fh:
          return fh.read()
      except FileNotFoundError:
        return ""

    out = slurp(out_path)
    err = slurp(err_path)
    ok = (rc == 0) and (not timed_out)
    if not ok:
      any_fail = True
    results.append({
      "name": t,
      "ok": ok,
      "exit_code": rc,
      "timed_out": timed_out,
      "duration_ms": dur_ms,
      "command": cmd_str,
      "stdout": out,
      "stderr": err,
    })

payload = {
  "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
  "requested_type": req_type,
  "ok": (not any_fail),
  "results": results,
}
print(json.dumps(payload, ensure_ascii=False))
sys.exit(1 if any_fail else 0)
PY
}

start_all "$OUTPUT_JSON"

if [[ "$OUTPUT_JSON" -eq 1 ]]; then
  emit_json
else
  emit_plain
fi
