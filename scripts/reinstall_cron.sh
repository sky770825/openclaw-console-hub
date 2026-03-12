#!/bin/bash
# Run this to update your crontab
(crontab -l | grep -v "monitor_and_move.sh" | grep -v "auto-checkpoint.sh" | grep -v "docker-n8n-recovery.sh" ; echo "*/15 * * * * /Users/caijunchang/.openclaw/workspace/scripts/monitor_and_move.sh") | crontab -
(crontab -l ; echo "0 * * * * /Users/caijunchang/.openclaw/workspace/scripts/auto-checkpoint.sh") | crontab -
(crontab -l ; echo "*/5 * * * * /Users/caijunchang/.openclaw/workspace/scripts/docker-n8n-recovery.sh") | crontab -
