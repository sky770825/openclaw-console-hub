#!/bin/bash
# agent-scheduled-tasks.sh — 代理級定時任務調度器
# 每 4 小時觸發，依時段執行不同代理的專屬任務
# 學習自龍蝦系統「每個代理都有自己的定時任務」的設計
#
# 排程表：
# 08:00 — patrol 巡查 + journal 昨日摘要
# 12:00 — ami 記憶整理 + ashu 數據統計
# 16:00 — patrol 巡查 + growth 指標檢查
# 20:00 — journal 今日總結 + ami 知識歸檔

WORKSPACE="/Users/sky770825/.openclaw/workspace"
BOT_TOKEN="8357299731:AAEk_01wMCxADTe7x6_BeY0aaFtRTVDDJsI"
CHAT_ID="5819565005"
LOG_FILE="/Users/sky770825/.openclaw/logs/agent-tasks.log"
DATE=$(date '+%Y-%m-%d')
HOUR=$(date '+%H')
TIME=$(date '+%H:%M')

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"; }

log "=== 代理定時任務開始 (${TIME}) ==="

# ─────────────────────────────────
# 共用函數
# ─────────────────────────────────
write_inbox() {
    local agent=$1 subject=$2 content=$3
    local inbox_dir="$WORKSPACE/crew/${agent}/inbox"
    mkdir -p "$inbox_dir"
    local filename="${DATE}_$(date '+%H%M')_${subject}.md"
    echo "$content" > "$inbox_dir/$filename"
    log "  寫入 ${agent}/inbox/${filename}"
}

notify_telegram() {
    local msg=$1
    curl -s "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
        -d chat_id="$CHAT_ID" \
        -d parse_mode=HTML \
        -d text="$msg" > /dev/null 2>&1
}

check_svc() {
    local code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 "$1" 2>/dev/null)
    [ "$code" = "200" ] && echo "OK" || echo "DOWN"
}

# ─────────────────────────────────
# patrol 巡查任務
# ─────────────────────────────────
task_patrol() {
    log "  [patrol] 系統巡查開始"

    local issues=""
    local issue_count=0

    # 服務健康檢查
    for svc_pair in "Gateway:http://localhost:18789/health" "Taskboard:http://localhost:3011/api/tasks" "Ollama:http://localhost:11434/api/tags" "n8n:http://localhost:5678" "SearXNG:http://localhost:8888" "Dashboard:http://localhost:7000"; do
        name="${svc_pair%%:*}"
        url="${svc_pair#*:}"
        status=$(check_svc "$url")
        if [ "$status" != "OK" ]; then
            issues="${issues}\n- ${name} 服務異常"
            issue_count=$((issue_count + 1))
        fi
    done

    # 檢查磁碟空間
    disk_pct=$(df -h / | tail -1 | awk '{gsub(/%/,""); print $5}')
    if [ "$disk_pct" -gt 85 ]; then
        issues="${issues}\n- 磁碟使用率 ${disk_pct}% (>85%)"
        issue_count=$((issue_count + 1))
    fi

    # 檢查 error log 是否暴增
    error_log="/Users/sky770825/.openclaw/automation/logs/taskboard-error.log"
    if [ -f "$error_log" ]; then
        recent_errors=$(find "$error_log" -mmin -240 -exec wc -l {} \; 2>/dev/null | awk '{print $1}')
        if [ "${recent_errors:-0}" -gt 50 ]; then
            issues="${issues}\n- Error log 近 4 小時新增 ${recent_errors} 行"
            issue_count=$((issue_count + 1))
        fi
    fi

    # 檢查各代理 inbox 積壓
    for agent_dir in "$WORKSPACE/crew/"*/; do
        agent_name=$(basename "$agent_dir")
        [ "$agent_name" = "shared" ] && continue
        inbox_count=$(ls "$agent_dir/inbox/"*.md 2>/dev/null | wc -l | tr -d ' ')
        if [ "$inbox_count" -gt 10 ]; then
            issues="${issues}\n- ${agent_name} inbox 積壓 ${inbox_count} 項"
            issue_count=$((issue_count + 1))
        fi
    done

    # 寫入巡查報告
    local report_file="$WORKSPACE/crew/patrol/inbox/${DATE}_${TIME}_patrol-report.md"
    mkdir -p "$WORKSPACE/crew/patrol/inbox"

    if [ "$issue_count" -eq 0 ]; then
        echo "# 巡查報告 ${DATE} ${TIME}
> 狀態：全部正常
> 服務：6/6 正常
> 磁碟：${disk_pct}%

無異常。" > "$report_file"
        log "  [patrol] 巡查完成，無異常"
    else
        echo "# 巡查報告 ${DATE} ${TIME}
> 狀態：發現 ${issue_count} 項異常

## 異常項目
$(echo -e "$issues")

## 建議
請達爾或 Claude Code 處理以上異常。" > "$report_file"

        # 有異常時發 Telegram 通知
        notify_telegram "<b>&#128680; patrol 巡查異常</b>
${DATE} ${TIME}

發現 ${issue_count} 項問題：$(echo -e "$issues" | head -5)"

        log "  [patrol] 巡查完成，${issue_count} 項異常"
    fi
}

