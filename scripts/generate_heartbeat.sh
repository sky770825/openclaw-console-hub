#!/bin/bash
set -e

REPORT_DATE=$(date +%Y-%m-%d)
WORKSPACE_ROOT="/Users/caijunchang/.openclaw/workspace"
OUTPUT_FILE="$WORKSPACE_ROOT/reports/heartbeat-$REPORT_DATE.md"

# 1. Header
{
    echo "# 小蔡主動心跳報告 ($REPORT_DATE)"
    echo "報告生成時間: $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
} > "$OUTPUT_FILE"

# 2. System Status
{
    echo "## 🖥️ 系統狀態"
    echo "- **OS:** $(uname -sr)"
    echo "- **Uptime:** $(uptime | awk -F, '{print $1}' | sed 's/.*up //')"
    echo "- **Load Average:** $(sysctl -n vm.loadavg | awk '{print $2, $3, $4}')"
    echo ""
} >> "$OUTPUT_FILE"

# 3. Task Progress (Supabase)
# Note: Assuming SUPABASE_URL and SUPABASE_ANON_KEY are available in environment
{
    echo "## 📋 任務進度 (Supabase)"
    if [[ -n "$SUPABASE_URL" && -n "$SUPABASE_ANON_KEY" ]]; then
        # Fetching tasks that are in_progress or todo
        TASKS=$(curl -s -X GET "$SUPABASE_URL/rest/v1/tasks?select=title,status&status=in.(in_progress,todo)" \
            -H "apikey: $SUPABASE_ANON_KEY" \
            -H "Authorization: Bearer $SUPABASE_ANON_KEY")
        
        if [ "$(echo "$TASKS" | jq '. | length')" -eq 0 ]; then
            echo "目前沒有進行中的任務。"
        else
            echo "$TASKS" | jq -r '.[] | "- [ ] \(.title) (狀態: \(.status))"'
        fi
    else
        echo "⚠️ 警告: 未偵測到 Supabase 環境變數，無法查詢任務。請確保 SUPABASE_URL 與 SUPABASE_ANON_KEY 已設置。"
    fi
    echo ""
} >> "$OUTPUT_FILE"

# 4. Recent Activity (Notes & Ideas)
{
    echo "## 💡 新想法與筆記 (24h 內)"
    
    echo "### Workspace Notes:"
    NEW_NOTES=$(find "$WORKSPACE_ROOT/notes" -type f -mtime -1 -maxdepth 2 2>/dev/null || true)
    if [ -n "$NEW_NOTES" ]; then
        echo "$NEW_NOTES" | sed "s|$WORKSPACE_ROOT/notes/||" | awk '{print "- " $0}'
    else
        echo "最近 24 小時無更新。"
    fi

    echo ""
    echo "### Project Ideas:"
    NEW_IDEAS=$(find "$WORKSPACE_ROOT/projects/ideas" -type f -mtime -1 -maxdepth 2 2>/dev/null || true)
    if [ -n "$NEW_IDEAS" ]; then
        echo "$NEW_IDEAS" | sed "s|$WORKSPACE_ROOT/projects/ideas/||" | awk '{print "- " $0}'
    else
        echo "最近 24 小時無更新。"
    fi
    echo ""
} >> "$OUTPUT_FILE"

# 5. Conclusion
{
    echo "---"
    echo "*本報告由小蔡自動化腳本生成。*"
} >> "$OUTPUT_FILE"

echo "Heartbeat report generated at $OUTPUT_FILE"
