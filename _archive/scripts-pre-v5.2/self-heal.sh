#!/bin/zsh
# self-heal.sh — OpenClaw 自動診斷修復腳本 v1.3
# 對應 AGENTS.md v1.4.1 危機處理守則 CR-1~CR-8
# 用法：
#   ./scripts/self-heal.sh              # 全部檢查
#   ./scripts/self-heal.sh check        # 只檢查不修復
#   ./scripts/self-heal.sh fix          # 檢查 + 自動修復（綠燈項目）
#   ./scripts/self-heal.sh rollback     # 回滾到上次驗證版本
#   ./scripts/self-heal.sh <CR編號>     # 只跑特定檢查，如 cr1, cr2, cr3, cr4, cr5, cr7, cr8

set -uo pipefail
setopt nullglob 2>/dev/null || true  # zsh: no error on empty glob

WORKSPACE="${OPENCLAW_WORKSPACE:-$HOME/.openclaw/workspace}"
API_BASE="${OPENCLAW_API_BASE:-http://localhost:3011}"
MODE="${1:-check}"

# 顏色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ISSUES=0
FIXED=0
WARNINGS=0

log_ok()   { echo "${GREEN}[✅ OK]${NC} $1"; }
log_warn() { echo "${YELLOW}[⚠️  WARN]${NC} $1"; WARNINGS=$((WARNINGS + 1)); }
log_fail() { echo "${RED}[❌ FAIL]${NC} $1"; ISSUES=$((ISSUES + 1)); }
log_fix()  { echo "${BLUE}[🔧 FIX]${NC} $1"; FIXED=$((FIXED + 1)); }
log_head() { echo "\n${BLUE}━━━ $1 ━━━${NC}"; }

