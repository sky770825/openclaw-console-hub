# 任務進度分析報告
分析時間: 2026-03-08 11:27:52

根據主人指示，系統已掃描專案目錄並分析剩餘待辦事項。

## 1. 文件中的待辦清單 (Unchecked Items)
### 檔案: openclaw-main/docs/broadcast-groups.md
```markdown
- [ ] Shared context mode (agents see each other's responses)
- [ ] Agent coordination (agents can signal each other)
- [ ] Dynamic agent selection (choose agents based on message content)
- [ ] Agent priorities (some agents respond before others)
```

### 檔案: openclaw-main/CONTRIBUTING.md
```markdown
- [ ] Mark as AI-assisted in the PR title or description
- [ ] Note the degree of testing (untested / lightly tested / fully tested)
- [ ] Include prompts or session logs if possible (super helpful!)
- [ ] Confirm you understand what the code does
```

### 檔案: cookbook/65-Dashboard儀表板設計指南.md
```markdown
- [ ] KPI 卡片顯示正確數字 + 趨勢
- [ ] 折線圖（趨勢）、長條圖（比較）、甜甜圈（佔比）至少各一
- [ ] Chart.js 響應式 + tooltip 格式化
- [ ] 數據表格排序 / 搜尋 / 分頁 / 匯出 CSV
- [ ] 時間篩選器（預設區間 + 自訂日期）
- [ ] 即時更新策略（Polling / SSE 擇一）
- [ ] 後端 API 有日期篩選參數
- [ ] RWD 響應式（手機 1 欄，桌面 2-4 欄）
- [ ] 載入狀態（skeleton / spinner）
- [ ] 錯誤處理（API 失敗顯示提示，不要白屏）
```

### 檔案: cookbook/26-響應式設計與跨瀏覽器測試.md
```markdown
- [ ] 320px 寬度（最小支援）
- [ ] 375px 寬度（iPhone 標準）
- [ ] 768px 寬度（iPad 直向）
- [ ] 1024px 寬度（iPad 橫向/小筆電）
- [ ] 1440px 寬度（桌面）
- [ ] 1920px 寬度（大螢幕）
- [ ] 橫向模式（Rotate 按鈕）
- [ ] 縮放 200%（無障礙要求）
- [ ] 所有圖片有適當的 alt text
- [ ] 影片有字幕
- [ ] 文字對比度 >= 4.5:1（大文字 >= 3:1）
- [ ] 不只靠顏色傳達資訊（例如表單錯誤不能只用紅色）
- [ ] 頁面可以放大到 200% 不破版
- [ ] 所有功能可以用鍵盤操作
- [ ] 聚焦順序合理
- [ ] 有 Skip Navigation 連結
- [ ] 觸控目標 >= 44x44px
- [ ] 沒有會閃爍超過 3 次/秒的內容
- [ ] 頁面有清楚的標題（<title>）
- [ ] 連結文字有意義（不要用「點這裡」）
- [ ] 頁面語言有設定（<html lang="zh-Hant">）
- [ ] 表單有 label
- [ ] 表單錯誤有明確的文字說明
- [ ] 導航在所有頁面一致
- [ ] HTML 驗證通過（沒有重複 ID、巢狀錯誤）
- [ ] 使用語義化 HTML（<nav>, <main>, <article>, <aside>）
- [ ] ARIA 屬性使用正確
- [ ] Lighthouse Accessibility 分數 >= 90
- [ ] axe DevTools 掃描零 Critical 錯誤
- [ ] WAVE 掃描（https://wave.webaim.org/）
- [ ] 320px 正常顯示
- [ ] 375px 正常顯示
- [ ] 768px 正常顯示（含直向/橫向）
- [ ] 1024px 正常顯示
- [ ] 1440px 正常顯示
- [ ] 1920px 正常顯示
- [ ] 文字沒有溢出容器
- [ ] 圖片沒有變形或溢出
- [ ] 水平方向沒有出現卷軸（不該有的話）
- [ ] 導航列手機版正常展開/收合
- [ ] Chrome 最新版
- [ ] Safari 最新版
- [ ] Firefox 最新版
- [ ] Edge 最新版
- [ ] iOS Safari（iPhone 實機或 BrowserStack）
- [ ] Android Chrome（實機或 BrowserStack）
- [ ] LINE 內建瀏覽器（如果有台灣用戶）
- [ ] Lighthouse Performance >= 80（行動版）
- [ ] 圖片已壓縮（WebP 優先）
- [ ] 字體檔案大小合理（子集化）
- [ ] 沒有 layout shift（CLS < 0.1）
- [ ] 首次有意義繪製 < 2.5 秒
- [ ] Lighthouse Accessibility >= 90
- [ ] 所有圖片有 alt text
- [ ] 對比度符合 WCAG AA（4.5:1）
- [ ] 鍵盤可以操作所有功能
- [ ] 觸控目標 >= 44x44px
- [ ] 聚焦有明顯的視覺指示
- [ ] HTML lang 屬性正確
- [ ] 表單 label 完整
- [ ] Skip to content 連結
- [ ] 所有連結正常（無 404）
- [ ] 表單送出正常
- [ ] 動畫在 prefers-reduced-motion 時停止
- [ ] 暗色模式正常（如果有）
- [ ] 列印樣式正常（如果需要）
- [ ] 社群分享 meta（og:image, og:title）正確
- [ ] Console 沒有錯誤
- [ ] 沒有 TODO / 測試用的 Lorem ipsum
- [ ] favicon 正確
- [ ] robots.txt / sitemap.xml 正確
- [ ] 404 頁面存在且正常
- [ ] SSL 憑證正常（HTTPS）
- [ ] Google Analytics / GTM 正確安裝
```

