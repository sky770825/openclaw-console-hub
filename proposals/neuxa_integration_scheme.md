# NEUXA 星群架構整合方案：LangGraph + CrewAI

## 整合思路
建議採用 **「LangGraph 為骨幹，CrewAI 為執行單元」** 的混合架構。

### 方案架構 (Hybrid Orchestration)：
1.  **NEUXA Orchestrator (LangGraph 層)：**
    - 負責星群的整體生命週期管理。
    - 使用 LangGraph 定義大任務的階段 (例如：需求分析 -> 方案設計 -> 執行 -> 審核)。
    - 處理「人工審核」節點與「異常回滾」邏輯。
2.  **NEUXA Teams (CrewAI 層)：**
    - 在 LangGraph 的特定節點中，調用一個 CrewAI 實例。
    - 例如：「執行」節點內部由一個包含「研究員」與「撰稿者」的 CrewAI Team 負責。
3.  **品質保證 (QA Suite)：**
    - 引入 CrewAI 的測試機制，在 Agent 實際上線前，於 Sandbox 環境進行 `crew.test()`，生成的測試報告回傳至 NEUXA 任務面板。

## 可行性評估
- **優點：** 結合了 LangGraph 的穩定控制流與 CrewAI 的高效協作及測試能力。
- **挑戰：** 需統一兩者的狀態傳遞格式 (State Schema Conversion)。
- **技術路徑：**
    - 第一階段：建立基於 LangGraph 的基本 Mission Workflow。
    - 第二階段：封裝 CrewAI 作為 LangGraph 的 Node。
    - 第三階段：整合 CrewAI 測試結果至 NEUXA 前端監控面板。

