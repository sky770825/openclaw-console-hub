# 14 — 接案標準作業手冊

> 適用對象：幫客戶做網站、LINE OA、會員系統、自動化整合的接案團隊
> 最後更新：2026-03-05

---

## 1. 接案流程總覽

```
客戶需求確認 → 選方案 → 報價 → 簽約 → 配置 → 部署 → 驗收交付 → 維護
```

| 階段 | 負責人 | 產出物 | 時間 |
|------|--------|--------|------|
| 需求確認 | PM / 業務 | 需求訪談紀錄、功能清單 | 1-2 天 |
| 選方案 | PM + 技術 | 方案確認書（A/B/C 擇一或組合） | 當天 |
| 報價 | PM | 報價單（含明細、時程、付款方式） | 1 天 |
| 簽約 | 業務 | 合約、訂金收款 | 1-3 天 |
| 配置 | 工程師 | 環境建置、帳號設定、程式開發 | 3-14 天 |
| 部署 | 工程師 | 上線、DNS 設定、SSL | 1 天 |
| 驗收交付 | PM + 客戶 | 交付檢查清單、操作手冊 | 1-2 天 |
| 維護 | 工程師 | 月報、異常處理 | 持續 |

### 需求訪談必問清單

1. 你的客戶是誰？（B2B / B2C / 內部）
2. 目前怎麼跟客戶溝通？（LINE / 電話 / Email / 門市）
3. 最想自動化的事是什麼？（回覆訊息 / 預約 / 通知 / 報表）
4. 有沒有現有網站或系統？
5. 預算範圍？
6. 期望上線時間？
7. 需要會員功能嗎？（註冊 / 登入 / 會員等級 / 點數）
8. 有沒有 LINE Official Account？（如果沒有，需要幫開嗎）

---

## 2. 方案模板

### A. LINE OA 智能客服

**適合**：餐廳、診所、美容美髮、店家、服務業

**功能**：
- 關鍵字自動回覆（營業時間、地址、菜單、預約）
- AI 智能對話（Gemini 自然語言理解，超出關鍵字也能回）
- 推播通知（活動、優惠、公告）
- Flex Message 卡片選單（圖文並茂，可點擊操作）
- Rich Menu 圖文選單（底部常駐選單）

**技術棧**：
- LINE Messaging API（收發訊息）
- n8n Webhook workflow（訊息處理邏輯）
- Gemini AI（自然語言回覆）
- Flex Message 卡片模板（12 種內建卡片）

**已有模板與資源**：
| 資源 | 路徑 | 說明 |
|------|------|------|
| Flex 卡片模板 | `openclaw-main/src/line/flex-templates.ts` | 12 種卡片（InfoCard、ListCard、ImageCard、ActionCard、NotificationBubble、ReceiptCard、EventCard、AgendaCard、MediaPlayerCard、AppleTvRemoteCard、DeviceControlCard、Carousel） |
| Template Messages | `openclaw-main/src/line/template-messages.ts` | Confirm / Buttons / Carousel / ImageCarousel 模板 |
| Rich Menu 管理 | `openclaw-main/src/line/rich-menu.ts` | 建立 / 上傳圖片 / 設為預設 |
| Webhook 處理 | `openclaw-main/src/line/webhook.ts` | 簽名驗證 + 事件分派 |
| Bot 核心 | `openclaw-main/src/line/bot.ts` | createLineBot + handleWebhook |
| 訊息發送 | `openclaw-main/src/line/send.ts` | 推播 / 回覆 / 多播 |
| Markdown 轉換 | `openclaw-main/src/line/markdown-to-line.ts` | Markdown 轉 LINE 格式 |
| 分段發送 | `openclaw-main/src/line/reply-chunks.ts` | 超長訊息自動分段 |
| n8n Workflow 範例 | `docs/n8n/*.json` | 多個可匯入的 workflow |

**設定步驟**：

1. **LINE Developers Console 建立 Provider + Channel**
   - 前往 https://developers.line.biz/
   - 登入 → Create Provider → 輸入公司名稱
   - Create Channel → 選 Messaging API
   - 填寫 Channel 名稱、描述、類別

