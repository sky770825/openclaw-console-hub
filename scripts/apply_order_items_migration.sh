#!/bin/bash
# Utility to apply order_items schema to a target database
DB_PATH=$1
if [ -z "$DB_PATH" ]; then
    echo "Usage: $0 <database_path>"
    exit 1
fi
sqlite3 "$DB_PATH" < "/Users/caijunchang/.openclaw/workspace/sandbox/output/create_order_items.sql"
echo "Migration applied to $DB_PATH"