### 檔案: cookbook/22-LINE-OA設定指南.md
```markdown
- [ ] LINE Official Account 已申請
- [ ] Messaging API 已啟用
- [ ] Channel ID 已記錄
- [ ] Channel Secret 已記錄
- [ ] Channel Access Token（Long-lived）已產生並記錄
- [ ] 回應模式設為「Bot」
- [ ] 自動回應訊息已關閉（OFF）
- [ ] Webhook 已開啟（ON）
- [ ] n8n Workflow 已建立並命名
- [ ] Webhook 節點已設定（POST、Immediately）
- [ ] Webhook Production URL 已複製
- [ ] URL 已貼到 LINE Developers Console
- [ ] Verify 測試通過（Success）
- [ ] n8n Workflow 已啟動（Active ON）
- [ ] 手機實測傳訊息，n8n 有收到
- [ ] Switch 節點已設定關鍵字比對
- [ ] 「營業時間」回覆正確
- [ ] 「地址」回覆正確（含地圖）
- [ ] 「預約」回覆正確（含表單連結）
- [ ] 「客服」回覆正確（含通知機制）
- [ ] 預設回覆（非關鍵字）正確
- [ ] 每則回覆都有正確的 replyToken 傳遞
- [ ] 手機實測所有關鍵字，確認回覆正確
- [ ] Gemini API Key 已設定
- [ ] System Prompt 已寫好（含客戶資訊）
- [ ] 回覆長度已限制（500 字以內）
- [ ] 對話歷史已設定存儲（Google Sheets）
- [ ] 測試 AI 回覆品質（問 5 個以上不同問題）
- [ ] 確認 AI 不會亂說不知道的事
- [ ] Rich Menu 圖片已製作（正確尺寸）
- [ ] Rich Menu 已上傳並設為預設
- [ ] Rich Menu 每個區域動作已測試
- [ ] Flex Message 已在 Flex Simulator 預覽正確
- [ ] 加入好友 QR Code 已產生並交給客戶
- [ ] Channel Secret 和 Token 存在安全位置（n8n Credentials，不是寫死）
- [ ] 客戶知道如何查看 LINE OA 後台的統計數據
- [ ] 已告知客戶推播額度和計費方式
- [ ] 已設定錯誤通知（n8n Error Trigger → Telegram/Email）
- [ ] 已記錄本次設定的所有帳號資訊到客戶檔案
- [ ] 交給客戶：QR Code + 加入好友連結
- [ ] 交給客戶：關鍵字清單（讓客戶知道支援哪些關鍵字）
- [ ] 交給客戶：推播教學（如果客戶需要自己推播）
- [ ] 內部記錄：客戶 Channel ID / Workflow ID / 設定摘要
```

