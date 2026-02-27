#!/bin/bash
set -e

# context-audit.sh - 計算會話啟動 Context 大小
# 用法: ./scripts/context-audit.sh

WORKSPACE="/Users/caijunchang/.openclaw/workspace"
TOKEN_RATIO=1.3  # 1 word ≈ 1.3 tokens for 中英混合

echo "=========================================="
echo "  Context Audit Report"
echo "  (1 word ≈ ${TOKEN_RATIO} tokens)"
echo "=========================================="
echo ""

# 定義會話啟動必載檔案
FILES=(
    "$WORKSPACE/SOUL.md"
    "$WORKSPACE/USER.md"
    "$WORKSPACE/IDENTITY.md"
    "$WORKSPACE/NOW.md"
    "$WORKSPACE/MEMORY.md"
    "$WORKSPACE/AGENTS.md"
    "$WORKSPACE/SESSION-STATE.md"
    "$WORKSPACE/HEARTBEAT.md"
    "$WORKSPACE/TOOLS.md"
)

total_words=0
total_tokens=0

printf "%-30s %10s %10s\n" "File" "Words" "Tokens"
printf "%-30s %10s %10s\n" "----" "-----" "------"

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        words=$(wc -w < "$file" | tr -d ' ')
        tokens=$(echo "$words * $TOKEN_RATIO" | bc | cut -d. -f1)
        total_words=$((total_words + words))
        total_tokens=$((total_tokens + tokens))
        filename=$(basename "$file")
        printf "%-30s %10d %10d\n" "$filename" "$words" "$tokens"
    else
        filename=$(basename "$file")
        printf "%-30s %10s %10s\n" "$filename" "MISSING" "-"
    fi
done

echo ""
printf "%-30s %10s %10s\n" "----" "-----" "------"
printf "%-30s %10d %10d\n" "TOTAL" "$total_words" "$total_tokens"
echo ""
echo "Target: ~3,000 tokens"
echo "Status: $([ $total_tokens -le 3500 ] && echo "✅ PASS" || echo "⚠️  NEEDS OPTIMIZATION")"
echo "=========================================="
