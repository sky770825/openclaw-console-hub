#!/bin/bash
# ============================================================================
# 知識庫深度研究腳本
# 用法: ./research.sh <知識庫名稱>
# 範例: ./research.sh devin-ai
# ============================================================================

KNOWLEDGE_DIR="$(cd "$(dirname "$0")" && pwd)"
TEMPLATE="$KNOWLEDGE_DIR/TEMPLATE.md"

# 所有知識庫清單
ALL_LIBS="devin-ai grok-4.1 gpt-5.2 gemini-vision auto-gpt salesforce-einstein sonnet-4.5 trivy"

get_product() {
    case "$1" in
        devin-ai) echo "Devin AI" ;;
        grok-4.1) echo "Grok 4.1" ;;
        gpt-5.2) echo "GPT-5.2" ;;
        gemini-vision) echo "Gemini 2.5 Pro/Flash" ;;
        auto-gpt) echo "AutoGPT" ;;
        salesforce-einstein) echo "Salesforce Einstein" ;;
        sonnet-4.5) echo "Claude Sonnet 4.5" ;;
        trivy) echo "Trivy" ;;
        *) echo "" ;;
    esac
}

get_topics() {
    case "$1" in
        devin-ai) echo "Upwork freelancer 案例、自主 coding agent、SWE-bench 13.86%、Cognition Labs 融資、定價" ;;
        grok-4.1) echo "xAI 架構、SuperCluster 訓練、benchmark 成績、X/Twitter 整合、API 定價" ;;
        gpt-5.2) echo "OpenAI 發布、Codex agent、benchmark 成績、API 定價、企業案例" ;;
        gemini-vision) echo "Google DeepMind、多模態能力、benchmark、API 定價、1M token context" ;;
        auto-gpt) echo "開源自主 agent、架構設計、使用步驟、限制與問題、社群生態" ;;
        salesforce-einstein) echo "AI CRM、Agentforce、企業案例、定價方案、與 OpenClaw 整合" ;;
        sonnet-4.5) echo "Anthropic、SWE-bench 成績、定價、與 Opus 比較、agentic coding" ;;
        trivy) echo "Aqua Security、容器掃描、SBOM、CI/CD 整合、使用步驟、與競品比較" ;;
        *) echo "" ;;
    esac
}

usage() {
    echo "============================================"
    echo "知識庫深度研究腳本"
    echo "============================================"
    echo ""
    echo "用法: $0 <知識庫名稱>"
    echo "      $0 all          # 顯示所有狀態"
    echo "      $0 verify <名稱> # 驗證品質"
    echo ""
    echo "可用的知識庫:"
    echo ""
    for key in $ALL_LIBS; do
        echo "  $key"
        echo "    產品: $(get_product "$key")"
        echo "    研究重點: $(get_topics "$key")"
        echo ""
    done
}

check_status() {
    echo "============================================"
    echo "知識庫完成狀態"
    echo "============================================"
    echo ""
    printf "%-22s %-8s %-10s %s\n" "知識庫" "檔案數" "總大小" "狀態"
    echo "--------------------------------------------------------------"
    for key in $ALL_LIBS; do
        dir="$KNOWLEDGE_DIR/$key"
        if [ -d "$dir" ]; then
            count=$(find "$dir" -type f | wc -l | tr -d ' ')
            size=$(du -sh "$dir" 2>/dev/null | cut -f1)
            v11="$dir/README-v1.1.md"
            if [ -f "$v11" ]; then
                bytes=$(wc -c < "$v11" | tr -d ' ')
                if [ "$bytes" -ge 5000 ]; then
                    status="✅ 完成 (${bytes}B)"
                else
                    status="⚠️ 太小 (${bytes}B)"
                fi
            else
                status="❌ 未開始"
            fi
        else
            count=0
            size="0B"
            status="❌ 目錄不存在"
        fi
        printf "%-22s %-8s %-10s %s\n" "$key" "$count" "$size" "$status"
    done
    echo ""

    # 也顯示已完成的 cursor-ai
    dir="$KNOWLEDGE_DIR/cursor-ai"
    v11="$dir/README-v1.1.md"
    if [ -f "$v11" ]; then
        bytes=$(wc -c < "$v11" | tr -d ' ')
        printf "%-22s %-8s %-10s %s\n" "cursor-ai" "$(find "$dir" -type f | wc -l | tr -d ' ')" "$(du -sh "$dir" 2>/dev/null | cut -f1)" "✅ 完成 (${bytes}B)"
    fi
    echo ""
}