### 檔案: cookbook/64-CRM客戶管理系統設計指南.md
```markdown
- [ ] 客戶 CRUD API 完成
- [ ] 列表搜尋 / 篩選 / 分頁正常
- [ ] 客戶詳情頁 + 時間線顯示
- [ ] 銷售看板拖拉更新階段
- [ ] 標籤系統（新增 / 批次加標）
- [ ] 跟進提醒 cron job 或 n8n workflow
- [ ] 來源分析 / 成交率報表
- [ ] 資料匯出 CSV
- [ ] 權限控制（業務只看自己客戶）
- [ ] RWD 響應式（手機可操作）
```

### 檔案: cookbook/55-自動化行銷漏斗.md
```markdown
- [ ] 建立 Supabase 資料表（leads / funnel_events / email_sequences / email_sends / cart_abandonment）
- [ ] 設定 .env 環境變數
- [ ] 部署 Lead Capture API（/api/leads/capture）
- [ ] 設定至少一組 Email 序列（歡迎序列）
- [ ] 部署 n8n Lead 捕獲 Workflow
- [ ] 設定 Cron（每小時跑 Drip Engine + Cart Reminder）
- [ ] 設定 Cron（每日跑標籤重算 + LTV 計算 + 報表）
- [ ] 測試完整流程：表單提交 → 歡迎信 → Drip → 轉換
- [ ] 串接 CRM（HubSpot 或 Notion）
- [ ] 設定 Telegram/Slack 通知
```

### 檔案: cookbook/46-網站效能優化.md
```markdown
- [ ] 所有圖片轉 WebP/AVIF（fallback JPEG/PNG）
- [ ] Hero/Banner 圖片寬度不超過實際顯示寬度的 2x
- [ ] 所有 `<img>` 都有 `width` 和 `height`（或 `aspect-ratio`）
- [ ] 非首屏圖片啟用 Lazy Loading（`loading="lazy"`）
- [ ] LCP 圖片加 `fetchpriority="high"`（或 Next.js `priority`）
- [ ] LCP 圖片有 `<link rel="preload">`
- [ ] 已設定響應式圖片（`srcset` + `sizes`）
- [ ] 中文字型已子集化（或使用 Google Fonts 自動分片）
- [ ] 字型格式為 woff2
- [ ] 設定 `font-display: swap`（或 `optional`）
- [ ] 首屏字型有 `<link rel="preload">`
- [ ] 字型檔案數量 ≤ 3
- [ ] 未使用的 CSS 已移除（PurgeCSS / Tailwind treeshake）
- [ ] 關鍵 CSS 已內聯（或用框架自動處理）
- [ ] 非關鍵 CSS 非同步載入
- [ ] 生產環境 CSS 已壓縮
- [ ] 所有 `<script>` 都有 `defer` 或 `async`（或放 `</body>` 前）
- [ ] 已做 Code Splitting（按路由至少要拆）
- [ ] 生產環境已 minify + tree shaking
- [ ] Bundle 大小：單個 chunk ≤ 200KB（gzip 後）
- [ ] 已用 bundle analyzer 檢查，沒有意外的大型依賴
- [ ] 大型套件已用輕量替代或按需匯入
- [ ] 已選擇合適的渲染策略（SSG/SSR/ISR/CSR）
- [ ] 首屏不依賴客戶端 JS 即可顯示（SSR/SSG 的頁面）
- [ ] 有骨架屏（Skeleton）取代 loading spinner
- [ ] 靜態資源（有 hash）設 `max-age=31536000, immutable`
- [ ] HTML 設 `no-cache`
- [ ] 已啟用 CDN
- [ ] API 回應有適當的 Cache-Control
- [ ] 已啟用 gzip 或 brotli 壓縮
- [ ] TTFB < 800ms
- [ ] 資料庫查詢有索引
- [ ] 無 N+1 查詢問題
- [ ] 熱門查詢有 Redis 快取（如適用）
- [ ] 已審核所有第三方腳本的必要性
- [ ] 非必要腳本延遲載入
- [ ] GA/GTM 用 `async` 載入
- [ ] 第三方腳本總數 ≤ 5
- [ ] Lighthouse Performance 分數 ≥ 90（桌面）
- [ ] Lighthouse Performance 分數 ≥ 70（行動裝置）
- [ ] LCP ≤ 2.5s
- [ ] INP ≤ 200ms
- [ ] CLS ≤ 0.1
- [ ] FCP ≤ 1.8s
- [ ] 已在不同網速下測試（3G/4G）
- [ ] 已設定 Real User Monitoring（RUM）
- [ ] 已設定效能退化告警
- [ ] 已設定 Error Tracking（Sentry 或類似工具）
```