# ============================================================
# CR-2: workspace 根目錄污染檢查
# ============================================================
check_cr2() {
  log_head "CR-2: workspace 根目錄檢查"

  # .md 白名單 — 只有這些允許存在於根目錄
  local MD_WHITELIST="AGENTS.md CHANGELOG.md CLAUDE.md CONTRIBUTING.md MEMORY.md README.md SECURITY.md BOOTSTRAP.md SOUL.md IDENTITY.md TOOLS.md USER.md HEARTBEAT.md"

  local dirty=0
  local trash_dir="$WORKSPACE/archive/orphaned/$(date +%Y%m%d)"

  # 1. 檢查非白名單 .md 檔案
  for f in "$WORKSPACE"/*.md; do
    [ -f "$f" ] || continue
    local base=$(basename "$f")
    local in_whitelist=0
    for w in ${=MD_WHITELIST}; do
      [ "$base" = "$w" ] && in_whitelist=1 && break
    done
    if [ "$in_whitelist" -eq 0 ]; then
      local size=$(wc -c < "$f" | tr -d '[:space:]')
      log_fail "根目錄有非白名單 .md: $base ($size bytes)"
      dirty=1
      if [ "$MODE" = "fix" ]; then
        mkdir -p "$trash_dir"
        mv "$f" "$trash_dir/$base"
        log_fix "已移到 $trash_dir/$base"
      fi
    fi
  done

  # 2. 檢查非系統檔案（json, xml, png, csv 等）
  for f in "$WORKSPACE"/*.json "$WORKSPACE"/*.xml "$WORKSPACE"/*.png "$WORKSPACE"/*.jpg "$WORKSPACE"/*.csv "$WORKSPACE"/*.sql; do
    [ -f "$f" ] || continue
    local base=$(basename "$f")
    # 跳過 package.json 等標準檔案
    case "$base" in
      package.json|package-lock.json|tsconfig.json) continue ;;
    esac
    local size=$(wc -c < "$f" | tr -d '[:space:]')
    log_fail "根目錄有非系統檔案: $base ($size bytes)"
    dirty=1
    if [ "$MODE" = "fix" ]; then
      mkdir -p "$trash_dir"
      mv "$f" "$trash_dir/$base"
      log_fix "已移到 $trash_dir/$base"
    fi
  done

  # 3. 檢查臨時垃圾檔案
  for f in "$WORKSPACE"/*.backup* "$WORKSPACE"/*.raw "$WORKSPACE"/*.tmp "$WORKSPACE"/*.bak; do
    [ -f "$f" ] || continue
    local base=$(basename "$f")
    local size=$(wc -c < "$f" | tr -d '[:space:]')
    log_fail "根目錄有垃圾檔案: $base ($size bytes)"
    dirty=1
    if [ "$MODE" = "fix" ]; then
      mkdir -p "$trash_dir"
      mv "$f" "$trash_dir/$base"
      log_fix "已移到 $trash_dir/$base"
    fi
  done

  if [ "$dirty" -eq 0 ]; then
    log_ok "根目錄乾淨，無非白名單檔案"
  fi
}

# ============================================================
# CR-3: 任務板一致性檢查
# ============================================================
check_cr3() {
  log_head "CR-3: 任務板資料一致性"

  # 檢查 API 是否可用
  if ! curl -sf "$API_BASE/api/tasks" > /dev/null 2>&1; then
    log_fail "任務板 API 無回應 ($API_BASE)"
    return
  fi

  local total=$(curl -sf "$API_BASE/api/tasks" | jq '. | if type == "array" then length else (.tasks // .data | length) end' 2>/dev/null || echo "0")
  local tasks_json=$(curl -sf "$API_BASE/api/tasks")

  log_ok "任務板可連線，共 $total 筆任務"

  # 檢查 stuck running 任務（超過 24 小時還在 running）
  # 使用 jq 處理時間（jq 處理 ISO8601 比較麻煩，這裡我們可以用 jq 找出 running 任務，然後用 date 比較，或者簡化邏輯）
  # 既然 python3 不能用，我們改用 jq 找出 running 任務 ID 並印出
  echo "$tasks_json" | jq -r '. | (if type == "array" then . else (.tasks // .data) end) | .[] | select(.status == "running") | "\(.id)|\(.createdAt)|\(.name)"' 2>/dev/null | while IFS='|' read -r tid tcreated tname; do
    if [ -n "$tcreated" ]; then
      # macOS date 格式與 linux 不同
      local created_ts=$(date -j -f "%Y-%m-%dT%H:%M:%S%z" "${tcreated%Z}+0000" "+%s" 2>/dev/null || echo "0")
      local now_ts=$(date "+%s")
      local age_h=$(( (now_ts - created_ts) / 3600 ))
      if [ "$age_h" -gt 24 ]; then
        log_warn "STUCK: $tid ($tname) - running $age_h hrs"
        if [ "$MODE" = "fix" ]; then
          curl -sf -X PATCH "$API_BASE/api/tasks/$tid/progress" \
            -H "Content-Type: application/json" \
            -d '{"status":"failed","summary":"auto-heal: stuck >24h, marked failed"}' > /dev/null 2>&1 && \
            log_fix "已將 $tid 標記為 failed" || true
        fi
      fi
    fi
  done
}

# ============================================================
# CR-4: n8n 通知迴路檢查
# ============================================================
check_cr4() {
  log_head "CR-4: n8n 通知迴路"

  # 檢查 n8n 容器
  if command -v docker > /dev/null 2>&1; then
      if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "n8n"; then
        log_ok "n8n 容器運行中"
      else
        log_warn "n8n 容器未運行"
        return
      fi
  else
      log_warn "Docker 未安裝"
      return
  fi

  # 檢查 n8n workflows active
  local active_count="0"
  if command -v docker > /dev/null 2>&1; then
      active_count=$(docker exec n8n-production-postgres-1 \
        psql -U n8n -d n8n -t -A -c "SELECT COUNT(*) FROM workflow_entity WHERE active=true;" 2>/dev/null || echo "0")
  fi
  active_count=$(echo "$active_count" | tr -d '[:space:]')

  if [ "$active_count" -ge 3 ]; then
    log_ok "n8n workflows: $active_count 個 active"
  else
    log_warn "n8n workflows: 只有 $active_count 個 active（預期 3 個）"
  fi

  # 檢查 runs 的 runPath
  if curl -sf "$API_BASE/api/runs" > /dev/null 2>&1; then
    local run_stats=$(curl -sf "$API_BASE/api/runs" | jq -r '. | (if type == "array" then . else (.runs // .data) end) | length as $total | (map(select(.runPath != null and .runPath != "" and .runPath != "undefined")) | length) as $with_path | "\($total) \($with_path)"' 2>/dev/null || echo "0 0")

    local total_runs=$(echo "$run_stats" | cut -d' ' -f1)
    local with_path=$(echo "$run_stats" | cut -d' ' -f2)

    if [ "$with_path" -eq 0 ] && [ "$total_runs" -gt 0 ]; then
      log_fail "全部 $total_runs 個 runs 的 runPath 為空 → n8n 通知無法觸發"
      log_warn "原因：建立任務時未帶 projectPath，或未使用 POST /api/tasks/:id/run"
    elif [ "$with_path" -lt "$total_runs" ]; then
      log_warn "$total_runs 個 runs 中只有 $with_path 個有 runPath"
    else
      log_ok "全部 $total_runs 個 runs 都有 runPath"
    fi
  fi

  # 檢查 /workspace 掛載
  if command -v docker > /dev/null 2>&1 && docker exec n8n-production-n8n-1 ls /workspace/AGENTS.md > /dev/null 2>&1; then
    log_ok "/workspace 掛載正常"
  else
    log_warn "/workspace 未掛載或 Docker 不可用"
  fi
}

# ============================================================
# CR-6: 服務全掛（P0 緊急）
# ============================================================
check_cr6() {
  log_head "CR-6: 服務全掛（P0 緊急）"
  local failed=0

  if ! docker ps &>/dev/null; then
    log_fail "Docker 未運行"
    failed=$((failed+1))
  fi

  if ! curl -s -o /dev/null -w '' --max-time 5 http://localhost:3011/health &>/dev/null 2>&1; then
    log_fail "任務板 API 無回應"
    failed=$((failed+1))
  fi

  if ! curl -s -o /dev/null -w '' --max-time 5 http://localhost:5678/healthz &>/dev/null 2>&1; then
    log_fail "n8n 無回應"
    failed=$((failed+1))
  fi

  local usage=$(df -h / | tail -1 | awk '{print $5}' | tr -d '%')
  if [ "$usage" -ge 90 ] 2>/dev/null; then
    log_fail "磁碟 ${usage}% — 快滿了"
    failed=$((failed+1))
  fi

  if [ $failed -eq 0 ]; then
    log_ok "CR-6: 核心服務正常"
  else
    log_fail "CR-6: ${failed} 個服務異常 — P0 回報主人"
  fi
}

# ============================================================
# CR-1: 知識庫品質檢查
# ============================================================
check_cr1() {
  log_head "CR-1: 知識庫品質檢查"

  local kb_dir="$WORKSPACE/knowledge"
  if [ ! -d "$kb_dir" ]; then
    log_fail "knowledge/ 目錄不存在"
    return
  fi

  local total=0
  local good=0
  local bad=0

  for dir in "$kb_dir"/*/; do
    [ -d "$dir" ] || continue
    local name=$(basename "$dir")
    total=$((total + 1))

    local readme="$dir/README-v1.1.md"
    if [ ! -f "$readme" ]; then
      # 也檢查 README.md
      readme="$dir/README.md"
    fi

    if [ ! -f "$readme" ]; then
      log_warn "$name: 無 README"
      bad=$((bad + 1))
      continue
    fi

    local size=$(wc -c < "$readme" | tr -d '[:space:]')
    if [ "$size" -lt 5000 ]; then
      log_fail "$name: $(basename $readme) 只有 $size bytes（需 ≥5000）"
      bad=$((bad + 1))
    else
      log_ok "$name: $(basename $readme) = $size bytes"
      good=$((good + 1))
    fi
  done

  echo ""
  echo "  總計: $total 個知識庫, ${GREEN}$good 合格${NC}, ${RED}$bad 不合格${NC}"
}

