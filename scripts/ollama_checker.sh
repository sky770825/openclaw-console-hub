#!/bin/bash
# OpenClaw Ollama Helper Tool

OLLAMA_HOST="${OLLAMA_HOST:-http://localhost:11434}"

function check_status() {
    echo "Checking Ollama status at $OLLAMA_HOST..."
    if curl -s "$OLLAMA_HOST/api/tags" > /dev/null; then
        echo "✅ Ollama is running."
        curl -s "$OLLAMA_HOST/api/tags" | jq -r '.models[] | "- \(.name) (\(.size/1024/1024/1024 | nt) GB)"' 2>/dev/null || echo "No models downloaded yet."
    else
        echo "❌ Ollama is not detected. Please start Ollama.app or run 'ollama serve'."
    fi
}

function recommend_models() {
    echo "Recommended models for OpenClaw:"
    echo "1. deepseek-v2.5 (General / Coding)"
    echo "2. phi4 (Lightweight Reasoning)"
    echo "3. llama3.1:8b (General purpose)"
}

case "$1" in
    "check") check_status ;;
    "list") recommend_models ;;
    *) echo "Usage: $0 {check|list}" ;;
esac
