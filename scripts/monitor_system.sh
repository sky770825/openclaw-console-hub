#!/bin/bash
echo "--- 系統負載監控 ---"
uptime
echo "--- 記憶體使用情況 ---"
vm_stat | perl -ne '/page size of (\d+) bytes/ && ($s=$1); /Pages (\w+): +(\d+)./ && printf("%-15s %10.2f MB\n", $1, $2*$s/1048576);'
echo "--- 磁碟空間 ---"
df -h /Users/sky770825/
