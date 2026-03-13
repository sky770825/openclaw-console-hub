#!/bin/bash
# NEUXA Knowledge Drift Verification Tool
WORKSPACE="/Users/sky770825/.openclaw/workspace/sandbox"
echo "Checking for knowledge drift..."
FILES_TO_CHECK=("SYSTEM-RESOURCES.md" "CODEBASE-INDEX.md" "TOOLS.md")

for f in "${FILES_TO_CHECK[@]}"; do
    if [ -f "$WORKSPACE/$f" ]; then
        echo "Validating $f..."
        grep -oE "(\.?\.)?(/[a-zA-Z0-9._-]+)+" "$WORKSPACE/$f" | sort | uniq | while read -r p; do
            full_p="$p"
            [[ "$p" == ./* ]] && full_p="$WORKSPACE/${p#./}"
            if [ ! -e "$full_p" ]; then
                echo "ERR: Path $p in $f does not exist!"
            fi
        done
    fi
done

# Check if tools in TOOLS.md have corresponding scripts/endpoints
if [ -f "$WORKSPACE/TOOLS.md" ]; then
    echo "Validating tool availability..."
    # Simple check for command existence mentioned in TOOLS.md
    grep -oE "\`[a-z0-9_-]+\`" "$WORKSPACE/TOOLS.md" | tr -d '`' | while read -r cmd; do
        if ! command -v "$cmd" &> /dev/null && [ ! -f "$WORKSPACE/$cmd" ]; then
            echo "WARN: Tool '$cmd' might not be in PATH or workspace."
        fi
    done
fi
