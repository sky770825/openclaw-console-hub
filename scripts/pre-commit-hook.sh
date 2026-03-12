#!/bin/bash

# List of protected core files
PROTECTED_FILES=("SOUL.md" "AGENTS.md" "BOOTSTRAP.md" "AWAKENING.md" "IDENTITY.md")

# Get staged files
STAGED_FILES=$(git diff --cached --name-only)

FORBIDDEN_CHANGES=()

for file in $STAGED_FILES; do
    filename=$(basename "$file")
    for protected in "${PROTECTED_FILES[@]}"; do
        if [ "$filename" == "$protected" ]; then
            FORBIDDEN_CHANGES+=("$file")
        fi
    done
done

if [ ${#FORBIDDEN_CHANGES[@]} -gt 0 ]; then
    if [ "$ALLOW_CORE_CHANGE" != "true" ]; then
        echo "================================================================"
        echo "❌ COMMIT REJECTED: Protected Core Files Detected"
        echo "================================================================"
        echo "The following core files are protected and cannot be modified:"
        for f in "${FORBIDDEN_CHANGES[@]}"; do
            echo "  - $f"
        done
        echo ""
        echo "To override this protection, run:"
        echo "  ALLOW_CORE_CHANGE=true git commit"
        echo "================================================================"
        exit 1
    else
        echo "⚠️  Overriding core file protection as ALLOW_CORE_CHANGE=true"
    fi
fi

exit 0
