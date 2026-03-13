#!/bin/bash
# Logic to organize desktop files into specific categories
SOURCE_DIR="$1"
TARGET_DIR="$2"

if [ ! -d "$SOURCE_DIR" ]; then
    echo "Source directory $SOURCE_DIR does not exist."
    exit 1
fi

mkdir -p "$TARGET_DIR"/{Screenshots,Images,Documents,Archives,Code,Others}

# Use -print0 to handle spaces and special characters in filenames safely
find "$SOURCE_DIR" -maxdepth 1 -type f -not -name ".*" -print0 | while IFS= read -r -d '' file; do
    filename=$(basename "$file")
    extension=$(echo "${filename##*.}" | tr '[:upper:]' '[:lower:]')
    
    # Categorization
    case "$extension" in
        png|jpg|jpeg|gif|svg|webp|bmp|tiff)
            if [[ "$filename" == "Screenshot"* ]] || [[ "$filename" == "螢幕快照"* ]]; then
                mv "$file" "$TARGET_DIR/Screenshots/"
            else
                mv "$file" "$TARGET_DIR/Images/"
            fi
            ;;
        pdf|doc|docx|txt|md|pages|numbers|key|xls|xlsx|ppt|pptx|csv|rtf)
            mv "$file" "$TARGET_DIR/Documents/"
            ;;
        zip|tar|gz|rar|7z|dmg|pkg|iso)
            mv "$file" "$TARGET_DIR/Archives/"
            ;;
        sh|py|js|html|css|ts|json|yaml|yml|c|cpp|rs|go|php|rb|sql)
            mv "$file" "$TARGET_DIR/Code/"
            ;;
        *)
            mv "$file" "$TARGET_DIR/Others/"
            ;;
    esac
done

# Clean up any empty categories
find "$TARGET_DIR" -type d -empty -delete
