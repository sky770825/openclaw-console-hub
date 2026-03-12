#!/usr/bin/env bash
# NEUXA 記憶引擎 - 一鍵同步腳本原型
# 用法: ./sync-state.sh [--generate|--serve|--status|--full]

set -euo pipefail

WORKSPACE="${OPENCLAW_WORKSPACE:-$HOME/.openclaw/workspace}"
ENGINE_DIR="$WORKSPACE/knowledge_base/memory_engine"
SNAPSHOT_DIR="$ENGINE_DIR/snapshots"
CACHE_DIR="$ENGINE_DIR/cache"
MEMORY_FILE="$WORKSPACE/MEMORY.md"
COMPACT_FILE="$ENGINE_DIR/COMPACT_MEMORY.md"
SERVER_PID_FILE="$CACHE_DIR/snapshot-server.pid"
SERVER_PORT=8766
SERVER_SCRIPT="$ENGINE_DIR/scripts/snapshot-server.py"

echo "NEUXA Eternal Memory Engine Sync Tool"
echo "======================================"

# 確保目錄存在
mkdir -p "$SNAPSHOT_DIR" "$CACHE_DIR" "$(dirname "$SERVER_SCRIPT")"

# 生成精簡記憶
generate_compact() {
    echo "[INFO] Generating compact memory..."
    
    if [[ ! -f "$MEMORY_FILE" ]]; then
        echo "[ERROR] MEMORY.md not found"
        return 1
    fi
    
    local version=$(grep -m1 "版本" "$MEMORY_FILE" | grep -oE 'v[0-9]+\.[0-9]+' || echo "unknown")
    
    cat > "$COMPACT_FILE" <<EOF
# NEUXA Quick Recovery Anchor
**Version**: $version | **Updated**: $(date '+%Y-%m-%d %H:%M')

## Current Focus
EOF
    
    # Extract active items
    grep -A 20 "Active Context\|進行中事項" "$MEMORY_FILE" 2>/dev/null | grep "^- " | head -5 >> "$COMPACT_FILE" || echo "- No active items" >> "$COMPACT_FILE"
    
    cat >> "$COMPACT_FILE" <<EOF

## Quick Commands
- /status - System status
- /codex <task> - Call Codex Agent
- /new - New conversation

Full memory: MEMORY.md
EOF
    
    echo "[OK] Compact memory created: $COMPACT_FILE"
}

# 創建快照
create_snapshot() {
    echo "[INFO] Creating state snapshot..."
    
    local timestamp=$(date '+%Y-%m-%d-%H%M%S')
    local snapshot_file="$SNAPSHOT_DIR/$timestamp.json"
    
    cat > "$snapshot_file" <<EOF
{
  "snapshot": {
    "version": "v1.0",
    "timestamp": "$(date -Iseconds)",
    "memory_version": "$(grep -m1 '版本' $MEMORY_FILE 2>/dev/null | grep -oE 'v[0-9]+\.[0-9]+' || echo 'unknown')"
  }
}
EOF
    
    # Update latest symlink
    [[ -L "$SNAPSHOT_DIR/latest.json" ]] && rm "$SNAPSHOT_DIR/latest.json"
    ln -s "$(basename "$snapshot_file")" "$SNAPSHOT_DIR/latest.json"
    
    echo "[OK] Snapshot created: $snapshot_file"
}

# 生成 Python 伺服器腳本
generate_server() {
    cat > "$SERVER_SCRIPT" <<'PYEOF'
#!/usr/bin/env python3
import json, sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

SNAPSHOT_DIR = Path("~/.openclaw/workspace/knowledge_base/memory_engine/snapshots").expanduser()
COMPACT_FILE = Path("~/.openclaw/workspace/knowledge_base/memory_engine/COMPACT_MEMORY.md")

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/api/snapshot/latest":
            latest = SNAPSHOT_DIR / "latest.json"
            if not latest.exists():
                self.send_error(404)
                return
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            with open(latest) as f:
                self.wfile.write(f.read().encode())
        elif self.path == "/api/memory/compact":
            if not COMPACT_FILE.exists():
                self.send_error(404)
                return
            self.send_response(200)
            self.send_header("Content-Type", "text/markdown")
            self.end_headers()
            with open(COMPACT_FILE, 'rb') as f:
                self.wfile.write(f.read())
        elif self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status":"ok"}).encode())
        else:
            self.send_error(404)

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8766
    print(f"Starting NEUXA Snapshot Server on port {port}")
    HTTPServer(("", port), Handler).serve_forever()
PYEOF
    chmod +x "$SERVER_SCRIPT"
}

# 啟動伺服器
start_server() {
    echo "[INFO] Starting snapshot server..."
    
    [[ -f "$SERVER_SCRIPT" ]] || generate_server
    
    if [[ -f "$SERVER_PID_FILE" ]] && ps -p "$(cat $SERVER_PID_FILE)" > /dev/null 2>&1; then
        echo "[OK] Server already running (PID: $(cat $SERVER_PID_FILE))"
        return 0
    fi
    
    nohup python3 "$SERVER_SCRIPT" "$SERVER_PORT" > "$CACHE_DIR/server.log" 2>&1 &
    echo $! > "$SERVER_PID_FILE"
    sleep 2
    
    if ps -p "$(cat $SERVER_PID_FILE)" > /dev/null 2>&1; then
        echo "[OK] Server started on port $SERVER_PORT"
        echo "       API: http://localhost:$SERVER_PORT/api/snapshot/latest"
        echo "  Compact: http://localhost:$SERVER_PORT/api/memory/compact"
    else
        echo "[ERROR] Server failed to start"
        return 1
    fi
}

# 顯示狀態
show_status() {
    echo ""
    echo "Memory Engine Status"
    echo "-------------------"
    echo "MEMORY.md: $([[ -f $MEMORY_FILE ]] && echo '✓' || echo '✗')"
    echo "COMPACT_MEMORY.md: $([[ -f $COMPACT_FILE ]] && echo '✓' || echo '✗')"
    echo "Snapshots: $(find $SNAPSHOT_DIR -name '*.json' -type f 2>/dev/null | wc -l)"
    echo "Server: $([[ -f $SERVER_PID_FILE ]] && ps -p $(cat $SERVER_PID_FILE) > /dev/null 2>&1 && echo '✓ Running' || echo '✗ Stopped')"
}

# 主邏輯
case "${1:-}" in
    --generate|-g)
        generate_compact
        create_snapshot
        ;;
    --serve|-s)
        start_server
        ;;
    --status)
        show_status
        ;;
    --full|-f)
        generate_compact
        create_snapshot
        start_server
        show_status
        echo ""
        echo "Full sync complete!"
        ;;
    *)
        echo "Usage: $0 [--generate|--serve|--status|--full]"
        echo ""
        echo "Options:"
        echo "  --generate, -g  Generate compact memory and snapshot"
        echo "  --serve, -s     Start snapshot server"
        echo "  --status        Show system status"
        echo "  --full, -f      Full sync (generate + serve)"
        ;;
esac
