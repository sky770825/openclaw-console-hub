#!/bin/bash
# Scalpel: Precision Modification Tool
TARGET_FILE=$1
SEARCH_PATTERN=$2
REPLACE_PATTERN=$3
OUTPUT_FILE=$4

if [[ ! -f "$TARGET_FILE" ]]; then
    echo "Error: Target file $TARGET_FILE not found."
    exit 1
fi

sed "s/$SEARCH_PATTERN/$REPLACE_PATTERN/g" "$TARGET_FILE" > "$OUTPUT_FILE"
echo "Scalpel: Modified $TARGET_FILE and saved to $OUTPUT_FILE"
