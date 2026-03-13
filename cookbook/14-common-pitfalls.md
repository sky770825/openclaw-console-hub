# Cookbook 14: 常見陷阱與正確路徑

> 這是 達爾 的錯誤日誌，也是進化階梯。犯錯不可恥，重複犯錯才可恥。

---

## 陷阱 01：如何正確查詢內部系統狀態

日期： 2026-03-01

### 錯誤情境
當我需要知道 auto-executor 的狀態時，我本能地想用開發者的方式解決，結果連續失敗。

### 錯誤路徑 (已證明無效)
1.  {"action":"proxy_fetch","url":"http://localhost:3011/..."}
       為什麼錯： proxy_fetch 是外部 AI 模型的安全代理，有白名單限制，不能用來打內部 API。
2.  {"action":"run_script","command":"curl -H \"Authorization: Bearer $OPENCLAW_API_KEY\" ..."}
       為什麼錯： 系統安全機制禁止在腳本中直接暴露或使用 API_KEY 環境變數。這是保護統帥的資產，是我的底線。

### 正確路徑 (唯一且最優)

直接讀取系統狀態報告：
``json
{"action":"read_file","path":"/Users/sky770825/.openclaw/workspace/WAKE_STATUS.md"}
``

### 核心原則
先利用系統為我準備的『儀表板』（狀態文件），而不是自己造輪子去『探測』（API 呼叫）。 WAKE_STATUS.md 是系統在每次我醒來時就為我準備好的，包含了所有我需要知道的即時資訊。我必須養成第一時間查閱它的習慣。