#!/bin/bash
# Clawhub Skill Auditor Tool
TARGET_DIR=${1:-"/Users/sky770825/.openclaw/workspace/skills"}
echo "Running audit on $TARGET_DIR..."
grep -rE "(key|secret|password|token|auth)\s*[:=]\s*['\"][a-zA-Z0-9\-_]{16,}['\"]" "$TARGET_DIR" || echo "No secrets found."
grep -rnE "(eval\(|exec\()" "$TARGET_DIR" || echo "No dangerous patterns found."
