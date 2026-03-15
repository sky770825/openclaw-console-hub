#!/bin/bash
# daily-morning-report.sh — 每日工作早報
# 每天 07:30 觸發，給主人發送「今日系統狀態 + 昨日摘要 + 今日待辦」
# 學習自龍蝦系統的每日早報機制，升級為達爾版

WORKSPACE="/Users/sky770825/.openclaw/workspace"
PROJECT="/Users/sky770825/Desktop/大額/openclaw任務面版設計"
BOT_TOKEN="8357299731:AAEk_01wMCxADTe7x6_BeY0aaFtRTVDDJsI"
CHAT_ID="5819565005"
LOG_FILE="/Users/sky770825/.openclaw/logs/morning-report.log"
DATE=$(date '+%Y-%m-%d')
YESTERDAY=$(date -v-1d '+%Y-%m-%d')
TIME=$(date '+%H:%M')

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"; }

log "=== 每日早報生成開始 ==="

# ─────────────────────────────────
# 0a. 天氣資訊（台北，Open-Meteo 免費 API）
# ─────────────────────────────────
WEATHER_JSON=$(curl -s --connect-timeout 5 "https://api.open-meteo.com/v1/forecast?latitude=25.03&longitude=121.57&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max&timezone=Asia/Taipei&forecast_days=1" 2>/dev/null)

if echo "$WEATHER_JSON" | grep -q '"current"'; then
    TEMP_NOW=$(echo "$WEATHER_JSON" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['current']['temperature_2m'])" 2>/dev/null)
    HUMIDITY=$(echo "$WEATHER_JSON" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['current']['relative_humidity_2m'])" 2>/dev/null)
    WIND=$(echo "$WEATHER_JSON" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['current']['wind_speed_10m'])" 2>/dev/null)
    WMO=$(echo "$WEATHER_JSON" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['current']['weather_code'])" 2>/dev/null)
    TEMP_MAX=$(echo "$WEATHER_JSON" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['daily']['temperature_2m_max'][0])" 2>/dev/null)
    TEMP_MIN=$(echo "$WEATHER_JSON" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['daily']['temperature_2m_min'][0])" 2>/dev/null)
    RAIN_PCT=$(echo "$WEATHER_JSON" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['daily']['precipitation_probability_max'][0])" 2>/dev/null)
    UV_IDX=$(echo "$WEATHER_JSON" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['daily']['uv_index_max'][0])" 2>/dev/null)

    # WMO 天氣代碼轉中文
    case "$WMO" in
        0) WMO_TXT="晴天" ;;
        1|2|3) WMO_TXT="多雲" ;;
        45|48) WMO_TXT="霧" ;;
        51|53|55) WMO_TXT="毛毛雨" ;;
        61|63|65) WMO_TXT="下雨" ;;
        71|73|75) WMO_TXT="下雪" ;;
        80|81|82) WMO_TXT="陣雨" ;;
        95|96|99) WMO_TXT="雷暴" ;;
        *) WMO_TXT="未知($WMO)" ;;
    esac

    # 穿搭建議
    if [ "$(echo "$TEMP_MIN < 15" | bc 2>/dev/null)" = "1" ]; then
        DRESS="早晚偏涼，建議帶薄外套"
    elif [ "$(echo "$TEMP_MAX > 30" | bc 2>/dev/null)" = "1" ]; then
        DRESS="天氣炎熱，注意防曬補水"
    else
        DRESS="氣溫舒適，輕便穿著即可"
    fi
    [ "${RAIN_PCT:-0}" -gt 50 ] && DRESS="${DRESS}，記得帶傘"

    WEATHER_LINE="${WMO_TXT} ${TEMP_NOW}C (${TEMP_MIN}-${TEMP_MAX}C)
濕度 ${HUMIDITY}% | 風速 ${WIND}km/h | 降雨 ${RAIN_PCT}% | UV ${UV_IDX}
${DRESS}"
else
    WEATHER_LINE="(天氣資訊取得失敗)"
    log "天氣 API 失敗"
