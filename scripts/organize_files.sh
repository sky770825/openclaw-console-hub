#!/bin/bash
# Reusable File Organizer
TARGET_DIR="${1:-.}"

if [ ! -d "$TARGET_DIR" ]; then
    echo "Error: Directory $TARGET_DIR does not exist."
    exit 1
fi

# Convert to absolute path
TARGET_DIR=$(cd "$TARGET_DIR" && pwd)
cd "$TARGET_DIR"

# Create category directories
ORG_ROOT="_Organized_$TIMESTAMP"
# Note: Use a unique folder name to prevent recursive moving
mkdir -p "$ORG_ROOT"/{Images,Documents,Archives,Code_Scripts,Media,Folders,Miscellaneous}

echo "Starting organization of: $TARGET_DIR"

# Process all items (excluding the new organized folder and hidden files)
find . -mindepth 1 -maxdepth 1 -not -name "$ORG_ROOT" -not -name ".*" | while read -r item; do
    # Remove leading ./
    base_item="${item#./}"
    
    if [ -d "$base_item" ]; then
        echo "Moving folder: $base_item"
        mv "$base_item" "$ORG_ROOT/Folders/"
    else
        ext="${base_item##*.}"
        # Handle files with no extension
        if [[ "$base_item" == "$ext" ]]; then
            ext="none"
        fi
        ext=$(echo "$ext" | tr '[:upper:]' '[:lower:]')
        
        case "$ext" in
            jpg|jpeg|png|gif|svg|webp|bmp|ico|tif|tiff)
                mv "$base_item" "$ORG_ROOT/Images/" ;;
            pdf|doc|docx|txt|rtf|xls|xlsx|ppt|pptx|md|csv|pages|numbers|key|epub|pdf)
                mv "$base_item" "$ORG_ROOT/Documents/" ;;
            zip|tar|gz|rar|7z|dmg|pkg|iso|bz2|xz)
                mv "$base_item" "$ORG_ROOT/Archives/" ;;
            sh|py|js|ts|json|html|css|cpp|c|h|rb|go|rs|sql|php|java|yml|yaml|xml|bash)
                mv "$base_item" "$ORG_ROOT/Code_Scripts/" ;;
            mp3|wav|mp4|mov|avi|mkv|flv|wmv|m4a|aac)
                mv "$base_item" "$ORG_ROOT/Media/" ;;
            *)
                mv "$base_item" "$ORG_ROOT/Miscellaneous/" ;;
        esac
    fi
done
echo "Organization completed in $ORG_ROOT"
