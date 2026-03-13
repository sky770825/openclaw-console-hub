# 記憶反思任務配置草案

## 1. 執行時機與頻率 (Cron Configuration)

考慮到資源負載、Token 成本以及記憶更新的自然週期，建議採用「雙軌反思制」：

### A. 每日輕量回顧 (Daily Check-in)
- **頻率**：每天 23:30 (Asia/Taipei)
- **目的**：摘要當日進度，清理當日失敗任務。
- **負載控制**：使用本地模型 `qwen2.5:14b` 執行。
- **Cron 語法**：
  ```bash
  30 23 * * * /Users/sky770825/.openclaw/workspace/scripts/run-daily-reflection.sh
  ```

### B. 每週深度反思 (Weekly Retrospective)
- **頻率**：每週六 09:00 (Asia/Taipei)
- **目的**：跨任務關聯分析，修正系統架構與 SOP。
- **負載控制**：使用 `google/gemini-2.0-flash-thinking` 或 `claude-3-5-sonnet` 以獲得深度推理。
- **Cron 語法**：
  ```bash
  0 9 * * 6 /Users/sky770825/.openclaw/workspace/scripts/run-weekly-reflection.sh
  ```

---

## 2. 儲存架構 (Storage Architecture)

反思結果採取「層次化儲存」策略：

1.  **原始報告 (Raw Report)**：
    - 位置：`memory/results/REFLECTION-YYYY-MM-DD.md`
    - 內容：完整的推理過程與數據分析。
2.  **知識庫注入 (Knowledge Injection)**：
    - 如果反思產生了新的 SOP 或修正，需更新 `sop-知識庫/` 下的對應檔案。
3.  **冷記憶索引更新 (Memory Index Update)**：
    - 自動將反思中的「三大核心發現」摘要寫入 `MEMORY.md` 的 `Recent Summary` 區塊。

---

## 3. 智能召回對接方案 (Smart Recall Integration)

反思任務啟動時，系統將自動呼叫 `scripts/smart-recall-v2.py`：

- **查詢擴展策略**：
    - 關鍵詞 1：`"fail error blocked task root cause"`
    - 關鍵詞 2：`"successful pattern optimization strategy"`
    - 關鍵詞 3：`"knowledge gap missing documentation"`
- **召回範圍**：
    - `collection: memory_smart_chunks_v2` (bge-m3 向量庫)
    - `filter`: `date > current_date - period`
- **資訊提取**：
    - 僅提取 `payload.summary` 和 `payload.lesson_learned` 以節省 Token。

---

## 4. 實作腳本邏輯 (Conceptual Script)

`scripts/run-reflection.sh`：
1. 呼叫 `smart-recall-v2.py` 獲取過去 N 天的關鍵記憶。
2. 組合 `prompts/memory-reflection.md` 與召回內容。
3. `sessions_spawn` 一個子代理（L2 或本地高階模型）執行反思。
4. 子代理將結果寫入 `memory/results/` 並發送 Telegram 通知。
