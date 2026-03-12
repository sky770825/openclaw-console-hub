#!/bin/bash
echo "Instructions to apply optimizations manually to core:"
echo "1. Replace server/src/executor/AutoExecutor.ts constants with 5000ms."
echo "2. Import and call clearZombies() in server/src/index.ts (bootstrap)."
echo "3. Update anti-stuck.ts to include the recovery logic from optimized_logic/."
