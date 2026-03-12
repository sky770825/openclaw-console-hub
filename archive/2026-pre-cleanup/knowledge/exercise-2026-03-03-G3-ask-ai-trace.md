# 練習 G-3：ask_ai 呼叫鏈追蹤

### 1. 入口
- action-handlers.ts: handleAskAi 函式接收 ask_ai action。

### 2. 核心邏輯
- handleAskAi 內部呼叫 think 函式 (來自 xiaocai-think.ts)。

### 3. 模型路由
- think 函式根據 model 參數，從 model-registry.ts 中查找對應的 Provider。

### 4. 最終呼叫
- model-registry.ts 中的 getProviderForModel 函式會實例化具體的 AI 客戶端 (如 GoogleGenerativeAI)，並執行 API 請求。

### 結論
呼叫鏈：action-handlers.ts -> xiaocai-think.ts -> model-registry.ts -> 具體 AI Provider SDK。