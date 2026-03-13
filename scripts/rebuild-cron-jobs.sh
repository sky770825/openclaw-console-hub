#!/bin/bash
# This script lists the required cron jobs.
# Usage: ./rebuild-cron-jobs.sh | crontab -

CURRENT_CRON=$(crontab -l 2>/dev/null || echo "")
NEW_JOB="*/5 * * * * /Users/sky770825/.openclaw/workspace/scripts/openclaw-dispatch.sh >> /Users/sky770825/.openclaw/workspace/reports/cron_output.log 2>&1"

if echo "$CURRENT_CRON" | grep -q "openclaw-dispatch.sh"; then
    echo "Cron job already exists."
else
    (echo "$CURRENT_CRON"; echo "$NEW_JOB") | crontab -
    echo "Cron job installed."
fi