# ============================================================
# CR-5: Agent 假報告偵測（檢查 evidenceLinks 指向的檔案）
# ============================================================
check_cr5() {
  log_head "CR-5: evidenceLinks 驗證"

  if ! curl -sf "$API_BASE/api/tasks" > /dev/null 2>&1; then
    log_fail "API 無回應，跳過"
    return
  fi

  local tasks_json=$(curl -sf "$API_BASE/api/tasks")
  local checked=0
  local broken=0

  # 使用 jq 萃取 evidenceLinks
  while IFS='|' read -r tid tname links; do
    [ -z "$links" ] && continue
    # links 是一個逗號分隔的列表（從 jq 萃取）
    for link in ${(s:,:)links}; do
      checked=$((checked + 1))
      local path=$link
      # 去除引號
      path="${path%\"}"
      path="${path#\"}"
      # 處理 file://
      [[ "$path" == file://* ]] && path="${path#file://}"
      
      # 檢查是否為絕對路徑
      if [[ ! "$path" == /* ]]; then
        path="$WORKSPACE/$path"
      fi

      if [ -f "$path" ]; then
        local size=$(wc -c < "$path" | tr -d '[:space:]')
        if [ "$size" -lt 100 ]; then
          log_warn "EMPTY:$tid|$tname|$size|$link"
          broken=$((broken + 1))
        fi
      else
        log_fail "MISSING:$tid|$tname|$link"
        broken=$((broken + 1))
      fi
    done
  done < <(echo "$tasks_json" | jq -r '. | (if type == "array" then . else (.tasks // .data) end) | .[] | select((.status == "done" or .status == "review") and (.evidenceLinks | length > 0)) | "\(.id)|\(.name)|\(.evidenceLinks | join(","))"' 2>/dev/null)

  if [ "$broken" -eq 0 ] && [ "$checked" -gt 0 ]; then
    log_ok "已驗證 $checked 個 evidenceLinks，全部有效"
  elif [ "$checked" -eq 0 ]; then
    log_ok "無待驗證的 evidenceLinks"
  fi
}

# ============================================================
# CR-7: 未授權自動化偵測
# ============================================================
check_cr7() {
  log_head "CR-7: 未授權自動化偵測"

  local found=0
  local trash_dir="$WORKSPACE/archive/orphaned/$(date +%Y%m%d)"

  # 1. 掃描 .pid 檔案（排除主人授權的）
  local PID_WHITELIST=".telegram-panel.pid"
  for f in "$WORKSPACE"/.*.pid "$WORKSPACE"/*.pid; do
    [ -f "$f" ] || continue
    local base=$(basename "$f")
    # 跳過白名單
    local pid_ok=0
    for pw in ${=PID_WHITELIST}; do
      [ "$base" = "$pw" ] && pid_ok=1 && break
    done
    [ "$pid_ok" -eq 1 ] && continue
    local pid_val=$(cat "$f" 2>/dev/null | tr -d '[:space:]')
    found=1

    if [ -n "$pid_val" ] && ps -p "$pid_val" > /dev/null 2>&1; then
      log_fail "未授權 process 在跑! $base (PID: $pid_val) → 🔴 需主人批准才能 kill"
    else
      log_warn "發現 .pid 檔: $base (PID: $pid_val, 已停止)"
      if [ "$MODE" = "fix" ]; then
        mkdir -p "$trash_dir"
        mv "$f" "$trash_dir/$base"
        log_fix "已移到 $trash_dir/$base"
      fi
    fi
  done

  # 2. 掃描 executor/daemon/cron 相關檔案
  for pattern in "*executor*" "*daemon*" "*cron*" "*scheduler*" ".auto-mode-status" "*autoexecutor*"; do
    for f in "$WORKSPACE"/$pattern "$WORKSPACE"/.$pattern; do
      [ -e "$f" ] || continue
      [ -d "$f" ] && [ "$(ls -A "$f" 2>/dev/null)" = "" ] && continue  # 跳過空目錄
      local base=$(basename "$f")
      local ftype="file"
      [ -d "$f" ] && ftype="directory"
      log_warn "發現未授權自動化 $ftype: $base ($(ls -la "$f" 2>/dev/null | awk '{print $6, $7, $8}'))"
      found=1

      if [ "$MODE" = "fix" ]; then
        mkdir -p "$trash_dir"
        mv "$f" "$trash_dir/$base" 2>/dev/null
        log_fix "已移到 $trash_dir/$base"
      fi
    done
  done

  # 3. 檢查 logs/ 下的 autoexecutor 日誌
  if [ -f "$WORKSPACE/logs/autoexecutor.log" ]; then
    log_warn "發現 autoexecutor 日誌: logs/autoexecutor.log"
    found=1
    if [ "$MODE" = "fix" ]; then
      mkdir -p "$trash_dir"
      mv "$WORKSPACE/logs/autoexecutor.log" "$trash_dir/autoexecutor.log"
      log_fix "已移到 $trash_dir/autoexecutor.log"
    fi
  fi

  if [ "$found" -eq 0 ]; then
    log_ok "未發現未授權自動化程式"
  fi
}

# ============================================================
# CR-8: Session 膨脹 / 自幹偵測
# ============================================================
check_cr8() {
  log_head "CR-8: Session 膨脹 + 自幹偵測"

  local sessions_dir="$HOME/.openclaw/agents/main/sessions"
  if [ ! -d "$sessions_dir" ]; then
    log_warn "sessions 目錄不存在: $sessions_dir"
    return
  fi

  local bloated=0
  local SESSION_SIZE_WARN=204800   # 200KB
  local SESSION_SIZE_CRIT=512000   # 500KB

  # 1. 掃描活躍 session（最近 1 小時有更新的）
  for f in $(find "$sessions_dir" -name "*.jsonl" -mmin -60 2>/dev/null); do
    local base=$(basename "$f")
    local size=$(wc -c < "$f" | tr -d '[:space:]')

    if [ "$size" -ge "$SESSION_SIZE_CRIT" ]; then
      log_fail "Session 嚴重膨脹: $base (${size} bytes > 500KB) → 可能卡死"
      bloated=1
    elif [ "$size" -ge "$SESSION_SIZE_WARN" ]; then
      log_warn "Session 偏大: $base (${size} bytes > 200KB) → 建議開新對話"
    fi
  done

  # 2. 偵測自幹行為（連續 web_search 或大量 toolCall）
  for f in $(find "$sessions_dir" -name "*.jsonl" -mmin -30 2>/dev/null); do
    local base=$(basename "$f")
    local search_count=$(grep -c -E '"web_search"|"brave_search"|"tavily"' "$f" 2>/dev/null || echo "0")
    search_count=$(echo "$search_count" | head -1 | tr -d '[:space:]')
    local tool_count=$(grep -c -E '"toolCall"' "$f" 2>/dev/null || echo "0")
    tool_count=$(echo "$tool_count" | head -1 | tr -d '[:space:]')

    if [ "$search_count" -gt 10 ]; then
      log_fail "自幹偵測: $base 有 $search_count 次 web_search → 應該用 sessions_spawn"
      bloated=1
    fi
    if [ "$tool_count" -gt 50 ]; then
      log_warn "工具呼叫過多: $base 有 $tool_count 次 toolCall → context 可能快爆"
    fi
  done

  if [ "$bloated" -eq 0 ]; then
    log_ok "Session 大小正常，無自幹行為"
  fi
}

# ============================================================
# 基礎健康檢查
# ============================================================
check_infra() {
  log_head "基礎設施健康檢查"

  # API
  if curl -sf "$API_BASE/api/tasks" > /dev/null 2>&1; then
    log_ok "OpenClaw API ($API_BASE) 正常"
  else
    log_fail "OpenClaw API ($API_BASE) 無回應"
  fi

  # Docker
  if command -v docker > /dev/null 2>&1; then
    local containers=$(docker ps --format '{{.Names}}' 2>/dev/null | grep "n8n-production" | wc -l | tr -d '[:space:]')
    if [ "$containers" -ge 4 ]; then
      log_ok "Docker: $containers 個 n8n 容器運行中"
    elif [ "$containers" -gt 0 ]; then
      log_warn "Docker: 只有 $containers 個容器（預期 4 個）"
    else
      log_fail "Docker: 無 n8n 容器運行"
    fi
  else
    log_warn "Docker 未安裝"
  fi

  # Git status
  cd "$WORKSPACE"
  local dirty=$(git status --porcelain 2>/dev/null | wc -l | tr -d '[:space:]')
  if [ "$dirty" -eq 0 ]; then
    log_ok "Git: working tree 乾淨"
  else
    log_warn "Git: $dirty 個未提交的變更"
  fi

  # 磁碟空間
  local disk_pct=$(df -h "$WORKSPACE" | tail -1 | awk '{print $5}' | tr -d '%')
  if [ "$disk_pct" -lt 80 ]; then
    log_ok "磁碟使用: ${disk_pct}%"
  elif [ "$disk_pct" -lt 95 ]; then
    log_warn "磁碟使用: ${disk_pct}%（>80%）"
  else
    log_fail "磁碟使用: ${disk_pct}%（>95% 危險！）"
  fi
}

# ============================================================
# 主流程
# ============================================================
echo "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo "${BLUE}║   OpenClaw Self-Heal v1.3                ║${NC}"
echo "${BLUE}║   模式: $MODE                              ║${NC}"
echo "${BLUE}╚══════════════════════════════════════════╝${NC}"
echo ""

case "$MODE" in
  cr1) check_cr1 ;;
  cr2) check_cr2 ;;
  cr3) check_cr3 ;;
  cr4) check_cr4 ;;
  cr5) check_cr5 ;;
  cr6) check_cr6 ;;
  cr7) check_cr7 ;;
  cr8) check_cr8 ;;
  rollback)
    echo "${BLUE}━━━ 回滾到驗證版本 ━━━${NC}"
    local latest_tag
    latest_tag=$(git -C "$WORKSPACE" tag -l "verified-*" --sort=-version:refname | head -1)
    if [ -z "$latest_tag" ]; then
      echo "${RED}❌ 找不到任何 verified-* 標籤${NC}"
      echo "請先由 Claude Code 執行: git tag -a verified-vX.X -m '描述'"
      exit 1
    fi
    echo "🏷️  最新驗證標籤: ${latest_tag}"
    echo "📌 標籤內容: $(git -C "$WORKSPACE" log "$latest_tag" --oneline -1)"
    echo "📍 目前 HEAD: $(git -C "$WORKSPACE" log --oneline -1)"
    local commits_ahead
    commits_ahead=$(git -C "$WORKSPACE" rev-list "${latest_tag}..HEAD" --count)
    echo "📏 距離驗證版: ${commits_ahead} 個 commit"
    echo ""
    if [ "$commits_ahead" = "0" ]; then
      echo "${GREEN}✅ 目前已經在驗證版本，不需要回滾${NC}"
      exit 0
    fi
    echo "${YELLOW}⚠️  即將回滾到 ${latest_tag}${NC}"
    echo "  這會恢復以下關鍵檔案到驗證版本："
    echo "  - AGENTS.md"
    echo "  - scripts/self-heal.sh"
    echo "  - scripts/telegram-panel.sh"
    echo ""
    echo -n "確定要回滾嗎？(y/N) "
    read -r confirm
    if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
      local backup_branch="backup-before-rollback-$(date +%Y%m%d-%H%M%S)"
      cd "$WORKSPACE"
      git stash --include-untracked -m "self-heal rollback backup" 2>/dev/null
      git branch "$backup_branch" 2>/dev/null
      git checkout "$latest_tag" -- AGENTS.md scripts/self-heal.sh scripts/telegram-panel.sh 2>/dev/null
      echo ""
      echo "${GREEN}✅ 回滾完成${NC}"
      echo "💾 備份分支: ${backup_branch}"
      echo "如需恢復: git stash pop"
    else
      echo "已取消"
    fi
    exit 0
    ;;
  check|fix)
    check_infra
    check_cr2
    check_cr1
    check_cr3
    check_cr4
    check_cr5
    check_cr7
    check_cr8
    ;;
  *)
    echo "用法: $0 [check|fix|rollback|cr1|cr2|cr3|cr4|cr5|cr6|cr7]"
    echo ""
    echo "  check    - 只檢查不修復（預設）"
    echo "  fix      - 檢查 + 自動修復綠燈項目"
    echo "  rollback - 回滾到上次驗證版本（verified-* tag）"
    echo "  cr1      - 只跑知識庫品質檢查"
    echo "  cr2      - 只跑根目錄污染檢查"
    echo "  cr3      - 只跑任務板一致性"
    echo "  cr4      - 只跑 n8n 迴路"
    echo "  cr5      - 只跑 evidenceLinks 驗證"
    echo "  cr6      - 只跑服務全掛檢查（P0 緊急）"
    echo "  cr7      - 只跑未授權自動化偵測"
    echo "  cr8      - 只跑 session 膨脹 + 自幹偵測"
    exit 0
    ;;
esac

# 總結
echo ""
echo "${BLUE}━━━ 總結 ━━━${NC}"
echo "  ${RED}❌ 問題: $ISSUES${NC}"
echo "  ${YELLOW}⚠️  警告: $WARNINGS${NC}"
if [ "$MODE" = "fix" ]; then
  echo "  ${BLUE}🔧 已修復: $FIXED${NC}"
fi

if [ "$ISSUES" -gt 0 ]; then
  echo ""
  echo "${RED}⚠️  發現問題，請回報主人或執行 '$0 fix' 自動修復綠燈項目${NC}"
  exit 1
else
  echo ""
  echo "${GREEN}✅ 系統健康${NC}"
  exit 0
fi
