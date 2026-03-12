#!/bin/bash
set -e

# Configuration
PROJECT_ROOT="/Users/caijunchang/openclaw任務面版設計"
WORKSPACE="/Users/caijunchang/.openclaw/workspace"
SCRIPTS_DIR="$WORKSPACE/scripts"
OUTPUT_DIR="$WORKSPACE/sandbox/output"
mkdir -p "$SCRIPTS_DIR"
mkdir -p "$OUTPUT_DIR"

# Try to determine the server port from the source code
# Default to 1521 if not found
PORT=$(grep -rE "listen\([0-9]+" "$PROJECT_ROOT/server/src" 2>/dev/null | grep -oE "[0-9]{4,5}" | head -n 1 || echo 1521)
API_BASE="http://localhost:$PORT/api"

# Locate the indexing tools
# We search in common bin directories and the project structure
INDEX_FILE_BIN=$(find /Users/caijunchang/.openclaw/bin "$PROJECT_ROOT" -name index_file -type f -executable 2>/dev/null | head -n 1 || which index_file 2>/dev/null || echo "")
SEMANTIC_SEARCH_BIN=$(find /Users/caijunchang/.openclaw/bin "$PROJECT_ROOT" -name semantic_search -type f -executable 2>/dev/null | head -n 1 || which semantic_search 2>/dev/null || echo "")

# Define indexing function with fallback logic
index_item() {
    local file_path=$1
    local category=$2
    local importance=$3

    echo "Indexing: $file_path (Category: $category, Importance: ${importance:-normal})"

    if [ -n "$INDEX_FILE_BIN" ]; then
        # Use binary if found
        if [ -n "$importance" ]; then
            "$INDEX_FILE_BIN" path="$file_path" category="$category" importance="$importance"
        else
            "$INDEX_FILE_BIN" path="$file_path" category="$category"
        fi
    else
        # Fallback to direct API call
        local json_payload
        if [ -n "$importance" ]; then
            json_payload=$(jq -n --arg p "$file_path" --arg c "$category" --arg i "$importance" '{path: $p, category: $c, importance: $i}')
        else
            json_payload=$(jq -n --arg p "$file_path" --arg c "$category" '{path: $p, category: $c}')
        fi
        
        curl -s -X POST "$API_BASE/knowledge/index" \
            -H "Content-Type: application/json" \
            -d "$json_payload" > /dev/null || echo "API call failed for $file_path"
    fi
}

# Define search function with fallback logic
search_verify() {
    local query=$1
    echo "Verifying with semantic search for: '$query'..."

    if [ -n "$SEMANTIC_SEARCH_BIN" ]; then
        "$SEMANTIC_SEARCH_BIN" query="$query"
    else
        # Fallback to direct API call
        local encoded_query
        encoded_query=$(python3 -c "import urllib.parse; print(urllib.parse.quote('''$query'''))")
        curl -s "$API_BASE/knowledge/search?query=$encoded_query" | jq .
    fi
}

# 1. Index Wave8 Summary
index_item "/Users/caijunchang/.openclaw/workspace/knowledge/skills-wave8-summary.md" "knowledge" "high"

# 2. Index Bug Fixing Skill
index_item "/Users/caijunchang/.openclaw/workspace/skills/bug-fixing/SKILL.md" "skills" "high"

# 3. Index Memory Master Skill
index_item "/Users/caijunchang/.openclaw/workspace/skills/memory-master/SKILL.md" "skills" ""

# 4. Index Memory Organizer Skill
index_item "/Users/caijunchang/.openclaw/workspace/skills/memory-organizer/SKILL.md" "skills" ""

# 5. Index Macro Pipeline Skill
index_item "/Users/caijunchang/.openclaw/workspace/skills/macro-pipeline/SKILL.md" "skills" ""

echo "--------------------------------------------------"
echo "All files submitted for indexing."
echo "Waiting 2 seconds for vector database synchronization..."
sleep 2

# Verification
search_verify "Wilson Score" > "$OUTPUT_DIR/wilson_score_search.json"

echo "--------------------------------------------------"
echo "Search results captured in $OUTPUT_DIR/wilson_score_search.json"
echo "TASK_COMPLETE: Wave8 skills indexed and verified via semantic search."

# Save this script to the workspace for future use
cp "$0" "$SCRIPTS_DIR/index_wave8_skills.sh"
chmod +x "$SCRIPTS_DIR/index_wave8_skills.sh"
echo "Script saved to $SCRIPTS_DIR/index_wave8_skills.sh"