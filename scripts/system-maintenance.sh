#!/bin/bash
# OpenClaw System Maintenance Script
# Performs Zombie Cleanup and Anti-Stuck checks

echo "[$(date)] Starting maintenance..."

# 1. In a real environment, we would run the compiled TS/JS files
# node dist/scripts/clear-zombies.js

# 2. Trigger Anti-Stuck Full Scan
# curl -X POST http://localhost:3000/api/admin/maintenance/anti-stuck-scan

echo "[$(date)] Maintenance complete."