2. **取得 Channel Access Token + Channel Secret**
   - Channel 頁面 → Basic settings → Channel secret（複製保存）
   - Channel 頁面 → Messaging API → Issue Channel access token (long-lived)（複製保存）

3. **n8n 部署 Webhook workflow**
   - 登入 n8n（Zeabur：`https://sky770825.zeabur.app`）
   - 匯入 LINE bot workflow（見第 4 節詳細步驟）
   - 在 Webhook 節點取得 Production URL

4. **LINE Console 設定 Webhook URL**
   - Messaging API → Webhook settings → Edit
   - 填入 n8n Webhook Production URL
   - 開啟 Use webhook
   - 點 Verify 確認連線成功

5. **設定關鍵字規則**
   - n8n workflow 裡用 Switch 節點
   - 條件範例：
     ```
     營業時間 → 回覆「週一至週五 9:00-18:00」
     地址 → 回覆地圖 Flex 卡片
     菜單 → 回覆圖文 Carousel
     預約 → 回覆預約表單連結
     其他 → 轉 Gemini AI 回覆
     ```

6. **設定 Rich Menu**
   - 準備 2500x1686 或 2500x843 圖片
   - 使用 `rich-menu.ts` 建立並上傳
   - 設定區域對應動作（最多 20 個區域）
   - 設為預設 Rich Menu

7. **測試**
   - 手機加 Bot 好友
   - 測試每個關鍵字
   - 測試 AI 自由對話
   - 測試 Rich Menu 每個按鈕
   - 測試推播發送

8. **客戶培訓**
   - 教客戶在 LINE OA Manager 看數據（好友數、訊息量）
   - 教客戶如何改關鍵字（n8n 介面或提供設定表格）
   - 教客戶如何發推播

---

### B. 企業網站 + 會員系統

**適合**：中小企業、電商、社群平台、SaaS

**功能**：
- RWD 響應式網站（手機 / 平板 / 電腦自適應）
- 會員註冊 / 登入（Email + 密碼、Google OAuth、LINE Login）
- 會員資料管理（個人檔案、頭像、偏好設定）
- 訂閱計費（可選，串接金流）
- 管理後台（會員列表、資料匯出）

**技術棧**：
- React + TypeScript + Vite（前端）
- Supabase Auth（會員驗證）
- Supabase Database（PostgreSQL 資料庫）
- Supabase Storage（檔案/圖片儲存）
- Vercel / Zeabur（部署）

**設定步驟**：

1. **建立 Supabase 專案**
   - 前往 https://supabase.com → New Project
   - 選 Region（Asia Northeast - Tokyo）
   - 記下 Project URL 和 anon key

2. **設定資料表**
   ```sql
   -- 會員擴充資料（Supabase Auth 已有基本 users 表）
   CREATE TABLE profiles (
     id UUID REFERENCES auth.users PRIMARY KEY,
     display_name TEXT,
     avatar_url TEXT,
     phone TEXT,
     membership_level TEXT DEFAULT 'basic',
     points INTEGER DEFAULT 0,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );

   -- RLS 政策（每人只能讀寫自己的資料）
   ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Users can view own profile"
     ON profiles FOR SELECT USING (auth.uid() = id);
   CREATE POLICY "Users can update own profile"
     ON profiles FOR UPDATE USING (auth.uid() = id);

   -- 自動建立 profile（新用戶註冊時）
   CREATE OR REPLACE FUNCTION handle_new_user()
   RETURNS TRIGGER AS $$
   BEGIN
     INSERT INTO profiles (id, display_name)
     VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;

   CREATE TRIGGER on_auth_user_created
     AFTER INSERT ON auth.users
     FOR EACH ROW EXECUTE FUNCTION handle_new_user();
   ```

3. **設定 Auth Provider**
   - Supabase Dashboard → Authentication → Providers
   - 開啟 Email（預設已開）
   - 開啟 Google：填入 Google OAuth Client ID + Secret
   - 開啟 LINE Login（如需要）：填入 LINE Login Channel ID + Secret
   - 設定 Redirect URL：`https://客戶網域/auth/callback`

4. **前端專案初始化**
   ```bash
   npm create vite@latest client-site -- --template react-ts
   cd client-site
   npm install @supabase/supabase-js react-router-dom
   ```

