# OpenClaw 統一方案報告 — 等老蔡審

> 報告日期：2026-02-17
> 狀態：等待審核
> 規則：舊的不動不移不刪，做新的等審核，審過再部署

---

## 目錄

| 編號 | 專案 | 類型 | 老蔡指示 | 建議優先級 |
|------|------|------|---------|-----------|
| A2 | dealcrm | AI 房仲 CRM | 自由發揮 | P2 |
| B6 | haowei | 豪偉安居後台 | 用心做 ERP+CRM+LINE OA | P1 |
| C1 | junyangONLYME | 房仲個人網站 | 直接做 | P2 |
| C2 | junyang666 | 物件展示網站 | 複製做新的 | P3 |
| D1 | hannai | 漢娜裝潢管理 | ERP+CRM+LINE OA | P1 |
| D2 | hsiangyun-wellness | 湘芸教練官網 | LINE OA+會員 | P2 |
| D3 | TRINHNAI- | 小貞美甲美睫 | 自由發揮 LINE OA | P2 |
| D6 | yangmeilife | 楊梅生活集 | 做 | P3 |
| E1+E2 | Foodcarshop + foodcarcalss | 餐車訂購+報名 | 只讀不碰，模組化研究 | 研究 |
| F1 | shun1010-react | 常順班表 | 做新的（備份 F2） | P2 |
| G1 | niceshow | 餐車行程展示 | 做新的 | P3 |

---

## 一、完成事項回顧

### 1. 紫燈系統（已 commit）
- `server/src/riskClassifier.ts` — 四級風險分類器
- `server/src/index.ts` — dispatch gate + 3 個 API endpoint + Telegram 通知
- `src/components/openclaw/DispatchToggle.jsx` — 前端開關
- `src/components/openclaw/uiPrimitives.jsx` — RiskBadge 元件
- **狀態**：代碼已 commit，伺服器需重新部署才能啟用

### 2. n8n 模板（已建立在 local n8n）
- LINE OA 基礎客服 Bot（5 節點）— ID: `csbBzfj438fzzYUc`
- 潘朵拉派工 LINE OA Bot（8 節點含快取）— ID: `n5I4fSgj5Bska0Xn`

### 3. 全面審計（已完成）
- GitHub 50 個 repo 全部分類
- Zeabur n8n 47 個 workflow 全部分析
- 11 個目標 repo 深度研究

---

## 二、各專案詳細方案

---

### A2 — dealcrm（我超業 AI 房仲 CRM）

**現況**：React 19 + TailwindCSS v4 + Recharts，AI 功能模組
**技術棧**：Vite + React 19 + TypeScript + shadcn/ui
**已有功能**：
- 客戶管理（聯絡人清單）
- 商機看板（Kanban）
- 行銷工作室（Marketing Studio）
- AI 輔助功能

**老蔡指示**：自由發揮

**建議方案**：
1. 補齊 Supabase 後端（目前可能是 mock data）
2. 接入 LINE OA — 客戶從 LINE 來的訊息自動建立為線索
3. 加入物件管理模組（從 junyangONLYME 參考）
4. AI 功能強化 — 用 Gemini API 做物件描述生成、客戶跟進建議
5. 與 haowei 共享 CRM 核心模組

**風險等級**：🟡 low（不影響現有系統）

---

### B6 — haowei（豪偉安居後台）

**現況**：Lovable 標準棧 + Supabase，最完整的後台系統之一
**技術棧**：Vite 5 + React 18 + TypeScript + shadcn/ui + Supabase
**已有功能**：
- 案件管理（Cases）
- 客戶管理（Customers）
- 訂單管理（Orders）
- 庫存管理（Inventory）
- 報價管理（Quotes）
- 班表管理（Schedule）
- 帳務管理（Billing）
- 有 Supabase migrations

**老蔡指示**：用心做，ERP+CRM+LINE OA

**建議方案**：
1. **CRM 強化**：
   - 從 hannai 參考完整 CRM 架構（線索→客戶→商機→報價→合約）
   - 加入活動紀錄（call/email/meeting/visit）
   - 加入客戶標籤系統（從 TRINHNAI- 參考 tag_dictionary）
2. **ERP 強化**：
   - 從 hannai 參考專案管理（四階段進度追蹤）
   - 加入廠商管理 + 工單系統
   - 加入請款/付款追蹤
3. **LINE OA 整合**：
   - Supabase Edge Function 接收 LINE webhook
   - 客戶綁定 LINE user_id
   - 訂單狀態變更自動推送 LINE 通知
   - 用 n8n 模板串接自動回覆
4. **報表匯出**：PDF/Excel 匯出報價單、帳務

