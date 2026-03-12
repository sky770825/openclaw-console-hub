# 33 — 治理與斷路器 (Governance & Circuit Breaker)

> 基於 server/src/governanceEngine.ts 與 riskClassifier.ts 的實作解析。這是 NEUXA 的自律神經系統。

---

## 一、斷路器機制 (Circuit Breaker)

為了防止系統在錯誤狀態下持續執行任務導致災難擴大，我們實作了標準的斷路器模式。

### 1. 狀態機

- Closed (正常)：任務正常執行。若連續失敗次數達到 failureThreshold (預設 5)，轉為 Open。
- Open (斷路)：拒絕所有新任務執行。持續 cooldownMs (預設 1 分鐘)。
- Half-Open (試探)：冷卻結束後進入此狀態。允許 halfOpenAllowance (預設 2) 個任務通過。若成功則轉回 Closed，若失敗則立刻轉回 Open 並重新冷卻。

### 2. 觸發條件

- 任務執行結果為 failed 或拋出未捕獲異常。
- 連續失敗計數器累加。
- 只要有一次成功，計數器歸零。

---

## 二、風險分級 (Risk Classification)

在任務執行前，riskClassifier.ts 會掃描任務名稱、描述與標籤，決定執行權限。

| 等級 | 定義 | 觸發關鍵字範例 | 審核機制 |
|---|---|---|---|
| Critical | 最高風險 | deploy, billing, secret, key, production | 必須老蔡親審 |
| Medium | 中度風險 | delete, remove, drop, auth, rollback | Claude 審慎執行 |
| Low | 一般風險 | (不含上述關鍵字的一般任務) | Claude 自動審核 |
| None | 無風險 | health, report, list, read, test | 自動通過 |

### 關鍵字邏輯

- 嚴格匹配：deploy, production 只要出現就 Critical。
- 上下文匹配：api key 只有在搭配 change, rotate 等動詞時才算 Critical，避免誤殺文件寫作任務。

---

## 三、治理最佳實踐

1. 遇到斷路怎麼辦？
   - 不要急著重試。先檢查最後幾次失敗的 log (read_file logs)。
   - 確認修復後，可手動重置斷路器（雖然代碼中有自動恢復，但手動介入更保險）。

2. 如何避免被誤判為 Critical？
   - 撰寫任務描述時，如果只是「研究部署流程」而非「真的部署」，請使用 "research deployment process" 而非 "deploy to production"。
   - 避免在任務名稱中直接貼上 API Key 或 Secret（這本來就是資安大忌）。

3. 信任分 (Trust Score)
   - 系統會追蹤每個 Agent 的執行成功率。長期低於閾值的 Agent 可能會被降級或暫停使用（此功能在代碼中已有框架）。
