#!/bin/bash

# ==============================================================================
# Work Tree Aggregator (結果聚合器) v1.0
# Description: Aggregates results from a completed Work Tree.
# ==============================================================================

WORKTREE_ROOT="worktrees"
TASKS_DIR="$WORKTREE_ROOT/tasks"

aggregate_results() {
    local tree_id=$1
    local tree_file="$TASKS_DIR/$tree_id.json"
    
    if [ ! -f "$tree_file" ]; then echo "Tree not found"; return 1; fi
    
    echo "# Results for Work Tree: $(jq -r '.root_name' "$tree_file")"
    echo "ID: $tree_id"
    echo "Date: $(date)"
    echo "---"

    # Sort nodes by creation/id to maintain some order, or by dependency?
    # Simple alphabetical by name for now
    jq -r '.nodes | to_entries[] | "\(.value.name) | \(.value.status) | \(.value.results)"' "$tree_file" | while read -r line; do
        local name=$(echo "$line" | cut -d'|' -f1)
        local status=$(echo "$line" | cut -d'|' -f2)
        local result=$(echo "$line" | cut -d'|' -f3)
        
        echo "## Node: $name"
        echo "Status: $status"
        echo "Result:"
        echo "$result" | sed 's/^"//;s/"$//;s/\\n/\
/g'
        echo ""
    done
}

case "$1" in
    aggregate) aggregate_results "$2" ;;
    *) echo "Usage: $0 aggregate <tree_id>" ;;
esac
