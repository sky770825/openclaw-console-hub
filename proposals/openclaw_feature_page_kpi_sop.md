# OpenClaw 官網功能特色頁面 KPI 數據追蹤 SOP (建議草案)

## 1. 目標頁面與 KPI 指標
根據專案掃描結果，核心目標為「功能特色頁 (Feature Page)」。

### 核心 KPI (Key Performance Indicators)
- **點擊率 (CTR):** 功能區塊中的「開始使用」或「立即體驗」按鈕點擊次數。
- **捲動深度 (Scroll Depth):** 使用者閱讀功能說明的完整程度（25%, 50%, 75%, 100%）。
- **互動率 (Engagement):** 特定功能展示組件（如：Demo 影片、分頁切換）的點擊次數。
- **轉換率 (CVR):** 從功能頁跳轉至註冊/登入頁面的比率。

## 2. 埋點命名規範 (Tracking Naming Convention)
建議採用 `Category_Action_Label` 格式：
- Category: `feature_page`
- Action: `click`, `view`, `scroll`
- Label: 具體功能名稱 (例如: `automated_agent`, `task_executor`)

## 3. 現有基礎設施分析
- **偵測到的套件:** None found
- **現有追蹤點:** 

## 4. 實作建議
建議在 `src/utils/telemetry.ts` (若無則新建) 封裝統一的追蹤函式，避免業務代碼與追蹤邏輯強耦合。
