# OpenClaw System Investigation Report
Date: Sun Mar  1 07:49:47 CST 2026
## API Health Check
```json
API_UNREACHABLE
```
## Current Cron Jobs
0 9 * * * cd /Users/caijunchang/.openclaw/workspace && ./scripts/ollama-reporter-host.sh >> taskboard/.history/telegram.log 2>&1
# Unified Monitor v2.1 - 每10分鐘檢查，異常即報/每小時摘要
*/10 * * * * /Users/caijunchang/.openclaw/workspace/scripts/unified-monitor.sh
# OpenClaw System Recovery Center - Auto Backup
# OpenClaw System Recovery Center - Desktop Backup
0 */6 * * * /Users/caijunchang/.openclaw/workspace/scripts/recovery/backup-desktop.sh daily >> /Users/caijunchang/Desktop/小蔡/系統備份/backup.log 2>&1
0 3 * * * /Users/caijunchang/.openclaw/workspace/scripts/recovery/backup-desktop.sh daily >> /Users/caijunchang/Desktop/小蔡/系統備份/backup.log 2>&1
0 2 * * * /Users/caijunchang/.openclaw/arsenal/layer0-ai-core/redteam-daily.sh >> /Users/caijunchang/.openclaw/arsenal/logs/redteam-cron.log 2>&1
0 9 * * * /Users/caijunchang/.openclaw/workspace/scripts/daily-health-check.sh >> /Users/caijunchang/.openclaw/workspace/logs/cron-health-check.log 2>&1
# Gateway Health Watchdog v2.0 - 每分鐘檢查 gateway 健康狀態
* * * * * /Users/caijunchang/.openclaw/workspace/scripts/gateway-health-watchdog.sh
0 4 * * * /Users/caijunchang/.openclaw/workspace/scripts/log-rotate.sh >> /Users/caijunchang/.openclaw/logs/log-rotate.log 2>&1
0 5 * * * /Users/caijunchang/.openclaw/workspace/scripts/local-db-backup.sh >> /Users/caijunchang/.openclaw/backups/backup.log 2>&1
0 23 * * 0 /Users/caijunchang/.openclaw/workspace/scripts/memory-cleanup.sh >> /Users/caijunchang/.openclaw/logs/memory-cleanup.log 2>&1
0 * * * * /bin/bash /Users/caijunchang/.openclaw/workspace/sandbox/output/health-scanner.sh
## API Route Analysis
