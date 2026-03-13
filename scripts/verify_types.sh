#!/bin/bash
PROJECT_DIR="/Users/sky770825/openclaw任務面版設計/server"
cd "$PROJECT_DIR"
echo "Running TypeScript type check (noEmit)..."
npx tsc --noEmit
