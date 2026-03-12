#!/bin/zsh
set -e
# Switch to Gemini 2.5 Flash
openclaw session_status --model google/gemini-2.5-flash
echo "✅ Model switched to Gemini 2.5 Flash (gemini-flash)"