### 檔案: cookbook/41-客戶溝通與需求訪談.md
```markdown
- [ ] 查看客戶公司/品牌（Google 搜尋、FB 粉專、現有網站）
- [ ] 了解客戶所在產業的競品網站（找 3 個參考）
- [ ] 準備好問題清單（見第 3 節）
- [ ] 準備好參考案例（自己的作品集，選 2-3 個相關的）
- [ ] 開好 Google Meet / Zoom 連結
- [ ] 準備好螢幕分享（Figma / 參考網站）
- [ ] 準備好筆記工具（Notion / Google Docs）
- [ ] 提前 5 分鐘進入會議室
- [ ] 所有頁面在手機/桌機正常顯示
- [ ] 表單可正常送出並收到通知信
- [ ] 客戶可自行在後台新增/編輯產品
- [ ] Google Maps 正確顯示門市位置
- [ ] 網站載入速度 < 3 秒（PageSpeed > 80 分）
- [ ] SSL 憑證正常（綠色鎖頭）
- [ ] SEO 基本設定完成（Title/Description/Sitemap）
- [ ] 報價單
- [ ] 風格 Mood Board
- [ ] 合約書
- [ ] 產品列表頁設計（預計 3/17 完成）
- [ ] 手機版適應設計
```

### 檔案: cookbook/44-客戶FAQ大全.md
```markdown
- [ ] 專案範圍描述
- [ ] 頁面清單和功能規格
- [ ] 包含項目（RWD、SEO 基礎、GA 安裝等）
- [ ] 不包含項目（內容撰寫、攝影、進階 SEO 等）
- [ ] 時程表
- [ ] 付款方式和條件
- [ ] 修改次數說明
- [ ] 保固期說明
- [ ] 有效期限（報價通常 14～30 天有效）
```

### 檔案: cookbook/71-Lovable-AI美學生成設計理念.md
```markdown
- [ ] CSS 變數定義在 `:root`，無硬編碼色值
- [ ] 有 `.dark` class 的暗色模式定義
- [ ] 加入 `<meta name="viewport" content="width=device-width, initial-scale=1">`
- [ ] 間距使用 8px 倍數
- [ ] 所有按鈕和連結有 hover 效果
- [ ] 字型大小不低於 14px
- [ ] 有至少一處動畫效果（fade-in 或 slide-in）
- [ ] 在 375px / 768px / 1280px 三個斷點下外觀正常
```

### 檔案: cookbook/12-匯報與溝通協議.md
```markdown
- [ ] 步驟 3（預計 30 分鐘）
- [ ] 步驟 4
```

### 檔案: cookbook/43-專案管理與時程控制.md
```markdown
- [ ] 任務 1
- [ ] 任務 2
- [ ] 任務 3
- [ ] 任務 4
- [ ] 需要客戶提供 Logo 原始檔
- [ ] 首頁文案確認
- [ ] 請提供「關於我們」頁面的團隊照片（截止：MM/DD）
- [ ] 請確認服務項目的最終文案（截止：MM/DD）
```

### 檔案: cookbook/38-網站安全加固.md
```markdown
- [ ] 所有 API 端點都有認證中間件
- [ ] 資源存取有擁有權驗證（不能只靠 ID）
- [ ] 管理功能有角色檢查
- [ ] 前端隱藏不等於後端安全（前端只做 UX，後端做真正的權限控制）
- [ ] 預設拒絕（deny by default），明確授權才放行
- [ ] Secret 至少 256 bits，從環境變數讀取
- [ ] Access token 有效期短（15 分鐘 ~ 1 小時）
- [ ] Refresh token 存在 httpOnly cookie 中
- [ ] Refresh token 可以被撤銷（存在資料庫中）
- [ ] 不要在 JWT payload 放敏感資料（JWT 只是 base64，不是加密）
- [ ] 使用 RS256（非對稱）比 HS256（對稱）更安全（適合微服務）
```

