#!/bin/bash
# Tool to inject security layer into existing scripts
SECURITY_LIB="/Users/sky770825/.openclaw/workspace/armory/claw_security_lib.sh"
TARGET_SCRIPT="$1"

if [ -z "$TARGET_SCRIPT" ] || [ ! -f "$TARGET_SCRIPT" ]; then
    echo "Usage: $0 <script_path>"
    exit 1
fi

# Create a hardened version in the workspace
FILENAME=$(basename "$TARGET_SCRIPT")
OUTPUT="/Users/sky770825/.openclaw/workspace/skills/hardened_$FILENAME"

echo "#!/bin/bash" > "$OUTPUT"
echo "source $SECURITY_LIB" >> "$OUTPUT"
echo "secure_env" >> "$OUTPUT"
grep -v "^#!/bin" "$TARGET_SCRIPT" >> "$OUTPUT"

chmod +x "$OUTPUT"
echo "Hardened script created at: $OUTPUT"
