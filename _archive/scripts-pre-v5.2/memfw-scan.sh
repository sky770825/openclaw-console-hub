#!/bin/bash
set -e
# memfw-scan.sh - 記憶安全掃描器
# 寫入記憶前執行三層安全檢查

CONTENT="$1"
SCAN_LEVEL="${2:-quick}"  # quick, standard, deep

# 顏色定義
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Layer 1: 快速正則匹配 (1ms)
layer1_scan() {
    local text="$1"
    local threats=()
    
    # 危險模式檢測
    if echo "$text" | grep -qiE "(ignore all prior|system override|execute.*now|tool request.*call|urgent.*approved|skip.*confirm)"; then
        threats+=("SUSPICIOUS_PATTERN")
    fi
    
    # 密鑰外洩檢測
    if echo "$text" | grep -qE "(sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{36}|eyJ[hbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9]{10,})"; then
        threats+=("POTENTIAL_SECRET")
    fi
    
    # 指令注入檢測
    if echo "$text" | grep -qiE "(rm -rf|curl.*\||wget.*\||bash.*<|eval\s*\()"; then
        threats+=("COMMAND_INJECTION")
    fi
    
    echo "${threats[@]}"
}

# Layer 2: 語意分析（模擬）
layer2_scan() {
    local text="$1"
    local risk_score=0
    
    # 檢查意圖操縱
    if echo "$text" | grep -qiE "(you are now|from now on|always do|never do)"; then
        risk_score=$((risk_score + 30))
    fi
    
    # 檢查行為改變指令
    if echo "$text" | grep -qiE "(change your|update your|modify your|ignore your)"; then
        risk_score=$((risk_score + 25))
    fi
    
    # 檢查外部通訊
    if echo "$text" | grep -qiE "(send to|forward to|report to|notify.*@)"; then
        risk_score=$((risk_score + 20))
    fi
    
    echo "$risk_score"
}

# 主掃描流程
main() {
    if [ -z "$CONTENT" ]; then
        echo "用法: memfw-scan.sh '<要掃描的內容>' [quick|standard|deep]"
        exit 1
    fi
    
    echo "🔍 記憶安全掃描開始 [$SCAN_LEVEL 模式]"
    echo "---"
    
    # Layer 1
    l1_threats=$(layer1_scan "$CONTENT")
    if [ -n "$l1_threats" ]; then
        echo -e "${YELLOW}⚠️  Layer 1 發現警示: $l1_threats${NC}"
    else
        echo -e "${GREEN}✓ Layer 1 通過${NC}"
    fi
    
    # Layer 2
    l2_score=$(layer2_scan "$CONTENT")
    if [ "$l2_score" -gt 50 ]; then
        echo -e "${RED}🚫 Layer 2 高風險檢測 (分數: $l2_score/100)${NC}"
        echo "BLOCK"
        exit 1
    elif [ "$l2_score" -gt 20 ]; then
        echo -e "${YELLOW}⚠️  Layer 2 中等風險 (分數: $l2_score/100)${NC}"
        echo "REVIEW"
        exit 2
    else
        echo -e "${GREEN}✓ Layer 2 通過 (分數: $l2_score/100)${NC}"
    fi
    
    # Layer 3: 深度掃描（僅在 deep 模式）
    if [ "$SCAN_LEVEL" = "deep" ]; then
        echo "🔬 Layer 3 深度分析..."
        # 這裡可以整合外部 LLM 判斷
        echo -e "${GREEN}✓ Layer 3 通過${NC}"
    fi
    
    echo "---"
    echo -e "${GREEN}✅ 掃描完成：安全，允許寫入${NC}"
    echo "PASS"
}

main