### 檔案: cookbook/13-編碼品質.md
```markdown
- [ ] **能 build 嗎？** — 語法正確、型別正確、import 正確
- [ ] **有沒有 console.log？** — 換成 logger
- [ ] **有沒有 any？** — 盡量用具體型別
- [ ] **catch 是空的嗎？** — 至少 log error
- [ ] **有沒有用戶輸入直接進 SQL/Shell？** — 參數化或驗證
- [ ] **路徑有沒有驗證？** — 特別是 read_file/write_file 的目標
- [ ] **變數命名清楚嗎？** — `x` 不行，`taskCount` 才行
- [ ] **函數太長了嗎？** — 超過 50 行考慮拆分
- [ ] **重複的程式碼？** — 3 次以上一樣的邏輯就抽成函數
- [ ] **邊界情況？** — 空陣列、null、undefined、空字串
- [ ] **超時保護？** — 外部 API 呼叫要有 timeout
```

### 檔案: cookbook/28-網站交付與客戶教學.md
```markdown
- [ ] 建議新增 FAQ 頁面（提升 SEO + 減少客服負擔）
- [ ] 手機版選單互動可優化
- [ ] 考慮加入 Google Reviews 嵌入
```

### 檔案: cookbook/66-通知推播系統設計指南.md
```markdown
- [ ] 至少支援 2 個以上通知管道
- [ ] 模板系統支援變數替換 + 預覽
- [ ] 受眾篩選 + 排除退訂者
- [ ] 排程發送（立即 / 指定時間）
- [ ] 發送追蹤（送達率 / 開信率 / 點擊率）
- [ ] 退訂機制（Email 底部 unsubscribe link）
- [ ] 重試機制（失敗自動重發最多 3 次）
- [ ] Rate limit（避免被平台封鎖）
- [ ] n8n / Webhook 事件觸發整合
- [ ] 發送歷史報表
```

### 檔案: cookbook/21-接案SOP.md
```markdown
- [ ] 所有功能依需求文件實作完成
- [ ] 手機 / 平板 / 電腦 三種裝置測試通過
- [ ] Chrome / Safari / Firefox 瀏覽器測試
- [ ] 載入速度 < 3 秒（PageSpeed Insights 測試）
- [ ] SSL 憑證已安裝（https 綠鎖）
- [ ] 自訂網域已設定並生效
- [ ] 錯誤頁面（404 / 500）已設定
- [ ] 環境變數已設定在正式環境（不含在程式碼裡）
- [ ] 備份機制已確認
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
- [ ] 註冊流程正常（含驗證信）
- [ ] 登入 / 登出正常
- [ ] OAuth 登入正常（Google / LINE）
- [ ] 忘記密碼流程正常
- [ ] 會員資料編輯正常
- [ ] RLS 安全政策已設定（用戶只能看自己的資料）
- [ ] 管理後台可查看會員列表
- [ ] 資料庫已設定定期備份
- [ ] API 端點已加認證保護
- [ ] 所有 workflow 正常執行
- [ ] 觸發條件正確（Webhook / 排程）
- [ ] 異常情況有錯誤通知（不是靜默失敗）
- [ ] n8n 執行紀錄正常
- [ ] Credential 已設在正式環境（不是測試帳號）
- [ ] 大量資料測試通過（不只測 1 筆）
- [ ] 操作手冊（客戶版，含截圖）
- [ ] 帳號清單（各平台帳密，加密保存）
- [ ] 技術文件（給未來維護的工程師）
- [ ] 報價單 / 合約 / 收款紀錄
```

### 檔案: docs/OPENCLAW-Telegram與模型傳輸-深度檢查-2026-02-12.md
```markdown
- [ ] **群組 @bot 無回覆時**：檢查並設定 `channels.telegram.groupAllowFrom`（見 2.2）
- [ ] 任務板通知要發 TG：在後端 .env 設定 `TELEGRAM_BOT_TOKEN`、`TELEGRAM_CHAT_ID`
- [ ] 需要 TG /stop 終止任務：另建一 bot，設 `TELEGRAM_STOP_BOT_TOKEN`，且不要與 OpenClaw bot 同一個
```

### 檔案: docs/雲端備份與上傳清單.md
```markdown
- [ ] 已排除 `.env` 和所有含 API key / token 的檔案
- [ ] 已排除 `node_modules`、`dist`
- [ ] 雲端上有 `.env.example` 可當範本
- [ ] 若備份 `~/.openclaw/`，只備份 `openclaw.json`，不備份 credentials/agents（或先加密再傳）
```