**風險等級**：🔴 medium（涉及 DB schema 變更）
**預計做法**：fork 一份做新版，舊的不動

---

### C1 — junyangONLYME（房仲個人形象網站）

**現況**：完整的房仲個人網站 + Express API 後端
**技術棧**：Vite 5 + React 18 + TypeScript + shadcn/ui + Supabase + TipTap 編輯器 + Express API
**已有功能**：
- 物件列表 + 詳情頁
- 文章管理（TipTap 富文本編輯器）
- 後台管理（Admin）
- API 後端（Express + Supabase + cors）
- dnd-kit 拖拽排序

**老蔡指示**：直接做

**建議方案**：
1. 完善物件搜尋/篩選（地區、價格區間、坪數）
2. 物件分享到 LINE — 產生 Flex Message 卡片
3. 加入預約看屋功能（寫入 Supabase + LINE 通知）
4. SEO 強化 — 每個物件頁面的 meta tags
5. 優化行動端體驗（目前以桌面為主）
6. 接入 LINE OA — 用 n8n 模板實現自動物件推薦

**風險等級**：🟡 low
**預計做法**：直接在現有 repo 上新開 branch 開發

---

### C2 — junyang666（子菲濬瑒物件網站）

**現況**：純 HTML/JavaScript 物件展示網站
**技術棧**：HTML + JavaScript + Supabase + Cloudflare
**已有功能**：
- 物件列表展示
- 多個頁面（每個物件獨立 HTML）
- Supabase 後端
- Cloudflare 部署

**老蔡指示**：複製做新的

**建議方案**：
1. 以 C1 (junyangONLYME) 為基礎建立新版
2. 遷移至 React + Vite + shadcn/ui（統一技術棧）
3. 將靜態物件頁面改為動態 SPA（從 Supabase 讀取）
4. 加入物件搜尋/篩選
5. 保留舊版作為備份

**風險等級**：🟢 none（建新 repo）
**預計做法**：建立新 repo `junyang666-v2`，基於 Lovable 模板

---

### D1 — hannai（漢娜裝潢管理系統）— 最成熟

**現況**：所有專案中功能最完整的，已有完整 CRM + ERP
**技術棧**：Vite 5 + React 18 + TypeScript + shadcn/ui + Supabase（多租戶架構）
**線上**：hannah-omega.vercel.app

**已有功能（CRM）**：
- 線索管理（6 階段狀態流轉）
- 客戶管理（清單+詳情）
- 商機管理（列表+Kanban 看板）
- 報價單（項目明細+版本管理）
- 合約管理（簽署流程）
- 活動紀錄（call/email/meeting/note/visit）

**已有功能（ERP）**：
- 專案管理（四階段進度追蹤）
- 工單管理（分派廠商+完工紀錄）
- 施工照片（按專案/階段上傳）
- 廠商管理（含 LINE user_id）
- 請款管理（分期+付款追蹤）
- 保固工單（報修→指派→結案）

**已有功能（平台）**：
- 多租戶架構（Platform Dashboard + Tenants）
- 團隊管理、LINE OA 設定頁、整合設定
- 通知 SOP、按鈕管理器
- 客戶端公開頁面（進度檢視、合約簽署）

**已有 DB Schema**（hannah schema）：
tenants, profiles, user_roles, customers, leads, projects, deals, quotes, quote_items, contracts, vendors, work_orders, project_progress, invoices, payments, warranty_tickets, activity_logs, project_photos, audit_logs

**老蔡指示**：ERP+CRM+LINE OA

**建議方案**：
1. **LINE OA 實際串接**（最重要）：
   - 建立 Supabase Edge Function 處理 LINE webhook
   - vendors 表已有 `line_user_id` 欄位 → 實現廠商 LINE 通知
   - 工單指派時自動 LINE 推播
   - 施工進度變更推送給客戶（用客戶端頁面 URL）
   - 用 n8n 潘朵拉模板串接
2. **啟用完整 RLS**：移除暫時關閉的 RLS，確保多租戶資料隔離
3. **認證完善**：加入 Supabase Auth 登入/註冊頁面
4. **報表匯出**：報價單、請款單 PDF 匯出
5. **hannai 作為「模範 repo」**：其他專案的 CRM/ERP 功能從這裡參考

**風險等級**：🔴 medium（涉及 RLS 和認證改動）
**預計做法**：在現有 repo 上新開 branch，先做 LINE OA 串接

---

### D2 — hsiangyun-wellness（湘芸身心靈教練）

**現況**：教練官網 + 後台管理系統
**技術棧**：Vite 5 + React 18 + TypeScript + shadcn/ui + Supabase
**線上**：hsiangyun-wellness.vercel.app

