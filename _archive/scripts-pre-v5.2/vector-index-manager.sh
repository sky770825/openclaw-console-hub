#!/bin/bash
# vector-index-manager.sh - 向量索引資料庫管理系統
# 解決：自動分類標籤、知識過期檢測、跨文件關聯

set -e

QDRANT_HOST="localhost"
QDRANT_PORT="6333"
COLLECTION="memory_smart_chunks"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$(dirname "$SCRIPT_DIR")"

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 檢查 Qdrant 狀態
check_qdrant() {
    if ! curl -s "http://${QDRANT_HOST}:${QDRANT_PORT}/collections" > /dev/null 2>&1; then
        log_error "Qdrant 未啟動，請先執行: docker start qdrant"
        exit 1
    fi
    log_success "Qdrant 連線正常"
}

# 顯示索引統計
show_stats() {
    log_info "索引資料庫統計:"
    
    # 總 chunk 數
    local total_chunks=$(curl -s "http://${QDRANT_HOST}:${QDRANT_PORT}/collections/${COLLECTION}" 2>/dev/null | \
        python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('result',{}).get('points_count',0))" 2>/dev/null || echo "0")
    
    echo "  - 總 Chunks: $total_chunks"
    
    # 各類別分布
    echo "  - 分類分布:"
    curl -s "http://${QDRANT_HOST}:${QDRANT_PORT}/collections/${COLLECTION}/points/scroll" \
        -X POST -H 'Content-Type: application/json' \
        -d '{"limit": 1000, "with_payload": true}' 2>/dev/null | \
        python3 -c "
import sys, json, collections
data = json.load(sys.stdin)
points = data.get('result', {}).get('points', [])
categories = [p.get('payload', {}).get('category', 'unknown') for p in points]
for cat, count in collections.Counter(categories).most_common(10):
    print(f'    • {cat}: {count}')
" 2>/dev/null || echo "    (無法取得統計)"
}

# 檢查過期知識（超過 180 天未更新）
check_expired() {
    log_info "檢查過期知識 (>180天未更新):"
    
    local cutoff_date=$(date -v-180d +%Y-%m-%d 2>/dev/null || date -d '180 days ago' +%Y-%m-%d)
    
    curl -s "http://${QDRANT_HOST}:${QDRANT_PORT}/collections/${COLLECTION}/points/scroll" \
        -X POST -H 'Content-Type: application/json' \
        -d "{\"limit\": 1000, \"filter\": {\"must\": [{\"key\": \"date\", \"range\": {\"lt\": \"$cutoff_date\"}}]}, \"with_payload\": true}" 2>/dev/null | \
        python3 -c "
import sys, json
data = json.load(sys.stdin)
points = data.get('result', {}).get('points', [])
if points:
    print(f'  發現 {len(points)} 個過期 chunks:')
    for p in points[:5]:
        payload = p.get('payload', {})
        print(f'    • {payload.get(\"file\", \"unknown\")} ({payload.get(\"date\", \"unknown\")})')
else:
    print('  ✅ 無過期知識')
" 2>/dev/null
}

# 建立跨文件關聯
build_relations() {
    log_info "建立跨文件關聯:"
    
    # 搜尋相似主題建立關聯
    local topics=("AI Agent" "成本優化" "自動化" "資料庫" "向量索引")
    
    for topic in "${topics[@]}"; do
        local count=$(curl -s "http://${QDRANT_HOST}:${QDRANT_PORT}/collections/${COLLECTION}/points/search" \
            -X POST -H 'Content-Type: application/json' \
            -d "{\"vector\": $(python3 -c "import sys; sys.path.insert(0, '${SCRIPT_DIR}'); from smart_recall import generate_query_vector; print(generate_query_vector('$topic'))" 2>/dev/null || echo '[]'), \"limit\": 5, \"score_threshold\": 0.8}" 2>/dev/null | \
            python3 -c "import sys,json; print(len(json.load(sys.stdin).get('result',[])))" 2>/dev/null || echo "0")
        echo "  • '$topic' 相關: $count chunks"
    done
}

# 重新索引指定目錄
reindex_dir() {
    local dir=$1
    local tag=$2
    
    log_info "重新索引目錄: $dir (標籤: $tag)"
    
    if [ -f "${SCRIPT_DIR}/smart-chunk-indexer.sh" ]; then
        bash "${SCRIPT_DIR}/smart-chunk-indexer.sh" --dir "$dir" --tag "$tag"
    else
        log_error "找不到 smart-chunk-indexer.sh"
        return 1
    fi
}

# 主選單
show_menu() {
    echo ""
    echo "=== 向量索引資料庫管理系統 ==="
    echo ""
    echo "1. 查看索引統計"
    echo "2. 檢查過期知識"
    echo "3. 建立跨文件關聯"
    echo "4. 重新索引 business 目錄"
    echo "5. 重新索引 tech 目錄"
    echo "6. 完整重建索引"
    echo "7. 健康檢查 (全部)"
    echo "q. 退出"
    echo ""
}

# 執行健康檢查
health_check() {
    log_info "執行完整健康檢查..."
    check_qdrant
    show_stats
    check_expired
    build_relations
    log_success "健康檢查完成"
}

# 主程式
main() {
    case "${1:-menu}" in
        stats)
            check_qdrant
            show_stats
            ;;
        expired)
            check_qdrant
            check_expired
            ;;
        relations)
            check_qdrant
            build_relations
            ;;
        reindex-business)
            reindex_dir "learning/business" "business"
            ;;
        reindex-tech)
            reindex_dir "learning/tech" "tech"
            ;;
        rebuild)
            log_warn "這將重建所有索引，可能需要數分鐘..."
            read -p "確定要繼續嗎? (y/N) " confirm
            if [[ $confirm == [yY] ]]; then
                reindex_dir "learning/business" "business"
                reindex_dir "learning/tech" "tech"
                reindex_dir "memory" "memory"
            fi
            ;;
        health)
            health_check
            ;;
        menu|*)
            while true; do
                show_menu
                read -p "請選擇操作: " choice
                case $choice in
                    1) show_stats ;;
                    2) check_expired ;;
                    3) build_relations ;;
                    4) reindex_dir "learning/business" "business" ;;
                    5) reindex_dir "learning/tech" "tech" ;;
                    6) 
                        log_warn "重建所有索引..."
                        reindex_dir "learning/business" "business"
                        reindex_dir "learning/tech" "tech"
                        ;;
                    7) health_check ;;
                    q|Q) exit 0 ;;
                    *) log_error "無效選項" ;;
                esac
                echo ""
                read -p "按 Enter 繼續..."
            done
            ;;
    esac
}

main "$@"
