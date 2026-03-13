#!/bin/bash
# NEUXA L1-L2 即時同步橋接器
# 用途: 監測檔案變更並即時同步到對方

WORKSPACE="/Users/sky770825/.openclaw/workspace"
SYNC_DIR="$WORKSPACE/.sync-bridge"
CLAUDE_PROJECT="/Users/sky770825/.claude/projects/-Users-caijunchang-openclaw------"

# 建立同步目錄
mkdir -p "$SYNC_DIR"
mkdir -p "$SYNC_DIR/l1-to-l2"
mkdir -p "$SYNC_DIR/l2-to-l1"
mkdir -p "$SYNC_DIR/shared-state"

# 共享狀態檔案
STATE_FILE="$SYNC_DIR/shared-state/current-state.json"
LOCK_FILE="$SYNC_DIR/sync.lock"

# 產生當前狀態
generate_state() {
    cat > "$STATE_FILE.tmp" << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "l1_agent": "NEUXA-L1",
  "l2_agent": "Claude-Opus",
  "workspace_version": "$(cd $WORKSPACE && git rev-parse --short HEAD 2>/dev/null || echo 'unknown')",
  "last_sync": "$(date +"%Y-%m-%d %H:%M:%S")",
  "active_project": "CauseLaw",
  "sync_status": "active"
}
EOF
    mv "$STATE_FILE.tmp" "$STATE_FILE"
}

# 監測變更並通知
watch_and_sync() {
    echo "🔍 啟動即時同步監測..."
    echo "   Workspace: $WORKSPACE"
    echo "   Sync Dir: $SYNC_DIR"
    
    # 使用 fswatch 或 entr 監測（如果可用）
    if command -v fswatch &> /dev/null; then
        fswatch -r "$WORKSPACE" --event Created --event Updated --event Removed | while read path; do
            if [[ "$path" != *".git"* ]] && [[ "$path" != *"node_modules"* ]]; then
                echo "📡 檔案變更檢測: $path"
                generate_state
                notify_sync "$path"
            fi
        done
    else
        # Fallback: 使用定期輪詢
        while true; do
            generate_state
            sleep 10
        done
    fi
}

# 通知同步（可以擴展為 webhook、Telegram 等）
notify_sync() {
    local changed_file="$1"
    echo "🔄 $(date '+%H:%M:%S') - 同步通知: $changed_file"
    
    # 寫入變更日誌
    echo "$(date -u +"%Y-%m-%dT%H:%M:%SZ") | $changed_file" >> "$SYNC_DIR/sync.log"
}

# 檢查對方狀態
check_peer_status() {
    if [ -f "$STATE_FILE" ]; then
        cat "$STATE_FILE"
    else
        echo '{"status": "unknown"}'
    fi
}

# 主命令
case "${1:-}" in
    start)
        generate_state
        watch_and_sync
        ;;
    status)
        check_peer_status
        ;;
    notify)
        notify_sync "${2:-manual}"
        ;;
    *)
        echo "NEUXA L1-L2 即時同步橋接器"
        echo ""
        echo "用法:"
        echo "  $0 start    - 啟動同步監測"
        echo "  $0 status   - 檢查同步狀態"
        echo "  $0 notify   - 手動觸發同步通知"
        ;;
esac