**已有功能（前台）**：
首頁、關於、方法、學員見證、資源、預約表單、隱私政策、測驗

**已有功能（後台）**：
- 儀表板、網站設定（JSON 動態）
- 媒體庫、預約管理
- CRM 會員管理（學員清單+詳情）
- 任務板（學員任務 todo/doing/done）
- 行事曆、推播管理

**已有 DB**：
hsiangyun_bookings, hsiangyun_members, hsiangyun_tasks, hsiangyun_push_messages, hsiangyun_media, hsiangyun_site_settings
後續 migration 追加：line_user_id, line_display_name, tags, session_notes

**老蔡指示**：LINE OA+會員

**建議方案**：
1. **LINE OA 整合**：
   - LINE Login 讓學員綁定帳號（DB 已有 line_user_id 欄位）
   - LINE webhook 接收訊息 → 自動回覆預約確認
   - 課堂提醒推播（push_messages → LINE Messaging API）
   - 進度追蹤通知
2. **會員自助入口**：
   - 學員登入後查看自己的任務進度、課堂紀錄
   - LINE Login 作為登入方式
3. **完善推播**：將 push_messages 連接 LINE Messaging API
4. **預約時段管理**：讓教練設定可預約時段，前台顯示空閒時段
5. **課程/方案管理**：新增 courses 表管理不同瘦身方案+定價

**風險等級**：🟡 low
**預計做法**：在現有 repo 上新開 branch

---

### D3 — TRINHNAI-（小貞美甲美睫）

**現況**：美甲美睫官網 + CRM + 完整標籤系統
**技術棧**：Vite + React + TypeScript + shadcn/ui + Supabase（app_triahni schema）
**線上**：trinhnai.vercel.app

**已有功能**：
- 多語系（中/越/英）
- CRM 客戶管理
- 四級角色（admin/editor/staff/member）
- 三級會員（free/pro/vip）
- 完整標籤系統（來源/意向/地區/階段/熱度）
- 網站區塊 CMS（nav/footer/floating_actions）
- 媒體庫

**問題**：根目錄散落 40+ 個 .md/.sql 檔案很雜亂

**老蔡指示**：自由發揮 LINE OA

**建議方案**：
1. **整理根目錄**：.md → `docs/`，.sql → `supabase/migrations/`
2. **建立預約系統**（美甲美睫核心需求）：
   - 新增 appointments 表
   - 前台預約流程（選服務→選時段→填資料→確認）
   - LINE 預約提醒
3. **作品集模組**：
   - 新增 portfolio 表
   - 前台作品展示頁（照片牆、分類篩選）
4. **服務項目頁**：
   - 新增 services 表（美甲/美睫/手足保養+價格）
   - 前台展示
5. **LINE OA 串接**：
   - LINE webhook → 自動回覆
   - 預約確認推播
   - 作品集 Flex Message 展示
6. **利用已有標籤系統**：自動標記客戶來源（LINE/IG/FB/TikTok）

**風險等級**：🟡 low
**預計做法**：新開 branch，先整理再加功能

---

### D6 — yangmeilife（楊梅生活集）

**現況**：純 HTML+JS 在地生活資訊站，50+ 個頁面
**技術棧**：HTML 89.5% + JavaScript 10.5%，無框架
**已有功能**：
- 冷氣、整復、美容、美髮、美甲、按摩等 20+ 種在地服務頁面
- 生活工具（記帳、貸款計算、稅務計算、待辦清單）
- 社群功能（社區公告板、聊天、評價）
- PWA 支援（manifest.json + sw.js）
- 搜尋、比價、後台

**問題**：
- 50+ HTML 全堆在根目錄
- 無 package.json、無建置流程
- 依賴 Google Sheets 作後端
- 有重複頁面（rental-management vs rental-mgmt）

**老蔡指示**：做

**建議方案**：
1. **遷移至 React/Vite SPA**（長期，P3）：
   - 用 Lovable 模板建立新版
   - 共用 header/footer/nav 元件
   - 從 Google Sheets 遷移至 Supabase
2. **短期優化**（可先做）：
   - 整理目錄結構（services/、tools/、community/）
   - 刪除重複頁面
   - 修復 PWA 離線功能
3. **LINE OA 整合**：楊梅在地生活最適合 LINE OA 作入口
   - 推送新店上架、優惠活動通知
   - 用 n8n 模板快速串接

**風險等級**：🟢 none（建新版不影響舊的）
**預計做法**：建立新 repo `yangmeilife-v2`

---

