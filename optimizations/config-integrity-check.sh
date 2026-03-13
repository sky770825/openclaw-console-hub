#!/bin/bash
# =============================================================================
# config-integrity-check.sh
# 每日設定檔完整性校正腳本
# 排程：每日 02:05 CST（由 OpenClaw cron 觸發）
# 用途：sha256 校驗核心設定檔、檢查權限、偵測異常新增檔案、統計空間變化
# 輸出：~/.openclaw/logs/integrity-check.jsonl
# =============================================================================

set -euo pipefail

OPENCLAW_HOME="$HOME/.openclaw"
WORKSPACE="$OPENCLAW_HOME/workspace"
LOG_FILE="$OPENCLAW_HOME/logs/integrity-check.jsonl"
BASELINE_DIR="$OPENCLAW_HOME/workspace/optimizations/.integrity-baseline"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# 需要檢查的核心設定檔
CORE_CONFIGS=(
  "$OPENCLAW_HOME/openclaw.json"
  "$OPENCLAW_HOME/config.json"
  "$OPENCLAW_HOME/cron/jobs.json"
  "$OPENCLAW_HOME/identity/device.json"
  "$OPENCLAW_HOME/credentials/telegram-pairing.json"
  "$OPENCLAW_HOME/credentials/telegram-allowFrom.json"
)

# 排除動態目錄（不偵測新增檔案）
EXCLUDE_DIRS="logs|backups|cron/runs|browser|node_modules|.git"

# 初始化
mkdir -p "$BASELINE_DIR" "$(dirname "$LOG_FILE")"

issues=()
checks_passed=0
checks_failed=0

# ---------------------------------------------------------------------------
# 1. SHA256 完整性檢查
# ---------------------------------------------------------------------------
echo "=== Config Integrity Check: $TIMESTAMP ==="
echo ""
echo "[Phase 1] SHA256 Checksum Verification"

for config_file in "${CORE_CONFIGS[@]}"; do
  filename=$(basename "$config_file")
  relative_path="${config_file#$OPENCLAW_HOME/}"
  safe_name=$(echo "$relative_path" | tr '/' '_')
  baseline_hash_file="$BASELINE_DIR/${safe_name}.sha256"

  if [ ! -f "$config_file" ]; then
    echo "  [SKIP] $relative_path (file not found)"
    continue
  fi

  current_hash=$(shasum -a 256 "$config_file" | awk '{print $1}')

  if [ ! -f "$baseline_hash_file" ]; then
    # 首次執行：建立基線
    echo "$current_hash" > "$baseline_hash_file"
    echo "  [INIT] $relative_path -> baseline created"
    checks_passed=$((checks_passed + 1))
  else
    baseline_hash=$(cat "$baseline_hash_file")
    if [ "$current_hash" = "$baseline_hash" ]; then
      echo "  [OK]   $relative_path"
      checks_passed=$((checks_passed + 1))
    else
      echo "  [CHANGED] $relative_path"
      echo "            baseline: $baseline_hash"
      echo "            current:  $current_hash"
      issues+=("sha256_mismatch:$relative_path")
      checks_failed=$((checks_failed + 1))
      # 更新基線（記錄變更但下次以新值為基準）
      echo "$current_hash" > "$baseline_hash_file"
    fi
  fi
done

# ---------------------------------------------------------------------------
# 2. 檔案權限檢查
# ---------------------------------------------------------------------------
echo ""
echo "[Phase 2] File Permission Check"

EXPECTED_PERMS_STRICT="600"   # credentials 類
EXPECTED_PERMS_NORMAL="644"   # 一般設定檔

for config_file in "${CORE_CONFIGS[@]}"; do
  if [ ! -f "$config_file" ]; then
    continue
  fi

  relative_path="${config_file#$OPENCLAW_HOME/}"
  # macOS stat 語法
  current_perm=$(stat -f "%Lp" "$config_file" 2>/dev/null || stat -c "%a" "$config_file" 2>/dev/null)

  # credentials 目錄下的檔案應為 600
  if echo "$relative_path" | grep -q "^credentials/"; then
    if [ "$current_perm" != "600" ] && [ "$current_perm" != "640" ]; then
      echo "  [WARN] $relative_path: perm=$current_perm (expected 600)"
      issues+=("perm_too_open:$relative_path=$current_perm")
      checks_failed=$((checks_failed + 1))
    else
      echo "  [OK]   $relative_path: perm=$current_perm"
      checks_passed=$((checks_passed + 1))
    fi
  else
    # 一般檔案不應有 group/other write
    if echo "$current_perm" | grep -qE '.[2367].$|..[2367]'; then
      echo "  [WARN] $relative_path: perm=$current_perm (writable by group/other)"
      issues+=("perm_writable:$relative_path=$current_perm")
      checks_failed=$((checks_failed + 1))
    else
      echo "  [OK]   $relative_path: perm=$current_perm"
      checks_passed=$((checks_passed + 1))
    fi
  fi
done

