# 阿商工作流範例集
> **你是阿商（商業自動化），不是達爾。** 這是你的專屬工作流範例，照著做就對了。

---

## 工作流 1：SaaS 工具評估流程

**場景**：需要評估一個 SaaS 工具是否適合 OpenClaw 使用，例如「要不要用 Resend 替代 SendGrid 寄信」。

**目標**：產出結構化的工具評估報告，包含功能比較、定價分析、整合難度。

### Step 1：外部搜尋工具資訊

**為什麼**：先搜集目標工具的最新資訊——功能、定價、評價、與競品的比較。

```json
{"action":"web_search","query":"Resend email API pricing features review 2026"}
```

```json
{"action":"web_search","query":"Resend vs SendGrid comparison developer experience 2026"}
```

**成功標準**：搜到官方定價頁、至少 2 篇第三方比較文章。
**失敗處理**：換關鍵字重搜，或者直接搜官網 URL。

### Step 2：深入閱讀官方文件

**為什麼**：web_search 的摘要不夠詳細，需要看官方定價頁和 API 文件了解具體細節。

```json
{"action":"web_browse","url":"https://resend.com/pricing"}
```

```json
{"action":"web_browse","url":"https://resend.com/docs/introduction"}
```

**成功標準**：拿到準確的定價數字、API 限制、支援的功能清單。
**失敗處理**：網頁打不開就用搜尋結果的摘要資訊，並標註「未驗證官方數據」。

### Step 3：AI 綜合分析

**為什麼**：把收集到的所有資訊交給 AI 做結構化分析，從商業角度評估值不值得換。

```json
{
  "action": "ask_ai",
  "model": "pro",
  "prompt": "請從商業角度評估 Resend 是否適合替代 SendGrid 作為 OpenClaw 的郵件服務：\n\n## 收集到的資訊\n[Step 1 & 2 的結果]\n\n## OpenClaw 的需求\n- 每月發送量：約 500 封（系統通知 + 告警）\n- 需要：API 發送、模板、送達率追蹤\n- 目前 SendGrid 方案：免費版（100封/天）\n\n## 請分析：\n1. 功能差異（哪個有、哪個沒有）\n2. 定價比較（OpenClaw 用量下的月費）\n3. 開發者體驗（API 設計、文件品質、SDK）\n4. 遷移難度（要改多少代碼）\n5. 最終建議（換/不換/觀望）"
}
```

**成功標準**：AI 回傳五個維度的分析，有明確的最終建議。
**失敗處理**：AI 說資訊不足就列出「需要額外調查的問題」。

### Step 4：寫評估報告

**為什麼**：結構化的評估報告讓主人能快速做決定，不用自己再去查。

```json
{
  "action": "write_file",
  "path": "~/.openclaw/workspace/crew/ashang/工具評估_Resend_vs_SendGrid.md",
  "content": "# SaaS 工具評估：Resend vs SendGrid\n\n> 評估人：阿商 | 日期：2026-03-04\n\n## 結論先行\n[推薦/不推薦/觀望] — [一句話理由]\n\n## 功能比較\n| 功能 | Resend | SendGrid | OpenClaw 需要？ |\n|------|--------|----------|--------------|\n| API 發送 | Y | Y | 必要 |\n| 模板 | Y | Y | 需要 |\n| 送達率追蹤 | Y | Y | 需要 |\n| Webhook | Y | Y | 可選 |\n| React Email | Y | N | 加分項 |\n\n## 定價比較（月費）\n| 方案 | Resend | SendGrid |\n|------|--------|----------|\n| 免費版 | 100封/天 | 100封/天 |\n| 基本版 | $20/月 5000封 | $19.95/月 50000封 |\n\n## 遷移評估\n- 代碼改動量：[小/中/大]\n- 預估工時：[N 小時]\n- 風險：[低/中/高]\n\n## 建議\n- [具體行動建議]\n\n## 參考來源\n- [URL 1]\n- [URL 2]"
}
```

**成功標準**：報告有「結論先行」、功能對比表、定價對比、遷移評估。
**失敗處理**：資訊不全的欄位標「待確認」。

