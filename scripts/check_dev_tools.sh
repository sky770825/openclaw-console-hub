#!/bin/bash

echo "=========================================="
echo "  General Development Tools Status Report"
echo "  Date: $(date)"
echo "=========================================="
echo

check_tool() {
    local name=$1
    local cmd=$2
    printf "%-12s: " "$name"
    if command -v "$cmd" &> /dev/null; then
        local version
        version=$($cmd --version 2>&1 | head -n 1)
        echo "INSTALLED ($version)"
    else
        echo "NOT FOUND"
    fi
}

# Specific version commands if --version isn't standard
check_tool "Homebrew" "brew"
check_tool "Node.js" "node"
check_tool "npm" "npm"
check_tool "Python 3" "python3"
check_tool "Git" "git"
check_tool "Docker" "docker"

echo
echo "--- Environment Info ---"
echo "OS: $(uname -a)"
echo "User: $(whoami)"
echo "=========================================="
