#!/bin/bash
TARGET="/Users/sky770825/.openclaw/workspace/sandbox"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
CLEANUP_ROOT="$TARGET/output/Organized_$TIMESTAMP"

echo "Organizing files in $TARGET..."
mkdir -p "$CLEANUP_ROOT"

# Move files in sandbox root to categorized folders in output
# We use copy (cp) then remove (rm) to be safer across potential mount points, 
# but here rm is fine as long as we don't touch system dirs.
find "$TARGET" -maxdepth 1 -type f | while read -r file; do
    filename=$(basename "$file")
    # Skip hidden files
    [[ "$filename" == .* ]] && continue
    
    ext="${filename##*.}"
    if [[ "$ext" == "$filename" ]]; then ext="no_ext"; fi
    
    mkdir -p "$CLEANUP_ROOT/$ext"
    cp "$file" "$CLEANUP_ROOT/$ext/"
    rm "$file"
    echo "Moved $filename to $ext/"
done
echo "Organization Complete. Check $CLEANUP_ROOT"
