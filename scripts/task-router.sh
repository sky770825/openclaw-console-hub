#!/bin/bash
# task-router.sh — 任務路由與決策門檻攔截器
# 功能：
# 1. 分析任務類型，自動派發至對應代理 inbox
# 2. 檢查決策門檻，需要審批的任務先攔截，等主人確認
#
# 用法：
#   bash task-router.sh "任務描述" [優先級P0/P1/P2]
#
# 範例：
#   bash task-router.sh "修復 Ollama 連線超時問題" P1
#   bash task-router.sh "在 IG 發布三月活動貼文" P0
#   bash task-router.sh "刪除過期的備份檔案" P1

WORKSPACE="/Users/sky770825/.openclaw/workspace"
BOT_TOKEN="8357299731:AAEk_01wMCxADTe7x6_BeY0aaFtRTVDDJsI"
CHAT_ID="5819565005"
LOG_FILE="/Users/sky770825/.openclaw/logs/task-router.log"
DATE=$(date '+%Y-%m-%d')
TIME=$(date '+%H:%M:%S')

TASK_DESC="$1"
PRIORITY="${2:-P1}"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"; }

if [ -z "$TASK_DESC" ]; then
    echo "用法: task-router.sh \"任務描述\" [P0/P1/P2]"
    exit 1
fi

log "=== 任務路由開始 ==="
log "任務: $TASK_DESC"
log "優先級: $PRIORITY"

# ─────────────────────────────────
# 1. 決策門檻檢查（攔截需要審批的操作）
# ─────────────────────────────────
NEEDS_APPROVAL=false
APPROVAL_REASON=""

# 對外發布
if echo "$TASK_DESC" | grep -qiE "發布|發送|推播|上架|publish|post|send|deploy"; then
    NEEDS_APPROVAL=true
    APPROVAL_REASON="對外發布內容需要主人/達爾審批"
fi

# 刪除操作
if echo "$TASK_DESC" | grep -qiE "刪除|移除|清除|drop|delete|remove|rm "; then
    NEEDS_APPROVAL=true
    APPROVAL_REASON="刪除操作需要主人確認"
fi

# 系統架構變更
if echo "$TASK_DESC" | grep -qiE "新增服務|移除服務|架構|LaunchAgent|plist|port|端口|遷移|migrate"; then
    NEEDS_APPROVAL=true
    APPROVAL_REASON="系統架構變更需要主人確認"
fi

# 安裝大型套件
if echo "$TASK_DESC" | grep -qiE "安裝|install|pip install|npm install|brew install"; then
    NEEDS_APPROVAL=true
    APPROVAL_REASON="安裝新套件需要主人確認"
fi

# 如果需要審批，攔截並通知
if [ "$NEEDS_APPROVAL" = true ]; then
    log "攔截！原因: $APPROVAL_REASON"

    # 寫入待審批檔案
    APPROVAL_FILE="$WORKSPACE/crew/shared/active-tasks/pending-approval-$(date '+%H%M%S').md"
    cat > "$APPROVAL_FILE" << EOF
# 待審批任務
> 時間：${DATE} ${TIME}
> 優先級：${PRIORITY}
> 攔截原因：${APPROVAL_REASON}

## 任務描述
${TASK_DESC}

## 審批方式
主人回覆「核准」或「駁回」即可。
核准後，task-router 會自動派發給對應代理執行。
EOF

    # 通知主人審批
    curl -s "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
        -d chat_id="$CHAT_ID" \
        -d text="[決策門檻攔截]

任務: ${TASK_DESC}
優先級: ${PRIORITY}
攔截原因: ${APPROVAL_REASON}

請回覆「核准」或「駁回」。" > /dev/null 2>&1

    log "已發送審批通知"
    echo "BLOCKED: ${APPROVAL_REASON}"
    echo "待審批檔案: ${APPROVAL_FILE}"
    log "=== 任務路由完成（攔截） ==="
    exit 0
fi

# ─────────────────────────────────
# 2. 任務類型偵測與代理分配
# ─────────────────────────────────
TARGET_AGENT=""
TASK_TYPE=""

# 工程/修復/bug
if echo "$TASK_DESC" | grep -qiE "修復|修改|bug|error|fix|patch|代碼|code|API|server|build|編譯|重啟"; then
    TARGET_AGENT="agong"
    TASK_TYPE="工程"

