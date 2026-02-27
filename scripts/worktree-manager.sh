#!/bin/bash

# ==============================================================================
# Work Tree Manager (Work Tree 管理器) v1.0
# Description: Manages the lifecycle of complex tasks using a tree structure.
# ==============================================================================

WORKTREE_ROOT="worktrees"
TASKS_DIR="$WORKTREE_ROOT/tasks"
STATUS_DIR="$WORKTREE_ROOT/status"
RESULTS_DIR="$WORKTREE_ROOT/results"

mkdir -p "$TASKS_DIR" "$STATUS_DIR" "$RESULTS_DIR"

generate_id() {
    date +%s%N | cut -b1-13
}

# Create a new Work Tree
create_tree() {
    local root_task_name=$1
    local tree_id=$(generate_id)
    local tree_file="$TASKS_DIR/$tree_id.json"

    cat <<EOF > "$tree_file"
{
    "tree_id": "$tree_id",
    "root_name": "$root_task_name",
    "status": "initialized",
    "nodes": {},
    "created_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF
    echo "$tree_id"
}

# Add a node (subtask) to the tree
add_node() {
    local tree_id=$1
    local parent_id=$2 # root if it's top-level
    local node_name=$3
    local engine_hint=$4
    local node_id=$(generate_id)
    
    local tree_file="$TASKS_DIR/$tree_id.json"
    if [ ! -f "$tree_file" ]; then
        echo "Error: Tree $tree_id not found"
        return 1
    fi

    # Add node using jq
    local updated_json=$(jq \
        --arg id "$node_id" \
        --arg name "$node_name" \
        --arg pid "$parent_id" \
        --arg engine "$engine_hint" \
        '.nodes[$id] = {id: $id, name: $name, parent_id: $pid, engine_hint: $engine, status: "pending", dependencies: [], results: null}' \
        "$tree_file")
    
    echo "$updated_json" > "$tree_file"
    echo "$node_id"
}

# Add dependency (node A must finish before node B)
add_dependency() {
    local tree_id=$1
    local node_id=$2
    local dep_id=$3

    local tree_file="$TASKS_DIR/$tree_id.json"
    local updated_json=$(jq \
        --arg nid "$node_id" \
        --arg did "$dep_id" \
        '.nodes[$nid].dependencies += [$did]' \
        "$tree_file")
    
    echo "$updated_json" > "$tree_file"
}

# List ready nodes (all dependencies met and status is pending)
get_ready_nodes() {
    local tree_id=$1
    local tree_file="$TASKS_DIR/$tree_id.json"
    
    # Logic: 
    # 1. status == "pending"
    # 2. for each d in dependencies, .nodes[d].status == "completed"
    jq -r '.nodes | to_entries[] | select(.value.status == "pending") | .key as $k | .value | 
        if (.dependencies | length == 0) or 
           (all(.dependencies[]; . as $d | ($nodes[$d].status == "completed"))) 
        then .id else empty end' --argjson nodes "$(jq '.nodes' "$tree_file")" "$tree_file"
}

# Update node status
update_node_status() {
    local tree_id=$1
    local node_id=$2
    local status=$3
    local result_file=$4

    local tree_file="$TASKS_DIR/$tree_id.json"
    local result_content="null"
    if [ -f "$result_file" ]; then
        result_content=$(cat "$result_file" | jq -Rs .)
    fi

    local updated_json=$(jq \
        --arg nid "$node_id" \
        --arg s "$status" \
        --argjson r "$result_content" \
        '.nodes[$nid].status = $s | .nodes[$nid].results = $r' \
        "$tree_file")
    
    echo "$updated_json" > "$tree_file"
}

case "$1" in
    create) create_tree "$2" ;;
    add-node) add_node "$2" "$3" "$4" "$5" ;;
    add-dep) add_dependency "$2" "$3" "$4" ;;
    ready) get_ready_nodes "$2" ;;
    update) update_node_status "$2" "$3" "$4" "$5" ;;
    show) cat "$TASKS_DIR/$2.json" ;;
    *) echo "Usage: $0 {create|add-node|add-dep|ready|update|show}" ;;
esac