5. **Supabase Client 設定**
   ```typescript
   // src/lib/supabase.ts
   import { createClient } from '@supabase/supabase-js'

   export const supabase = createClient(
     import.meta.env.VITE_SUPABASE_URL,
     import.meta.env.VITE_SUPABASE_ANON_KEY
   )
   ```

6. **會員註冊/登入元件**
   ```typescript
   // 註冊
   const { data, error } = await supabase.auth.signUp({
     email: 'user@example.com',
     password: 'securepassword',
     options: { data: { full_name: '王大明' } }
   })

   // 登入
   const { data, error } = await supabase.auth.signInWithPassword({
     email: 'user@example.com',
     password: 'securepassword'
   })

   // Google OAuth
   const { data, error } = await supabase.auth.signInWithOAuth({
     provider: 'google',
     options: { redirectTo: 'https://客戶網域/auth/callback' }
   })

   // 登出
   await supabase.auth.signOut()
   ```

7. **部署**
   - 設定環境變數（VITE_SUPABASE_URL、VITE_SUPABASE_ANON_KEY）
   - 部署到 Vercel / Zeabur
   - 設定自訂網域 + SSL

8. **管理後台（如需要）**
   - Supabase Dashboard 直接當後台用（小案子）
   - 或另建管理頁面（大案子），用 admin role 讀取全部會員資料

---

### C. 自動化整合方案

**適合**：已有網站或 LINE，需要串接自動化流程

**功能**：
- 表單提交 → 即時通知（LINE / Email / Telegram）
- 異常監控 → 自動告警
- 定期報告 → 自動產生 + 發送
- 跨平台同步（Google Sheets ↔ 資料庫 ↔ LINE）
- 訂單 / 預約 → 自動確認 + 提醒

**技術棧**：
- n8n workflows（流程自動化引擎）
- Webhook（接收外部事件）
- REST API（串接各系統）
- Cron trigger（定時排程）

**常見 workflow 範例**：

#### C1. 表單提交 → LINE 通知
```
[Webhook] → [Set 整理欄位] → [LINE 發送通知]
```
節點組合：
- `n8n-nodes-base.webhook`：POST 接收表單資料
- `n8n-nodes-base.set`：整理姓名、電話、內容欄位
- `n8n-nodes-base.httpRequest`：呼叫 LINE Push Message API

#### C2. 定時檢查 → 異常告警
```
[Cron 每小時] → [HTTP 檢查網站] → [IF 異常] → [LINE/Email 告警]
```
節點組合：
- `n8n-nodes-base.scheduleTrigger`：每小時執行
- `n8n-nodes-base.httpRequest`：GET 目標 URL
- `n8n-nodes-base.if`：檢查 HTTP status !== 200
- `n8n-nodes-base.httpRequest`：發 LINE 通知

#### C3. Google Sheets 同步 → 資料庫
```
[Cron 每天] → [Google Sheets 讀取] → [Supabase 寫入/更新]
```
節點組合：
- `n8n-nodes-base.scheduleTrigger`：每天凌晨 2 點
- `n8n-nodes-base.googleSheets`：讀取指定工作表
- `n8n-nodes-base.supabase`：Upsert 到資料表

#### C4. 訂單成立 → 自動確認 + 提醒
```
[Webhook 訂單] → [Supabase 寫入] → [LINE 確認通知] → [Wait 24h] → [LINE 提醒取貨]
```
節點組合：
- `n8n-nodes-base.webhook`：接收訂單
- `n8n-nodes-base.supabase`：Insert 訂單
- `n8n-nodes-base.httpRequest`：LINE Push 確認訊息
- `n8n-nodes-base.wait`：等待 24 小時
- `n8n-nodes-base.httpRequest`：LINE Push 提醒訊息

#### C5. 每週報表 → Email 發送
```
[Cron 每週一 9AM] → [Supabase 查詢] → [Code 產生報表] → [Email 發送]
```
節點組合：
- `n8n-nodes-base.scheduleTrigger`：每週一 09:00
- `n8n-nodes-base.supabase`：查詢上週數據
- `n8n-nodes-base.code`：計算統計、產生 HTML 報表
- `n8n-nodes-base.emailSend`：寄出報表

---

## 3. LINE OA 完整設定指南（從零開始）

### 3.1 申請 LINE Official Account

