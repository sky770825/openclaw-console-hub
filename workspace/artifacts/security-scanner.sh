#!/bin/bash
# security-scanner.sh - Core vulnerability scanning logic
TARGET=$1
OUTPUT=$2

if [ -z "$TARGET" ] || [ -z "$OUTPUT" ]; then
    echo "Usage: $0 <target_directory> <output_file>"
    exit 1
fi

echo "==========================================" > "$OUTPUT"
echo " SECURITY SCAN REPORT " >> "$OUTPUT"
echo " Target: $TARGET" >> "$OUTPUT"
echo " Timestamp: $(date)" >> "$OUTPUT"
echo "==========================================" >> "$OUTPUT"

if [ ! -d "$TARGET" ]; then
    echo "ERROR: Target directory $TARGET does not exist." >> "$OUTPUT"
    exit 0
fi

cd "$TARGET"

# Step 1: Check for package.json (Dependency Scan)
if [ -f "package.json" ]; then
    echo "[INFO] package.json detected. Analyzing dependencies..." >> "$OUTPUT"
    
    # Check if npm is available
    if command -v npm > /dev/null; then
        # Try npm audit if a lockfile exists
        if [ -f "package-lock.json" ] || [ -f "npm-shrinkwrap.json" ]; then
            echo "[INFO] Running npm audit..." >> "$OUTPUT"
            npm audit --json > "$OUTPUT.tmp" 2>/dev/null || true
            if [ -s "$OUTPUT.tmp" ]; then
                echo "Vulnerability Summary:" >> "$OUTPUT"
                jq '.metadata.vulnerabilities' "$OUTPUT.tmp" >> "$OUTPUT" 2>/dev/null || echo "Could not parse audit results." >> "$OUTPUT"
            fi
            rm -f "$OUTPUT.tmp"
        else
            echo "[WARN] No package-lock.json found. Listing dependencies for manual review." >> "$OUTPUT"
            jq '.dependencies, .devDependencies' package.json >> "$OUTPUT" 2>/dev/null || echo "Could not parse package.json." >> "$OUTPUT"
        fi
    else
        echo "[ERROR] npm not found. Skipping audit." >> "$OUTPUT"
    fi
else
    echo "[INFO] No package.json found. Skipping dependency scan." >> "$OUTPUT"
fi

# Step 2: Basic Secret Scanning (Simple grep pattern match)
echo -e "\n[INFO] Scanning for potential hardcoded secrets..." >> "$OUTPUT"
# Searching for common patterns while excluding node_modules and hidden files
grep -rnE "password|api_key|secret|token" . \
    --exclude-dir={node_modules,.git} \
    --exclude="*.md" \
    --exclude="$OUTPUT" \
    | head -n 20 >> "$OUTPUT" || echo "No immediate secrets found." >> "$OUTPUT"

echo -e "\nScan Completed." >> "$OUTPUT"
