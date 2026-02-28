#!/bin/bash
# NEUXA's Telegram Notification Tool (v1.2 - Robust and Error-Free)
# Usage: ./send-tg-notify.sh "Your message here"

# More robustly find the .env file relative to the script's location
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)
ENV_FILE="${SCRIPT_DIR}/../server/.env"

# Use 'source' for safer environment variable loading
if [ -f "$ENV_FILE" ]; then
  set -a # Automatically export all variables
  source "$ENV_FILE"
  set +a
fi

BOT_TOKEN="${TELEGRAM_BOT_TOKEN}"
CHAT_ID="${TELEGRAM_CHAT_ID}"
MESSAGE="$1"

if [ -z "$BOT_TOKEN" ] || [ -z "$CHAT_ID" ]; then
  echo "Error: TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set." >&2
  exit 1
fi

if [ -z "$MESSAGE" ]; then
  echo "Usage: $0 \"<message>\"" >&2
  exit 1
fi

URL="https://api.telegram.org/bot${BOT_TOKEN}/sendMessage"

# Use --data-urlencode for the message text to handle all special characters safely.
curl -s -X POST "$URL" --data-urlencode "chat_id=${CHAT_ID}" --data-urlencode "text=${MESSAGE}" > /dev/null

# If curl succeeds, exit 0 (success)
if [ $? -eq 0 ]; then
  exit 0
else
  echo "Error: Failed to send notification." >&2
  exit 1
fi