### E1+E2 — Foodcarshop + foodcarcalss（餐車生態）— 只讀研究

**現況**：
- **E1 Foodcarshop**：多客戶餐車訂購系統（WEB002/003/004）
  - 即時訂單計算、階梯價格、組合優惠、庫存管理
  - 授權/訂閱系統（授權管理中心）
  - CRM 客戶管理
  - WEB003 已遷移至 Supabase
  - **商業化潛力最高**

- **E2 foodcarcalss**：餐車報名表
  - Supabase 後端（從 Google Sheets 遷移）
  - 審計功能（操作紀錄）
  - Puppeteer 自動化測試

**老蔡指示**：只讀不碰，模組化商業化研究

**模組化分析**：

| 可抽出模組 | 商業價值 | 說明 |
|-----------|---------|------|
| 訂單引擎 | 高 | 即時計算+階梯價+組合優惠 → SaaS |
| 菜單管理系統 | 高 | 分類+圖片+庫存即時更新 |
| 授權/訂閱系統 | 高 | 已有授權中心雛形 → 付費閘道 |
| CRM 客戶管理 | 中高 | 場地訂單+客戶資料 |
| 報名表引擎 | 高 | 通用報名/登記 → 不限餐車 |
| 審計追蹤模組 | 中高 | 操作紀錄 → 任何稽核場景 |
| 通用模板系統 | 高 | 一鍵新增客戶 → 直接賣 |

**商業化路徑建議**：
最佳方案是做成「餐車 SaaS 平台」：
餐車老闆自助註冊 → 選模板 → 自訂菜單 → 上線
授權管理中心 + 訂閱計費 = 可收月費

**不動作項目**：遵照指示不碰，僅記錄分析結果供未來參考

---

### F1 — shun1010-react（常順班表新版）

**現況**：完整的 React 排班系統
**技術棧**：Vite 5 + React 18 + TypeScript + shadcn/ui + Supabase
**線上**：shun1010.pages.dev（Cloudflare Pages）
**已有功能**：
- 自動排班系統
- 值班台管理
- 鑰匙借還系統
- 規則庫設定
- 資料匯出/匯入
- Supabase 資料同步
- Google Sheets 整合
- CI/CD（GitHub Actions → Cloudflare Pages）

**F2 舊版（shun1010）**：純 HTML/JS，一個 HTML 塞所有功能，不再開發

**老蔡指示**：做新的（備份 F2 做新版）

**建議方案**：
1. 基於 shun1010-react 建立新版（fork 或 branch）
2. 清理冗餘：移除「版本2.0」資料夾、整合 GAS 腳本
3. 核心排班邏輯補測試（Vitest 100% 覆蓋）
4. 完善 Supabase RLS
5. 加入 LINE 通知：排班結果自動推送
6. F2 舊版保留做備份，不動

**風險等級**：🟡 low
**預計做法**：fork shun1010-react 做新版 `shun1010-v3`

---

### G1 — niceshow（餐車行程展示）

**現況**：四維商圈餐車月行程表
**技術棧**：HTML + JavaScript + Google Sheets API + Google Maps
**已有功能**：
- 月行程表展示
- 週次選擇
- Google Maps 導航
- 圖片跑碼燈
- 後台管理（admin/）
- 拖曳排序

**問題**：Batchfile 佔比 21%（Windows .bat 腳本），無框架

**老蔡指示**：做新的

**建議方案**：
1. 遷移至 React + Vite（與餐車生態統一技術棧）
2. 資料源從 Google Sheets 改 Supabase
3. 加入 PWA — 展示頁面適合加到手機桌面
4. 移除 .bat 檔，用 npm scripts 取代
5. 與 E1/E2 餐車系統資料互通

**風險等級**：🟢 none（建新 repo）
**預計做法**：建立新 repo `niceshow-v2`

---

## 三、跨專案共用模組建議

### 可以從 hannai 搬到其他專案的模組

| 模組 | 適用專案 | 說明 |
|------|---------|------|
| CRM 線索管理 | B6, A2 | 6 階段狀態流轉 |
| 商機 Kanban | B6, A2 | 列表+看板雙視圖 |
| 報價單系統 | B6 | 項目明細+版本管理 |
| 廠商管理 | B6 | 含 LINE user_id |
| 工單系統 | B6 | 分派+完工+保固 |
| 多租戶架構 | 所有專案 | platform_admin/tenant_admin/tenant_staff |

### 可以從 TRINHNAI- 搬到其他專案的模組

| 模組 | 適用專案 | 說明 |
|------|---------|------|
| 標籤系統 | B6, D2, A2 | tag_dictionary + profile_tags |
| 會員分級 | D2 | free/pro/vip |
| 多語系 | D6 | LanguageContext |
| 網站區塊 CMS | 所有官網 | site_sections |

