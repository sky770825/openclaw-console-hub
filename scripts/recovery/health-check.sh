#!/bin/bash
# OpenClaw System Recovery Center - Health Check
# 用途：系統健康檢查（供 unified-monitor 整合）
set -e

OPENCLAW_HOME="${OPENCLAW_HOME:-$HOME/.openclaw}"
BACKUP_DIR="$OPENCLAW_HOME/backups"

# JSON 輸出
output_json() {
    local status="$1"
    local message="$2"
    local details="$3"
    
    printf '{"status":"%s","message":"%s","timestamp":"%s","details":%s}\n' \
        "$status" "$message" "$(date -Iseconds)" "$details"
}

# 執行健康檢查
check_health() {
    local issues=0
    local warnings=0
    local details=""
    
    # 1. openclaw.json
    if [[ -f "$OPENCLAW_HOME/openclaw.json" ]]; then
        if jq . "$OPENCLAW_HOME/openclaw.json" >/dev/null 2>&1; then
            details="\"openclaw_json\": \"ok\""
        else
            details="\"openclaw_json\": \"error\""
            issues=$((issues + 1))
        fi
    else
        details="\"openclaw_json\": \"missing\""
        issues=$((issues + 1))
    fi
    
    # 2. 備份狀態
    if [[ -f "$BACKUP_DIR/manifest-latest.json" ]]; then
        local last_backup=$(jq -r '.timestamp' "$BACKUP_DIR/manifest-latest.json" 2>/dev/null)
        local last_epoch=$(date -j -f "%Y-%m-%dT%H:%M:%S" "${last_backup%%+*}" +%s 2>/dev/null || date -d "$last_backup" +%s 2>/dev/null || echo 0)
        local now=$(date +%s)
        local hours_ago=$(( (now - last_epoch) / 3600 ))
        
        if [[ "$hours_ago" -lt 24 ]]; then
            details="$details, \"backup\": \"ok\""
        else
            details="$details, \"backup\": \"stale\""
            warnings=$((warnings + 1))
        fi
    else
        details="$details, \"backup\": \"no_backup\""
        warnings=$((warnings + 1))
    fi
    
    # 3. 磁碟空間
    local disk_usage=$(df -h "$HOME" 2>/dev/null | awk 'NR==2 {print $5}' | tr -d '%')
    if [[ "$disk_usage" -lt 90 ]]; then
        details="$details, \"disk\": \"ok\""
    else
        details="$details, \"disk\": \"critical\""
        issues=$((issues + 1))
    fi
    
    # 輸出結果
    local details_obj="{ $details }"
    
    if [[ "$issues" -gt 0 ]]; then
        output_json "error" "發現 $issues 個問題" "$details_obj"
        return 1
    elif [[ "$warnings" -gt 0 ]]; then
        output_json "warning" "發現 $warnings 個警告" "$details_obj"
        return 0
    else
        output_json "ok" "系統健康" "$details_obj"
        return 0
    fi
}

# 主入口
case "${1:-}" in
    --json|-j)
        check_health
        ;;
    *)
        # 簡潔文字輸出
        result=$(check_health 2>/dev/null)
        status=$(echo "$result" | jq -r '.status')
        message=$(echo "$result" | jq -r '.message')
        
        case "$status" in
            ok) echo "✅ 恢復中心: $message" ;;
            warning) echo "⚠️  恢復中心: $message" ;;
            error) echo "❌ 恢復中心: $message" ;;
        esac
        ;;
esac