# ─────────────────────────────────
# journal 日誌任務
# ─────────────────────────────────
task_journal_morning() {
    log "  [journal] 昨日摘要生成"

    local yesterday=$(date -v-1d '+%Y-%m-%d')
    local yesterday_log="$WORKSPACE/memory/daily/${yesterday}.md"

    if [ ! -f "$yesterday_log" ]; then
        log "  [journal] 昨日無日誌，跳過"
        return
    fi

    local line_count=$(wc -l < "$yesterday_log" | tr -d ' ')
    local topics=$(grep '^##' "$yesterday_log" 2>/dev/null | head -10 | sed 's/^##\s*/  - /')
    local action_count=$(grep -cE '^\s*(>|-|\*)' "$yesterday_log" 2>/dev/null || echo 0)

    write_inbox "journal" "daily-summary" "# 昨日日誌摘要 (${yesterday})

## 統計
- 日誌行數：${line_count}
- 活動項目：${action_count}

## 主要話題
${topics:-  （無標題段落）}

## 來源
\`${yesterday_log}\`"
}

task_journal_evening() {
    log "  [journal] 今日總結生成"

    local today_log="$WORKSPACE/memory/daily/${DATE}.md"

    if [ ! -f "$today_log" ]; then
        log "  [journal] 今日無日誌，跳過"
        return
    fi

    local line_count=$(wc -l < "$today_log" | tr -d ' ')
    local topics=$(grep '^##' "$today_log" 2>/dev/null | head -10 | sed 's/^##\s*/  - /')

    write_inbox "journal" "evening-summary" "# 今日活動總結 (${DATE})

## 統計
- 截至 ${TIME}，日誌共 ${line_count} 行

## 今日話題
${topics:-  （無標題段落）}

## 待辦確認
請 journal 代理確認今日重要事項是否已記錄至長期記憶。"
}

# ─────────────────────────────────
# ami 記憶管理任務
# ─────────────────────────────────
task_ami_memory() {
    log "  [ami] 記憶整理任務"

    # 檢查過去 7 天的日誌大小
    local total_size=0
    local days_with_logs=0
    for i in $(seq 0 6); do
        local d=$(date -v-${i}d '+%Y-%m-%d')
        local f="$WORKSPACE/memory/daily/${d}.md"
        if [ -f "$f" ]; then
            local sz=$(wc -c < "$f" | tr -d ' ')
            total_size=$((total_size + sz))
            days_with_logs=$((days_with_logs + 1))
        fi
    done
    local total_kb=$((total_size / 1024))

    # 檢查 MEMORY.md 大小
    local memory_size=0
    if [ -f "$WORKSPACE/MEMORY.md" ]; then
        memory_size=$(wc -l < "$WORKSPACE/MEMORY.md" | tr -d ' ')
    fi

    write_inbox "ami" "memory-maintenance" "# 記憶維護提醒 (${DATE})

## 近 7 天日誌統計
- 有紀錄天數：${days_with_logs}/7
- 總大小：${total_kb} KB

## MEMORY.md 狀態
- 行數：${memory_size}

## 建議執行
1. 檢查過去 7 天日誌是否有重要事項未寫入 MEMORY.md
2. 清理過期或已完成的記憶條目
3. 確認知識庫索引是否需要更新"
}

task_ami_archive() {
    log "  [ami] 知識歸檔任務"

    # 統計各代理知識檔案
    local kb_stats=""
    for agent_dir in "$WORKSPACE/crew/"*/; do
        agent_name=$(basename "$agent_dir")
        [ "$agent_name" = "shared" ] && continue
        kb_count=$(ls "$agent_dir/knowledge/"*.md 2>/dev/null | wc -l | tr -d ' ')
        [ "$kb_count" -gt 0 ] && kb_stats="${kb_stats}\n- ${agent_name}: ${kb_count} 個知識檔"
    done

    write_inbox "ami" "knowledge-archive" "# 知識歸檔統計 (${DATE})

## 各代理知識庫
$(echo -e "${kb_stats:-  （尚無知識檔）}")

## 待確認
- 是否有新產生的知識需要歸檔？
- 是否有過期的知識需要更新？"
}

# ─────────────────────────────────
# ashu 數據統計任務
# ─────────────────────────────────
task_ashu_stats() {
    log "  [ashu] 數據統計任務"

    # 統計今日各項數據
    local agent_count=$(ls -d "$WORKSPACE/crew/"*/ 2>/dev/null | grep -v shared | wc -l | tr -d ' ')
    local la_count=$(launchctl list 2>/dev/null | grep -cE "openclaw|dar\." | tr -d ' ')
    local log_dir="/Users/sky770825/.openclaw/logs"
    local today_log_size=0
    if [ -d "$log_dir" ]; then
        today_log_size=$(find "$log_dir" -name "*.log" -mtime -1 -exec cat {} \; 2>/dev/null | wc -c | tr -d ' ')
    fi
    local today_log_kb=$((today_log_size / 1024))

    write_inbox "ashu" "system-stats" "# 系統數據統計 (${DATE} ${TIME})

## 基礎指標
- 活躍代理：${agent_count} 個
- LaunchAgent：${la_count} 個
- 今日 log 產出：${today_log_kb} KB

## Supabase 建議查詢
- 任務完成率
- 錯誤發生頻率
- 模型使用量分佈"
}

# ─────────────────────────────────
# growth 增長指標任務
# ─────────────────────────────────
task_growth_check() {
    log "  [growth] 增長指標檢查"

    write_inbox "growth" "metrics-check" "# 增長指標檢查提醒 (${DATE})

## 請確認以下指標
1. 任務完成率是否達標
2. 系統效能是否有退化趨勢
3. 代理協作是否有瓶頸
4. 是否有新的自動化機會

## 建議
- 與 ashu 配合拉取最新數據
- 更新 northstar-metrics.md 中的指標"
}

# ─────────────────────────────────
# 依時段派發任務
# ─────────────────────────────────
HOUR_NUM=$((10#$HOUR))

if [ "$HOUR_NUM" -ge 7 ] && [ "$HOUR_NUM" -lt 10 ]; then
    # 早上時段 07:00-09:59
    log "  時段：早上 — 執行 patrol + journal 昨日摘要"
    task_patrol
    task_journal_morning

elif [ "$HOUR_NUM" -ge 11 ] && [ "$HOUR_NUM" -lt 14 ]; then
    # 中午時段 11:00-13:59
    log "  時段：中午 — 執行 ami 記憶整理 + ashu 統計"
    task_ami_memory
    task_ashu_stats

elif [ "$HOUR_NUM" -ge 15 ] && [ "$HOUR_NUM" -lt 18 ]; then
    # 下午時段 15:00-17:59
    log "  時段：下午 — 執行 patrol + growth 指標"
    task_patrol
    task_growth_check

elif [ "$HOUR_NUM" -ge 19 ] && [ "$HOUR_NUM" -lt 22 ]; then
    # 晚上時段 19:00-21:59
    log "  時段：晚上 — 執行 journal 今日總結 + ami 歸檔"
    task_journal_evening
    task_ami_archive

else
    log "  非排程時段，靜默退出"
fi

# ─────────────────────────────────
# 通知達爾自動讀取 inbox
# ─────────────────────────────────
# 統計今日寫入的 inbox 總數
INBOX_WRITTEN=$(find "$WORKSPACE/crew" -path "*/inbox/${DATE}_*.md" 2>/dev/null | wc -l | tr -d ' ')

if [ "${INBOX_WRITTEN:-0}" -gt 0 ]; then
    # 寫入觸發檔案，讓達爾下次啟動時讀取
    TRIGGER_FILE="$WORKSPACE/crew/shared/active-tasks/inbox-trigger-${DATE}.md"
    cat > "$TRIGGER_FILE" << EOF
# 代理 inbox 任務通知
> 時間：$(date '+%Y-%m-%d %H:%M:%S')
> 來源：agent-scheduled-tasks.sh
> 本次寫入：${INBOX_WRITTEN} 個 inbox 任務

## 請達爾讀取以下代理的 inbox 並分派執行
$(find "$WORKSPACE/crew" -path "*/inbox/${DATE}_*.md" 2>/dev/null | sed 's|.*/crew/||' | sed 's|/inbox/| → |')

## 執行方式
依序讀取各代理 inbox，按內容執行對應動作，完成後刪除 inbox 檔案。
EOF

    # 發送 Telegram 通知達爾
    DARBOT_TOKEN="8225683676:AAHSIV9Sx5RqnODZZKVXHI2C2HzECaHzDIE"
    DAR_CHAT_ID="5819565005"
    curl -s "https://api.telegram.org/bot${DARBOT_TOKEN}/sendMessage" \
        -d chat_id="$DAR_CHAT_ID" \
        -d text="[代理排程通知]
${DATE} ${TIME}

已寫入 ${INBOX_WRITTEN} 個代理 inbox 任務。
請讀取 crew/shared/active-tasks/inbox-trigger-${DATE}.md 並分派執行。" > /dev/null 2>&1

    log "已通知達爾讀取 ${INBOX_WRITTEN} 個 inbox 任務"
fi

log "=== 代理定時任務完成 ==="
