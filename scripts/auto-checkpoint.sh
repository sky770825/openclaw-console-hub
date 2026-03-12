#!/bin/bash
# Description: Automatic backup of scripts and logic
BACKUP_DIR="/Users/caijunchang/.openclaw/workspace/backups"
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
tar -czf "$BACKUP_DIR/scripts_backup_$TIMESTAMP.tar.gz" -C "/Users/caijunchang/.openclaw/workspace" scripts
echo "Checkpoint created at $TIMESTAMP"