fi

# ─────────────────────────────────
# 0b. 今日行事曆（macOS Calendar.app）
# ─────────────────────────────────
CALENDAR_EVENTS=$(osascript -e '
set today to current date
set time of today to 0
set endOfDay to today + (24 * 60 * 60)
set eventList to ""
tell application "Calendar"
    repeat with cal in calendars
        try
            set calEvents to (every event of cal whose start date >= today and start date < endOfDay)
            repeat with evt in calEvents
                set h to hours of (start date of evt)
                set m to minutes of (start date of evt)
                if m < 10 then
                    set mStr to "0" & m
                else
                    set mStr to m as text
                end if
                set eventList to eventList & h & ":" & mStr & " " & (summary of evt) & linefeed
            end repeat
        end try
    end repeat
end tell
if eventList is "" then
    return "今日無行程"
else
    return eventList
end if' 2>/dev/null)

[ -z "$CALENDAR_EVENTS" ] && CALENDAR_EVENTS="(行事曆讀取失敗)"

# ─────────────────────────────────
# 1. 系統健康快速檢查
# ─────────────────────────────────
check_svc() {
    local code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 "$1" 2>/dev/null)
    [ "$code" = "200" ] && echo "OK" || echo "DOWN"
}

GW=$(check_svc "http://localhost:18789/health")
TB=$(check_svc "http://localhost:3011/api/tasks")
OL=$(check_svc "http://localhost:11434/api/tags")
N8N=$(check_svc "http://localhost:5678")
SX=$(check_svc "http://localhost:8888")
DB=$(check_svc "http://localhost:7000")

# 統計健康/異常數
TOTAL=6
HEALTHY=0
ISSUES=""
for svc_pair in "Gateway:$GW" "Taskboard:$TB" "Ollama:$OL" "n8n:$N8N" "SearXNG:$SX" "Dashboard:$DB"; do
    name="${svc_pair%%:*}"
    status="${svc_pair#*:}"
    if [ "$status" = "OK" ]; then
        HEALTHY=$((HEALTHY + 1))
    else
        ISSUES="${ISSUES}${name} "
    fi
done

if [ "$HEALTHY" -eq "$TOTAL" ]; then
    SVC_LINE="全部 ${TOTAL} 項正常運行"
    SVC_EMOJI="&#9989;"
else
    SVC_LINE="${HEALTHY}/${TOTAL} 正常｜異常: ${ISSUES}"
    SVC_EMOJI="&#9888;&#65039;"
fi

# ─────────────────────────────────
# 2. 昨日摘要（從達爾的互動日誌提取）
# ─────────────────────────────────
YESTERDAY_LOG="$WORKSPACE/memory/daily/${YESTERDAY}.md"
YESTERDAY_SUMMARY="（無昨日紀錄）"
YESTERDAY_LINES=0
YESTERDAY_ACTIONS=0

if [ -f "$YESTERDAY_LOG" ]; then
    YESTERDAY_LINES=$(wc -l < "$YESTERDAY_LOG" | tr -d ' ')
    # 統計達爾執行的動作數（以 > 或 ## 或 - 開頭的行，粗略計算）
    YESTERDAY_ACTIONS=$(grep -cE '^\s*(>|-|\*|##)' "$YESTERDAY_LOG" 2>/dev/null || echo 0)
    # 取最後 3 個 ## 標題作為摘要
    YESTERDAY_TOPICS=$(grep '^##' "$YESTERDAY_LOG" 2>/dev/null | tail -5 | sed 's/^##\s*//' | tr '\n' '、' | sed 's/、$//')
    if [ -n "$YESTERDAY_TOPICS" ]; then
        YESTERDAY_SUMMARY="${YESTERDAY_TOPICS}"
    fi
fi

# ─────────────────────────────────
# 3. 今日待辦（從 active-tasks 和 inbox 偵測）
# ─────────────────────────────────
ACTIVE_TASKS=0
PENDING_ITEMS=""

