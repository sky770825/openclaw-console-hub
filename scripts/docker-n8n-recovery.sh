#!/bin/bash
# Description: Check and recover n8n docker container
CONTAINER_NAME="n8n-production-n8n-1"
if ! docker ps --format '{{.Names}}' | grep -q "^$CONTAINER_NAME$"; then
    echo "n8n container is not running. Attempting restart..."
    docker start $CONTAINER_NAME || echo "Failed to start $CONTAINER_NAME"
fi
