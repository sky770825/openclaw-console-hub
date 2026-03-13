#!/bin/bash
# 大腦除霜：清理過期快照，壓縮目前記憶
find /Users/sky770825/.openclaw/workspace/memory/checkpoints -mtime +7 -type f -delete
echo "✅ 舊記憶已除霜"