1. 前往 https://www.linebiz.com/tw/
2. 點「免費開設帳號」
3. 用個人 LINE 帳號登入
4. 填寫：
   - 帳號名稱（客戶的品牌名）
   - 類別（餐飲/醫療/零售 等）
   - 公司/店家名稱
5. 完成建立，取得 LINE OA 帳號

### 3.2 LINE Developers Console 設定

1. 前往 https://developers.line.biz/console/
2. 用同一個 LINE 帳號登入
3. Create Provider（如果還沒有）
   - Provider 名稱 = 公司名稱
4. 在 Provider 下 Create Channel → Messaging API
5. 填寫：
   - Channel name：同 OA 名稱
   - Channel description：簡短描述
   - Category / Subcategory：對應產業
   - Email：聯絡信箱
6. 建立完成

### 3.3 Messaging API 啟用

1. LINE OA Manager → 設定 → Messaging API
2. 點「啟用 Messaging API」
3. 選擇剛建的 Provider
4. 確認 Channel 連結完成

### 3.4 Webhook URL 設定

1. LINE Developers Console → Channel → Messaging API 分頁
2. Webhook settings：
   - Webhook URL：填入 n8n Webhook Production URL
     格式：`https://sky770825.zeabur.app/webhook/xxxxxxxx`
   - Use webhook：開啟
   - 點 Verify → 確認顯示 Success
3. Auto-reply messages：關閉（改由我們的系統回覆）
4. Greeting messages：可保留或自訂

### 3.5 Channel Access Token 取得

1. LINE Developers Console → Channel → Messaging API 分頁
2. 滾到最下方 Channel access token
3. 點 Issue → 複製 long-lived token
4. 安全保存（這是 API 呼叫的認證金鑰）

### 3.6 基礎回覆測試

```bash
# 發送測試訊息（替換 TOKEN 和 USER_ID）
curl -X POST https://api.line.me/v2/bot/message/push \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {CHANNEL_ACCESS_TOKEN}" \
  -d '{
    "to": "{USER_ID}",
    "messages": [
      { "type": "text", "text": "Hello from API!" }
    ]
  }'
```

取得 User ID 的方法：
- Webhook 收到的 event 裡有 `source.userId`
- 或在 LINE Developers Console → Channel → Basic settings → Your user ID

### 3.7 Flex Message 卡片設計

**已內建 12 種 Flex 卡片模板**（`flex-templates.ts`）：

| 卡片類型 | 函式名 | 適用場景 |
|----------|--------|----------|
| 資訊卡 | `createInfoCard` | 通知、公告、說明 |
| 列表卡 | `createListCard` | 菜單、服務項目、FAQ |
| 圖片卡 | `createImageCard` | 產品展示、活動海報 |
| 動作卡 | `createActionCard` | 需要用戶點擊按鈕的場景 |
| 通知泡泡 | `createNotificationBubble` | 狀態通知（成功/警告/錯誤） |
| 收據卡 | `createReceiptCard` | 訂單明細、費用摘要 |
| 事件卡 | `createEventCard` | 行事曆事件、預約確認 |
| 議程卡 | `createAgendaCard` | 多事件排程、時間表 |
| 媒體播放卡 | `createMediaPlayerCard` | 音樂/影片控制 |
| 遙控器卡 | `createAppleTvRemoteCard` | 設備遙控 |
| 設備控制卡 | `createDeviceControlCard` | 智慧家電控制 |
| 輪播容器 | `createCarousel` | 多卡片橫向滑動（最多 12 張） |

**使用 LINE Flex Message Simulator 預覽**：
- https://developers.line.biz/flex-simulator/
- 把 JSON 貼進去即可即時預覽

**客戶常用組合**：
- 餐廳：ListCard（菜單）+ ImageCard（餐點照片）+ Carousel
- 診所：EventCard（預約確認）+ NotificationBubble（提醒）
- 電商：ReceiptCard（訂單）+ ActionCard（物流追蹤）

### 3.8 Rich Menu 設定

**圖片規格**：
- 尺寸：2500 x 1686（大）或 2500 x 843（小）
- 格式：JPEG 或 PNG
- 大小：< 1 MB

