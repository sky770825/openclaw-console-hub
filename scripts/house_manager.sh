#!/bin/bash
# 房子資料管理工具

ARCHIVE_DIR="/Users/sky770825/.openclaw/workspace/knowledge/house_archive"

usage() {
    echo "Usage: $0 [command]"
    echo "Commands:"
    echo "  add-asset \"Name\" \"Brand\" \"Date\" \"Warranty\" \"Location\" \"Note\""
    echo "  add-maintenance \"Date\" \"Item\" \"Vendor\" \"Phone\" \"Cost\" \"Description\""
    echo "  search \"Keyword\""
    echo "  list"
}

case "$1" in
    add-asset)
        echo "| $2 | $3 | $4 | $5 | $6 | $7 |" >> "$ARCHIVE_DIR/assets/inventory_template.md"
        echo "Asset added."
        ;;
    add-maintenance)
        echo "| $2 | $3 | $4 | $5 | $6 | $7 |" >> "$ARCHIVE_DIR/maintenance/maintenance_log.md"
        echo "Maintenance record added."
        ;;
    search)
        grep -rni "$2" "$ARCHIVE_DIR"
        ;;
    list)
        find "$ARCHIVE_DIR" -maxdepth 2 -not -path '*/.*'
        ;;
    *)
        usage
        ;;
esac
