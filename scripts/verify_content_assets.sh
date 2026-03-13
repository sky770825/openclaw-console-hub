#!/bin/bash
echo "--- OpenClaw Content Asset Verification ---"
[ -f "/Users/sky770825/.openclaw/workspace/reports/openclaw_features_core_message.md" ] && echo "[OK] Core Message Document Exists"
[ -f "/Users/sky770825/.openclaw/workspace/proposals/features_page_copywriting.md" ] && echo "[OK] Page Copywriting Proposal Exists"
echo "--- Preview of Core Value ---"
grep "Value Proposition" -A 2 "/Users/sky770825/.openclaw/workspace/reports/openclaw_features_core_message.md"
