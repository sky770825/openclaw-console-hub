#!/bin/bash
# OpenClaw System Recovery Center - Telegram Integration
# 用途：處理 Telegram 恢復選單的互動
set -e

OPENCLAW_HOME="${OPENCLAW_HOME:-$HOME/.openclaw}"
BACKUP_DIR="$OPENCLAW_HOME/backups"
RECOVERY_SCRIPT="$OPENCLAW_HOME/workspace/scripts/recovery/recovery.sh"
BACKUP_SCRIPT="$OPENCLAW_HOME/workspace/scripts/recovery/backup.sh"

# 取得最新備份資訊
get_latest_backup_info() {
    if [[ -f "$BACKUP_DIR/manifest-latest.json" ]]; then
        local timestamp=$(jq -r '.timestamp' "$BACKUP_DIR/manifest-latest.json" 2>/dev/null | cut -d'T' -f1)
        local size=$(jq -r '.size_bytes' "$BACKUP_DIR/manifest-latest.json" 2>/dev/null | numfmt --to=iec 2>/dev/null || echo "?")
        echo "$timestamp ($size)"
    else
        echo "無備份"
    fi
}

# 取得系統狀態
get_system_status() {
    if [[ -f "$OPENCLAW_HOME/openclaw.json" ]]; then
        if jq . "$OPENCLAW_HOME/openclaw.json" >/dev/null 2>&1; then
            echo "正常"
        else
            echo "Config 錯誤"
        fi
    else
        echo "未設定"
    fi
}

# 顯示主選單（文字版，供 Telegram 使用）
show_telegram_menu() {
    local latest_backup=$(get_latest_backup_info)
    local system_status=$(get_system_status)
    
    cat <<EOF
🏥 *系統恢復中心*

最新備份：$latest_backup
系統狀態：$system_status

請選擇操作：
EOF
}

# 執行健康檢查並回傳結果
do_health_check_telegram() {
    local result=$("$OPENCLAW_HOME/workspace/scripts/recovery/health-check.sh" --json 2>/dev/null)
    local status=$(echo "$result" | jq -r '.status')
    local message=$(echo "$result" | jq -r '.message')
    
    case "$status" in
        ok)
            echo "✅ *健康檢查結果*\n\n系統狀態良好，未發現問題。"
            ;;
        warning)
            echo "⚠️ *健康檢查結果*\n\n$message\n建議執行備份或檢查設定。"
            ;;
        error)
            echo "❌ *健康檢查結果*\n\n$message\n*建議立即執行恢復！*"
            ;;
    esac
}

# 列出備份供 Telegram 顯示
list_backups_telegram() {
    local output="📦 *備份列表*\n\n"
    
    # 基線
    if [[ -d "$BACKUP_DIR/baselines" ]]; then
        local baselines=$(find "$BACKUP_DIR/baselines" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l)
        if [[ "$baselines" -gt 0 ]]; then
            output+="🏷️ *基線* ($baselines 個):\n"
            for d in "$BACKUP_DIR/baselines"/*/; do
                [[ -d "$d" ]] || continue
                local name=$(basename "$d")
                output+="  • $name\n"
            done
            output+="\n"
        fi
    fi
    
    # 每日備份
    if [[ -d "$BACKUP_DIR/daily" ]]; then
        local dailies=$(find "$BACKUP_DIR/daily" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l)
        if [[ "$dailies" -gt 0 ]]; then
            output+="📅 *每日備份* ($dailies 個):\n"
            for d in "$BACKUP_DIR/daily"/*/; do
                [[ -d "$d" ]] || continue
                local name=$(basename "$d")
                output+="  • $name\n"
            done
            output+="\n"
        fi
    fi
    
    echo -e "$output"
}

# 執行快速恢復（今日備份）
do_quick_restore_telegram() {
    local today=$(date +%Y-%m-%d)
    local backup_path="$BACKUP_DIR/daily/$today"
    
    if [[ ! -d "$backup_path" ]]; then
        echo "❌ 找不到今日備份 ($today)"
        return 1
    fi
    
    echo "⏳ 開始恢復到今日備份 ($today)..."
    
    # 執行恢復（背景執行）
    (
        cd /tmp
        local temp_dir=$(mktemp -d)
        tar xzf "$backup_path/backup.tar.gz" -C "$temp_dir" 2>/dev/null
        
        # 恢復各個組件
        [[ -d "$temp_dir/config" ]] && cp -r "$temp_dir/config"/* "$OPENCLAW_HOME/config/" 2>/dev/null
        [[ -f "$temp_dir/openclaw.json" ]] && cp "$temp_dir/openclaw.json" "$OPENCLAW_HOME/" 2>/dev/null
        [[ -d "$temp_dir/memory" ]] && cp -r "$temp_dir/memory"/* "$OPENCLAW_HOME/memory/" 2>/dev/null
        [[ -d "$temp_dir/scripts" ]] && cp -r "$temp_dir/scripts"/* "$OPENCLAW_HOME/workspace/scripts/" 2>/dev/null
        
        rm -rf "$temp_dir"
        
        # 重啟 OpenClaw
        openclaw gateway restart 2>/dev/null || true
    ) &
    
    echo "✅ 恢復已啟動（背景執行中）"
    echo "系統將在 1-2 分鐘後重啟完成"
}

# 建立基線
do_create_baseline_telegram() {
    local name="${1:-telegram-$(date +%Y%m%d-%H%M)}"
    
    echo "📸 建立基線: $name"
    
    if "$BACKUP_SCRIPT" baseline "$name" >/dev/null 2>&1; then
        echo "✅ 基線建立成功: $name"
    else
        echo "❌ 基線建立失敗"
    fi
}

# 主入口
case "${1:-menu}" in
    menu)
        show_telegram_menu
        ;;
    health)
        do_health_check_telegram
        ;;
    list)
        list_backups_telegram
        ;;
    restore-quick)
        do_quick_restore_telegram
        ;;
    restore-baseline)
        # 需要第二個參數：基線名稱
        if [[ -z "${2:-}" ]]; then
            echo "❌ 請指定基線名稱"
            exit 1
        fi
        echo "⏳ 恢復到基線: $2"
        echo "（請在終端機執行: ~/.openclaw/recovery.sh）"
        ;;
    baseline-create)
        do_create_baseline_telegram "${2:-}"
        ;;
    status)
        echo "最新備份: $(get_latest_backup_info)"
        echo "系統狀態: $(get_system_status)"
        ;;
    *)
        echo "未知命令: $1"
        echo "用法: $0 {menu|health|list|restore-quick|status}"
        exit 1
        ;;
esac
