#!/bin/bash
TARGET=$1
REPORT=$2
echo "Starting Security Scan on $TARGET..."

echo "## 1. Vulnerable Function Usage" >> "$REPORT"
grep -rE "eval\(|new Function\(|child_process\.exec|dangerouslySetInnerHTML" "$TARGET" --exclude-dir=node_modules --exclude-dir=.git || echo "No critical dangerous functions found." >> "$REPORT"

echo -e "\n## 2. Potential Secret Exposure" >> "$REPORT"
grep -rEi "api_key|apiKey|secret|token|password|auth_header" "$TARGET" --exclude-dir=node_modules --exclude-dir=.git | grep -v "example" || echo "No obvious hardcoded secrets found." >> "$REPORT"

echo -e "\n## 3. Compliance Check: License and Headers" >> "$REPORT"
if [ -f "$TARGET/LICENSE" ] || [ -f "$TARGET/LICENSE.md" ]; then
    echo "PASS: License file detected." >> "$REPORT"
else
    echo "FAIL: License file missing." >> "$REPORT"
fi

echo -e "\n## 4. Environment Variables Leakage Check" >> "$REPORT"
grep -r "process.env" "$TARGET" --exclude-dir=node_modules --exclude-dir=.git || echo "Clean: No direct process.env exposure found." >> "$REPORT"