# 策略/規劃/拆解
elif echo "$TASK_DESC" | grep -qiE "規劃|策略|拆解|分析需求|優先|plan|strategy|OKR|KPI"; then
    TARGET_AGENT="ace"
    TASK_TYPE="策略"

# 研究/調研
elif echo "$TASK_DESC" | grep -qiE "調研|研究|搜尋|情報|research|investigate|比較"; then
    TARGET_AGENT="ayan"
    TASK_TYPE="研究"

# 數據/統計/指標
elif echo "$TASK_DESC" | grep -qiE "數據|統計|指標|metrics|dashboard|報表|query"; then
    TARGET_AGENT="ashu"
    TASK_TYPE="數據"

# 商業/市場
elif echo "$TASK_DESC" | grep -qiE "商業|市場|競品|營收|成本|ROI|商機"; then
    TARGET_AGENT="ashang"
    TASK_TYPE="商業"

# 記錄/整理/摘要
elif echo "$TASK_DESC" | grep -qiE "摘要|整理|記錄|歸檔|備份|summary|記憶"; then
    TARGET_AGENT="ami"
    TASK_TYPE="記錄"

# 內容/文案
elif echo "$TASK_DESC" | grep -qiE "文章|文案|內容|部落格|blog|copy|撰寫|腳本"; then
    TARGET_AGENT="content"
    TASK_TYPE="內容"

# SEO
elif echo "$TASK_DESC" | grep -qiE "SEO|關鍵字|排名|搜尋優化|keyword"; then
    TARGET_AGENT="seo"
    TASK_TYPE="SEO"

# 設計/UI/UX
elif echo "$TASK_DESC" | grep -qiE "設計|UI|UX|視覺|配色|排版|design|圖片"; then
    TARGET_AGENT="design"
    TASK_TYPE="設計"

# 審查/品質
elif echo "$TASK_DESC" | grep -qiE "審查|review|品質|檢查|驗證|validate"; then
    TARGET_AGENT="review"
    TASK_TYPE="審查"

# 社群
elif echo "$TASK_DESC" | grep -qiE "社群|IG|FB|Instagram|Threads|貼文|hashtag"; then
    TARGET_AGENT="social"
    TASK_TYPE="社群"

# 電子報
elif echo "$TASK_DESC" | grep -qiE "電子報|email|newsletter|EDM|信件|訂閱"; then
    TARGET_AGENT="newsletter"
    TASK_TYPE="電子報"

# 增長
elif echo "$TASK_DESC" | grep -qiE "增長|growth|轉換率|留存|A/B|實驗|漏斗"; then
    TARGET_AGENT="growth"
    TASK_TYPE="增長"

# 外展/合作
elif echo "$TASK_DESC" | grep -qiE "合作|外展|pitch|podcast|KOL|媒體|outreach"; then
    TARGET_AGENT="outreach"
    TASK_TYPE="外展"

# 巡查/監控
elif echo "$TASK_DESC" | grep -qiE "巡查|巡檢|監控|health|status|patrol"; then
    TARGET_AGENT="patrol"
    TASK_TYPE="巡查"

# 預設：阿策接收並拆解
else
    TARGET_AGENT="ace"
    TASK_TYPE="通用（由阿策拆解）"
fi

log "分配: ${TARGET_AGENT} (${TASK_TYPE})"

# ─────────────────────────────────
# 3. 寫入代理 inbox
# ─────────────────────────────────
INBOX_DIR="$WORKSPACE/crew/${TARGET_AGENT}/inbox"
mkdir -p "$INBOX_DIR"
TASK_FILE="${INBOX_DIR}/${DATE}_$(date '+%H%M%S')_routed-task.md"

cat > "$TASK_FILE" << EOF
# 路由任務：${TASK_TYPE}
> 時間：${DATE} ${TIME}
> 優先級：${PRIORITY}
> 來源：task-router.sh
> 分配給：${TARGET_AGENT}

## 任務描述
${TASK_DESC}

## 交付要求
請使用三段式交付格式（摘要/結論/下一步），見 shared/DELIVERY-FORMAT.md
EOF

log "已寫入 ${TARGET_AGENT}/inbox/"

# ─────────────────────────────────
# 4. 回報結果
# ─────────────────────────────────
echo "ROUTED: ${TASK_DESC}"
echo "  → 代理: ${TARGET_AGENT} (${TASK_TYPE})"
echo "  → 優先級: ${PRIORITY}"
echo "  → 檔案: ${TASK_FILE}"

log "=== 任務路由完成 ==="
