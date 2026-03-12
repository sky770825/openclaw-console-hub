#!/bin/bash
# OpenClaw System Recovery Center - Backup Script
# 用途：自動備份 OpenClaw 核心資料

set -eo pipefail

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 路徑設定
OPENCLAW_HOME="${OPENCLAW_HOME:-$HOME/.openclaw}"
BACKUP_DIR="$OPENCLAW_HOME/backups"
WORKSPACE="${OPENCLAW_WORKSPACE:-$OPENCLAW_HOME/workspace}"

# 日誌函數
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 檢查路徑是否存在
check_path() {
    local path="$1"
    if [[ "$path" == *.md ]]; then
        [[ -f "$path" ]]
    else
        [[ -e "$path" ]]
    fi
}

# 執行備份
do_backup() {
    local backup_type="${1:-daily}"
    local label="${2:-}"
    local timestamp
    timestamp=$(date +%Y-%m-%d_%H-%M-%S)
    local backup_name="${label:-$timestamp}"
    
    case "$backup_type" in
        incremental)
            local dest="$BACKUP_DIR/incremental/$backup_name"
            ;;
        daily)
            local dest="$BACKUP_DIR/daily/$(date +%Y-%m-%d)"
            ;;
        baseline)
            if [[ -z "$label" ]]; then
                log_error "基線備份需要指定名稱"
                exit 1
            fi
            local dest="$BACKUP_DIR/baselines/$label"
            ;;
        *)
            log_error "未知備份類型: $backup_type"
            exit 1
            ;;
    esac
    
    # 檢查是否已存在
    if [[ -d "$dest" ]] && [[ "$backup_type" != "incremental" ]]; then
        log_warning "備份已存在: $dest"
        rm -rf "$dest"
    fi
    
    mkdir -p "$dest"
    log_info "開始 $backup_type 備份 → $dest"
    
    # 建立臨時目錄收集檔案
    local temp_dir=$(mktemp -d)
    trap "rm -rf $temp_dir" EXIT
    
    local included_count=0
    
    # config/
    if check_path "$OPENCLAW_HOME/config"; then
        cp -r "$OPENCLAW_HOME/config" "$temp_dir/" 2>/dev/null && {
            log_info "  ✓ config"
            included_count=$((included_count + 1))
        } || log_warning "  ✗ config (複製失敗)"
    else
        log_warning "  ✗ config (不存在)"
    fi
    
    # openclaw.json
    if check_path "$OPENCLAW_HOME/openclaw.json"; then
        cp "$OPENCLAW_HOME/openclaw.json" "$temp_dir/" 2>/dev/null && {
            log_info "  ✓ openclaw.json"
            included_count=$((included_count + 1))
        } || log_warning "  ✗ openclaw.json (複製失敗)"
    else
        log_warning "  ✗ openclaw.json (不存在)"
    fi
    
    # memory/
    if check_path "$OPENCLAW_HOME/memory"; then
        cp -r "$OPENCLAW_HOME/memory" "$temp_dir/" 2>/dev/null && {
            log_info "  ✓ memory"
            included_count=$((included_count + 1))
        } || log_warning "  ✗ memory (複製失敗)"
    else
        log_warning "  ✗ memory (不存在)"
    fi
    
    # scripts/
    if check_path "$WORKSPACE/scripts"; then
        cp -r "$WORKSPACE/scripts" "$temp_dir/" 2>/dev/null && {
            log_info "  ✓ scripts"
            included_count=$((included_count + 1))
        } || log_warning "  ✗ scripts (複製失敗)"
    else
        log_warning "  ✗ scripts (不存在)"
    fi
    
    # extensions/
    if check_path "$OPENCLAW_HOME/extensions"; then
        cp -r "$OPENCLAW_HOME/extensions" "$temp_dir/" 2>/dev/null && {
            log_info "  ✓ extensions"
            included_count=$((included_count + 1))
        }
    fi
    
    # cron/
    if check_path "$OPENCLAW_HOME/cron"; then
        cp -r "$OPENCLAW_HOME/cron" "$temp_dir/" 2>/dev/null && {
            log_info "  ✓ cron"
            included_count=$((included_count + 1))
        }
    fi
    
    # workspace docs
    local docs_copied=0
    for doc in AGENTS.md MEMORY.md TOOLS.md SOUL.md USER.md IDENTITY.md; do
        if [[ -f "$WORKSPACE/$doc" ]]; then
            mkdir -p "$temp_dir/docs"
            cp "$WORKSPACE/$doc" "$temp_dir/docs/" 2>/dev/null && docs_copied=$((docs_copied + 1))
        fi
    done
    [[ "$docs_copied" -gt 0 ]] && {
        log_info "  ✓ docs ($docs_copied 個檔案)"
        included_count=$((included_count + 1))
    }
    
    # 打包
    local tar_file="$dest/backup.tar.gz"
    tar czf "$tar_file" -C "$temp_dir" . 2>/dev/null
    
    # 計算 checksum
    local checksum
    if command -v shasum &>/dev/null; then
        checksum=$(shasum -a 256 "$tar_file" | cut -d' ' -f1)
    else
        checksum=$(sha256sum "$tar_file" | cut -d' ' -f1)
    fi
    
    local size_bytes=0
    if [[ "$OSTYPE" == "darwin"* ]]; then
        size_bytes=$(stat -f%z "$tar_file" 2>/dev/null || echo 0)
    else
        size_bytes=$(stat -c%s "$tar_file" 2>/dev/null || echo 0)
    fi
    
    # 產生 manifest.json
    cat > "$dest/manifest.json" <<EOF
{
  "type": "$backup_type",
  "timestamp": "$(date -Iseconds)",
  "label": "$label",
  "checksum": "sha256:$checksum",
  "size_bytes": $size_bytes,
  "files_count": $included_count
}
EOF
    
    # 更新最新備份連結
    cp "$dest/manifest.json" "$BACKUP_DIR/manifest-latest.json"
    
    # 設定權限
    chmod 600 "$tar_file" 2>/dev/null || true
    chmod 600 "$dest/manifest.json" 2>/dev/null || true
    
    # 格式化大小顯示
    local size_display="${size_bytes} bytes"
    if command -v numfmt &>/dev/null; then
        size_display=$(numfmt --to=iec "$size_bytes" 2>/dev/null || echo "${size_bytes} bytes")
    fi
    
    log_success "備份完成: $tar_file ($size_display)"
    
    # 清理舊備份
    cleanup_old_backups "$backup_type"
}

