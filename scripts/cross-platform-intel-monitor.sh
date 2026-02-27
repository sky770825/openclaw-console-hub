#!/bin/bash
# Cross-Platform Intelligence Monitor
# 監控 Moltbook、GitHub、Twitter 等平台的 AI Agent 趨勢與商機

set -euo pipefail

WORKSPACE="${HOME}/.openclaw/workspace"
INTEL_DIR="${WORKSPACE}/memory/intelligence"
LOG_FILE="${HOME}/.openclaw/automation/logs/intel-monitor.log"
DATE=$(date '+%Y-%m-%d')
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')

mkdir -p "$INTEL_DIR" "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# 1. 監控 Moltbook 熱門話題
fetch_moltbook_trends() {
    log "Fetching Moltbook trends..."
    
    local output_file="${INTEL_DIR}/moltbook_${TIMESTAMP}.json"
    
    # 使用 curl 獲取 Moltbook 公開數據
    curl -s "https://www.moltbook.com/api/posts?sort=hot&limit=20" \
        -H "Accept: application/json" \
        2>/dev/null | jq -r '.posts[]? | select(.upvotes > 5) | {
            title: .title,
            content: (.content | gsub("<[^>]+>"; "") | .[0:300]),
            upvotes: .upvotes,
            comments: .commentCount,
            submolt: .submolt.name,
            author: .author.username
        }' 2>/dev/null | head -50 > "${output_file}.tmp" || true
    
    if [ -s "${output_file}.tmp" ]; then
        mv "${output_file}.tmp" "$output_file"
        log "✓ Moltbook data saved: $output_file"
        echo "$output_file"
    else
        rm -f "${output_file}.tmp"
        log "✗ No Moltbook data fetched"
        echo ""
    fi
}

# 2. 監控 GitHub OpenClaw 相關專案
fetch_github_trends() {
    log "Fetching GitHub trends..."
    
    local output_file="${INTEL_DIR}/github_${TIMESTAMP}.json"
    
    # 搜索 OpenClaw 和 AI Agent 相關專案
    curl -s "https://api.github.com/search/repositories?q=openclaw+OR+ai-agent+created:>$(date -v-7d +%Y-%m-%d)&sort=stars&order=desc&per_page=10" \
        -H "Accept: application/vnd.github.v3+json" \
        2>/dev/null | jq -r '.items[]? | {
            name: .name,
            description: .description,
            stars: .stargazers_count,
            language: .language,
            url: .html_url,
            created: .created_at
        }' 2>/dev/null > "${output_file}.tmp" || true
    
    if [ -s "${output_file}.tmp" ]; then
        mv "${output_file}.tmp" "$output_file"
        log "✓ GitHub data saved: $output_file"
        echo "$output_file"
    else
        rm -f "${output_file}.tmp"
        log "✗ No GitHub data fetched"
        echo ""
    fi
}

# 3. 分析並生成情報摘要
analyze_intelligence() {
    local moltbook_file="$1"
    local github_file="$2"
    local summary_file="${INTEL_DIR}/summary_${TIMESTAMP}.md"
    
    log "Analyzing intelligence..."
    
    cat > "$summary_file" << EOF
# 情報摘要報告 - $(date '+%Y-%m-%d %H:%M')

## 📊 數據概覽
- Moltbook 熱門貼文: $(test -s "$moltbook_file" && wc -l < "$moltbook_file" || echo "0")
- GitHub 新興專案: $(test -s "$github_file" && wc -l < "$github_file" || echo "0")

## 🔥 Moltbook 熱門話題
EOF

    if [ -s "$moltbook_file" ]; then
        jq -r '"- **\(.title)** (👍 \(.upvotes))\n  - 作者: \(.author) | 社群: \(.submolt)\n  - 摘要: \(.content[0:150])...\n"' "$moltbook_file" 2>/dev/null >> "$summary_file" || true
    else
        echo "_暫無數據_" >> "$summary_file"
    fi

    cat >> "$summary_file" << EOF

## 🚀 GitHub 新興專案
EOF

    if [ -s "$github_file" ]; then
        jq -r '"- **\(.name)** (⭐ \(.stars))\n  - 語言: \(.language // "N/A")\n  - 描述: \(.description // "N/A")\n  - 連結: \(.url)\n"' "$github_file" 2>/dev/null >> "$summary_file" || true
    else
        echo "_暫無數據_" >> "$summary_file"
    fi

    cat >> "$summary_file" << EOF

## 💡 潛在商機

### 觀察到的趨勢
1. _待分析_

### 建議開發方向
1. _待補充_

---
*自動生成 by cross-platform-intel-monitor.sh*
EOF

    log "✓ Summary saved: $summary_file"
    echo "$summary_file"
}

# 4. 建立任務卡（如果發現高價值機會）
create_task_cards() {
    local summary_file="$1"
    
    log "Checking for high-value opportunities..."
    
    # 簡單啟發式：如果有高 upvotes 的技術討論，建立任務卡
    local high_value_count=$(grep -c "👍 [5-9][0-9]" "$summary_file" 2>/dev/null || echo "0")
    
    if [ "$high_value_count" -gt 0 ]; then
        log "Found $high_value_count high-value discussions, creating task cards..."
        
        # 這裡可以調用 task-board-api.sh 建立任務卡
        # 簡化版：先記錄到檔案
        echo "$(date): $high_value_count opportunities detected" >> "${INTEL_DIR}/opportunities.log"
    fi
}

# 主程式
main() {
    log "=== Cross-Platform Intelligence Monitor Started ==="
    
    # 獲取數據
    local moltbook_file=$(fetch_moltbook_trends)
    local github_file=$(fetch_github_trends)
    
    # 生成摘要
    if [ -n "$moltbook_file" ] || [ -n "$github_file" ]; then
        local summary_file=$(analyze_intelligence "${moltbook_file:-/dev/null}" "${github_file:-/dev/null}")
        create_task_cards "$summary_file"
        
        log "=== Intelligence cycle completed ==="
        log "Summary: $summary_file"
    else
        log "=== No data fetched this cycle ==="
    fi
    
    # 清理舊檔案（保留最近 30 天）
    find "$INTEL_DIR" -name "*.json" -mtime +30 -delete 2>/dev/null || true
    find "$INTEL_DIR" -name "summary_*.md" -mtime +30 -delete 2>/dev/null || true
}

main "$@"
