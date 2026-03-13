#!/bin/bash
# Automatically generated Heartbeat Monitor

# Load configuration
if [ -f "/Users/sky770825/.openclaw/workspace/sandbox/output/monitor_config.env" ]; then
    source "/Users/sky770825/.openclaw/workspace/sandbox/output/monitor_config.env"
fi

# Path to the health check script
HEALTH_CHECK="/Users/sky770825/.openclaw/workspace/sandbox/armory/skills/health-check.sh"
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

# Execute health check
if bash "$HEALTH_CHECK" > /dev/null 2>&1; then
    echo "[$TIMESTAMP] Health check PASSED." >> "/Users/sky770825/.openclaw/workspace/sandbox/output/heartbeat.log"
else
    echo "[$TIMESTAMP] Health check FAILED! Sending Telegram alert..." >> "/Users/sky770825/.openclaw/workspace/sandbox/output/heartbeat.log"
    
    # Telegram Alert Logic
    if [[ "$TELEGRAM_BOT_TOKEN" != "YOUR_BOT_TOKEN_HERE" ]]; then
        MESSAGE="🚨 [Alert] OpenClaw Server Health Check Failed at $TIMESTAMP"
        curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
            -d chat_id="${TELEGRAM_CHAT_ID}" \
            -d text="${MESSAGE}" > /dev/null
    else
        echo "[$TIMESTAMP] Telegram notification skipped: Token not configured." >> "/Users/sky770825/.openclaw/workspace/sandbox/output/heartbeat.log"
    fi
fi
