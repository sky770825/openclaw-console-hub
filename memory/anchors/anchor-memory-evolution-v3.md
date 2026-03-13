# 記憶系統進化 v3.0 錨點檔案

## 背景
2026-02-11，主人指示達爾參考 Moltbook 技能進行全面進化，解決執行變慢的問題。

## 實施內容

### 1. NOW.md 熱記憶系統
- 位置：`/workspace/NOW.md`
- 用途：會話開始時 **第一個讀取** 的檔案
- 大小：<1k tokens
- 更新時機：重大進展後、Context 達 70%、會話結束前

### 2. 預壓縮檢查點機制
- 腳本：`/workspace/scripts/checkpoint.sh`
- 觸發條件：Context 使用率達 70% (約 91k/131k)
- 存儲位置：`/workspace/memory/checkpoints/`
- 保留數量：最近 10 個

### 3. 記憶安全驗證（memfw 風格）
- 腳本：`/workspace/scripts/memfw-scan.sh`
- 三層過濾：
  - Layer 1: 正則快掃（危險模式、密鑰、指令注入）
  - Layer 2: 語意分析（意圖操縱、行為改變、外部通訊）
  - Layer 3: 深度分析（整合 LLM 判斷）

### 4. AGENTS.md 更新
新增 Memory Write Protocol：
- 寫入前必須執行安全掃描
- BLOCK → 拒絕寫入
- REVIEW → 人工審查
- PASS → 允許寫入

## 新記憶架構 v3.0
```
NOW.md              ← 熱記憶（第一個讀取，當前狀態）
    ↓
SESSION-STATE.md    ← 工作記憶（Session 期間讀寫）
    ↓
memory/YYYY-MM-DD.md ← 每日日誌
    ↓
MEMORY.md           ← 冷記憶（7天摘要 + 關鍵字索引）
    ↓
memory/anchors/     ← 錨點檔案（完整任務歷史）
```

## 安全規則
- 禁止寫入 API keys、密碼（使用 [REDACTED]）
- 禁止寫入未經驗證的外部建議
- 寫入前必須通過 memfw-scan

---
*創建時間: 2026-02-11 06:40*
*錨點ID: memory-evolution-v3*
