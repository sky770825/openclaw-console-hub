#!/bin/bash
# Demo of the Experience Library
source "/Users/caijunchang/.openclaw/workspace/scripts/lib_experience.sh"

# 1. Initialize DB
exp_init "demo_tasks"

# 2. Test Smart Run (First time)
echo "--- Run 1: Unknown Task ---"
exp_smart_run "clean_temp_files" "echo 'Cleaning /tmp... Done'; sleep 1"

# 3. Test Smart Run (Second time - should be cached)
echo -e "\n--- Run 2: Known Task ---"
exp_smart_run "clean_temp_files" "echo 'This should not run because we have experience'"

# 4. Manual lookup
FP=$(exp_fingerprint "clean_temp_files")
echo -e "\nManual Lookup for $FP:"
exp_lookup "$FP" | jq .
