#!/bin/bash
# Autoexecutor 控制快捷鍵
# 用法: oc-auto [start|stop|status|logs]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

oc-auto() {
    case "${1:-status}" in
        start)
            if pgrep -f "autoexecutor.sh" > /dev/null; then
                echo "Autoexecutor 已在運行"
            else
                nohup "${SCRIPT_DIR}/autoexecutor.sh" start > /dev/null 2>&1 &
                echo "🟢 Autoexecutor 已啟動"
            fi
            ;;
        stop)
            "${SCRIPT_DIR}/autoexecutor.sh" stop
            echo "🔴 Autoexecutor 已停止"
            ;;
        status)
            "${SCRIPT_DIR}/autoexecutor.sh" status
            ;;
        logs)
            tail -f "${HOME}/.openclaw/workspace/logs/autoexecutor.log"
            ;;
        *)
            echo "用法: oc-auto [start|stop|status|logs]"
            ;;
    esac
}

oc-auto "$@"
