# 小蔡搬家工具組

## 腳本位置
- 打包：/Users/caijunchang/.openclaw/workspace/scripts/pack-for-m3.sh
- 還原：/Users/caijunchang/.openclaw/workspace/scripts/unpack-on-m3.sh

## 功能
- *打包*：自動排除 node_modules, artifacts, browser 等垃圾，只保留 memory, knowledge, scripts, .env。
- *還原*：在 M3 新機上一鍵恢復 /Users/caijunchang/.openclaw 環境。

## 使用流程
1. 舊機跑 pack-for-m3.sh -> 產出 .tar.gz
2. 新機跑 unpack-on-m3.sh <tarball> -> 恢復靈魂