**常見版面（大版 2500x1686，6 格）**：
```
┌────────────┬────────────┬────────────┐
│   預約服務  │   最新消息  │   菜單/產品  │
│            │            │            │
├────────────┼────────────┼────────────┤
│   會員中心  │   常見問題  │   聯絡我們  │
│            │            │            │
└────────────┴────────────┴────────────┘
```

各格 bounds 設定（6 格均分）：
```json
[
  { "bounds": { "x": 0, "y": 0, "width": 833, "height": 843 }, "action": { "type": "message", "text": "預約" } },
  { "bounds": { "x": 833, "y": 0, "width": 834, "height": 843 }, "action": { "type": "message", "text": "最新消息" } },
  { "bounds": { "x": 1667, "y": 0, "width": 833, "height": 843 }, "action": { "type": "message", "text": "菜單" } },
  { "bounds": { "x": 0, "y": 843, "width": 833, "height": 843 }, "action": { "type": "uri", "uri": "https://客戶網站/member" } },
  { "bounds": { "x": 833, "y": 843, "width": 834, "height": 843 }, "action": { "type": "message", "text": "FAQ" } },
  { "bounds": { "x": 1667, "y": 843, "width": 833, "height": 843 }, "action": { "type": "uri", "uri": "tel:0212345678" } }
]
```

### 3.9 常見問題排除

| 問題 | 原因 | 解法 |
|------|------|------|
| Webhook Verify 失敗 | URL 錯誤或 n8n workflow 未啟用 | 確認 URL 正確、workflow 已 Active |
| Bot 不回訊息 | Auto-reply 蓋過 Webhook | LINE OA Manager 關閉自動回覆 |
| 簽名驗證失敗 | Channel Secret 錯誤 | 重新複製 Channel Secret |
| 推播失敗 | Token 過期或額度用完 | 重新 Issue token、檢查方案額度 |
| Flex 卡片不顯示 | JSON 格式錯誤 | 用 Flex Simulator 驗證 JSON |
| Rich Menu 不顯示 | 未設為預設或圖片超過 1MB | 檢查是否 setDefault、壓縮圖片 |
| 用戶收不到推播 | userId 錯誤 | 確認 userId 來源正確（非 groupId） |

---

## 4. n8n Workflow 部署 SOP

### 4.1 環境資訊

- **Zeabur n8n**：`https://sky770825.zeabur.app`
- **本地測試**（如有）：`http://localhost:5678`

### 4.2 匯入 Workflow JSON

1. 登入 n8n
2. 左側 Workflows → Add Workflow（或直接在首頁 +）
3. 右上角 ... → Import from File
4. 選擇 workflow JSON 檔案
5. 匯入後檢查每個節點是否正確

**已有的 Workflow 範例**：
| 檔案 | 路徑 | 用途 |
|------|------|------|
| My-workflow.fixed.json | `docs/n8n/` | Webhook + AI 記憶整理 |
| My-workflow.no-llm.json | `docs/n8n/` | 不含 LLM 的基礎 workflow |
| Daily-Wrap-up.no-llm.json | `docs/n8n/` | 每日摘要（無 LLM） |
| OpenClaw-Run-Index-Reporter-Telegram.json | `docs/n8n/` | 向量索引 + Telegram 報告 |

### 4.3 設定 Credentials

n8n 左側 → Credentials → Add Credential

**LINE Messaging API**：
- Credential type：Header Auth
- Name：`LINE Bot Token`
- Header Name：`Authorization`
- Header Value：`Bearer {CHANNEL_ACCESS_TOKEN}`

**Google Sheets**：
- Credential type：Google Sheets OAuth2
- 按照 n8n 指引完成 Google OAuth 授權

**Supabase**：
- Credential type：Supabase API
- Host：`https://xxxxxx.supabase.co`
- Service Role Key：從 Supabase Dashboard → Settings → API 取得

**Email（SMTP）**：
- Credential type：SMTP
- Host / Port / User / Password（依客戶 Email 服務商）

### 4.4 設定 Webhook URL

1. Workflow 裡找到 Webhook 節點
2. 點開節點 → 複製 Production URL
   - 格式：`https://sky770825.zeabur.app/webhook/xxxxxxxx`
3. 把這個 URL 填到觸發來源：
   - LINE Developers Console → Webhook URL
   - 客戶網站表單 action URL
   - 第三方服務的 Webhook 設定

