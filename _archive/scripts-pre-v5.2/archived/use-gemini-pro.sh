#!/bin/zsh
set -e
# Switch to Gemini 2.5 Pro
openclaw session_status --model google/gemini-2.5-pro
echo "✅ Model switched to Gemini 2.5 Pro"
