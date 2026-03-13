#!/bin/bash
# 阿研的外部調研引擎 - 自動抓取趨勢數據
QUERY=$1
if [ -z "$QUERY" ]; then QUERY="task-management-dashboard-agent"; fi

echo "Searching GitHub for: $QUERY..."
# 抓取 GitHub 上最相關的開源任務面板項目
curl -s "https://api.github.com/search/repositories?q=${QUERY}&sort=stars&order=desc" \
| jq '.items[0:5] | .[] | {name: .full_name, stars: .stargazers_count, description: .description, url: .html_url}' \
> "/Users/sky770825/.openclaw/workspace/knowledge/external_trends.json"

echo "外部趨勢已更新至 knowledge/external_trends.json"