### 4.5 測試 Workflow

1. **手動測試**：n8n 編輯頁面 → Execute Workflow → 看每個節點執行結果
2. **Webhook 測試**：
   ```bash
   curl -X POST https://sky770825.zeabur.app/webhook-test/xxxxxxxx \
     -H "Content-Type: application/json" \
     -d '{"test": true, "message": "hello"}'
   ```
3. **啟用 Production**：確認測試沒問題 → Toggle Active（右上角開關）
4. **監控**：Executions 分頁查看歷史執行紀錄

### 4.6 常用節點組合速查

| 場景 | 節點流程 |
|------|----------|
| LINE 收訊 → 判斷 → 回覆 | Webhook → Switch（關鍵字）→ HTTP Request（LINE Reply） |
| 定時觸發 → 檢查 → 通知 | Schedule Trigger → HTTP Request → IF → LINE/Email |
| 表單送出 → 存資料 → 通知 | Webhook → Set → Supabase Insert → LINE Push |
| 資料同步 | Schedule Trigger → Google Sheets → Code（轉換）→ Supabase Upsert |
| AI 對話 | Webhook → AI Agent → HTTP Request（LINE Reply） |

---

## 5. 報價參考

### 5.1 方案報價

| 方案 | 基礎價（NTD） | 包含內容 | 工期 | 月維護費（NTD） |
|------|--------------|----------|------|----------------|
| LINE OA 基礎版 | 5,000 - 8,000 | 關鍵字回覆（10 組）、Rich Menu、基礎設定 | 3-5 天 | 1,500 |
| LINE OA + AI 對話 | 12,000 - 18,000 | 基礎版 + Gemini AI 對話、Flex 卡片、推播設定 | 5-7 天 | 2,000 |
| LINE OA 全配版 | 20,000 - 30,000 | AI 版 + 會員綁定、預約系統、數據報表 | 7-14 天 | 3,000 |
| 企業網站 | 15,000 - 30,000 | RWD 網站、5-10 頁、基礎 SEO、部署上線 | 7-14 天 | 1,500 |
| 網站 + 會員系統 | 25,000 - 50,000 | 企業網站 + 會員註冊登入、個人頁、管理後台 | 14-21 天 | 2,500 |
| 自動化整合 | 8,000 - 15,000/流程 | 單一自動化流程設計、部署、測試 | 2-5 天 | 1,000/流程 |

### 5.2 加購項目

| 項目 | 價格（NTD） | 說明 |
|------|------------|------|
| 額外關鍵字組 | 500/組 | 每 10 組關鍵字 |
| 額外 Flex 卡片設計 | 1,000/張 | 客製化卡片 |
| Google OAuth 登入 | 3,000 | 含 Google Cloud 設定 |
| LINE Login 整合 | 5,000 | LINE Login + 帳號綁定 |
| 金流串接 | 8,000 - 15,000 | 綠界/藍新/LINE Pay |
| 多語系 | 費用 x 1.5 | 中英雙語或多語 |
| 客製 Dashboard | 10,000 - 20,000 | 數據視覺化後台 |

### 5.3 付款方式

- **訂金**：簽約時收 50%
- **尾款**：驗收通過後收 50%
- **維護費**：每月 1 號收取（年繳 9 折）
- **匯款**：銀行轉帳 / LINE Pay

---

## 6. 交付檢查清單

每個專案交付前，逐項確認打勾：

### 6.1 通用項目

- [ ] 所有功能依需求文件實作完成
- [ ] 手機 / 平板 / 電腦 三種裝置測試通過
- [ ] Chrome / Safari / Firefox 瀏覽器測試
- [ ] 載入速度 < 3 秒（PageSpeed Insights 測試）
- [ ] SSL 憑證已安裝（https 綠鎖）
- [ ] 自訂網域已設定並生效
- [ ] 錯誤頁面（404 / 500）已設定
- [ ] 環境變數已設定在正式環境（不含在程式碼裡）
- [ ] 備份機制已確認

### 6.2 LINE OA 專案

