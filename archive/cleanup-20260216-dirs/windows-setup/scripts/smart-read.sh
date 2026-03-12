#!/bin/zsh
# Smart Read Pipeline v2 - 智慧讀取流程
# 結合 qmd + sed 實現精準 Token 控制

set -euo pipefail

WORKSPACE="${HOME}/.openclaw/workspace"
QUERY="${1:-}"
COLLECTION="${2:-memory}"

if [[ -z "$QUERY" ]]; then
    echo "用法: smart-read.sh '<查詢內容>' [collection名稱]"
    echo "範例: smart-read.sh 'Codex IO閉環' memory"
    exit 1
fi

echo "🔍 智慧讀取: '$QUERY' (from $COLLECTION)"
echo "═══════════════════════════════════════"

# Step 1: 用 qmd 找到相關檔案
qmd_results=$(qmd search "$QUERY" --collection "$COLLECTION" 2>/dev/null | head -30)

if [[ -z "$qmd_results" ]]; then
    echo "❌ 未找到相關內容"
    exit 1
fi

# Step 2: 解析 qmd 輸出並提取片段
# 格式: qmd://collection/path:line:hash

# 使用臨時檔案避免 subshell 問題
tmp_file=$(mktemp)
echo "$qmd_results" > "$tmp_file"

# 處理每一行
while IFS= read -r line; do
    # 跳過標題行和空行
    [[ -z "$line" ]] && continue
    [[ "$line" =~ ^Title: ]] && continue
    [[ "$line" =~ ^Score: ]] && continue
    [[ "$line" =~ ^@@ ]] && continue
    
    # 解析檔案路徑和行號（格式: qmd://collection/path:line #hash）
    if [[ "$line" =~ ^qmd://([^/]+)/(.+):([0-9]+)[[:space:]]+# ]]; then
        # zsh 使用 match 陣列
        coll_name="${match[1]}"
        rel_path="${match[2]}"
        match_line="${match[3]}"
        
        # 根據 collection 名稱決定 base 路徑
        if [[ "$coll_name" == "memory" ]]; then
            file_path="${WORKSPACE}/memory/${rel_path}"
        elif [[ "$coll_name" == "docs" ]]; then
            file_path="${WORKSPACE}/docs/${rel_path}"
        else
            file_path="${WORKSPACE}/${rel_path}"
        fi
        
        # 計算上下文範圍（前後各 8 行）
        start=$((match_line - 8))
        [[ $start -lt 1 ]] && start=1
        end=$((match_line + 8))
        
        echo ""
        echo "📄 $rel_path (行 $match_line 附近)"
        echo "───────────────────────────────────────"
        
        # 使用 sed 提取片段
        if [[ -f "$file_path" ]]; then
            sed -n "${start},${end}p" "$file_path" 2>/dev/null || echo "[無法讀取]"
        else
            echo "[檔案不存在: $file_path]"
        fi
        
        echo "───────────────────────────────────────"
    fi
done < "$tmp_file"

rm -f "$tmp_file"

echo ""
echo "✅ 智慧讀取完成 (使用 qmd + sed 切片)"
echo ""
echo "💡 Token 節省: 只讀取相關片段，而非整個檔案"
