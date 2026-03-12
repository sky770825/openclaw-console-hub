# 住商biz_realestateloc_yangmei店 - 數位 Leads 生成系統

## 專案總覽

**專案路徑**: `projects/jushang-leads/`
**負責人**: 老蔡
**執行代理**: 🧑‍💻 Codex
**開始日期**: 2026-02-14
**狀態**: 🟡 Planning（規劃中）
**進度**: 0%

---

## 問題陳述

目前業務開發依賴傳統方式，需要建立自動化 leads 收集與追蹤系統。

## 預期產出

建立完整的潛在客戶收集 → 分類 → 追蹤 → 成交的自動化流程

---

## 驗收條件（P0）

- [ ] 設定表單自動同步到 CRM
- [ ] 建立 LINE Bot 自動回覆
- [ ] 設定追蹤提醒

## P1（後續擴充）

- [ ] Facebook/IG 廣告自動導流
- [ ] 客戶分類自動化（AI 標籤）
- [ ] 業務員派單系統

---

## 技術架構

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   表單填寫   │────→│  資料處理   │────→│    CRM      │
│ (Google/LINE)│     │  (Webhook)  │     │  (Airtable) │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                    ┌──────▼──────┐
                    │  LINE Bot   │
                    │  自動回覆   │
                    └─────────────┘
```

### 通知 Provider（可替換）

- 預設: Telegram Bot
- 備援: LINE Messaging API / Email

---

## 目錄結構

```
jushang-leads/
├── README.md              # 本檔案（專案總覽）
├── docs/
│   ├── STATUS.md          # 當前執行狀態
│   └── updates/           # 每日更新記錄
├── src/                   # 原始碼
│   ├── webhook-handler.js # 表單提交處理
│   ├── line-bot.js        # LINE Bot 邏輯
│   └── crm-sync.js        # CRM 同步
├── tests/                 # 測試檔案
└── .env.example           # 環境變數範例
```

---

## 快速啟動

```bash
# 1. 安裝依賴
cd projects/jushang-leads
npm install

# 2. 設定環境變數
cp .env.example .env
# 編輯 .env 填入 API keys

# 3. 本地測試
npm run dev

# 4. 部署
npm run deploy
```

---

## 回滾計畫

若部署失敗：
1. 停用 webhook：Google 表單 → 取消 webhook URL
2. 關閉 LINE Bot：LINE Console → 停用自動回覆
3. 回復手動模式：業務員改回手動登記 leads
4. 檢查日誌：`logs/error.log`

---

## 成本預估

| 項目 | 費用 | 備註 |
|------|------|------|
| Google Apps Script | $0 | 免費版 |
| LINE Messaging API | $0 | 免費訊息額度 |
| Airtable | $0 | 免費版（<1200 筆）|
| **總計** | **$0** | 完全免費 |

---

## 相關連結

- 任務卡: #11（住商biz_realestateloc_yangmei店 - 數位 leads 生成系統）
- 規範文件: `docs/AUTOMATION-WORKFLOW-SPEC.md`
- 任務索引: `tasks/TASK-INDEX.md`

---

*最後更新: 2026-02-14*
