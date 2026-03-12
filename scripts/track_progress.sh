#!/bin/bash
DB_FILE="/Users/caijunchang/.openclaw/workspace/knowledge/project_progress.json"
REPORT_FILE="/Users/caijunchang/.openclaw/workspace/reports/progress_report.md"

update_status() {
    local feature_id=$1
    local new_status=$2
    jq --arg id "$feature_id" --arg status "$new_status" \
       '(.milestones[] | select(.id == ($id|tonumber)) | .status) = $status | .last_updated = "'$(date '+%Y-%m-%d %H:%M:%S')'"' \
       "$DB_FILE" > "${DB_FILE}.tmp" && mv "${DB_FILE}.tmp" "$DB_FILE"
    echo "Status updated for Milestone $feature_id to $new_status"
}

generate_report() {
    echo "# OpenClaw 專案進度追蹤報表" > "$REPORT_FILE"
    echo "更新時間: $(date '+%Y-%m-%d %H:%M:%S')" >> "$REPORT_FILE"
    echo "負責人: 阿秘" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "## 當前進度摘要" >> "$REPORT_FILE"
    jq -r '.milestones[] | "- [ ] **\(.feature)**: \(.status) \n  *\(.description)*"' "$DB_FILE" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "## 系統自動掃描發現" >> "$REPORT_FILE"
    jq -r '.system_scan.detected_todos[] | "- \(.)"' "$DB_FILE" >> "$REPORT_FILE"
    echo "Report generated at $REPORT_FILE"
}

case "$1" in
    "update") update_status "$2" "$3" ;;
    "report") generate_report ;;
    *) echo "Usage: $0 {update <id> <status> | report}" ;;
esac