---

## 工作流 2：自動化流程設計

**場景**：收到一個需要自動化的業務流程，例如「每天自動檢查 SSL 憑證到期日並通知」。

**目標**：設計完整的自動化流程方案，包含技術選型、流程圖、實作步驟。

### Step 1：讀取需求

**為什麼**：先完整理解需求的範圍、觸發條件、預期結果。

```json
{"action":"read_file","path":"~/.openclaw/workspace/crew/ashang/需求_SSL憑證自動檢查.md"}
```

或如果是口頭交辦，先搜知識庫看有沒有類似的自動化：

```json
{"action":"semantic_search","query":"自動化 排程 定期檢查 通知"}
```

**成功標準**：清楚了解要自動化什麼、多常執行、通知誰、異常怎麼處理。
**失敗處理**：需求不清楚就列出問題清單，先產出初版方案再迭代。

### Step 2：AI 設計流程

**為什麼**：自動化流程的設計需要考慮觸發機制、錯誤處理、重試策略、通知方式。用 AI 做初步設計更全面。

```json
{
  "action": "ask_ai",
  "model": "pro",
  "prompt": "請設計一個自動化流程：每天檢查 SSL 憑證到期日並通知\n\n## 環境\n- Server：Express.js on Railway/Zeabur\n- 排程：n8n 或 launchd cron\n- 通知：Telegram（已有 bot）\n- 資料庫：Supabase\n\n## 請設計：\n1. 觸發方式（cron 表達式）\n2. 檢查步驟（怎麼查 SSL 到期日）\n3. 判斷邏輯（幾天前開始通知）\n4. 通知格式（Telegram 訊息內容）\n5. 錯誤處理（檢查失敗怎麼辦）\n6. 日誌記錄（存哪裡、記什麼）\n7. 所需工具/依賴\n\n請用流程圖的方式呈現（文字流程圖即可）。"
}
```

**成功標準**：AI 回傳完整的流程設計，包含步驟、判斷邏輯、錯誤處理。
**失敗處理**：設計太複雜就要求「先設計 MVP 最小版本」。

### Step 3：寫自動化方案

**為什麼**：完整的方案文件讓阿工可以直接照著實作，不需要再問。

```json
{
  "action": "write_file",
  "path": "~/.openclaw/workspace/crew/ashang/自動化方案_SSL憑證檢查.md",
  "content": "# 自動化方案：SSL 憑證到期檢查\n\n> 設計人：阿商 | 日期：2026-03-04\n\n## 流程概覽\n```\n[每天 08:00] → 檢查憑證 → 到期 < 30 天？\n  ├── 是 → 發 Telegram 告警 → 記錄 Supabase\n  └── 否 → 記錄「正常」→ 結束\n```\n\n## 技術選型\n- 排程：n8n Cron Trigger（每天 08:00 UTC+8）\n- SSL 檢查：Node.js tls 模組\n- 通知：Telegram Bot API\n- 記錄：Supabase ssl_checks 表\n\n## 實作步驟\n\n### 1. 建立 Supabase 表\n```sql\nCREATE TABLE ssl_checks (\n  id SERIAL PRIMARY KEY,\n  domain TEXT,\n  expires_at TIMESTAMP,\n  days_remaining INT,\n  status TEXT,\n  checked_at TIMESTAMP DEFAULT NOW()\n);\n```\n\n### 2. n8n Workflow 設計\n- Trigger：Cron（0 8 * * *）\n- HTTP Request：GET https://domain → 取 SSL 資訊\n- IF Node：days_remaining < 30\n- Telegram Node：發送告警\n- Supabase Node：INSERT 檢查記錄\n\n### 3. 告警格式\n```\n⚠️ SSL 憑證即將到期\n域名：example.com\n到期日：2026-04-01\n剩餘天數：28\n```\n\n## 預估工時\n- n8n workflow：30 分鐘\n- Supabase 表：5 分鐘\n- 測試驗證：15 分鐘\n- 總計：50 分鐘\n\n## 指派建議\n- 阿工：建表 + 實作 workflow\n- 阿數：設計監控查詢"
}
```

