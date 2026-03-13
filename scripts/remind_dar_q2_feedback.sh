#!/bin/bash
# Description: Script to remind Xiao Cai about Q2 feedback deadline
TITLE="任務提醒：整理Q2客戶回饋"
MESSAGE="達爾，請記得整理 Q2 客戶回饋。截止日期是 2026-03-12 下午 5:00。"

# Send desktop notification
osascript -e "display notification \"$MESSAGE\" with title \"$TITLE\""

# Display a modal dialog box to ensure visibility
osascript -e "display dialog \"$MESSAGE\" buttons {\"我知道了\"} default button \"我知道了\" with title \"$TITLE\""
