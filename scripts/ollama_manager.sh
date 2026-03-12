#!/bin/bash
# Ollama Helper Tool for OpenClaw

COMMAND=$1
MODEL_NAME=${2:-"deepseek-r1:14b"}

case $COMMAND in
    "check")
        if curl -s http://localhost:11434/api/tags > /dev/null; then
            echo "Ollama is running."
            echo "Installed models:"
            curl -s http://localhost:11434/api/tags | jq '.models[].name' -r
        else
            echo "Ollama is not running. Please start Ollama first."
        fi
        ;;
    "pull")
        echo "Pulling model: $MODEL_NAME"
        curl http://localhost:11434/api/pull -d "{\"name\": \"$MODEL_NAME\"}"
        ;;
    "chat")
        echo "Starting chat with $MODEL_NAME..."
        curl http://localhost:11434/api/chat -d "{\"model\": \"$MODEL_NAME\", \"messages\": [{\"role\": \"user\", \"content\": \"你好，請介紹一下你自己。\"}]}"
        ;;
    *)
        echo "Usage: $0 {check|pull [model]|chat [model]}"
        ;;
esac
