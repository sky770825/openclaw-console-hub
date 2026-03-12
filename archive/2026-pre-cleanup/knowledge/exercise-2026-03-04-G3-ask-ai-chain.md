# 練習 G-3：ask_ai 呼叫鏈追蹤

### 1. 目標
追蹤 ask_ai 從接收指令到呼叫 Provider API 的完整呼叫鏈。

### 2. 呼叫鏈分析
- 入口: server/src/telegram/action-handlers.ts 中的 handleAskAI 函式。
- 分發: 根據 model 參數，從 server/src/telegram/model-registry.ts 取得對應的 provider 設定。
- 執行: 呼叫 server/src/telegram/ai-providers/ 下對應的類別（如 GeminiProvider 或 ClaudeProvider）執行 fetch 請求。

### 3. 結論
ActionHandler (解析參數) -> ModelRegistry (尋找 Provider) -> AIProvider (封裝 API 請求) -> 外部 LLM API。