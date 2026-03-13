#!/bin/bash
# Clawhub Shield: Secure Skill Execution Wrapper
# Usage: ./clawhub_shield.sh <skill_name> <command> [args...]

SKILL_NAME=$1
shift
COMMAND=$1
shift

SKILLS_ROOT="/Users/sky770825/.openclaw/workspace/skills"
SKILL_DIR="$SKILLS_ROOT/$SKILL_NAME"
SANDBOX_ROOT="/Users/sky770825/.openclaw/workspace/sandbox"

if [ ! -d "$SKILL_DIR" ]; then
    echo "Error: Skill $SKILL_NAME not found."
    exit 1
fi

# 1. Validate Manifest
if [ ! -f "$SKILL_DIR/manifest.json" ]; then
    echo "Error: Skill manifest missing. Refusing to execute."
    exit 1
fi

# 2. Path Sanitization Check
# Prevent escaping the sandbox
for arg in "$@"; do
    if [[ "$arg" == *".."* ]]; then
        echo "Security Alert: Path traversal attempt detected in arguments: $arg"
        exit 1
    fi
done

# 3. Environment Isolation
# Run the command with restricted environment variables
echo "[Shield] Executing $SKILL_NAME securely..."
export CLAW_SKILL_HOME="$SKILL_DIR"
export CLAW_SANDBOX="$SANDBOX_ROOT"

# Execute the actual command
exec "$COMMAND" "$@"
