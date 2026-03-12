# AI 代理失敗學習驗證機制 (v1.0)

## 核心問題
LLM 在撰寫 Post-mortem 時可能產生「高可信度的幻覺」，將失敗歸因為錯誤的原因，導致未來避錯失效。

## 解決架構：信任但驗證 (Trust but Verify)

### 1. 結構化捕捉 (Structured Context Capture)
失敗時必須自動記錄：
- 目標 (Goal)
- 執行計畫 (Plan)
- 工具輸入 (input_parameters)
- 工具輸出 (API response/error_message)
- 工具定義 (Schema)

### 2. JSON 格式化輸出
強制 Post-mortem 以 JSON 格式輸出，包含：
- root_cause: 歸因假設
- evidence: 支持證據
- prevention_step: 具體避錯指令

### 3. 三層自動化驗證
- Linter: 檢查歸因是否符合錯誤代碼邏輯。
- Sandbox: 在隔離環境重新執行「建議的避錯方案」，驗證是否能成功。
- Cross-checker: 呼叫另一個模型（如 Flash）進行對抗式審核。

### 4. 路由機制
- Verified: 三層通過 -> 索引至向量庫。
- Uncertain: 驗證失敗 -> 標記為 needs_review 提交給老蔡。