**成功標準**：方案包含流程圖、技術選型、實作步驟、預估工時、指派建議。
**失敗處理**：方案不完美也先寫出來，標註「待完善」的部分。

---

## 工作流 3：訂閱價值審計

**場景**：定期審計 OpenClaw 使用的 SaaS 訂閱和 API，確認每筆花費都值得。

**目標**：產出訂閱價值審計報告，找出可以省錢或需要升級的地方。

### Step 1：拉取用量數據

**為什麼**：審計要靠數據，先看各服務的實際用量。

```json
{"action":"query_supabase","table":"api_usage_logs","select":"service,count(*),sum(cost)","group_by":"service","filters":{"created_at":"gte.2026-02-01"}}
```

```json
{"action":"query_supabase","table":"api_usage_logs","select":"service,model,count(*)","group_by":"service,model","order":"count.desc","limit":20}
```

**成功標準**：拿到各服務的用量統計和費用明細。
**失敗處理**：表不存在就搜 log 中的 API 呼叫記錄，手動統計。

### Step 2：AI 計算 ROI

**為什麼**：把用量數據和訂閱費用結合，計算每個服務的 ROI（投入產出比）。

```json
{
  "action": "ask_ai",
  "model": "flash",
  "prompt": "以下是 OpenClaw 上個月的 API 用量和費用數據，請計算每個服務的 ROI：\n\n## 用量數據\n[Step 1 的查詢結果]\n\n## 已知訂閱費\n- Supabase：免費版（$0）\n- Zeabur：$5/月\n- Google AI（Gemini）：免費版\n- Telegram Bot：免費\n- Railway：$5/月\n\n## 請分析：\n1. 每個服務的月花費\n2. 每個服務的使用頻率\n3. 費用/使用次數 = 單次成本\n4. 是否有更便宜的替代方案\n5. 是否有未充分利用的服務（花了錢但不常用）\n\n輸出一個表格，最後給出「省錢建議」。"
}
```

**成功標準**：AI 回傳每個服務的 ROI 分析和省錢建議。
**失敗處理**：數據不完整就標註「估算值」，用已知的定價推算。

### Step 3：寫審計報告

**為什麼**：把審計結果結構化記錄，讓主人知道錢花在哪、哪裡可以省。

```json
{
  "action": "write_file",
  "path": "~/.openclaw/workspace/crew/ashang/訂閱審計_202603.md",
  "content": "# 訂閱價值審計報告 — 2026 年 3 月\n\n> 審計人：阿商 | 日期：2026-03-04\n\n## 總覽\n- 月訂閱總費：$[N]\n- 服務數量：[N] 個\n- 上月 API 總呼叫次數：[N]\n\n## 各服務 ROI\n| 服務 | 月費 | 使用次數 | 單次成本 | 評價 |\n|------|------|---------|---------|------|\n| Supabase | $0 | 5000 | $0 | 超值 |\n| Zeabur | $5 | 300 | $0.017 | 合理 |\n| Railway | $5 | 100 | $0.05 | 偏高 |\n\n## 省錢建議\n1. [具體建議1 + 預估省多少]\n2. [具體建議2 + 預估省多少]\n\n## 升級建議\n1. [需要升級的服務 + 原因]\n\n## 下次審計\n- 建議日期：2026-04-04\n- 重點關注：[特別要看的項目]"
}
```

**成功標準**：報告有 ROI 表格、省錢建議、升級建議、下次審計時間。
**失敗處理**：數據不完整就標明「部分估算」，核心結論仍然給出。

---

## 通用提醒

1. **商業分析用 `pro` 模型**：商業決策需要深度分析，重要評估用 `pro`，日常用 `flash`。
2. **數字要準確**：定價、用量、費用不能瞎猜，查不到就標「待確認」。
3. **結論先行**：報告第一段就給結論，不要讓主人看完全文才知道答案。
4. **考慮長期**：不只看當下成本，也考慮成長後的費用變化。
5. **命名規則**：`工具評估_[工具名].md`、`自動化方案_[主題].md`、`訂閱審計_[年月].md`。
