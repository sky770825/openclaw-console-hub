#!/bin/bash

# ==============================================================================
# Work Tree Test Suite v1.0
# Description: Tests the Work Trees and Async Task Distribution system.
# ==============================================================================

set -e

echo "================================"
echo "🧪 Work Trees Test Suite v1.0"
echo "================================"

# Test 1: Create a tree
TEST_TREE_NAME="Knowledge Base Analysis"
echo ""
echo "--- Test 1: Creating Work Tree ---"
TREE_ID=$(./scripts/worktree-manager.sh create "$TEST_TREE_NAME")
echo "Tree ID: $TREE_ID"

if [ -z "$TREE_ID" ]; then
    echo "❌ Test 1 Failed: Tree creation returned empty ID"
    exit 1
fi
echo "✅ Test 1 Passed: Tree created"

# Test 2: Add nodes
NODE1=$(./scripts/worktree-manager.sh add-node "$TREE_ID" "root" "Research Subjects" "ollama:qwen3:4b")
NODE2=$(./scripts/worktree-manager.sh add-node "$TREE_ID" "root" "Gather Data" "ollama:qwen3:8b")
NODE3=$(./scripts/worktree-manager.sh add-node "$TREE_ID" "$NODE1" "Analyze Topics" "ollama:qwen2.5:14b")
NODE4=$(./scripts/worktree-manager.sh add-node "$TREE_ID" "$NODE1" "Draft Report" "gemini:flash")

echo ""
echo "--- Test 2: Adding Nodes ---"
echo "Node 1: $NODE1"
echo "Node 2: $NODE2"
echo "Node 3: $NODE3 (depends on Node 1)"
echo "Node 4: $NODE4 (depends on Node 1)"

# Test 3: Add dependencies
./scripts/worktree-manager.sh add-dep "$TREE_ID" "$NODE3" "$NODE1"
./scripts/worktree-manager.sh add-dep "$TREE_ID" "$NODE4" "$NODE1"

echo ""
echo "--- Test 3: Added Dependencies ---"
echo "✅ Test 3 Passed: Dependencies added"

# Test 4: Check ready nodes
READY=$(./scripts/worktree-manager.sh ready "$TREE_ID")
echo ""
echo "--- Test 4: Checking Ready Nodes ---"
echo "Ready nodes: $READY"

# Nodes 1 and 2 should be ready (no dependencies)
if ! echo "$READY" | grep -q "$NODE1"; then
    echo "❌ Test 4 Failed: Node 1 should be ready"
    exit 1
fi
if ! echo "$READY" | grep -q "$NODE2"; then
    echo "❌ Test 4 Failed: Node 2 should be ready"
    exit 1
fi
# Node 3 should NOT be ready (depends on 1)
if echo "$READY" | grep -q "$NODE3"; then
    echo "❌ Test 4 Failed: Node 3 should NOT be ready yet"
    exit 1
fi
echo "✅ Test 4 Passed: Ready nodes identified correctly"

# Test 5: Update node status and recheck
echo ""
echo "--- Test 5: Updating Node Status ---"
echo "Simulating Node 1 completion..."
echo "Node 1 result" > /tmp/test_res_1.txt
./scripts/worktree-manager.sh update "$TREE_ID" "$NODE1" "completed" /tmp/test_res_1.txt

READY_AFTER=$(./scripts/worktree-manager.sh ready "$TREE_ID")
echo "Ready nodes after Node 1 completion: $READY_AFTER"

if ! echo "$READY_AFTER" | grep -q "$NODE3"; then
    echo "❌ Test 5 Failed: Node 3 should be ready after Node 1 completed"
    exit 1
fi
if ! echo "$READY_AFTER" | grep -q "$NODE4"; then
    echo "❌ Test 5 Failed: Node 4 should be ready after Node 1 completed"
    exit 1
fi
echo "✅ Test 5 Passed: Dependency resolution working"

# Test 6: Full workflow simulation
echo ""
echo "--- Test 6: Full Workflow Simulation ---"

# Complete all remaining nodes
for node in "$NODE2" "$NODE3" "$NODE4"; do
    echo "Node $node result" > /tmp/test_res_${node}.txt
    ./scripts/worktree-manager.sh update "$TREE_ID" "$node" "completed" /tmp/test_res_${node}.txt
done

# Check if tree is complete via aggregator
RESULTS=$(./scripts/worktree-aggregator.sh aggregate "$TREE_ID")
if ! echo "$RESULTS" | grep -q "completed"; then
    echo "❌ Test 6 Failed: Aggregation did not find completed nodes"
    exit 1
fi
echo "✅ Test 6 Passed: Full workflow works"

# Test 7: Multiple trees test
echo ""
echo "--- Test 7: Multiple Trees Test ---"
TREE2=$(./scripts/worktree-manager.sh create "Secondary Task")
TREE3=$(./scripts/worktree-manager.sh create "Tertiary Task")

if [ -z "$TREE2" ] || [ -z "$TREE3" ]; then
    echo "❌ Test 7 Failed: Could not create multiple trees"
    exit 1
fi

# Cleanup test files
rm -f /tmp/test_res_*.txt

echo ""
echo "================================"
echo "✅ All Tests Passed!"
echo "================================"
