#!/bin/bash
# OpenClaw System Recovery Center - Backup Script (桌面版)
# 備份位置：~/Desktop/小蔡/系統備份/

set -eo pipefail

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 路徑設定
OPENCLAW_HOME="${OPENCLAW_HOME:-$HOME/.openclaw}"
WORKSPACE="${OPENCLAW_WORKSPACE:-$OPENCLAW_HOME/workspace}"

# 桌面備份目錄
BACKUP_DIR="$HOME/Desktop/小蔡/系統備份"
mkdir -p "$BACKUP_DIR"

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
        daily)
            local dest="$BACKUP_DIR/$(date +%Y-%m-%d)"
            ;;
        baseline)
            if [[ -z "$label" ]]; then
                log_error "基線備份需要指定名稱"
                exit 1
            fi
            local dest="$BACKUP_DIR/基線-$label"
            ;;
        *)
            log_error "未知備份類型: $backup_type"
            exit 1
            ;;
    esac
    
    # 檢查是否已存在
    if [[ -d "$dest" ]]; then
        log_warning "備份已存在: $dest，覆蓋中..."
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
        }
    fi
    
    # openclaw.json
    if check_path "$OPENCLAW_HOME/openclaw.json"; then
        cp "$OPENCLAW_HOME/openclaw.json" "$temp_dir/" 2>/dev/null && {
            log_info "  ✓ openclaw.json"
            included_count=$((included_count + 1))
        }
    fi
    
    # memory/
    if check_path "$OPENCLAW_HOME/memory"; then
        cp -r "$OPENCLAW_HOME/memory" "$temp_dir/" 2>/dev/null && {
            log_info "  ✓ memory"
            included_count=$((included_count + 1))
        }
    fi
    
    # scripts/
    if check_path "$WORKSPACE/scripts"; then
        cp -r "$WORKSPACE/scripts" "$temp_dir/" 2>/dev/null && {
            log_info "  ✓ scripts"
            included_count=$((included_count + 1))
        }
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
    cp "$dest/manifest.json" "$BACKUP_DIR/最新備份資訊.json"
    
    # 設定權限
    chmod 600 "$tar_file" 2>/dev/null || true
    chmod 600 "$dest/manifest.json" 2>/dev/null || true
    
    # 格式化大小顯示
    local size_display="${size_bytes} bytes"
    if command -v numfmt &>/dev/null; then
        size_display=$(numfmt --to=iec "$size_bytes" 2>/dev/null || echo "${size_bytes} bytes")
    fi
    
    log_success "備份完成: $tar_file ($size_display)"
    
    # 檢查總大小（1GB = 1073741824 bytes）
    check_storage_limit
}

# 檢查儲存空間（1GB 限制）
check_storage_limit() {
    local limit=1073741824  # 1GB in bytes
    local current=$(du -sb "$BACKUP_DIR" 2>/dev/null | cut -f1)
    
    if [[ "$current" -gt "$limit" ]]; then
        log_warning "備份總大小超過 1GB，清理最舊的備份..."
        # 保留最近 30 個備份，刪除最舊的
        ls -t "$BACKUP_DIR" | tail -n +31 | while read dir; do
            if [[ -d "$BACKUP_DIR/$dir" ]]; then
                log_info "  刪除舊備份: $dir"
                rm -rf "$BACKUP_DIR/$dir"
            fi
        done
    fi
    
    local current_human=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
    log_info "目前備份總大小: $current_human / 1GB"
}

# 列出備份
list_backups() {
    echo ""
    echo "📦 備份列表 (~/Desktop/小蔡/系統備份/)"
    echo "────────────────────────────────────"
    
    local total_size=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
    echo "總大小: $total_size / 1GB"
    echo ""
    
    # 基線
    local baselines=$(find "$BACKUP_DIR" -maxdepth 1 -type d -name "基線-*" 2>/dev/null | wc -l)
    if [[ "$baselines" -gt 0 ]]; then
        echo "🏷️  基線:"
        for d in "$BACKUP_DIR"/基線-*/; do
            [[ -d "$d" ]] || continue
            local name=$(basename "$d" | sed 's/基線-//')
            local size=$(du -sh "$d" 2>/dev/null | cut -f1)
            echo "  • $name ($size)"
        done
        echo ""
    fi
    
    # 每日備份
    local dailies=$(find "$BACKUP_DIR" -maxdepth 1 -type d -name "2026-*" -o -name "2025-*" 2>/dev/null | wc -l)
    if [[ "$dailies" -gt 0 ]]; then
        echo "📅 每日備份 ($dailies 個):"
        for d in "$BACKUP_DIR"/202[56]-*/; do
            [[ -d "$d" ]] || continue
            local name=$(basename "$d")
            local size=$(du -sh "$d" 2>/dev/null | cut -f1)
            echo "  • $name ($size)"
        done
    fi
    
    echo ""
}

# 使用說明
show_help() {
    cat <<EOF
OpenClaw 備份腳本 (桌面版)

用法:
  $(basename "$0") <command> [options]

命令:
  daily [label]     執行每日備份
  baseline <name>   建立基線快照
  list              列出所有備份
  help              顯示說明

備份位置: ~/Desktop/小蔡/系統備份/
空間限制: 1GB (自動清理)

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
