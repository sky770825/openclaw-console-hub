#!/bin/bash
# Clawhub Security Library - Architecture Optimization Layer

# Prevent multiple inclusions
if [ -n "$CLAW_SECURITY_LIB_LOADED" ]; then return; fi
CLAW_SECURITY_LIB_LOADED=1

# 1. Input Sanitization
# Usage: sanitize_input "$VAR" "allow_pattern"
sanitize_input() {
    local input="$1"
    local pattern="${2:-^[a-zA-Z0-9._/-]*$}"
    if [[ ! "$input" =~ $pattern ]]; then
        echo "SECURITY ALERT: Invalid input detected: $input" >&2
        exit 1
    fi
    echo "$input"
}

# 2. Path Validation (Prevent Path Traversal)
# Usage: validate_path "/path/to/check" "/base/dir"
validate_path() {
    local target=$(realpath -m "$1" 2>/dev/null || echo "$1")
    local base=$(realpath -m "$2" 2>/dev/null || echo "$2")
    if [[ "$target" != "$base"* ]]; then
        echo "SECURITY ALERT: Path traversal attempt: $target (outside $base)" >&2
        exit 1
    fi
}

# 3. Environment Sanitization
# Usage: secure_env
secure_env() {
    # Unset sensitive vars that skills shouldn't see
    unset API_KEY
    unset SECRET_TOKEN
    unset SESSION_ID
    # Set restricted umask
    umask 077
}

# 4. Safe Execution Wrapper
# Usage: safe_run command arg1 arg2
safe_run() {
    local cmd="$1"
    shift
    # In a real architecture optimization, this could log execution or apply resource limits
    "$cmd" "$@"
}

export -f sanitize_input validate_path secure_env safe_run
