#!/bin/bash
# Utility to explore the openclaw任務面版設計 project
PROJECT_ROOT="/Users/sky770825/openclaw任務面版設計"

usage() {
    echo "Usage: $0 [tree|grep <pattern>|find <name>]"
}

case "$1" in
    tree)
        find "$PROJECT_ROOT" -maxdepth 3 -not -path '*/.*' -not -path '*/node_modules/*'
        ;;
    grep)
        shift
        grep -r "$@" "$PROJECT_ROOT" --exclude-dir=node_modules --exclude-dir=.git
        ;;
    find)
        shift
        find "$PROJECT_ROOT" -name "$@" -not -path '*/node_modules/*'
        ;;
    *)
        usage
        ;;
esac
