# Notion 深度整合計畫 - 第一階段：環境分析與基礎架構

## 1. Notion 資料庫設計方案 (建議模板)

### A. 行程豐富化資料庫 (Calendar/Timeline View)
*   **名稱**: `OpenClaw Timeline`
*   **屬性**:
    *   `Name` (Title): 事件名稱 (例如: [完成] 任務 A)
    *   `Date` (Date): 發生時間
    *   `Type` (Select): 類別 (Task / Reflection / Event / Alert)
    *   `Priority` (Select): 優先級 (P0 / P1 / P2)
    *   `Link` (URL): 相關文件連結 (指向 OpenClaw RESULT.md 或外部連結)
    *   `Summary` (Rich Text): 簡短摘要

### B. 常用連結管理資料庫 (Gallery/Table View)
*   **名稱**: `OpenClaw Knowledge Links`
*   **屬性**:
    *   `Title` (Title): 連結標題
    *   `URL` (URL): 網址
    *   `Category` (Multi-select): 標籤 (Tool / AI / Dev / Social)
    *   `Last Accessed` (Date): 最後訪問時間
    *   `Description` (Rich Text): 說明

### C. Notebook LM 展示區 (Board View)
*   **名稱**: `Notebook LM Insights`
*   **屬性**:
    *   `Topic` (Title): 主題
    *   `Date` (Date): 產出日期
    *   `Format` (Select): 格式 (Summary / Card / Research)
    *   `Content` (Rich Text/Block): AI 產出的核心內容
    *   `Actionable` (Checkbox): 是否需要後續行動

## 2. 工具開發規劃

*   **腳本名稱**: `scripts/notion-sync.sh`
*   **功能**:
    *   `add-event`: 新增行程事件
    *   `add-link`: 新增連結
    *   `query-link`: 關鍵字搜尋連結
    *   `post-insight`: 發布 Notebook LM 產出
*   **認證**: 使用 `~/.openclaw/secrets/notion.env` (NOTION_API_KEY, NOTION_DATABASE_ID_XXX)

## 3. 自動化工作流 (n8n)
*   建立 `OpenClaw to Notion` Webhook。
*   OpenClaw 腳本呼叫 Webhook 或直接打 Notion API。

## 4. 下一步行動
1. 請老蔡提供 Notion API Key 並建立上述資料庫。 (或由我代為產生架構說明讓老蔡操作)
2. 撰寫核心 API 調用腳本。
3. 整合至 `oc.sh`。
