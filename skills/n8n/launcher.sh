#!/bin/bash
# n8n webhook launcher

SKILL_DIR="$HOME/.openclaw/workspace/skills/n8n"
export N8N_WEBHOOK_PORT="${N8N_WEBHOOK_PORT:-5679}"
LOG_FILE="$HOME/.openclaw/logs/n8n-webhooks/server.log"
PID_FILE="$HOME/.openclaw/run/n8n-webhook-receiver.pid"

mkdir -p "$(dirname "$LOG_FILE")"

start() {
    if [[ -f "$PID_FILE" ]]; then
        PID=$(head -1 "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            echo "✅ Already running (PID: $PID)"
            return 0
        fi
    fi
    
    echo "🚀 Starting n8n webhook receiver on port $N8N_WEBHOOK_PORT..."
    nohup python3 "$SKILL_DIR/n8n-webhook-server.py" start >> "$LOG_FILE" 2>&1 &
    sleep 2
    
    if [[ -f "$PID_FILE" ]]; then
        PID=$(head -1 "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            echo "✅ Started (PID: $PID)"
            echo "   Health: http://127.0.0.1:$N8N_WEBHOOK_PORT/health"
            return 0
        fi
    fi
    
    echo "❌ Failed to start"
    return 1
}

stop() {
    if [[ -f "$PID_FILE" ]]; then
        PID=$(head -1 "$PID_FILE")
        if kill "$PID" 2>/dev/null; then
            echo "✅ Stopped (PID: $PID)"
        else
            echo "⏹️  Not running"
        fi
        rm -f "$PID_FILE"
    else
        echo "⏹️  Not running"
    fi
}

status() {
    python3 "$SKILL_DIR/n8n-webhook-server.py" status
}

case "${1:-start}" in
    start) start ;;
    stop) stop ;;
    restart) stop; sleep 1; start ;;
    status) status ;;
    *) echo "Usage: $0 [start|stop|restart|status]" ;;
esac
