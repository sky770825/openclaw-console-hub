#!/bin/bash
# Helper to check if visualization libraries are installed in the project
LIB_PATH="/Users/caijunchang/openclaw任務面版設計"

echo "Checking visualization libraries status in $LIB_PATH..."
cd "$LIB_PATH" || exit 1

libs=("recharts" "d3" "echarts" "react-echarts")

for lib in "${libs[@]}"; do
    if npm list "$lib" --depth=0 > /dev/null 2>&1; then
        echo "[FOUND] $lib"
    else
        echo "[MISSING] $lib"
    fi
done
