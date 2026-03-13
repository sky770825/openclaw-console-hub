#!/bin/bash
# Scalpel: Precision modification tool for workspace files
TARGET_FILE=$1
SEARCH=$2
REPLACE=$3

if [[ ! -f "$TARGET_FILE" ]]; then
    echo "Error: File $TARGET_FILE not found."
    exit 1
fi

# Ensure we don't touch protected source
if [[ "$TARGET_FILE" == "/Users/sky770825/openclaw任務面版設計"* ]]; then
    echo "Error: Modification of source project is FORBIDDEN."
    exit 1
fi

sed -i '' "s|$SEARCH|$REPLACE|g" "$TARGET_FILE"
echo "Scalpel: Successfully replaced '$SEARCH' with '$REPLACE' in $TARGET_FILE"
