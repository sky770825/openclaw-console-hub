#!/bin/bash
# 監控 M3 Ultra 遷移狀態
echo "Checking Ollama status..."
if pgrep -x "ollama" > /dev/null; then
    echo "STATUS: Ollama is running."
else
    echo "STATUS: Ollama is NOT running. Please start it."
fi