# 檢查 shared/active-tasks
if [ -d "$WORKSPACE/crew/shared/active-tasks" ]; then
    ACTIVE_TASKS=$(ls "$WORKSPACE/crew/shared/active-tasks/"*.md 2>/dev/null | wc -l | tr -d ' ')
fi

# 檢查各代理 inbox
INBOX_TOTAL=0
INBOX_AGENTS=""
for agent_dir in "$WORKSPACE/crew/"*/; do
    agent_name=$(basename "$agent_dir")
    [ "$agent_name" = "shared" ] && continue
    inbox_count=$(ls "$agent_dir/inbox/"*.md 2>/dev/null | wc -l | tr -d ' ')
    if [ "$inbox_count" -gt 0 ]; then
        INBOX_TOTAL=$((INBOX_TOTAL + inbox_count))
        INBOX_AGENTS="${INBOX_AGENTS}${agent_name}(${inbox_count}) "
    fi
done

if [ "$ACTIVE_TASKS" -eq 0 ] && [ "$INBOX_TOTAL" -eq 0 ]; then
    TODO_LINE="目前無待辦任務"
else
    TODO_LINE="共享任務: ${ACTIVE_TASKS} 項｜代理信箱: ${INBOX_TOTAL} 項"
    [ -n "$INBOX_AGENTS" ] && TODO_LINE="${TODO_LINE}\n${INBOX_AGENTS}"
fi

# ─────────────────────────────────
# 4. 代理狀態統計
# ─────────────────────────────────
AGENT_COUNT=$(ls -d "$WORKSPACE/crew/"*/ 2>/dev/null | grep -v shared | wc -l | tr -d ' ')
KNOWLEDGE_FILES=$(find "$WORKSPACE/crew" -name "*.md" -path "*/knowledge/*" 2>/dev/null | wc -l | tr -d ' ')

# ─────────────────────────────────
# 5. LaunchAgent 狀態
# ─────────────────────────────────
LA_COUNT=$(launchctl list 2>/dev/null | grep -cE "openclaw|dar\." | tr -d ' ')

# ─────────────────────────────────
# 6. 磁碟空間
# ─────────────────────────────────
DISK_USED=$(df -h / 2>/dev/null | tail -1 | awk '{print $5}')

# ─────────────────────────────────
# 7. 組裝報告
# ─────────────────────────────────
REPORT="━━━━━━━━━━━━━━━━━━━━
  達爾每日早報
  ${DATE}  ${TIME}
━━━━━━━━━━━━━━━━━━━━

☀ 天氣 — 台北
${WEATHER_LINE}

📅 今日行程
${CALENDAR_EVENTS}
🖥 系統健康
  ${SVC_LINE}

📋 昨日摘要
  ${YESTERDAY_SUMMARY}
  日誌 ${YESTERDAY_LINES} 行 ∣ 活動 ${YESTERDAY_ACTIONS} 項

📌 今日待辦
  ${TODO_LINE}

🤖 星群狀態
  代理 ${AGENT_COUNT} 個 ∣ 知識檔 ${KNOWLEDGE_FILES} 個
  LaunchAgent ${LA_COUNT} 個 ∣ 磁碟 ${DISK_USED}
━━━━━━━━━━━━━━━━━━━━"

# ─────────────────────────────────
# 8. 發送 Telegram
# ─────────────────────────────────
SEND_RESULT=$(curl -s "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
    -d chat_id="$CHAT_ID" \
    -d text="$REPORT" 2>&1)

if echo "$SEND_RESULT" | grep -q '"ok":true'; then
    log "早報發送成功"
else
    log "早報發送失敗: $SEND_RESULT"
fi

log "服務: ${HEALTHY}/${TOTAL} 正常, 代理: ${AGENT_COUNT}, 待辦: $((ACTIVE_TASKS + INBOX_TOTAL))"
log "=== 早報完成 ==="
