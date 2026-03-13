# 達爾 (Xiao Cai) 大腦除霜機制 (Memory Cleanup & Snapshots) 

## 1. 核心記憶保護機制 (Core Memory Protection)
- **SOUL (核心人格)**: 儲存在 `soul.json`，包含價值觀、語氣、核心目標。此部分在 Context 組裝時優先級最高，不可被清理。
- **AGENTS (工具集)**: 儲存在 `agents.json`，定義目前可用的技術工具與調用規範。
- **保護策略**: 在每次發送 API 請求前，強制將 SOUL 與 AGENTS 置於 Context 最前端（System Instructions）。

## 2. 清理邏輯 (Cleanup Logic)
- **雜訊過濾**: 
    - 移除重複的 "Thinking..." 或進度提示。
    - 壓縮超過 3 輪以上的任務日誌（只保留 Summary）。
    - 刪除已完成且無後續依賴的臨時指令。
- **Context 閾值**: 當 Context 接近 20k (Flash 2.5k 之限制預警) 時，啟動自動裁切。

## 3. 快照機制 (Snapshot Mechanism)
- **觸發點**: 任務重大階段完成時、或檢測到「模型回覆出現幻覺/格式崩壞」時。
- **恢復點**: 恢復至上一個穩定的 `SNAPSHOT_ID`，拋棄受污染的緩存。

## 4. 具體實作邏輯
- `cleanup`: 使用 `jq` 過濾 JSON 格式的歷史對話。
- `snapshot`: 將當前對話狀態備份至 `/snapshots/` 目錄。
- `restore`: 重新加載指定快照並清空當前緩存。
