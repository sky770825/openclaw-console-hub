#!/bin/bash
# 自動生成的端口管理工具

check_port() {
    local port=$1
    local pid=$(lsof -ti :$port)
    if [ -n "$pid" ]; then
        local process_name=$(ps -p $pid -o comm=)
        echo "[占用] 端口 $port 被進程 $process_name (PID: $pid) 占用"
        return 1
    else
        echo "[可用] 端口 $port 目前空閒"
        return 0
    fi
}

kill_port() {
    local port=$1
    local pid=$(lsof -ti :$port)
    if [ -n "$pid" ]; then
        echo "正在清理端口 $port (PID: $pid)..."
        kill -9 $pid
        echo "端口 $port 已釋放。"
    else
        echo "端口 $port 本就是空閒的。"
    fi
}

case "$1" in
    check)
        shift
        for p in "$@"; do check_port $p; done
        ;;
    kill)
        shift
        for p in "$@"; do kill_port $p; done
        ;;
    *)
        echo "Usage: $0 {check|kill} port1 port2 ..."
        ;;
esac
