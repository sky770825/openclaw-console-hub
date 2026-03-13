#!/bin/bash
# Skill Health Check Tool
SKILLS_DIR="/Users/sky770825/.openclaw/workspace/skills"
echo "--- Clawhub Skill Health Check ---"
if [ ! -d "$SKILLS_DIR" ]; then
    echo "[ERROR] Skills directory not found: $SKILLS_DIR"
    exit 1
fi

SKILL_COUNT=$(ls -l "$SKILLS_DIR" | grep "^d" | wc -l)
echo "[INFO] Detected $SKILL_COUNT installed skills."

for skill in "$SKILLS_DIR"/*/; do
    if [ -d "$skill" ]; then
        skill_name=$(basename "$skill")
        echo -n "[CHECKING] $skill_name ... "
        # Check for common requirements (example: entry point or manifest)
        if [ -f "$skill/index.js" ] || [ -f "$skill/main.py" ] || [ -f "$skill/skill.json" ]; then
            echo "PASSED"
        else
            echo "WARNING (Missing standard entry point)"
        fi
    fi
done
echo "--- Check Completed ---"
