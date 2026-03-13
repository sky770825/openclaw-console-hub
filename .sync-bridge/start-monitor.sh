#!/bin/bash
# 簡易同步監測啟動腳本

WORKSPACE="/Users/sky770825/.openclaw/workspace"
SYNC_DIR="$WORKSPACE/.sync-bridge"

echo "🚀 啟動 NEUXA L1-L2 即時同步監測"
echo "================================"
echo "監測目錄: $WORKSPACE"
echo "排除: .git/, node_modules/, .sync-bridge/"
echo ""

# 確保目錄存在
mkdir -p "$SYNC_DIR/shared-state" "$SYNC_DIR/l1-to-l2" "$SYNC_DIR/l2-to-l1"

# 寫入啟動時間
echo "$(date '+%Y-%m-%d %H:%M:%S') - Sync monitor started" >> "$SYNC_DIR/sync.log"

# 啟動 fswatch
echo "🔍 開始監測檔案變更..."
echo "   (按 Ctrl+C 停止)"
echo ""

fswatch -r "$WORKSPACE" \
  --exclude ".git" \
  --exclude "node_modules" \
  --exclude ".sync-bridge" \
  --event Created \
  --event Updated \
  --event Removed \
  --event Renamed | while read path; do
    
    # 只處理重要檔案類型
    if [[ "$path" =~ \.(md|html|css|js|json|sh|ts|tsx|jsx)$ ]]; then
        echo "📡 $(date '+%H:%M:%S') - $path"
        
        # 更新狀態
        cat > "$SYNC_DIR/shared-state/current-state.json" << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "l1_agent": "NEUXA-L1",
  "l2_agent": "Claude-Opus",
  "last_change": "$path",
  "sync_status": "active"
}
EOF
        
        # 記錄日誌
        echo "$(date '+%H:%M:%S') - Changed: $path" >> "$SYNC_DIR/sync.log"
    fi
done
