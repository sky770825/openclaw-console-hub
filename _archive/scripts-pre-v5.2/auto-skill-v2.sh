#!/bin/zsh
# Auto-Skill Decision Layer v2.0 - 強化版
# 新增：關鍵詞指紋、話題切換偵測、技能經驗庫、主動記錄

set -euo pipefail

WORKSPACE="${HOME}/.openclaw/workspace"
AUTO_SKILL_DIR="${WORKSPACE}/.auto-skill"
KNOWLEDGE_DIR="${AUTO_SKILL_DIR}/knowledge"
EXPERIENCE_DIR="${AUTO_SKILL_DIR}/experience"
LOG_FILE="${AUTO_SKILL_DIR}/autoskill.log"

# 建立目錄結構
mkdir -p "$KNOWLEDGE_DIR" "$EXPERIENCE_DIR" "${WORKSPACE}/logs"

# 顏色
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

log() {
    echo "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# ============================================
# 1. 關鍵詞指紋提取 (Fingerprinting)
# ============================================

extract_fingerprint() {
    local input="${1:-}"
    
    # 從輸入提取關鍵詞（技術詞、技能名稱、動作詞）
    local keywords=$(echo "$input" | grep -oE '\b[A-Z][a-z]+[A-Z][a-zA-Z]*\b|\b[a-z]+-[a-z]+\b|\b(設定|設定|修復|部署|建立|查詢|同步|更新)\b' | head -10 | tr '\n' ',' | sed 's/,$//')
    
    # 生成指紋（關鍵詞排序後的雜湊）- 使用 openssl
    local fingerprint=$(echo "$keywords" | tr ',' '\n' | sort | tr '\n' '-' | openssl md5 | awk '{print $NF}' | cut -c1-8)
    
    echo "$fingerprint|$keywords"
}

# ============================================
# 2. 話題切換偵測
# ============================================

detect_topic_shift() {
    local current_fingerprint="$1"
    local last_fingerprint_file="${AUTO_SKILL_DIR}/.last-fingerprint"
    
    if [[ ! -f "$last_fingerprint_file" ]]; then
        echo "$current_fingerprint" > "$last_fingerprint_file"
        echo "new"
        return
    fi
    
    local last_fingerprint=$(cat "$last_fingerprint_file")
    echo "$current_fingerprint" > "$last_fingerprint_file"
    
    if [[ "$current_fingerprint" == "$last_fingerprint" ]]; then
        echo "same"
    else
        # 計算相似度（簡易版：關鍵詞重疊度）
        local overlap=$(echo "$current_fingerprint" | grep -o "$last_fingerprint" | wc -l)
        if [[ $overlap -gt 0 ]]; then
            echo "related"
        else
            echo "shift"
        fi
    fi
}

# ============================================
# 3. 技能經驗庫檢索
# ============================================

skill_experience_lookup() {
    local skill_name="$1"
    local experience_file="${EXPERIENCE_DIR}/skill-${skill_name}.md"
    
    if [[ -f "$experience_file" ]]; then
        echo "📚 找到技能經驗：$skill_name"
        echo "═══════════════════════════════════════"
        head -20 "$experience_file"
        echo "═══════════════════════════════════════"
        return 0
    fi
    return 1
}

# 偵測技能呼叫
 detect_skill_invocation() {
    local input="${1:-}"
    local detected=""
    
    # 技能偵測模式
    [[ "$input" =~ (Codex|Cursor|程式|程式碼|code|bug|修復) ]] && detected="coding"
    [[ "$input" =~ (qmd|mq|搜尋|索引|query) ]] && detected="search"
    [[ "$input" =~ (部署|deploy|上線|發布|release) ]] && detected="deploy"
    [[ "$input" =~ (同步|sync|記憶|memory|備份) ]] && detected="memory"
    [[ "$input" =~ (爬蟲|scrape|抓取|fetch) ]] && detected="scraping"
    [[ "$input" =~ (n8n|自動化|workflow|排程) ]] && detected="automation"
    
    echo "$detected"
}

# ============================================
# 4. 通用知識庫檢索
# ============================================

knowledge_base_lookup() {
    local keywords="$1"
    local found=0
    
    # 搜尋 knowledge 目錄
    for file in "$KNOWLEDGE_DIR"/*.md; do
        [[ -f "$file" ]] || continue
        
        # 檢查關鍵詞是否匹配
        if grep -qi "$keywords" "$file" 2>/dev/null; then
            echo "📖 找到相關知識：$(basename "$file")"
            echo "───────────────────────────────────────"
            grep -B2 -A5 -i "$keywords" "$file" | head -15
            echo "───────────────────────────────────────"
            found=1
        fi
    done
    
    return $((1 - found))
}

# ============================================
# 5. 主動記錄機制 (Write Back)
# ============================================

suggest_experience_capture() {
    local task_summary="$1"
    local skill_name="$2"
    local experience_file="${EXPERIENCE_DIR}/skill-${skill_name}.md"
    
    # 產生建議記錄檔案
    local suggestion_file="${AUTO_SKILL_DIR}/.pending-capture"
    cat > "$suggestion_file" << EOF
## 建議記錄的經驗

**技能**: $skill_name
**時間**: $(date '+%Y-%m-%d %H:%M')
**任務摘要**: $task_summary

**解法**: 
[待填寫]

**遇到的坑**:
[待填寫]

**關鍵參數**:
[待填寫]

---
確認要記錄？編輯後儲存到: $experience_file
EOF

    echo ""
    echo -e "${YELLOW}💡 建議記錄經驗${NC}"
    echo "═══════════════════════════════════════"
    cat "$suggestion_file"
    echo "═══════════════════════════════════════"
    echo "編輯後儲存，下次使用 $skill_name 技能時會自動提醒"
}

# ============================================
# 6. 決策引擎 v2.0
# ============================================

make_decision_v2() {
    local user_input="${1:-}"
    local decisions=()
    local messages=()
    
    # 步驟 1: 關鍵詞指紋
    local fingerprint_data=$(extract_fingerprint "$user_input")
    local fingerprint=$(echo "$fingerprint_data" | cut -d'|' -f1)
    local keywords=$(echo "$fingerprint_data" | cut -d'|' -f2)
    
    log "指紋: $fingerprint, 關鍵詞: $keywords"
    
    # 步驟 2: 話題切換偵測
    local topic_state=$(detect_topic_shift "$fingerprint")
    log "話題狀態: $topic_state"
    
    if [[ "$topic_state" == "shift" ]]; then
        decisions+=("reload-knowledge")
        messages+=("🔄 偵測到新話題，重新載入知識庫")
    fi
    
    # 步驟 3: 技能偵測
    local skill=$(detect_skill_invocation "$user_input")
    if [[ -n "$skill" ]]; then
        log "偵測到技能: $skill"
        decisions+=("skill-lookup:$skill")
        messages+=("🔧 偵測到 $skill 技能，檢查經驗庫...")
    fi
    
    # 步驟 4: 知識庫檢索
    if [[ -n "$keywords" ]]; then
        decisions+=("knowledge-lookup:$keywords")
    fi
    
    # 步驟 5: 原有維護決策
    local memory_state=$(detect_memory_dirty)
    local qmd_state=$(detect_qmd_stale)
    
    [[ "$memory_state" == "dirty" ]] && decisions+=("nightly-sync")
    [[ "$qmd_state" == "stale" ]] && decisions+=("rebuild-qmd")
    
    # 輸出決策結果
    echo "DECISIONS: ${decisions[*]}"
    echo "FINGERPRINT: $fingerprint"
    echo "SKILL: $skill"
    
    for msg in "${messages[@]}"; do
        echo "MSG: $msg"
    done
}

# ============================================
# 輔助函數
# ============================================

detect_memory_dirty() {
    local last_sync_file="${WORKSPACE}/.last-memory-sync"
    [[ ! -f "$last_sync_file" ]] && echo "dirty" && return
    
    local last_sync=$(stat -f %m "$last_sync_file" 2>/dev/null || stat -c %Y "$last_sync_file" 2>/dev/null || echo 0)
    local hours_since=$(( ($(date +%s) - last_sync) / 3600 ))
    [[ $hours_since -gt 6 ]] && echo "dirty" || echo "clean"
}

detect_qmd_stale() {
    local last_index="${WORKSPACE}/.qmd-last-index"
    [[ ! -f "$last_index" ]] && echo "stale" && return
    
    local last_time=$(stat -f %m "$last_index" 2>/dev/null || stat -c %Y "$last_index" 2>/dev/null || echo 0)
    local hours_since=$(( ($(date +%s) - last_time) / 3600 ))
    [[ $hours_since -gt 12 ]] && echo "stale" || echo "fresh"
}

# ============================================
# 執行模組
# ============================================

execute_decision() {
    local decision="$1"
    local user_input="${2:-}"
    
    case "$decision" in
        "reload-knowledge")
            echo "🗺️ 重新載入知識庫索引..."
            ;;
            
        skill-lookup:*)
            local skill=$(echo "$decision" | cut -d':' -f2)
            if skill_experience_lookup "$skill"; then
                return 0
            else
                echo "📝 無 $skill 技能經驗，本次執行後可記錄"
            fi
            ;;
            
        knowledge-lookup:*)
            local kw=$(echo "$decision" | cut -d':' -f2)
            knowledge_base_lookup "$kw" || echo "📭 知識庫無相關記錄"
            ;;
            
        "nightly-sync")
            log "執行記憶同步"
            bash "${WORKSPACE}/../openclaw任務面版設計/scripts/nightly-memory-sync.sh" 2>/dev/null || true
            touch "${WORKSPACE}/.last-memory-sync"
            ;;
            
        "rebuild-qmd")
            log "重建 QMD 索引"
            qmd collection update docs 2>/dev/null || true
            qmd collection update memory 2>/dev/null || true
            touch "${WORKSPACE}/.qmd-last-index"
            ;;
    esac
}

# ============================================
# 主程式
# ============================================

main() {
    local user_input="${1:-}"
    
    echo "🧠 Auto-Skill v2.0 決策引擎"
    echo "═══════════════════════════════════════"
    
    if [[ -z "$user_input" ]]; then
        echo "用法: $0 '<用戶輸入>'"
        echo "或: $0 status"
        exit 1
    fi
    
    log "輸入: $user_input"
    
    # 執行決策
    local decision_output=$(make_decision_v2 "$user_input")
    
    # 解析決策
    local decisions=$(echo "$decision_output" | grep "^DECISIONS:" | cut -d' ' -f2-)
    local fingerprint=$(echo "$decision_output" | grep "^FINGERPRINT:" | cut -d':' -f2)
    local skill=$(echo "$decision_output" | grep "^SKILL:" | cut -d':' -f2)
    
    echo ""
    echo "📊 分析結果"
    echo "───────────────────────────────────────"
    echo "  指紋: $fingerprint"
    echo "  偵測技能: ${skill:-無}"
    echo "  決策: $decisions"
    echo "───────────────────────────────────────"
    
    # 執行每個決策
    echo ""
    # 先執行技能查詢和知識庫查詢
    for d in ${=decisions}; do
        [[ -n "$d" ]] || continue
        # 跳過維護類決策
        [[ "$d" == "nightly-sync" ]] && continue
        [[ "$d" == "rebuild-qmd" ]] && continue
        [[ "$d" == "reload-knowledge" ]] && continue
        execute_decision "$d" "$user_input"
    done
    
    # 如果偵測到技能，建議記錄（只在互動模式）
    if [[ -n "$skill" && -t 0 ]]; then
        echo ""
        read -q "?💡 是否要為 $skill 技能建立經驗記錄？(y/n) " confirm
        echo ""
        if [[ "$confirm" == "y" ]]; then
            suggest_experience_capture "$user_input" "$skill"
        fi
    elif [[ -n "$skill" ]]; then
        echo ""
        echo -e "${YELLOW}💡 偵測到 $skill 技能，可執行以下指令記錄經驗:${NC}"
        echo "   auto-skill-v2.sh capture 你的經驗描述"
    fi
    
    echo ""
    echo -e "${GREEN}✅ Auto-Skill 執行完成${NC}"
    log "完成"
}

case "${1:-}" in
    "status")
        echo "指紋庫: $(ls ${AUTO_SKILL_DIR}/.last-fingerprint 2>/dev/null && echo '有' || echo '無')"
        echo "知識庫: $(ls ${KNOWLEDGE_DIR}/*.md 2>/dev/null | wc -l) 個檔案"
        echo "技能經驗: $(ls ${EXPERIENCE_DIR}/*.md 2>/dev/null | wc -l) 個檔案"
        echo "Memory: $(detect_memory_dirty)"
        echo "QMD: $(detect_qmd_stale)"
        ;;
    "capture")
        # 手動記錄模式
        shift
        suggest_experience_capture "$*" "manual"
        ;;
    *)
        main "$*"
        ;;
esac
