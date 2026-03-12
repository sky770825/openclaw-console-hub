# Heartbeat Monitor Setup Report

## Components Created:
1. **Monitor Script**: `/Users/caijunchang/.openclaw/workspace/sandbox/output/heartbeat_monitor.sh`
   - Runs the health check and handles failure notifications.
2. **Config Template**: `/Users/caijunchang/.openclaw/workspace/sandbox/output/monitor_config.env`
   - Contains placeholders for Telegram credentials.
3. **Crontab Entry**: `/Users/caijunchang/.openclaw/workspace/sandbox/output/crontab_entry.txt`
   - Scheduled task definition (5-minute interval).

## Deployment Instructions:
1. Update `/Users/caijunchang/.openclaw/workspace/sandbox/output/monitor_config.env` with your actual Telegram Bot Token and Chat ID.
2. Run the following command to install the cron job:
   `(crontab -l 2>/dev/null; cat /Users/caijunchang/.openclaw/workspace/sandbox/output/crontab_entry.txt) | crontab -`
3. Check `/Users/caijunchang/.openclaw/workspace/sandbox/output/heartbeat.log` for execution history.

## Verification:
- Run `bash /Users/caijunchang/.openclaw/workspace/sandbox/output/heartbeat_monitor.sh` manually to verify logic.
- Stop the target server and wait 5 minutes to verify Telegram alert.
