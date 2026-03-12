#!/bin/bash
# 快速查看進度摘要
column -t -s '|' /Users/caijunchang/.openclaw/workspace/reports/CREW_DASHBOARD.md | grep -v "---"
