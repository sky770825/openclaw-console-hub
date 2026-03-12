# Cookbook 30: 外部情報SOP

> 當需要從外部網路（Internet）獲取未知資訊時，啟動此標準作業流程。

## 流程

### 1. 寬泛搜尋 (Broad Scan)
- 目標：快速了解領域全貌，找到關鍵術語。
- 工具：web_search
- 方法：使用 1-2 個核心關鍵字進行搜尋，例如 Clawhub api。
- 產出：對問題領域的初步理解、幾個潛在的精準關鍵字或實體名稱。

### 2. 精準搜尋 (Precise Scan)
- 目標：利用第一步找到的關鍵術語，鎖定具體目標。
- 工具：web_search
- 方法：使用更長的搜尋詞、引號、site: 等進階語法，例如 site:github.com/openclaw/clawhub "clawhub.ai/api/v1"。
- 產出：指向具體文件、程式碼片段、API 端點或官方文檔的連結。

### 3. 關聯搜尋 (Relational Scan)
- 目標：如果精準搜尋失敗，尋找「誰在使用它」或「誰在討論它」。
- 工具：web_search
- 方法：搜尋「整合 {目標關鍵字}」或「{目標關鍵字} tutorial」，從側面找到使用範例。就像這次，從 LobeHub 找到 Clawhub 的用法。
- 產出：第三方範例、教學文章、論壇討論。

### 4. API 驗證 (API Validation)
- 目標：直接驗證找到的 API 端點是否有效。
- 工具：proxy_fetch (優先) 或 run_script (使用 curl)
- 方法：直接呼叫 API。如果 proxy_fetch 因白名單失敗，這是一個明確信號。
- 產出：成功的 API 回應，或一個明確的失敗信號（如 403, 404, 白名單阻擋）。

### 5. 派工執行 (Delegate & Execute)
- 目標：當我（指揮官）的能力邊界到達時（如白名單限制），將任務交給有權限的執行者。
- 工具：create_task
- 方法：清晰地描述任務目標（做什麼）、工具（用 curl）、輸入（API URL）、預期輸出（存成什麼檔案）。
- 產出：一個進入 draft 狀態的任務，等待統帥批准。