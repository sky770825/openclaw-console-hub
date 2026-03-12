#!/bin/bash
# Desktop Organizer Tool
# Usage: ./organize_desktop.sh <target_directory>

TARGET_DIR="${1:-$HOME/Desktop}"

if [ ! -d "$TARGET_DIR" ]; then
    echo "Error: Directory $TARGET_DIR does not exist."
    exit 1
fi

echo "Organizing: $TARGET_DIR"

# Define mappings
declare -A FOLDERS
FOLDERS=(
    ["Images"]="jpg jpeg png gif svg bmp webp"
    ["Documents"]="pdf doc docx txt ppt pptx xls xlsx csv md"
    ["Media"]="mp4 mkv mov avi mp3 wav"
    ["Archives"]="zip tar gz rar 7z"
    ["Code"]="js ts py html css sh c cpp go"
    ["Design"]="psd ai fig sketch"
)

for folder in "${!FOLDERS[@]}"; do
    mkdir -p "$TARGET_DIR/$folder"
    for ext in ${FOLDERS[$folder]}; do
        # Move files with matching extension (case-insensitive)
        find "$TARGET_DIR" -maxdepth 1 -type f -iname "*.$ext" -exec mv {} "$TARGET_DIR/$folder/" \; 2>/dev/null
    done
done

# Clean up empty folders (optional)
# find "$TARGET_DIR" -type d -empty -delete 2>/dev/null

echo "Organization complete."
