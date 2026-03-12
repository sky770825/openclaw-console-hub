#!/bin/bash
# Browser: Dynamic Browsing Simulation
SOURCE_PATH=$1
echo "Browser: Navigating to $SOURCE_PATH"
if [[ -d "$SOURCE_PATH" ]]; then
    find "$SOURCE_PATH" -maxdepth 2 -not -path '*/.*'
elif [[ -f "$SOURCE_PATH" ]]; then
    head -n 20 "$SOURCE_PATH"
else
    echo "Browser: Path $SOURCE_PATH not accessible."
fi
