#!/bin/bash
# Claude Task Helper - Authorized by 老蔡
# This script provides read-only context for the task dashboard project.

SOURCE_DIR="/Users/sky770825/openclaw任務面版設計"

function show_status() {
    echo "--- Project Status ---"
    grep -r "TODO" "$SOURCE_DIR" --exclude-dir=node_modules || echo "No TODOs found."
}

function list_api() {
    echo "--- Server Routes (READ ONLY) ---"
    if [ -d "$SOURCE_DIR/server/src" ]; then
        grep -r "router\." "$SOURCE_DIR/server/src" || echo "No routes found."
    fi
}

case "$1" in
    status) show_status ;;
    api) list_api ;;
    *) echo "Usage: $0 {status|api}" ;;
esac
