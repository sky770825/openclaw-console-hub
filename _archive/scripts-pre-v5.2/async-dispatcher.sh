#!/bin/bash

# ==============================================================================
# Async Task Dispatcher (異步任務分發器) v1.0
# Description: Dispatches tasks to agents and tracks their status.
# ==============================================================================

WORKTREE_ROOT="worktrees"
QUEUE_DIR="$WORKTREE_ROOT/queue"
ACTIVE_DIR="$WORKTREE_ROOT/active"
DONE_DIR="$WORKTREE_ROOT/done"

mkdir -p "$QUEUE_DIR" "$ACTIVE_DIR" "$DONE_DIR"

# Dispatch a node from a worktree
dispatch_node() {
    local tree_id=$1
    local node_id=$2
    local engine=$3
    
    local task_file="$QUEUE_DIR/${tree_id}_${node_id}.task"
    
    echo "tree_id=$tree_id" > "$task_file"
    echo "node_id=$node_id" >> "$task_file"
    echo "engine=$engine" >> "$task_file"
    echo "dispatched_at=$(date +%s)" >> "$task_file"
    
    # In a real system, this would be picked up by a worker.
    # For now, we simulate the dispatch by calling the scheduler.
    
    echo "🚀 Dispatching node $node_id (Tree $tree_id) to $engine..."
    
    # Background execution simulator
    (
        mv "$task_file" "$ACTIVE_DIR/"
        local active_file="$ACTIVE_DIR/${tree_id}_${node_id}.task"
        
        # Call the scheduler to ensure resources
        ./scripts/intelligent-scheduler.sh dispatch "${tree_id}_${node_id}" 3 "$engine"
        
        # Simulate work based on engine
        local sleep_time=5
        if [[ $engine == *"qwen2.5:14b"* ]]; then sleep_time=10; fi
        
        sleep $sleep_time
        
        # Generate dummy result
        local result_file="$WORKTREE_ROOT/results/${tree_id}_${node_id}.res"
        echo "Result for node $node_id in tree $tree_id handled by $engine. Completed at $(date)." > "$result_file"
        
        # Update WorkTree status
        ./scripts/worktree-manager.sh update "$tree_id" "$node_id" "completed" "$result_file"
        
        mv "$active_file" "$DONE_DIR/"
        echo "✅ Node $node_id (Tree $tree_id) finished."
    ) &
}

# Monitor overall progress of a tree
monitor_tree() {
    local tree_id=$1
    local tree_file="$WORKTREE_ROOT/tasks/$tree_id.json"
    
    if [ ! -f "$tree_file" ]; then echo "Tree not found"; return 1; fi
    
    local total=$(jq '.nodes | length' "$tree_file")
    local completed=$(jq '.nodes | to_entries[] | select(.value.status == "completed") | .key' "$tree_file" | wc -l | xargs)
    local pending=$(jq '.nodes | to_entries[] | select(.value.status == "pending") | .key' "$tree_file" | wc -l | xargs)
    
    echo "📊 Tree $tree_id Progress: $completed/$total completed, $pending pending."
    
    if [ "$completed" -eq "$total" ] && [ "$total" -gt 0 ]; then
        echo "🏁 Tree $tree_id is fully completed!"
        return 0
    fi
    return 1
}

case "$1" in
    dispatch) dispatch_node "$2" "$3" "$4" ;;
    monitor) monitor_tree "$2" ;;
    *) echo "Usage: $0 {dispatch <tree_id> <node_id> <engine>|monitor <tree_id>}" ;;
esac
