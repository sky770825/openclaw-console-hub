#!/bin/bash
PROJECT_DIR="/Users/sky770825/openclaw任務面版設計"
echo "--- Animation Tech Stack Check ---"
if [ -f "$PROJECT_DIR/package.json" ]; then
    grep -E "framer-motion|framer|gsap|tailwind|radix" "$PROJECT_DIR/package.json"
else
    echo "package.json not found"
fi

echo "--- Searching for Linear/Vercel UI Patterns ---"
# Linear often uses mask-image, backdrop-blur, and border-glow
grep -rE "backdrop-blur|mask-image|border-white/10|bg-grid" "$PROJECT_DIR/src" | head -n 10
