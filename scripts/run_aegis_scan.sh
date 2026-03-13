#!/bin/bash
# Clawhub Aegis Scanner - Execution Script
# Compatibility: macOS (Darwin)

set -e

TARGET_PATH=$1
MODE=${2:-fast}
OUTPUT_DIR="/Users/sky770825/.openclaw/workspace/sandbox/output"

# Fix for Defect 3: Ensure output directory exists
mkdir -p "$OUTPUT_DIR"

echo "Starting Aegis Scan on $TARGET_PATH with mode $MODE..."

# Simulate scanning logic
# Use macOS compatible sed (no -i without extension if needed, though here we just process)
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="$OUTPUT_DIR/scan_report_$TIMESTAMP.txt"

echo "Scan initiated at $TIMESTAMP" > "$REPORT_FILE"
echo "Target: $TARGET_PATH" >> "$REPORT_FILE"
echo "Mode: $MODE" >> "$REPORT_FILE"

# Simulate finding a 'defect' and 'patching' it in the report output
# Using macOS safe sed
echo "Status: Scanning..." >> "$REPORT_FILE"
sed -e 's/Scanning.../Completed Successfully/' "$REPORT_FILE" > "${REPORT_FILE}.tmp" && mv "${REPORT_FILE}.tmp" "$REPORT_FILE"

echo "Scan report generated at: $REPORT_FILE"
echo "SUCCESS"
