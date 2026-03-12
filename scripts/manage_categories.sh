#!/bin/bash
DB_FILE="/Users/caijunchang/.openclaw/workspace/sandbox/menu_system.db"

function list_categories() {
    sqlite3 -header -column "$DB_FILE" "SELECT * FROM categories;"
}

function add_category() {
    local name="$1"
    local desc="$2"
    sqlite3 "$DB_FILE" "INSERT INTO categories (name, description) VALUES ('$name', '$desc');"
}

case "$1" in
    list) list_categories ;;
    add) add_category "$2" "$3" ;;
    *) echo "Usage: $0 {list|add name description}" ;;
esac