# ---------------------------------------------------------------------------
# 3. 意外新增檔案偵測
# ---------------------------------------------------------------------------
echo ""
echo "[Phase 3] Unexpected File Detection"

FILELIST_BASELINE="$BASELINE_DIR/filelist.txt"
FILELIST_CURRENT=$(mktemp)

# 列出根目錄下一層的檔案和目錄（排除動態目錄的內容）
find "$OPENCLAW_HOME" -maxdepth 1 -type f 2>/dev/null | sort > "$FILELIST_CURRENT"

if [ ! -f "$FILELIST_BASELINE" ]; then
  cp "$FILELIST_CURRENT" "$FILELIST_BASELINE"
  file_count=$(wc -l < "$FILELIST_CURRENT" | tr -d ' ')
  echo "  [INIT] Baseline created with $file_count root-level files"
else
  new_files=$(comm -13 "$FILELIST_BASELINE" "$FILELIST_CURRENT" 2>/dev/null || true)
  removed_files=$(comm -23 "$FILELIST_BASELINE" "$FILELIST_CURRENT" 2>/dev/null || true)

  if [ -n "$new_files" ]; then
    echo "  [NEW FILES DETECTED]:"
    echo "$new_files" | while read -r f; do
      echo "    + $(basename "$f")"
    done
    new_count=$(echo "$new_files" | wc -l | tr -d ' ')
    issues+=("new_files:$new_count")
    checks_failed=$((checks_failed + 1))
  else
    echo "  [OK]   No unexpected new files"
    checks_passed=$((checks_passed + 1))
  fi

  if [ -n "$removed_files" ]; then
    echo "  [REMOVED FILES]:"
    echo "$removed_files" | while read -r f; do
      echo "    - $(basename "$f")"
    done
    removed_count=$(echo "$removed_files" | wc -l | tr -d ' ')
    issues+=("removed_files:$removed_count")
    checks_failed=$((checks_failed + 1))
  fi

  # 更新基線
  cp "$FILELIST_CURRENT" "$FILELIST_BASELINE"
fi

rm -f "$FILELIST_CURRENT"

# ---------------------------------------------------------------------------
# 4. Workspace 總大小統計
# ---------------------------------------------------------------------------
echo ""
echo "[Phase 4] Workspace Size Statistics"

SIZE_BASELINE="$BASELINE_DIR/workspace_size.txt"

# macOS 的 du 使用 512-byte blocks，轉為 MB
workspace_size_kb=$(du -sk "$WORKSPACE" 2>/dev/null | awk '{print $1}')
workspace_size_mb=$((workspace_size_kb / 1024))

if [ ! -f "$SIZE_BASELINE" ]; then
  echo "$workspace_size_kb" > "$SIZE_BASELINE"
  echo "  [INIT] Workspace size: ${workspace_size_mb}MB (baseline created)"
else
  prev_size_kb=$(cat "$SIZE_BASELINE")
  diff_kb=$((workspace_size_kb - prev_size_kb))
  diff_mb=$((diff_kb / 1024))

  if [ "$prev_size_kb" -gt 0 ]; then
    change_pct=$((diff_kb * 100 / prev_size_kb))
  else
    change_pct=0
  fi

  echo "  Current: ${workspace_size_mb}MB | Change: ${diff_mb}MB (${change_pct}%)"

  # 超過 20% 變化視為異常
  if [ "$change_pct" -gt 20 ] || [ "$change_pct" -lt -20 ]; then
    echo "  [WARN] Significant size change detected!"
    issues+=("size_change:${change_pct}%")
    checks_failed=$((checks_failed + 1))
  else
    echo "  [OK]   Size within normal range"
    checks_passed=$((checks_passed + 1))
  fi

  echo "$workspace_size_kb" > "$SIZE_BASELINE"
fi

# ---------------------------------------------------------------------------
# 5. 產出報告
# ---------------------------------------------------------------------------
echo ""
echo "========================================="

if [ ${#issues[@]} -eq 0 ]; then
  status="ok"
  echo "Result: ALL CHECKS PASSED ($checks_passed passed, $checks_failed failed)"
else
  status="issues_found"
  echo "Result: ISSUES FOUND ($checks_passed passed, $checks_failed failed)"
  echo "Issues: ${issues[*]}"
fi

# 組合 issues 為 JSON 陣列
issues_json="["
first=true
for issue in "${issues[@]}"; do
  if [ "$first" = true ]; then
    issues_json="$issues_json\"$issue\""
    first=false
  else
    issues_json="$issues_json,\"$issue\""
  fi
done
issues_json="$issues_json]"

# 寫入 JSONL 報告
report="{\"timestamp\":\"$TIMESTAMP\",\"status\":\"$status\",\"checks_passed\":$checks_passed,\"checks_failed\":$checks_failed,\"issues\":$issues_json,\"workspace_size_mb\":$workspace_size_mb}"
echo "$report" >> "$LOG_FILE"

echo ""
echo "Report written to: $LOG_FILE"
echo "=== Integrity check complete ==="
