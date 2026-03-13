#!/bin/bash
PROJECT_ROOT="/Users/sky770825/openclaw任務面版設計"
echo "--- Current Animation Usage in project ---"
grep -r "animate-" "$PROJECT_ROOT/src" | head -n 20
echo "--- Framer Motion usage ---"
grep -r "motion." "$PROJECT_ROOT/src" | head -n 20
