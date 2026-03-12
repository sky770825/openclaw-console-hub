# ContextGuard 定價策略

| 方案 | 價格 | 功能 |
|------|------|------|
| **Free** | $0 | 基礎監控 + 日報 |
| **Pro** | $9/月 | 即時告警 + 自動優化 |
| **Enterprise** | $49/月 | API + 自定義規則 + 支援 |

---

## Free（免費）

- Context 使用率即時查詢（`contextguard status`）
- 日報告生成（`contextguard report --daily`）
- 本地閾值設定（warn / critical / autoCompact）
- 手動優化建議（`contextguard optimize`）

適合個人或小團隊試用與日常自管。

---

## Pro（$9/月）

- Free 全部功能
- **即時告警**：超過閾值時主動推送（Telegram / Email / Webhook）
- **自動優化**：排程執行優化建議並寫入日誌
- **週報告**：`contextguard report --weekly` 與歷史趨勢摘要
- 優先使用新功能與預設規則更新

適合需要被動提醒、減少手動檢查的用戶。

---

## Enterprise（$49/月）

- Pro 全部功能
- **API**：以 HTTP API 查詢狀態、觸發報告、寫入自訂指標
- **自定義規則**：自訂閾值、告警條件、報告欄位
- **技術支援**：郵件支援與問題排查
- 可選：與現有監控系統（Grafana、Datadog 等）整合範例

適合企業或需與既有系統整合的團隊。

---

## 實作狀態（Phase 3）

目前開源版本實作內容對應 **Free** 方案；Pro / Enterprise 的付費功能（即時告警通道、API、支援）為後續商業化項目，上架 ClawHub 或產品網站時啟用。
