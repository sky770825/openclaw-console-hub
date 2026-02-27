#!/bin/zsh
# MQ Wrapper - 檔案切片提取工具
# 如果 mq 未安裝，使用 sed/awk 替代方案

set -euo pipefail

# 檢查是否有安裝 mq
if command -v mq &> /dev/null; then
    # 使用原生 mq
    mq "$@"
else
    # 使用替代方案
    file="$1"
    shift
    
    # 解析參數
    local start_line=1
    local end_line=""
    local pattern=""
    
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --start|-s)
                start_line="$2"
                shift 2
                ;;
            --end|-e)
                end_line="$2"
                shift 2
                ;;
            --pattern|-p)
                pattern="$2"
                shift 2
                ;;
            *)
                shift
                ;;
        esac
    done
    
    # 如果沒有指定 end_line，默認提取 50 行
    if [[ -z "$end_line" ]]; then
        end_line=$((start_line + 49))
    fi
    
    # 使用 sed 提取指定行範圍
    if [[ -f "$file" ]]; then
        sed -n "${start_line},${end_line}p" "$file"
    else
        echo "錯誤: 檔案不存在 $file" >&2
        exit 1
    fi
fi