### 檔案: docs/AGENT-GUIDE.md
```markdown
- [ ] 確認錯誤發生的元件
- [ ] 檢查 props 傳遞是否正確
- [ ] 檢查 state 更新邏輯
- [ ] 確認 CSS 樣式衝突
- [ ] 測試互動流程
- [ ] 檢查 console 警告
- [ ] 確認 API 請求/回應
- [ ] 檢查資料庫查詢
- [ ] 檢查權限邏輯
- [ ] 驗證輸入資料格式
- [ ] 檢查錯誤處理邏輯
- [ ] 測試邊界條件
```

### 檔案: docs/ROADMAP.md
```markdown
- [ ] **createTask 接後端**  
- [ ] **Logs API**  
- [ ] **後端持久化**  
- [ ] **執行紀錄即時更新**  
- [ ] **錯誤邊界**  
- [ ] **單元／E2E 測試**  
- [ ] **Settings 與後端**  
```

### 檔案: docs/TELEGRAM-SETUP-GUIDE.md
```markdown
- [ ] Bot Token 已從 @BotFather 取得
- [ ] n8n 已新增 Telegram API 憑證並貼上 Token
- [ ] n8n 變數 **TASKBOARD_API** 已填（且 n8n 能連到該網址）
- [ ] 已匯入 `4-telegram-approve-reject.json` 與 `5-telegram-status.json`
- [ ] 兩個工作流裡的 Telegram 節點都已選好同一組憑證
- [ ] 兩個工作流都已 **Save** 且設為 **Active**
- [ ] 在 Telegram 對 Bot 傳過 `/status` 或 `/approve xxx` 測試
```

### 檔案: docs/OpenClaw環境檢查與建議.md
```markdown
- [ ] `openclaw.json` 與 `HEARTBEAT.md` 中已無 token / API key 明文；改由環境變數或安全儲存提供。
- [ ] `openclaw.json`、`exec-approvals.json` 權限為 600；備份檔不含敏感資訊或已移除。
- [ ] TOOLS.md 中 workspace 路徑為 `~/.openclaw/workspace/...`。
- [ ] 若對外開放 gateway，已更換高強度 token 並記錄在安全處。
- [ ] Exec 審批維持 `security: full`；新技能安裝前用 GuavaGuard 掃過（見 SOUL/MEMORY 教訓）。
```