# 清理過期備份
cleanup_old_backups() {
    local backup_type="$1"
    
    case "$backup_type" in
        incremental)
            find "$BACKUP_DIR/incremental" -mindepth 1 -maxdepth 1 -type d -mtime +7 -exec rm -rf {} \; 2>/dev/null || true
            ;;
        daily)
            find "$BACKUP_DIR/daily" -mindepth 1 -maxdepth 1 -type d -mtime +30 -exec rm -rf {} \; 2>/dev/null || true
            ;;
    esac
}

# 列出備份
list_backups() {
    echo ""
    echo "📦 備份列表"
    echo "────────────────────────────────────"
    
    # 基線
    if [[ -d "$BACKUP_DIR/baselines" ]]; then
        local baselines=$(find "$BACKUP_DIR/baselines" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l)
        if [[ "$baselines" -gt 0 ]]; then
            echo ""
            echo "🏷️  基線 (永久保留):"
            for d in "$BACKUP_DIR/baselines"/*/; do
                [[ -d "$d" ]] || continue
                local name=$(basename "$d")
                local time=$(jq -r '.timestamp' "$d/manifest.json" 2>/dev/null | cut -d'T' -f1)
                local size=$(jq -r '.size_bytes' "$d/manifest.json" 2>/dev/null)
                [[ "$size" != "null" && -n "$size" ]] && size=$(numfmt --to=iec "$size" 2>/dev/null || echo "?")
                echo "  • $name ($time, $size)"
            done
        fi
    fi
    
    # 每日備份
    if [[ -d "$BACKUP_DIR/daily" ]]; then
        local dailies=$(find "$BACKUP_DIR/daily" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l)
        if [[ "$dailies" -gt 0 ]]; then
            echo ""
            echo "📅 每日備份 (保留 30 天):"
            for d in "$BACKUP_DIR/daily"/*/; do
                [[ -d "$d" ]] || continue
                local name=$(basename "$d")
                local size=$(jq -r '.size_bytes' "$d/manifest.json" 2>/dev/null)
                [[ "$size" != "null" && -n "$size" ]] && size=$(numfmt --to=iec "$size" 2>/dev/null || echo "?")
                echo "  • $name ($size)"
            done
        fi
    fi
    
    # 增量備份
    if [[ -d "$BACKUP_DIR/incremental" ]]; then
        local count=$(find "$BACKUP_DIR/incremental" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l)
        if [[ "$count" -gt 0 ]]; then
            echo ""
            echo "⚡ 增量備份: $count 個 (保留 7 天)"
        fi
    fi
    
    echo ""
}

# 使用說明
show_help() {
    cat <<EOF
OpenClaw 備份腳本

用法:
  $(basename "$0") <command> [options]

命令:
  daily [label]     執行每日完整備份
  incremental       執行增量備份
  baseline <name>   建立基線快照
  list              列出所有備份
  help              顯示說明

範例:
  $(basename "$0") daily                    # 每日備份
  $(basename "$0") baseline v1.0-stable     # 標記穩定版本
  $(basename "$0") list                     # 查看備份列表

EOF
}

# 主入口
main() {
    case "${1:-}" in
        daily)
            do_backup daily "$2"
            ;;
        incremental)
            do_backup incremental
            ;;
        baseline)
            if [[ -z "${2:-}" ]]; then
                log_error "請提供基線名稱"
                echo "用法: $0 baseline <name>"
                exit 1
            fi
            do_backup baseline "$2"
            ;;
        list)
            list_backups
            ;;
        help|--help|-h)
            show_help
            ;;
        "")
            log_error "請指定命令"
            show_help
            exit 1
            ;;
        *)
            log_error "未知命令: $1"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
