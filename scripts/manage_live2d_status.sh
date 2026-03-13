#!/bin/bash
STATUS_FILE="/Users/sky770825/.openclaw/workspace/reports/live2d_task_status.json"

# Initialize file if not exists
if [ ! -f "$STATUS_FILE" ]; then
    echo '{"project": "Live2D Starship", "tasks": []}' > "$STATUS_FILE"
fi

add_task() {
    local task_name=$1
    local priority=$2
    local status="Pending"
    jq ".tasks += [{\"name\": \"$task_name\", \"priority\": \"$priority\", \"status\": \"$status\", \"updated\": \"$(date)\"}]" "$STATUS_FILE" > "$STATUS_FILE.tmp" && mv "$STATUS_FILE.tmp" "$STATUS_FILE"
}

list_tasks() {
    jq . "$STATUS_FILE"
}

update_status() {
    local name=$1
    local new_status=$2
    jq "(.tasks[] | select(.name == \"$name\") | .status) = \"$new_status\" | (.tasks[] | select(.name == \"$name\") | .updated) = \"$(date)\"" "$STATUS_FILE" > "$STATUS_FILE.tmp" && mv "$STATUS_FILE.tmp" "$STATUS_FILE"
}

case $1 in
    add) add_task "$2" "$3" ;;
    list) list_tasks ;;
    update) update_status "$2" "$3" ;;
    *) echo "Usage: $0 {add|list|update} [args...]" ;;
esac
