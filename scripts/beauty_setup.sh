#!/bin/bash
set -e
echo "==== Beauty Project Dev Env Setup ===="
PROJECT_ROOT="$(pwd)"

# Dependency check
check_tool() {
    if ! command -v $1 &> /dev/null; then
        echo "Error: $1 is not installed."
        exit 1
    fi
}

check_tool node
check_tool npm

echo ">> Installing Client Dependencies..."
if [ -d "client" ]; then
    cd client && npm install --no-audit
    cd "$PROJECT_ROOT"
fi

echo ">> Installing Server Dependencies..."
if [ -d "server" ]; then
    cd server && npm install --no-audit
    cd "$PROJECT_ROOT"
fi

echo ">> Environment Setup Successfully!"
