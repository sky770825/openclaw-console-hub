#!/bin/bash
# 健康檢查腳本 - 修正版
curl -s http://localhost:3011/api/health | python3 -c "
import json, sys
data = json.load(sys.stdin)
print('Server:', data.get('service', 'N/A'), 'v' + data.get('version', 'N/A'))
print('Uptime:', data.get('uptime', 'N/A'), 'seconds')
auto = data.get('autoExecutor', {})
print('Auto-executor:', 'RUNNING' if auto.get('isRunning') else 'STOPPED')
print('Tasks today:', auto.get('totalExecutedToday', 0))
print('Last poll:', auto.get('lastPollAt', 'N/A'))
"