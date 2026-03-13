#!/bin/bash
BASE_DIR="/Users/sky770825/.openclaw/workspace/knowledge/house_vault"

usage() {
    echo "使用方式: $0 [command]"
    echo "指令:"
    echo "  init              初始化目錄結構"
    echo "  log-maint NAME    建立新的維修記錄檔案"
    echo "  add-asset NAME    建立新的資產檔案"
    echo "  list-all          列出所有建檔內容"
    echo "  search KEYWORD    搜尋所有文件內容"
}

case "$1" in
    init)
        mkdir -p "$BASE_DIR"/{documents,photos,maintenance_logs,assets,templates}
        echo "已初始化目錄。"
        ;;
    log-maint)
        NAME="${2:-new_log}"
        FILE="$BASE_DIR/maintenance_logs/$(date +%Y%m%d)_$NAME.md"
        cp "$BASE_DIR/templates/maintenance_entry.md" "$FILE"
        echo "已建立維修記錄: $FILE"
        ;;
    add-asset)
        NAME="${2:-new_asset}"
        FILE="$BASE_DIR/assets/$NAME.md"
        cp "$BASE_DIR/templates/asset_entry.md" "$FILE"
        echo "已建立資產記錄: $FILE"
        ;;
    list-all)
        find "$BASE_DIR" -maxdepth 3 -not -path '*/.*'
        ;;
    search)
        grep -r "$2" "$BASE_DIR"
        ;;
    *)
        usage
        ;;
esac