- [ ] Bot 加好友連結可用
- [ ] 所有關鍵字回覆正確
- [ ] AI 對話正常運作（非關鍵字也能回）
- [ ] Flex 卡片在手機上顯示正常
- [ ] Rich Menu 顯示正確、每格按鈕可用
- [ ] 推播功能測試成功
- [ ] Webhook URL 是 Production URL（不是 test URL）
- [ ] n8n workflow 已設為 Active
- [ ] LINE OA Manager 自動回覆已關閉
- [ ] Channel Access Token 記錄在交付文件

### 6.3 網站 + 會員系統專案

- [ ] 註冊流程正常（含驗證信）
- [ ] 登入 / 登出正常
- [ ] OAuth 登入正常（Google / LINE）
- [ ] 忘記密碼流程正常
- [ ] 會員資料編輯正常
- [ ] RLS 安全政策已設定（用戶只能看自己的資料）
- [ ] 管理後台可查看會員列表
- [ ] 資料庫已設定定期備份
- [ ] API 端點已加認證保護

### 6.4 自動化整合專案

- [ ] 所有 workflow 正常執行
- [ ] 觸發條件正確（Webhook / 排程）
- [ ] 異常情況有錯誤通知（不是靜默失敗）
- [ ] n8n 執行紀錄正常
- [ ] Credential 已設在正式環境（不是測試帳號）
- [ ] 大量資料測試通過（不只測 1 筆）

### 6.5 文件交付

- [ ] 操作手冊（客戶版，含截圖）
- [ ] 帳號清單（各平台帳密，加密保存）
- [ ] 技術文件（給未來維護的工程師）
- [ ] 報價單 / 合約 / 收款紀錄

---

## 7. 維護 SOP

### 7.1 月度檢查項目

每月 1 號執行（可自動化）：

| 項目 | 檢查方式 | 正常標準 |
|------|----------|----------|
| 網站可用性 | `curl -s -o /dev/null -w "%{http_code}" https://客戶網站` | 200 |
| SSL 到期日 | `echo \| openssl s_client -connect 網站:443 2>/dev/null \| openssl x509 -noout -dates` | > 30 天 |
| n8n workflow 狀態 | n8n Dashboard → Executions | 無連續失敗 |
| LINE Bot 回應 | 手動發測試訊息 | 3 秒內回覆 |
| 資料庫容量 | Supabase Dashboard → Database | < 80% |
| 錯誤日誌 | n8n Executions → Error | 無未處理錯誤 |
| API 額度 | LINE / Google / Supabase Dashboard | 未超額 |

### 7.2 異常處理流程

```
偵測異常 → 判斷嚴重度 → 處理 → 通知客戶 → 記錄
```

**嚴重度分級**：

| 級別 | 定義 | 回應時間 | 範例 |
|------|------|----------|------|
| P0 緊急 | 服務完全中斷 | 1 小時內 | 網站掛了、Bot 完全不回 |
| P1 嚴重 | 核心功能異常 | 4 小時內 | 會員無法登入、支付失敗 |
| P2 一般 | 非核心問題 | 24 小時內 | 某張卡片顯示異常、排版跑掉 |
| P3 輕微 | 不影響使用 | 下次維護時 | 文字修改、微調樣式 |

### 7.3 客戶問題回報處理

1. **收到回報**：客戶透過 LINE / Email / 電話回報
2. **建立工單**：記錄問題描述、截圖、發生時間
3. **分級**：依上表判斷 P0-P3
4. **指派**：分配給對應工程師
5. **處理**：修復 → 測試 → 部署
6. **回報**：通知客戶已修復，附說明
7. **記錄**：更新維護日誌

**維護日誌格式**：
```
## 2026-03-05
- [P2] 修復首頁輪播圖不顯示問題（圖片 CDN 路徑變更）
- [維護] 更新 SSL 憑證（有效期至 2027-03-05）
```

---

## 8. 已有資源索引

### 8.1 LINE 相關

