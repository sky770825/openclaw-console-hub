#!/bin/bash
# 自動搜尋美業相關進度的工具
SEARCH_TERM="美業"
WORKSPACE="/Users/caijunchang/.openclaw/workspace"
PROJECT="/Users/caijunchang/openclaw任務面版設計"

echo "=== 搜尋 Workspace 中的美業記錄 ==="
grep -rn "$SEARCH_TERM" "$WORKSPACE" --include="*.md" --include="*.json" 2>/dev/null || echo "Workspace 中未發現關鍵字"

echo -e "\n=== 搜尋 專案原始碼 中的美業標記 ==="
grep -rn "$SEARCH_TERM" "$PROJECT" --exclude-dir={node_modules,.git} 2>/dev/null || echo "專案代碼中未發現關鍵字"
