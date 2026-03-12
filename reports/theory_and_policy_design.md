# 理論研究與策略表示設計

## 1. 情境感知安全 (Context-Aware Security) 概述
情境感知安全強調「安全決策不應僅基於靜態規則，而應考慮動態環境」。
在本系統中，情境（Context）包含：
- **架構情境**：服務部署位置、依賴關係、網路拓撲。
- **數據情境**：數據敏感度（PII, Secrets）、流動方向。
- **執行情境**：程式碼實作方式、中介軟體配置。

## 2. 策略表示法 (CASPE Policy Design)
我們採用 YAML 格式來定義高層次策略，這對人類友好且易於機器解析。
策略將分為三個主要類別：
1. **DataFlow (數據流動)**：定義數據允許/禁止的移動路徑。
2. **AccessControl (訪問控制)**：定義服務間的調用權限。
3. **Implementation (實作規範)**：定義程式碼層面的安全要求（如：必須加密、必須記錄日誌）。

### 策略範例 (policy_schema.yaml)
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
        data_type: "PII"
        condition: "is_encrypted == false"

  - id: P-002
    name: "Service Call Authorization"
    type: AccessControl
    rules:
      - service: "frontend"
        can_call: ["api-gateway"]
      - service: "api-gateway"
        can_call: ["auth-service", "data-service"]

  - id: P-003
    name: "Logging Requirement"
    type: Implementation
    rules:
      - scope: "auth-service"
        required_function: "log_event"
        trigger: "login_attempt"
```