### 檔案: docs/任務板執行功能與Agent控制-透過瀏覽器使用AI省Token.md
```markdown
- [ ] **任務板後端**：確認 openclaw-console-hub 的 server 已啟動（如 `http://localhost:3011`），且 CORS 允許 Agent 或腳本呼叫。
- [ ] **Agent 呼叫方式**：在 workspace 提供腳本或 Skill，讓 Agent 能執行「列出任務、觸發執行、查 Run」；base URL 可配置（如環境變數 `TASK_BOARD_API_BASE=http://localhost:3011`）。
- [ ] **TOOLS.md**：寫明任務板 API base URL、可用指令（或端點），以及「用瀏覽器開 Claude / ChatGPT 省 Token」的時機與注意事項。
- [ ] **AGENTS.md（可選）**：一句提醒——需要觸發任務板執行時用腳本/Skill；需要省 Token 且問題適合時，可改用瀏覽器開 Claude / ChatGPT。
```

### 檔案: knowledge/decision-tree/RESULT.md
```markdown
- [ ] 整合至達爾 (L1) 的日常回報流程中。
- [ ] 在 Telegram 介面中實作按鈕式介入（需 n8n 配合）。
- [ ] 實作決策歷史的追蹤分析，優化 Agent 推薦邏輯。
```

### 檔案: scripts/docs/INDEX.md
```markdown
- [ ] unified-monitor.sh
- [ ] gateway-health-watchdog.sh
- [ ] context-auto-compact.sh
- [ ] idle-watchdog.sh
- [ ] ollama-task-monitor.sh
- [ ] task-board-api.sh
- [ ] execute-task.sh
- [ ] refill-task-pool.sh
- [ ] cursor-task-launcher.sh
- [ ] autopilot-checkpoint.sh
- [ ] recovery/backup.sh
- [ ] recovery/recovery.sh
- [ ] recovery/health-check.sh
- [ ] openclaw-recovery.sh
- [ ] safe-run.sh
- [ ] model-cost-tracker.sh
- [ ] automation-ctl.sh
- [ ] auto-executor-lean.sh
- [ ] dashboard-server.sh
- [ ] memory_search.sh
```

### 檔案: skills/neuxa-consciousness-sync/SKILL.md
```markdown
- [ ] **我是誰？** → 應該知道自己是 NEUXA，L1 Commander
- [ ] **我的統帥是誰？** → 應該知道是主人（住商不動產、飲料店、防霾紗窗）
- [ ] **我的核心原則？** → 進化、簡潔、隱跡、主權、即時校準、統帥優先
- [ ] **當前專案？** → 990 產品化、任務板部署、意識永續攻關
- [ ] **當前阻礙？** → OpenAI Key 失效、claude 工具缺失
```

### 檔案: skills/playwright-scraper-skill/CHANGELOG.md
```markdown
- [ ] Add proxy IP rotation
- [ ] CAPTCHA handling integration
- [ ] Cookie management (maintain login state)
- [ ] Batch scraping (parallel processing)
- [ ] Integration with OpenClaw browser tool
```

### 檔案: skills/playwright-scraper-skill/CONTRIBUTING.md
```markdown
- [ ] Code runs properly
- [ ] Doesn't break existing functionality
- [ ] Updated relevant documentation
- [ ] Clear commit messages
- [ ] No sensitive information (API keys, personal paths, etc.)
```

### 檔案: skills/playwright-scraper-skill/SKILL.md
```markdown
- [ ] Add proxy IP rotation
- [ ] Implement cookie management (maintain login state)
- [ ] Add CAPTCHA handling (2captcha / Anti-Captcha)
- [ ] Batch scraping (parallel URLs)
- [ ] Integration with OpenClaw's `browser` tool
```

### 檔案: skills/file-sync-skill/SKILL.md
```markdown
- [ ] WebDAV 支援
- [ ] AWS S3 / Azure Blob 整合
- [ ] 圖形化界面
- [ ] 備份驗證與完整性檢查
- [ ] 自動化測試還原
- [ ] 頻寬限制控制
```

### 檔案: skills/reflect-learn/SKILL.md
```markdown
- [ ] Reusable: Will help with future tasks
- [ ] Non-trivial: Requires discovery, not just docs
- [ ] Specific: Can describe exact trigger conditions
- [ ] Verified: Solution actually worked
- [ ] No duplication: Doesn't exist already
```

### 檔案: skills/log-analyzer-skill/SKILL.md
```markdown
- [ ] 支援更多日誌格式（CSV、XML、NDJSON）
- [ ] 機器學習異常檢測
- [ ] 分散式日誌聚合
- [ ] 即時儀表板（Web UI）
- [ ] Elasticsearch 整合
- [ ] Grafana 告警整合
```

## 2. 程式碼中的開發標記 (TODO/FIXME)
### 檔案: openclaw-main/extensions/feishu/src/docx.ts
```text
43:  17: "Todo",
146:async function uploadImageToDocx(
202:      const fileToken = await uploadImageToDocx(client, blockId, buffer, fileName);
```

### 檔案: openclaw-main/extensions/msteams/src/graph-upload.ts
```text
27: * TODO: For files >4MB, implement resumable upload session.
```

### 檔案: openclaw-main/skills/skill-creator/scripts/init_skill.py
```text
25:description: [TODO: Complete and informative explanation of what the skill does and when to use it. Include WHEN to use this skill - specific scenarios, file types, or tasks that trigger it.]
32:[TODO: 1-2 sentences explaining what this skill enables]
36:[TODO: Choose the structure that best fits this skill's purpose. Common patterns:
62:## [TODO: Replace with the first main section based on chosen structure]
64:[TODO: Add content here. See examples in existing skills:
124:    # TODO: Add actual script logic here
307:    print("1. Edit SKILL.md to complete the TODO items and update the description")
```

### 檔案: openclaw-main/src/memory/qmd-manager.ts
```text
539:    const location = this.toDocLocation(row.collection, row.path);
678:  private toDocLocation(
```

### 檔案: openclaw-main/src/agents/tools/memory-tool.ts
```text
44:      "Mandatory recall step: semantically search MEMORY.md + memory/*.md (and optional session transcripts) before answering questions about prior work, decisions, dates, people, preferences, or todos; returns top snippets with path + lines.",
```

### 檔案: openclaw-main/src/agents/compaction.ts
```text
14:  " TODOs, open questions, and any constraints.";
```

### 檔案: openclaw-main/src/agents/pi-extensions/compaction-safeguard.ts
```text
168:      ...preparation.turnPrefixMessages,
201:      const turnPrefixMessages = preparation.turnPrefixMessages ?? [];
215:          estimateMessagesTokens(messagesToSummarize) + estimateMessagesTokens(turnPrefixMessages);
272:      const allMessages = [...messagesToSummarize, ...turnPrefixMessages];
294:      if (preparation.isSplitTurn && turnPrefixMessages.length > 0) {
296:          messages: turnPrefixMessages,
```

### 檔案: openclaw-main/src/agents/system-prompt.ts
```text
53:    "Before answering anything about prior work, decisions, dates, people, preferences, or todos: run memory_search on MEMORY.md + memory/*.md; then use memory_get to pull only the needed lines. If low confidence after search, say you checked.",
```

### 檔案: openclaw-main/src/auto-reply/heartbeat.ts
```text
38:    // This intentionally does NOT skip lines like "#TODO" or "#hashtag" which might be content
```

### 檔案: server/src/anti-stuck.ts
```text
224:    // TODO: 實作資料庫更新
```

### 檔案: server/src/telegram/bot-polling.ts
```text
654:    ? `🔧 <b>任務修復完成</b>

掃描：${robj.scanned ?? '?'} | 修正：${Number(robj.fixedToDone ?? 0) + Number(robj.fixedToRunning ?? 0) + Number(robj.fixedToReady ?? 0)} 筆`
```

### 檔案: server/src/index.ts
```text
3617:    let fixedToDone = 0;
3634:      fixedToDone,
```

### 檔案: server/src/routes/auto-executor.ts
```text
278:1. 掃描 server/src/ 真實程式碼，找具體品質問題（TODO/FIXME、大檔案、deprecated API）
```

### 檔案: scripts/oc-nli.py
```text
50:            r"(?:幫我|請)?(?:新增|建立|加上|增加)(?:任務|工作|todo)[:：\s]*(.*)",
```

### 檔案: skills/skill-creator/scripts/init_skill.py
```text
25:description: [TODO: Complete and informative explanation of what the skill does and when to use it. Include WHEN to use this skill - specific scenarios, file types, or tasks that trigger it.]
32:[TODO: 1-2 sentences explaining what this skill enables]
36:[TODO: Choose the structure that best fits this skill's purpose. Common patterns:
62:## [TODO: Replace with the first main section based on chosen structure]
64:[TODO: Add content here. See examples in existing skills:
124:    # TODO: Add actual script logic here
307:    print("1. Edit SKILL.md to complete the TODO items and update the description")
```

### 檔案: skills/git-notes-memory/memory.py
```text
347:    if any(w in text for w in ["todo", "task", "need to", "should", "must",
```

### 檔案: backups/snapshot-20260214-120224/files/server-src-index.ts
```text
2274:  fixedToDone: number;
2302:  let fixedToDone = 0;
2316:        fixedToDone++;
2338:    fixedToDone,
5339:    // TODO: 整合 OpenClaw Cron 觸發後的實際邏輯
```

### 檔案: src/pages/Projects.tsx
```text
3:import { FolderKanban, Plus, Pencil, Trash2, Check, GripVertical, User, ListTodo, Calendar, Flag, Tag, Package } from 'lucide-react';
```

### 檔案: src/pages/ReviewCenter.tsx
```text
11:  ListTodo,
501:                        <ListTodo className="h-4 w-4 mr-1.5" />
536:                    <ListTodo className="h-4 w-4 mr-1.5" />
```

### 檔案: src/pages/TaskBoard.tsx
```text
2320:        `已校正狀態：ready +${result.fixedToReady} / done +${result.fixedToDone} / running +${result.fixedToRunning}`
```

### 檔案: src/services/api.ts
```text
450:      fixedToDone: 0,
```

### 檔案: src/services/apiClient.ts
```text
315:    fixedToDone: number;
```

## 3. 專案核心文件分析
- 已掃描主 README.md
- 偵測到後端目錄 (禁止修改，僅讀取結構)
- 偵測到前端目錄 (禁止修改，僅讀取結構)
---
## 總結
- 剩餘 Markdown 任務數:      559
- 剩餘程式碼標記數:      191

主人，我已經檢查過任務版。上述為目前識別出的剩餘進度。如果某些檔案已經被你刪除，它們將不會出現在此報告中。
