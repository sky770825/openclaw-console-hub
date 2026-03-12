#!/bin/bash
# Memory Vacuum Shell Fallback v1.0

WORKSPACE="${OPENCLAW_WORKSPACE:-$HOME/.openclaw/workspace}"
MEMORY_DIR="$WORKSPACE/memory"
ARCHIVE_DIR="$MEMORY_DIR/archive"
INDEX_FILE="$WORKSPACE/memory_index.json"
REPORT_FILE="$MEMORY_DIR/vacuum_report.json"

mkdir -p "$ARCHIVE_DIR"

echo "=== Memory Vacuum System (Shell Mode) ==="
deleted_count=0

# 功能 A: 掃描重複與低價值 (這裡簡單實現：檢查大小與重複 md5)
declare -A seen_hashes

for f in "$MEMORY_DIR"/*.md; do
    [ -e "$f" ] || continue
    [ -d "$f" ] && continue
    filename=$(basename "$f")
    
    # 跳過已歸檔
    [[ "$f" == *"archive"* ]] && continue
    
    # 檢查大小 (低價值：小於 20 bytes)
    size=$(wc -c < "$f" | tr -d '[:space:]')
    if [ "$size" -lt 20 ]; then
        echo "🗑️ 標記低價值檔案 (過短): $filename"
        mv "$f" "$ARCHIVE_DIR/"
        ((deleted_count++))
        continue
    fi
    
    # 檢查重複
    file_hash=$(md5 -q "$f")
    if [[ -n "${seen_hashes[$file_hash]}" ]]; then
        echo "🗑️ 發現重複內容: $filename (與 ${seen_hashes[$file_hash]} 重複)"
        mv "$f" "$ARCHIVE_DIR/"
        ((deleted_count++))
    else
        seen_hashes[$file_hash]="$filename"
    fi
done

echo "✅ 掃描完成。清理了 $deleted_count 個項目。"

# 功能 C: 清理過時索引條目 (Shell 模式下僅檢查 INDEX_FILE 是否存在)
cleaned_indices=0
if [ -f "$INDEX_FILE" ]; then
    echo "🧹 檢測到索引檔案，請求重新建立以清理過時條目。"
    # 由於 python 不可用，我們這裡只能標記需要清理
    cleaned_indices="requires_rebuild"
else
    echo "ℹ️ 索引檔案不存在。"
fi

# 功能 B: 重新向量化
reindexed="skipped_python_issue"
echo "⚠️ 系統 Python 受限 (Xcode License)，跳過高品質向量化。"

# 寫入報告
cat << EOR > "$REPORT_FILE"
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "deleted_files": $deleted_count,
  "cleaned_indices": "$cleaned_indices",
  "reindexed": "$reindexed",
  "mode": "shell_fallback"
}
EOR

echo "=== Vacuum Completed ==="
