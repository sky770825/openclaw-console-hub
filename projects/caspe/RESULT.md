# 情境感知安全策略執行 (CASPE) Agent 原型研究報告

## 1. 理論概述 (Theoretical Overview)

情境感知安全 (Context-Aware Security) 是一種安全範式，它主張安全決策應基於環境的動態屬性（Context）而非法定靜態規則。在 Agentic Workflow（代理工作流）中，CASPE Agent 扮演「安全審查官」的角色，確保 AI 代理在操作系統資源、調用 API 或處理數據時，始終符合既定的安全邊界。

### 核心要素：
- **實體 (Entity)**：系統中的組件（服務、資料庫、外部 API）。
- **情境 (Context)**：
    - **位置情境**：內部網路 vs 外部網路。
    - **數據情境**：PII (個人隱私資訊)、Secrets、公開數據。
    - **傳輸情境**：加密協定 (TLS/HTTPS) vs 明文 (HTTP/FTP)。
- **策略 (Policy)**：定義在特定情境下允許或禁止的行為。

## 2. 策略表示設計 (Policy Representation)

我們設計了一種結構化、可機讀的 YAML 格式來表示高層次策略。

### 策略類別：
- **DataFlow**：控管敏感數據的流動路徑與加密要求。
- **AccessControl**：控管服務間的白名單調用權限。
- **Implementation**（原型擴展方向）：檢查程式碼實作是否包含必要的日誌或安全檢查。

### 範例 (YAML):
```yaml
policies:
  - id: P-001
    name: "PII Data Isolation"
    type: DataFlow
    context:
      source_tag: "internal"
      destination_tag: "external"
    rules:
      - action: DENY
        data_type: "user-email"
        condition: "is_encrypted == false"
```

## 3. 原型實作細節 (Prototype Implementation)

原型包含以下核心模組：

### A. 系統架構分析模組 (Architecture Analysis)
- 使用 `system_graph.json` 定義系統節點 (Nodes) 與連線 (Edges)。
- 節點包含標籤 (tags)，如 `internal`, `external`, `sensitive`。
- 連線包含協定 (protocol) 與傳輸數據 (data)。

### B. CASPE Agent 核心邏輯
- **解析器**：加載 YAML 策略與 JSON 系統圖。
- **分析引擎**：
    - 遍歷所有網路連線，匹配 `DataFlow` 策略中的標籤與數據類型。
    - 檢查連線屬性（如協定）是否滿足策略中的條件 (Condition)。
    - 執行 `AccessControl` 的白名單檢查，識別非授權的跨服務調用。

### C. 策略與程式碼映射 (Mapping)
- 原型通過將「系統圖中的邊 (Edge)」視為「程式碼中的網路請求/函數調用」來實現映射。
- 當發現違規時，Agent 能精確定位源頭 (Source) 與目標 (Target)，並給出具體的建議 (Suggestion)。

## 4. 測試結果 (Test Results)

我們設計了一個模擬系統，包含一個違規情境：`data-service`（內部、敏感）透過不安全的 `http` 將 `user-email` 傳送到 `external-log-aggregator`（外部）。

### 檢測結果：
1. **DataFlow 違規**：偵測到敏感數據 `user-email` 在未加密的情境下流向外部。
2. **AccessControl 違規**：偵測到 `data-service` 呼叫了未在允許清單中的 `external-log-aggregator`。

**輸出片段：**
> [!] DataFlow Violation (Policy: P-001)
> Message: Sensitive data 'user-email' flowing from data-service to external-log-aggregator over unencrypted http
> Suggestion: Enforce HTTPS/TLS for the connection between data-service and external-log-aggregator

## 5. 未來展望 (Future Outlook)

- **動態追蹤**：結合 eBPF 或 Service Mesh (Istio) 即時捕獲實際流量，而非僅分析靜態圖。
- **自動修正 (Auto-Remediation)**：CASPE Agent 可與 CI/CD 整合，自動生成 PR 修改 `docker-compose` 或 `deployment.yaml` 中的環境變數。
- **程式碼級掃描**：整合 AST (Abstract Syntax Tree) 分析，檢查程式碼中是否確實調用了安全套件。
- **LLM 增強策略解析**：允許管理員使用自然語言描述安全意圖，由 LLM 轉換為結構化 CASPE 策略。

---
**執行者**：L2 Claude Code (OpenClaw CASPE Prototype Task Force)
**日期**：2026-02-17
