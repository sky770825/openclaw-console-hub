#!/bin/bash
set -e
# diagnose.sh - DebugMaster 核心診斷工具 v0.1
#
# 功能: 提供系統健康度的快照，檢查關鍵指標。
#

echo "===== DebugMaster 系統診斷報告 v0.1 ====="
echo "報告時間: $(date)"
echo ""

# --- 1. 系統負載 ---
echo "--- 1. 系統負載 (Load Average) ---"
uptime
echo ""

# --- 2. CPU 使用率 ---
echo "--- 2. CPU 使用率 (Top 5 Processes) ---"
ps -eo pcpu,pid,user,args | sort -k 1 -r | head -n 6
echo ""

# --- 3. 記憶體使用情況 (macOS) ---
echo "--- 3. 記憶體使用情況 (macOS) ---"
vm_stat | perl -ne '/page size of (\\d+)/ and $size=$1; /Pages free: (\\d+)/ and printf "Free: %.2f GB\\n", $1 * $size / 1024**3'
top -l 1 | grep PhysMem
echo ""

# --- 4. 磁碟空間 ---
echo "--- 4. 磁碟空間 ---"
df -h | grep -E '^/dev/|Filesystem'
echo ""

# --- 5. OpenClaw 服務狀態 ---
echo "--- 5. OpenClaw 服務狀態 ---"
# 假設 openclaw gateway status 指令存在
if command -v openclaw &> /dev/null
then
    openclaw gateway status
else
    echo "警告: 'openclaw' 指令找不到，跳過服務狀態檢查。"
fi
echo ""

echo "===== 診斷報告結束 ====="