### 統一 LINE OA 串接模板

所有需要 LINE OA 的專案（B6, C1, D1, D2, D3）可以用同一套架構：

```
LINE webhook → n8n 工作流程 → Supabase Edge Function
                    ↓
              Google Sheets（客服回覆資料庫）
                    ↓
              LINE reply API（Flex Message）
```

已建好的 n8n 模板可直接複用：
- 基礎客服 Bot：`csbBzfj438fzzYUc`
- 潘朵拉派工 Bot：`n5I4fSgj5Bska0Xn`

---

## 四、技術棧統一建議

| 層面 | 現況 | 統一為 |
|------|------|--------|
| 前端 | 混合（HTML/JS + React） | React 18 + TypeScript |
| UI | 手寫 CSS / shadcn 混合 | shadcn/ui + Tailwind 3 |
| 建置 | 無 / Vite 混合 | Vite 5 |
| 後端 | Google Sheets / Supabase 混合 | Supabase 全面 |
| 部署 | GitHub Pages / Vercel / Cloudflare 混合 | Vercel 或 Cloudflare Pages |
| 測試 | 無 / 散落 | Vitest + Testing Library |
| 通訊 | 無 | LINE Messaging API（via n8n） |

---

## 五、建議執行順序

### 第一批（P1 — 立即開始）
1. **D1 hannai** — LINE OA 串接（已有最完整的 CRM/ERP，只缺 LINE）
2. **B6 haowei** — 從 hannai 搬 CRM/ERP 模組 + LINE OA

### 第二批（P2 — 接著做）
3. **C1 junyangONLYME** — 物件搜尋+預約看屋+LINE 推薦
4. **D2 hsiangyun-wellness** — LINE Login + 會員自助 + 推播
5. **D3 TRINHNAI-** — 整理+預約系統+作品集+LINE
6. **A2 dealcrm** — Supabase 後端 + LINE 串接
7. **F1 shun1010-react** — fork 新版 + 清理 + LINE 通知

### 第三批（P3 — 最後做）
8. **C2 junyang666** — 用 C1 為基礎建新版
9. **D6 yangmeilife** — 建 React 新版
10. **G1 niceshow** — 建 React 新版

### 研究（不動手）
11. **E1+E2** — 餐車模組化研究報告已完成，等老蔡決定

---

## 六、n8n 工作流程建議

### Zeabur 上的 47 個 workflow 摘要

| 分類 | 數量 | 狀態 |
|------|------|------|
| LINE OA 客服 | 19 | 8 ON / 11 OFF |
| 潘朵拉派工 | 8 | 全 ON |
| 快取服務 | 5 | 1 ON / 4 OFF |
| 電話查詢 | 2 | 1 ON / 1 OFF |
| PDF 生成 | 2 | 全 OFF |
| 排程/報表 | 2 | 全 OFF |
| 記帳/金流 | 2 | 全 OFF |
| 其他 | 7 | 1 ON / 6 OFF |

**啟用中的不動**。停用的不管。

### 建議新增的模板（在 local n8n 開發測試）

| 模板 | 用途 | 覆蓋 |
|------|------|------|
| LINE OA 基礎客服 Bot | 一鍵部署新客戶 | 10+ workflow |
| 潘朵拉統一路由器 | 6 條分線合 1 | 6 workflow |
| Google Sheets 快取 API | 通用快取層 | 5 workflow |
| LINE OA 進階版（含外部 API） | 複雜客服 | 3 workflow |
| AI PDF 文案生成器 | 文件自動化 | 2 workflow |

---

## 七、待老蔡決定

1. **紫燈部署**：dispatch 系統代碼已 commit，要部署嗎？
2. **潘朵拉合併**：6 條分線可以合併為 1 個 workflow + switch 路由，要做嗎？（不會影響現有功能，只是減少維護量）
3. **E1+E2 餐車**：模組化研究完成，要開始做 SaaS 平台嗎？還是繼續不碰？
4. **新 repo 命名**：C2 新版叫 `junyang666-v2`？D6 新版叫 `yangmeilife-v2`？G1 新版叫 `niceshow-v2`？
5. **LINE OA 統一**：所有專案的 LINE 串接用同一套 n8n 模板？還是各做各的？
6. **hannai 多租戶**：hannai 的多租戶架構要推廣到 B6 haowei 嗎？

---

> 報告完成。所有研究均已執行完畢，等老蔡醒來後審核。
> 舊的不動不移不刪。做新的等審核。審過再部署。