| 資源 | 路徑 | 說明 |
|------|------|------|
| Flex 卡片模板（12 種） | `openclaw-main/src/line/flex-templates.ts` | InfoCard / ListCard / ImageCard / ActionCard / NotificationBubble / ReceiptCard / EventCard / AgendaCard / MediaPlayerCard / AppleTvRemoteCard / DeviceControlCard / Carousel |
| Flex 卡片測試 | `openclaw-main/src/line/flex-templates.test.ts` | 每種卡片的單元測試 |
| Template Messages | `openclaw-main/src/line/template-messages.ts` | Confirm / Buttons / Carousel / ImageCarousel |
| Template Messages 測試 | `openclaw-main/src/line/template-messages.test.ts` | 單元測試 |
| Rich Menu 管理 | `openclaw-main/src/line/rich-menu.ts` | 建立 / 上傳圖片 / 列表 / 刪除 / 設為預設 |
| Webhook 處理 | `openclaw-main/src/line/webhook.ts` | 簽名驗證 + 事件處理中介層 |
| Bot 核心 | `openclaw-main/src/line/bot.ts` | createLineBot / createLineWebhookCallback |
| 訊息發送 | `openclaw-main/src/line/send.ts` | reply / push / multicast / broadcast |
| Markdown 轉 LINE | `openclaw-main/src/line/markdown-to-line.ts` | Markdown → LINE 文字格式 |
| 分段發送 | `openclaw-main/src/line/reply-chunks.ts` | 超長文自動分段 |
| 帳號管理 | `openclaw-main/src/line/accounts.ts` | 多帳號切換 |
| 設定 Schema | `openclaw-main/src/line/config-schema.ts` | LINE 設定驗證 |
| Bot Handlers | `openclaw-main/src/line/bot-handlers.ts` | 事件分派處理 |
| 自動回覆 | `openclaw-main/src/line/auto-reply-delivery.ts` | 自動回覆機制 |
| 檔案下載 | `openclaw-main/src/line/download.ts` | LINE 媒體檔案下載 |

### 8.2 n8n Workflow 範例

| 檔案 | 路徑 | 用途 |
|------|------|------|
| My-workflow.fixed.json | `docs/n8n/` | Webhook + AI 記憶整理（含 OpenAI） |
| My-workflow.no-llm.json | `docs/n8n/` | 基礎 Webhook workflow（無 LLM） |
| Daily-Wrap-up.no-llm.json | `docs/n8n/` | 每日摘要（無 LLM 版） |
| Daily-Wrap-up.no-llm.with-error-alert.json | `docs/n8n/` | 每日摘要 + 錯誤告警 |
| OpenClaw-Run-Index-Reporter-Telegram.json | `docs/n8n/` | 向量索引 + Telegram 報告 |
| OpenClaw-Run-Index-Reporter-Telegram.code-node.json | `docs/n8n/` | 同上（Code 節點版） |

### 8.3 Server 核心

| 資源 | 路徑 | 說明 |
|------|------|------|
| Server 主程式 | `server/src/index.ts` | Express.js 入口 |
| n8n Client | `server/src/n8nClient.ts` | n8n API 呼叫封裝 |
| Supabase Client | `server/src/supabase.ts` | Supabase 連線 |
| WebSocket | `server/src/websocket.ts` | 即時通訊 |
| Prompt Guard | `server/src/promptGuard.ts` | Prompt 注入防護 |
| Risk Classifier | `server/src/riskClassifier.ts` | 風險分類器 |

### 8.4 文件

| 資源 | 路徑 | 說明 |
|------|------|------|
| n8n 說明 | `docs/n8n/README.md` | n8n 使用指南 |
| API 端點文件 | `cookbook/01-API-端點.md` | 所有 API 端點 |
| 資料庫文件 | `cookbook/02-資料庫.md` | Supabase 資料表 |
| 部署文件 | `cookbook/07-網站與部署.md` | 部署流程 |
| 編碼品質 | `cookbook/13-編碼品質.md` | 程式碼品質標準 |

---

## 附錄：接案 Checklist（快速版）

新案子進來，照這個順序做：

```
□ 需求訪談（填完必問清單 8 題）
□ 選方案（A/B/C 或組合）
□ 報價（用第 5 節價目表）
□ 簽約收訂金（50%）
□ 建立專案資料夾
□ 開通帳號（LINE / Supabase / n8n / 網域）
□ 配置環境（程式碼 / workflow / 資料庫）
□ 開發功能
□ 內部測試（交付檢查清單）
□ 客戶驗收
□ 收尾款（50%）
□ 交付文件（操作手冊 + 帳號清單 + 技術文件）
□ 設定維護排程
□ 歸檔
```
