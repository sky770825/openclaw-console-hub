#!/bin/bash
# Experience Library (lib_experience.sh) - A modular self-learning mechanism
# Author: Task Executor
# Version: 1.0.0

# Initialize the experience database
# Usage: exp_init <db_name>
exp_init() {
    local db_name=$1
    local db_dir="/Users/caijunchang/.openclaw/workspace/knowledge/experience_db"
    mkdir -p "$db_dir"
    EXP_DB_FILE="${db_dir}/${db_name}.json"
    
    if [ ! -f "$EXP_DB_FILE" ]; then
        echo '{"version": "1.0", "experiences": {}}' > "$EXP_DB_FILE"
    fi
}

# Generate a fingerprint (SHA256) for a given input
# Usage: exp_fingerprint <string>
exp_fingerprint() {
    local input="$*"
    # Use shasum on macOS/Darwin
    echo -n "$input" | shasum -a 256 | awk '{print $1}'
}

# Lookup an experience by fingerprint
# Usage: exp_lookup <fingerprint>
exp_lookup() {
    local fp=$1
    if [ ! -f "$EXP_DB_FILE" ]; then return 1; fi
    
    local result=$(jq -r ".experiences[\"$fp\"] // empty" "$EXP_DB_FILE")
    if [ -n "$result" ]; then
        echo "$result"
        return 0
    else
        return 1
    fi
}

# Record a new experience
# Usage: exp_record <fingerprint> <json_data>
exp_record() {
    local fp=$1
    local data=$2
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Add timestamp and hit count to data
    local enriched_data=$(echo "$data" | jq --arg ts "$timestamp" '. + {updated_at: $ts, hits: ((.hits // 0) + 1)}')
    
    local tmp_file=$(mktemp)
    jq --arg fp "$fp" --argjson val "$enriched_data" '.experiences[$fp] = $val' "$EXP_DB_FILE" > "$tmp_file" && mv "$tmp_file" "$EXP_DB_FILE"
}

# Helper: Quick check and run
# Usage: exp_smart_run <task_description> <command_to_run_if_unknown>
exp_smart_run() {
    local task="$1"
    local cmd="$2"
    local fp=$(exp_fingerprint "$task")
    
    echo "Checking experience for: $task ($fp)"
    local existing=$(exp_lookup "$fp")
    
    if [ -n "$existing" ]; then
        local solution=$(echo "$existing" | jq -r '.solution')
        echo "Found existing experience! Reusing solution..."
        eval "$solution"
    else
        echo "No experience found. Executing new command..."
        local output
        output=$(eval "$cmd" 2>&1)
        echo "$output"
        
        # Save this as a new experience
        local payload=$(jq -n --arg task "$task" --arg sol "$cmd" '{task: $task, solution: $sol}')
        exp_record "$fp" "$payload"
        echo "Experience recorded."
    fi
}