create_research() {
    local name=$1
    local product=$(get_product "$name")
    local topics=$(get_topics "$name")

    if [ -z "$product" ]; then
        echo "❌ 未知的知識庫: $name"
        echo "執行 $0 查看可用清單"
        exit 1
    fi

    local dir="$KNOWLEDGE_DIR/$name"
    local output="$dir/README-v1.1.md"

    mkdir -p "$dir"

    if [ -f "$output" ]; then
        bytes=$(wc -c < "$output" | tr -d ' ')
        if [ "$bytes" -ge 5000 ]; then
            echo "⚠️ $output 已存在 (${bytes} bytes)，跳過"
            echo "如要重做，請先刪除: rm $output"
            exit 0
        fi
    fi

    cp "$TEMPLATE" "$output"
    sed -i '' "s/\[產品名稱\]/$product/g" "$output"

    echo "============================================"
    echo "📝 已建立: $output"
    echo "============================================"
    echo ""
    echo "產品: $product"
    echo "研究重點: $topics"
    echo ""
    echo "📋 在 Cursor Agent Mode 中貼上以下 prompt："
    echo ""
    echo "---"
    echo "研究 $product 並填寫 $output 這個模板。"
    echo "研究重點: $topics"
    echo "要求："
    echo "- 搜尋最新資料 (2025-2026)"
    echo "- 數據必須有來源 URL"
    echo "- 不要編造 benchmark 分數"
    echo "- 完成後 >= 5KB"
    echo "---"
    echo ""
    echo "完成後驗證: $0 verify $name"
}

verify() {
    local name=$1
    local file="$KNOWLEDGE_DIR/$name/README-v1.1.md"

    if [ ! -f "$file" ]; then
        echo "❌ $file 不存在"
        exit 1
    fi

    bytes=$(wc -c < "$file" | tr -d '[:space:]')
    lines=$(wc -l < "$file" | tr -d '[:space:]')
    tables=$(grep -c '|.*|.*|' "$file" 2>/dev/null | tr -d '[:space:]' || echo 0)
    urls=$(grep -cE 'https?://' "$file" 2>/dev/null | tr -d '[:space:]' || echo 0)
    placeholder=$(grep -c '\[.*名稱\]' "$file" 2>/dev/null | tr -d '[:space:]' || echo 0)

    echo "============================================"
    echo "驗證: $name"
    echo "============================================"
    echo ""
    echo "檔案大小: ${bytes} bytes $([ "$bytes" -ge 5000 ] && echo '✅' || echo '❌ 太小')"
    echo "行數: ${lines}"
    echo "表格行數: ${tables} $([ "$tables" -ge 5 ] && echo '✅' || echo '⚠️ 表格太少')"
    echo "來源 URL: ${urls} $([ "$urls" -ge 2 ] && echo '✅' || echo '⚠️ 來源不足')"
    echo "未填佔位符: ${placeholder} $([ "$placeholder" -eq 0 ] && echo '✅' || echo '❌ 還有未填項目')"
    echo ""

    if [ "$bytes" -ge 5000 ] && [ "$placeholder" -eq 0 ] && [ "$urls" -ge 2 ]; then
        echo "🎉 通過驗證！可以定版"
    else
        echo "⚠️ 未通過，請繼續補充"
    fi
}

# 主程式
case "${1:-}" in
    "")
        usage
        ;;
    "all"|"status")
        check_status
        ;;
    "verify")
        if [ -z "${2:-}" ]; then
            echo "用法: $0 verify <知識庫名稱>"
            exit 1
        fi
        verify "$2"
        ;;
    *)
        create_research "$1"
        ;;
esac
