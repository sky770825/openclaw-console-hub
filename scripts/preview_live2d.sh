#!/bin/bash
# Script to serve the Live2D Prototype
PORT=8080
PROTOTYPE_PATH="/Users/caijunchang/.openclaw/workspace/sandbox/live2d_prototype"

echo "Starting Technical Verification Server on http://localhost:$PORT"
echo "Press Ctrl+C to stop."

cd "$PROTOTYPE_PATH"
python3 -m http.server $PORT
