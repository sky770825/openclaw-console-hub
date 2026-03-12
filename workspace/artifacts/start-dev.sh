#!/bin/bash
echo "🚀 Starting OpenClaw Development Environment..."

# Ensure we are in the project root
if [ ! -d "server" ]; then
    echo "❌ Error: 'server' directory not found. Please run this from the project root."
    exit 1
fi

# Function to kill background processes on exit
cleanup() {
    echo "Stopping services..."
    kill $(jobs -p) 2>/dev/null
    exit
}
trap cleanup SIGINT SIGTERM

echo "Starting Server on port 3011..."
(cd server && npm run dev) &

echo "Starting Frontend on port 5173..."
npm run dev &

wait
