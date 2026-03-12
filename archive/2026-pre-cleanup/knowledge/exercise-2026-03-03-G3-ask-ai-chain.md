# 練習 G-3：ask_ai 呼叫鏈追蹤

### 1. 指令解析層
檔案：server/src/telegram/action-handlers.ts  
函式：handleAskAI  
邏輯：從 AI 傳回的 JSON 中提取 model, prompt 與 context。根據 model 名稱（如 flash, pro, claude）決定路由。

### 2. 模型路由層
檔案：server/src/telegram/model-registry.ts (推測)  
邏輯：將簡短的模型別名對應到實際的 provider (Google/Anthropic/OpenRouter)。

### 3. API 請求層
檔案：server/src/executor-agents.ts 或內部封裝的 callLLM 函式  
邏輯：構造符合 Provider 規範的 HTTP 請求，並注入 API Key（來自環境變數或 KeyVault）。

### 4. 資料流總結
小蔡 JSON → handleAskAI → ModelRegistry → Provider API → 小蔡回傳。